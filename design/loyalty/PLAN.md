# Fidélité — Plan d'implémentation en 7 steps

Feuille de route de la feature **programme de fidélité (tampons)**. Référence
pérenne pour ne pas reperdre le découpage entre deux sessions.

- **Branche :** tout sur `feature/fidelite`. 1 commit (minimum) par step, **push à
  la fin de chaque step**. `main` reste intacte jusqu'au merge final après Step 7.
  **Ne jamais toucher à `main`.**
- **Règle d'or :** le tampon récompense la **VISITE**, jamais l'avis. Aucun lien
  logique ni textuel entre tampon et avis ; blocs toujours séparés (« et aussi »).
- **Design / specs :** `design/loyalty/HANDOFF.md` + maquettes
  `design/loyalty/mockups.html` (écrans client 1–4, commerçant A–C).

---

## Step 1 — Migration 0016 (schéma + RLS) ✅ FAIT
`db/migrations/0016_loyalty.sql`. Tables `loyalty_programs`, `loyalty_rewards`,
`loyalty_cards`, `loyalty_stamps`, `loyalty_redemptions`. Contraintes clés :
`UNIQUE(program_id, device_id)`, `UNIQUE(card_id, stamped_on)` (1 tampon/jour),
`UNIQUE(card_id, reward_id, cycle)` (idempotence récompense). RLS : owner CRUD
sur programs/rewards, owner SELECT-only sur cards/stamps/redemptions, écritures
cards/stamps/redemptions réservées au service role.

## Step 2 — Cookie appareil dans le proxy ✅ FAIT
`proxy.ts` (middleware Next 16 renommé) pose un `device_id` sur `/review/:path*` :
`httpOnly, Secure, SameSite=Lax, 400j`. Côté serveur obligatoirement (survie à
l'ITP Safari 7j ; impossible de `cookies().set()` pendant le rendu d'un Server
Component sous Next 16).

## Step 3 — Logique serveur + Server Actions ✅ FAIT
`lib/loyalty.ts` (service role, jamais importé côté client) : `applyScan`,
`validateReward`, `saveContact`, `recoverCard` + construction de `LoyaltyState`.
Server Actions dans `app/(public)/review/[id]/actions.ts`. Carte + tampon créés
**uniquement** via appel explicite après affichage (jamais au rendu SSR), pour
que les aperçus de lien (WhatsApp/iMessage/robots) ne faussent pas les stats.
Éligibilité paliers : tout `threshold <= stamp_count` non encore obtenu dans le
cycle (pas l'égalité stricte). Reset au redeem du dernier palier.

## Step 4 — Carte client au-dessus du parcours /review ✅ FAIT
`app/(public)/review/[id]/loyalty-section.tsx` : écrans 1 (bienvenue), 2 (passage
+ encart sauvegarde), 3 (déjà tamponné aujourd'hui), 4 (popup récompense avec
horloge live anti-capture). Lien « Vous aviez déjà une carte ? » (récupération).
Le parcours d'avis existant (`review-client.tsx`) **n'est pas modifié**.
- **Correctif encart « Plus tard » :** le refus n'est plus un état local réaffiché
  à chaque visite. On mémorise le `stampCount` au refus dans `localStorage` (clé
  `scanavis_loy_savecard_dismissed_<businessId>`, initialiseur paresseux sûr au
  SSR) ; l'encart n'est reproposé que lorsque `stampCount >= refus + 3`.

## Step 5 — Dashboard commerçant (onglet « Fidélité ») ✅ FAIT
Onglet « Fidélité » dans `components/dashboard-header.tsx` + page
`app/(dashboard)/business/[businessId]/fidelite/page.tsx`. 100 % côté client via
le client supabase authentifié (pattern `/parrainage`) : la RLS autorise l'owner
à CRUD programme+paliers et à lire cartes/tampons/récompenses. Aucune écriture
cards/stamps/redemptions ici.
- **Écran A — Activation :** empty state + « Créer ma carte de fidélité »
  (crée `loyalty_programs`, `is_active=false`).
- **Écran B — Configuration :** paliers (nb passages → récompense) add/edit/delete,
  aperçu client en direct, interrupteur actif/pause. L'enregistrement diffe les
  paliers (suppressions/màj/insertions) en **préservant les `reward_id`** existants
  (ne pas casser l'idempotence des redemptions en attente). Validation côté client
  **avant** tout appel DB : nom requis, passages entier > 0, pas de doublon de
  seuil — messages clairs en français, jamais d'erreur technique (filet de
  sécurité sur les codes Postgres 23505/23514 dans le `catch`).
- **Écran C — Vue d'ensemble :** 3 KPIs (clients fidélisés, passages ce mois-ci,
  récompenses distribuées) + liste des dernières récompenses distribuées.

## Step 6 — Paragraphe page de confidentialité ✅ FAIT
`app/(public)/confidentialite/page.tsx` : sous-section « 2.6 Programme de fidélité »
(identifiant d'appareil via cookie technique, nombre de passages, email/tél
**facultatifs** uniquement pour retrouver la carte, jamais revendus ni
publicitaires) + section 5 Cookies complétée (2e cookie strictement nécessaire :
l'identifiant d'appareil de la carte). Date de mise à jour bumpée.

## Step 7 — Tests de tous les cas ✅ FAIT
Harnais de test dans `scripts/loy-test/` (exécute la **vraie** `lib/loyalty.ts`
contre la base, sur des commerces de test jetables préfixés `ZZZ_TEST_LOYALTY`,
tous supprimés en fin de run ; « le lendemain » simulé en reculant les dates en
base). Lancement :
`node --import ./scripts/loy-test/preload.mjs scripts/loy-test/run.ts`
Résultat : **21/21 cas de logique OK**. Cas « aperçu de lien » vérifié
empiriquement via le serveur dev (`linkpreview.ts`) : un GET serveur ne crée
aucune carte. Cas UI (« Plus tard » 3 passages, messages écran B) vérifiés par
inspection de code (logique 100 % client, déjà implémentée).

Vérifier et rapporter (checklist) :
- 2 scans le même jour → 1 seul tampon ; lendemain → +1.
- Palier atteint → popup → validation → ne revient plus.
- Dernier palier validé → reset carte (`stamp_count=0`, `cycle++`).
- Palier baissé sous le `stamp_count` actuel → récompense déclenchée au tampon
  suivant + reset OK.
- Suppression d'un palier : jamais bloquée, historique gardé, récompense en
  attente conservée & validable.
- Programme en pause → page d'avis normale, sans carte.
- Sauvegarde email/tél puis récupération sur un autre navigateur ; récupération
  quand l'appareil courant a déjà une carte du jour (ni perte ni gain de tampon).
- Aperçus de lien (WhatsApp/iMessage/robots) ne créent **pas** de carte.
- Parcours d'avis inchangé.
- Encart « Plus tard » : masqué puis reproposé 3 passages plus tard.
- Écran B : doublon / 0 / vide → message FR clair, jamais d'erreur technique.

---

## État actuel
Steps 1 → 7 **tous faits**, fusionnés et poussés sur `main` (projet pas encore
lancé → plus de branche de feature ; commit/push direct sur `main`). Reste
éventuellement une passe manuelle en navigateur pour les 2 cas purement visuels
(encart « Plus tard », messages de l'écran B).
