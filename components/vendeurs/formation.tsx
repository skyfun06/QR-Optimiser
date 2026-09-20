'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// Formation vendeur : premier plan du dashboard tant que le vendeur est en
// "formation". Contenu statique (modules dépliables) pour apprendre à présenter
// et vendre ScanAvis, suivi d'un test (à venir) qui validera le passage en actif.

type Module = { titre: string; points: string[] }

const MODULES: Module[] = [
  {
    titre: 'ScanAvis en une phrase',
    points: [
      'ScanAvis transforme les clients satisfaits d’un commerce en avis Google, grâce à un simple QR code.',
      'Les clients mécontents, eux, sont redirigés vers un formulaire privé : le commerçant récupère le retour sans avis négatif public.',
      'Ton rôle : faire comprendre en 30 secondes ce gain concret au commerçant.',
    ],
  },
  {
    titre: 'Le problème que ça résout',
    points: [
      '9 clients satisfaits sur 10 ne laissent jamais d’avis spontanément.',
      'Sans avis récents, un commerce remonte moins bien sur Google et inspire moins confiance.',
      'Les avis négatifs, eux, arrivent tout seuls : le déséquilibre fait mal à la réputation.',
    ],
  },
  {
    titre: 'Comment ça marche (démo)',
    points: [
      'Le client scanne le QR code posé en caisse ou sur la table.',
      'Content → il est envoyé directement sur la page d’avis Google du commerce.',
      'Pas content → il tombe sur un formulaire privé ; le commerçant est alerté et peut réagir.',
      'Le commerçant suit tout depuis son tableau de bord (avis, scans, retours).',
    ],
  },
  {
    titre: 'L’offre et le prix',
    points: [
      'Deux formules : QR seul, ou QR + carte NFC (le client paie en approchant son téléphone du support).',
      'Un essai est proposé avant le premier paiement réel.',
      'Un abonnement mensuel simple, sans engagement lourd.',
      'Reste factuel sur le prix : la valeur (plus d’avis, meilleure réputation) justifie le coût.',
    ],
  },
  {
    titre: 'À qui vendre en priorité',
    points: [
      'Restaurants, bars, coiffeurs, instituts, garages, cavistes… tout commerce de proximité qui vit de sa réputation locale.',
      'Cible ceux qui ont peu d’avis ou une note fragile : le besoin est évident.',
      'Le bon interlocuteur est le gérant / propriétaire, pas un employé de passage.',
    ],
  },
  {
    titre: 'Répondre aux objections',
    points: [
      '« C’est trop cher » → combien vaut un nouveau client par mois ? Un seul avis peut le ramener.',
      '« J’ai pas le temps » → l’installation prend 2 minutes, tout est automatique ensuite.',
      '« Les gens ne scanneront pas » → le QR est mis au bon moment (fin de repas, encaissement), quand le client est satisfait.',
      '« J’ai déjà des avis » → justement, il faut les entretenir : Google valorise la fraîcheur.',
    ],
  },
  {
    titre: 'Conclure la vente',
    points: [
      'Résume le bénéfice, propose l’essai, et accompagne le commerçant à l’inscription.',
      'Ton code personnel est saisi à l’inscription du commerce : c’est lui qui t’attribue la vente et déclenche tes commissions.',
      'Tu retrouves chaque commerce signé et l’état de tes versements sur ton espace.',
    ],
  },
]

function ModuleItem({ mod, index }: { mod: Module; index: number }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <div className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#221c10] text-gold text-sm font-bold">
            {index + 1}
          </span>
          <span className="font-semibold text-white">{mod.titre}</span>
        </span>
        <span className={`text-[#8c8c8c] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-2 px-4 pb-4 pl-14">
          {mod.points.map((p, i) => (
            <li key={i} className="text-sm text-[#c7c7c7] leading-relaxed list-disc">
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function VendeurFormation({ prenom }: { prenom?: string | null }) {
  async function logout() {
    await supabase.auth.signOut()
    window.location.assign('/rejoindre/connexion')
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-5 animate-fade-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-white">
          {prenom ? `Bienvenue ${prenom}` : 'Bienvenue'}
        </h1>
        <p className="text-sm text-[#8c8c8c] leading-relaxed">
          Ta candidature est validée. Avant de te lancer, suis la formation ci-dessous : elle te
          donne tout pour présenter et vendre ScanAvis avec assurance.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {MODULES.map((mod, i) => (
          <ModuleItem key={mod.titre} mod={mod} index={i} />
        ))}
      </div>

      {/* Test de validation — à venir (forme définie plus tard). */}
      <div className="flex flex-col gap-3 p-5 bg-[#171717] border border-[#292929] rounded-2xl">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-white">Test de validation</h2>
          <p className="text-sm text-[#8c8c8c] leading-relaxed">
            Une fois la formation assimilée, tu passeras un court test pour valider tes
            connaissances. Réussi, il débloque ton statut de vendeur actif et ton code personnel.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="min-h-[46px] rounded-xl bg-[#292929] text-[#6a6a6a] text-sm font-semibold cursor-not-allowed"
        >
          Bientôt disponible
        </button>
      </div>

      <button
        type="button"
        onClick={logout}
        className="min-h-[44px] text-sm text-[#8c8c8c] hover:text-white transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  )
}
