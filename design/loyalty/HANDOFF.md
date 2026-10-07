# Fidélité — Handoff d'implémentation (Next.js 16 / Tailwind 4)

Bundle de passation pour la feature **programme de fidélité** ajoutée à la page de scan client (`/review/[id]`) et au dashboard commerçant (`/business/[businessId]`).

> **Maquettes :** ouvrir `design/loyalty/mockups.html` dans un navigateur. Tous les écrans (client 1–4 + commerçant A–C) y sont rendus dans le design system réel, avec les animations (pop du tampon, horloge live, popup récompense).

---

## 0. Règle d'or (non négociable, à relire avant toute rédaction de copy)

> **Le tampon récompense la VISITE, jamais l'AVIS.**

- Aucun texte, nulle part, ne doit suggérer qu'on gagne un tampon / une récompense en laissant un avis.
- Le bloc tampons et le bloc avis sont **toujours séparés visuellement** (divider « et aussi »).
- Le tampon est ajouté **au chargement de la page** (= à la visite), avant et indépendamment de toute interaction avis.
- Formulations interdites : « laissez un avis pour gagner un tampon », « +1 tampon si vous notez », etc.
- Formulation du bloc avis : réutiliser l'existant — « Comment s'est passée votre visite ? ». Sous-texte neutre, mention facultative « Indépendant de votre carte de fidélité ».

---

## 1. Design system (rappel — déjà en place dans le repo)

| Token | Valeur | Usage |
|---|---|---|
| Fond page | `#0d0d0d` (ambiant global via `SiteAmbient`) | racines `min-h-screen bg-[#0d0d0d]` |
| Carte | `#171717` | `bg-[#171717]` (reflet + ombre auto via `globals.css`) |
| Champ / piste | `#0f0f0f` | inputs, barres de fond |
| Bordure | `#292929` (et `#222222` doux) | `border-[#292929]` |
| Accent or | `#C9973A` (`text-gold`, `bg-gold`) | CTA, tampons, accents |
| Texte | `#ededed` / muted `#8c8c8c` / faible `#666` | |
| Police | Space Grotesk (`font-sans`, déjà chargée dans `layout.tsx`) | |

Conventions repo à suivre :
- Styles **inline Tailwind + `style={{…}}`** (pas de CSS modules). Les animations lourdes passent par un bloc `const STYLES = \`…\`` + `<style>{STYLES}</style>` comme dans `review-client.tsx` / dashboard `page.tsx`.
- Toujours gérer `@media (prefers-reduced-motion: reduce)`.
- Boutons or : `bg-gold text-[#12100e]` (ou `#0d0d0d`), `min-h` ≥ 48–52 px, `active:scale-[0.97]`.
- Mobile : classe `tap-target` (voir `review-client.tsx`), cibles tactiles ≥ 48px, `min-h-dvh`.
- Textes en français, ton chaleureux et sobre.

---

## 2. Modèle de données (Supabase / Postgres)

Nouvelle migration `db/migrations/00XX_loyalty.sql`. Même style que les migrations existantes (idempotent, RLS, grants).

```
loyalty_programs            1 par business
  id              uuid pk
  business_id     uuid fk businesses (unique)
  is_active       boolean default false   -- interrupteur écran B
  created_at      timestamptz

loyalty_rewards             les paliers (tiers)
  id              uuid pk
  program_id      uuid fk loyalty_programs on delete cascade
  threshold       int not null            -- nb de passages (5, 10, …)
  label           text not null           -- "Un café offert"
  position        int                     -- ordre d'affichage
  -- contrainte: threshold unique par program_id

loyalty_cards               1 carte = 1 appareil (ou 1 contact)
  id              uuid pk
  program_id      uuid fk loyalty_programs on delete cascade
  device_token    text not null           -- UUID généré client, stocké localStorage
  email           text                    -- optionnel (écran 2 "sauvegarder")
  phone           text                    -- optionnel (exclusif avec email)
  stamp_count     int not null default 0  -- compteur courant (depuis dernier reset)
  cycle           int not null default 1  -- n° de cycle (incrémenté au reset)
  last_stamp_date date                    -- pour la règle "1 tampon / jour"
  created_at      timestamptz
  -- index unique (program_id, device_token)

loyalty_stamps              journal des passages (pour les stats)
  id              uuid pk
  card_id         uuid fk loyalty_cards on delete cascade
  created_at      timestamptz

loyalty_redemptions         récompenses retirées (irréversible)
  id              uuid pk
  card_id         uuid fk loyalty_cards on delete cascade
  reward_id       uuid fk loyalty_rewards
  reward_label    text    -- snapshot (le palier peut être édité ensuite)
  threshold       int     -- snapshot
  cycle           int     -- cycle où elle a été gagnée
  redeemed_at     timestamptz
```

**RLS / sécurité** (cf. `0014_reclamations.sql` pour le modèle) :
- `loyalty_programs` / `loyalty_rewards` : lecture publique si `is_active` (la page client en a besoin) ; écriture réservée au propriétaire du business (authenticated + ownership) ou service_role.
- `loyalty_cards` / `loyalty_stamps` / `loyalty_redemptions` : **aucune écriture client directe**. Tout passe par des routes API en **service role** (le client ne doit pas pouvoir forger des tampons). Le `device_token` est le secret qui autorise l'appareil à lire/incrémenter SA carte via l'API.

---

## 3. Identité client sans formulaire

- Au 1er scan, générer `device_token = crypto.randomUUID()`, le stocker en `localStorage` (clé `scanavis_loyalty_<businessId>`).
- Ce token identifie la carte à chaque scan suivant → pas de login, pas de formulaire.
- L'encart « Ne perdez pas vos tampons » (écran 2) ajoute **optionnellement** un email **ou** un téléphone sur la carte (un seul champ, exclusif), pour récupération cross-device plus tard. Non bloquant (« Plus tard »).

---

## 4. Routes API (toutes en service role)

```
POST /api/loyalty/scan
  body: { businessId, deviceToken }
  → résout/crée la carte, applique la règle "1 tampon/jour",
    incrémente si éligible, détecte palier atteint & reset.
  → renvoie l'état complet pour le rendu client (voir §5 payload).

POST /api/loyalty/save-contact
  body: { businessId, deviceToken, email? , phone? }   // un seul des deux

POST /api/loyalty/redeem
  body: { businessId, deviceToken, rewardId }
  → crée loyalty_redemptions, marque la récompense consommée.
    Idempotent (un 2e appel ne recrée rien).

-- côté commerçant (authenticated + ownership) --
GET    /api/loyalty/program?businessId        → programme + rewards + stats
POST   /api/loyalty/program                   → create (écran A) / toggle is_active
PUT    /api/loyalty/rewards                   → upsert/delete des paliers (écran B)
GET    /api/loyalty/overview?businessId       → 3 KPIs + dernières redemptions (écran C)
```

### Logique `/scan` (cœur métier)
```
1. card = find_or_create(program, deviceToken)
2. today = date courante (TZ Europe/Paris)
3. alreadyToday = (card.last_stamp_date == today)
4. si NOT alreadyToday ET program.is_active:
     card.stamp_count += 1
     insert loyalty_stamps
     card.last_stamp_date = today
5. tiers triés par threshold. nextTier = premier threshold > stamp_count
   reached = tier dont threshold == stamp_count (palier pile atteint ce scan)
6. si stamp_count == max(threshold):  // dernier palier franchi
     (après que le client ait vu/retiré la récompense) → reset:
     card.stamp_count = 0 ; card.cycle += 1
   NB: faire le reset APRÈS redeem du dernier palier, pas au scan,
       pour que l'écran récompense puisse s'afficher.
7. renvoyer payload (§5)
```

---

## 5. Payload client (ce que `/review/[id]` consomme)

```ts
type LoyaltyState = {
  active: boolean
  businessName: string
  stampCount: number
  rewards: { id: string; threshold: number; label: string }[]
  maxThreshold: number
  justStamped: boolean          // → anime le dernier tampon (écran 1/2)
  alreadyStampedToday: boolean  // → écran 3
  nextReward: { threshold: number; label: string; remaining: number } | null
  pendingReward: {              // → écran 4 (popup) si non null
    id: string; label: string; threshold: number
  } | null
  contactSaved: boolean         // masque l'encart "ne perdez pas vos tampons"
}
```

Règles de rendu :
- `active === false` → n'afficher **aucun** bloc fidélité ; la page reste le parcours d'avis seul (comportement actuel).
- `pendingReward != null` → afficher le **popup plein écran** (écran 4) au-dessus de tout.
- `alreadyStampedToday` → variante « tampon du jour » (écran 3) ; sinon écran 1 (count passe de 0→1) ou écran 2 (count ≥ 2).
- Encart sauvegarde : afficher sur écran 2 si `!contactSaved` ; lien « Plus tard » = dismiss local (sessionStorage).

---

## 6. Arborescence des composants

### Côté client — `app/(public)/review/[id]/`
Le `review-client.tsx` existant reste le **bloc avis**. On ajoute au-dessus un bloc fidélité, dans le même conteneur centré.

```
review/[id]/page.tsx (server)
  └─ fetch LoyaltyState via /api/loyalty/scan (ou direct supabase-admin au SSR)
  └─ <ReviewClientPage business + loyalty? />
       ├─ <LoyaltyCard />          // écran 1/2/3 : header commerce + grille tampons + progression
       │    ├─ <StampGrid stamps rewards count justStamped />
       │    ├─ <ProgressToNext nextReward />
       │    └─ <AlreadyToday />    // variante écran 3
       ├─ <SaveContactCard />      // écran 2 — email|phone + "Sauvegarder" / "Plus tard"
       ├─ <Divider label="et aussi" />
       ├─ (parcours avis existant — INCHANGÉ)
       └─ <RewardPopup pendingReward /> // écran 4 — overlay plein écran
```

### Côté commerçant — nouvel onglet `app/(dashboard)/business/[businessId]/fidelite/`
```
fidelite/page.tsx (client)
  selon l'état du programme :
    ├─ <ActivateLoyalty />     // écran A — empty state + "Créer ma carte de fidélité"
    ├─ <RewardConfig />        // écran B — liste paliers + aperçu live + switch is_active
    │    ├─ <TierRow /> (×n)   // input passages + input label + supprimer
    │    ├─ <AddTierButton />
    │    ├─ <ClientPreview />  // réutilise <StampGrid> en lecture seule
    │    └─ <ActiveToggle />
    └─ <LoyaltyOverview />     // écran C — 3 KPIs + liste redemptions + "Modifier"
         ├─ <KpiCard /> ×3     // réutiliser le pattern KPI du dashboard existant
         └─ <RedemptionList />
```

---

## 7. Détail par écran

### Écran 1 — Premier scan
- Header : logo (placeholder initiales si pas de logo) + nom commerce + sous-titre ville/type.
- Carte : titre « Votre carte de fidélité est créée », grille de tampons, le **1er tampon** avec `.just-added` (pop + glow, cf. keyframes `stampPop`/`stampGlow` dans mockups).
- Paliers visibles : drapeaux sous les positions 5 et 10 + légende listant chaque récompense avec « plus que N ».
- Divider, puis bloc avis.

### Écran 2 — Scan suivant
- Tampon ajouté animé + barre de progression : « Plus que N passages pour votre {récompense} » + compteur `count / threshold`.
- Encart sauvegarde : segment **E-mail / Téléphone** (exclusif, un seul champ), bouton « Sauvegarder », lien discret « Plus tard ». Validation : email OU tel non vide → `POST /save-contact`.
- Puis divider + bloc avis.

### Écran 3 — Déjà scanné aujourd'hui
- Message : « Vous avez déjà votre tampon du jour, à demain ! » (icône horloge).
- Carte + progression (sans animation d'ajout).
- Bloc avis toujours disponible.

### Écran 4 — Palier atteint (popup)
- Overlay **plein écran**, `position:fixed inset-0`, fond assombri+flou. **Pas de fermeture au clic extérieur** (pas de `onClick` de dismiss sur le backdrop ; pas de bouton croix).
- Nom de la récompense en grand + « Montrez cet écran au commerçant ».
- **Horloge live `HH:MM:SS`** qui s'incrémente chaque seconde (`setInterval`), + anneau en rotation continue (`animate-spin`) et point « en direct » clignotant → preuve anti-capture. ⚠️ Même en `prefers-reduced-motion`, **l'horloge doit continuer de défiler** (c'est fonctionnel, pas décoratif) ; seules les rotations/clignotements décoratifs se figent.
- Bouton « J'ai reçu ma récompense » → vue de confirmation inline : « Avez-vous bien montré cet écran au commerçant ? Cette récompense disparaîtra. » → **Annuler** / **Oui**.
- « Oui » → `POST /redeem` → la récompense ne réapparaît plus jamais (vérifié via `loyalty_redemptions`).
- Si c'était le **dernier palier** → au redeem, reset carte (`stamp_count=0`, `cycle++`).

### Écran A — Activation (commerçant)
- Empty state centré : icône, titre « Faites revenir vos clients », explication 2 phrases, bouton **« Créer ma carte de fidélité »** → crée `loyalty_programs` (is_active=false) et bascule sur l'écran B.

### Écran B — Configuration
- Liste de `<TierRow>` : `[nb passages] → [nom récompense]` + bouton supprimer. « Ajouter une récompense » (bouton dashed).
- **Aperçu live** : à droite (desktop) / dessous (mobile), rendu réel de `<StampGrid>` + progression tel que vu sur mobile, mis à jour en direct à chaque frappe.
- **Interrupteur** actif/pause = `is_active`. Sauvegarde auto (debounce) ou bouton « Enregistrer » explicite.
- Validations : threshold entier > 0, unique, label non vide.

### Écran C — Vue d'ensemble
- 3 cartes KPI (réutiliser le style `.kpi` / `useCountUp` du dashboard existant) :
  - **Clients fidélisés** = `count(loyalty_cards)` du programme (ou cartes avec ≥1 tampon).
  - **Passages ce mois-ci** = `count(loyalty_stamps)` sur le mois courant.
  - **Récompenses distribuées** = `count(loyalty_redemptions)`.
- Liste simple des dernières `redemptions` (label + date formatée FR, cf. `formatReviewDateFr`).
- Bouton « Modifier les récompenses » → écran B.

---

## 8. Intégrations dans le code existant

1. **Onglet nav** — `components/dashboard-header.tsx`, dans `navItems` (ligne ~103) ajouter :
   ```ts
   { href: `${base}/fidelite`, label: 'Fidélité' },
   ```
   (La pastille coulissante et le responsive fonctionnent automatiquement.)

2. **Page de scan** — `app/(public)/review/[id]/page.tsx` : charger le `LoyaltyState` et le passer à `ReviewClientPage`. Ne rien changer au flux avis existant (note ≥4 → Google, <4 → `/feedback`).

3. **Comptage de visite** — déclencher `/scan` **au montage** de la page review (la visite = le scan), pas sur une action.

4. **Animations** — réutiliser les keyframes de `globals.css` (`animate-fade-up`, `animate-pulse-glow`, `animate-spin-slow`) ; ajouter `stampPop` / `stampGlow` dans un bloc `<style>` local au composant client (comme `review-client.tsx`).

---

## 9. Points de vigilance / edge cases

- **Anti-fraude tampons** : incrément uniquement côté serveur (service role) ; le client ne fait que lire son état via `device_token`. Règle « 1 tampon / jour » appliquée serveur (TZ Europe/Paris) via `last_stamp_date`.
- **Programme en pause** (`is_active=false`) : le scan n'ajoute pas de tampon ; la page client n'affiche aucun bloc fidélité (parcours avis seul).
- **Édition d'un palier après coup** : les `redemptions` stockent un snapshot (`reward_label`, `threshold`) → l'historique reste correct même si le commerçant renomme/supprime un palier.
- **Reset après dernier palier** : se fait au `redeem` du dernier palier, pas au scan, sinon l'écran 4 ne pourrait pas s'afficher.
- **Récompense déjà retirée** : `/redeem` idempotent ; à la (re)lecture, ne pas reproposer un palier présent dans `loyalty_redemptions` pour le cycle courant.
- **Perte de `localStorage`** (nouveau téléphone, navigation privée) : carte repart de zéro sauf si l'email/tel avait été sauvegardé → prévoir (plus tard) une récupération par contact. L'encart écran 2 sert exactement à ça.
- **Reduced motion** : figer les animations décoratives ; **garder l'horloge live fonctionnelle** (écran 4).
- **Accessibilité** : popup récompense = `role="dialog" aria-modal="true"`, focus trap, cibles ≥ 48px.
