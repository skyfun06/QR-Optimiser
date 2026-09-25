'use client'

import { useState } from 'react'
import { FORMULES, type Formule } from '@/lib/vendeur-commerce'

// Formulaire court d'inscription d'un commerce, utilisable debout sur mobile.
// À la validation : le commerce est créé côté serveur, rattaché au vendeur, et
// un email de finalisation part au patron. Écran de confirmation ensuite.

const inputClass =
  'w-full min-h-[48px] bg-[#0f0f0f] border border-[#292929] px-4 py-3 rounded-xl text-[15px] text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all duration-200'

const FORMULE_ORDER: Formule[] = ['qr', 'qr_nfc']

export function InscrireCommerceForm({ onClose }: { onClose: (reload?: boolean) => void }) {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [formule, setFormule] = useState<Formule>('qr')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ emailSent: boolean } | null>(null)

  const canSubmit = businessName.trim().length > 1 && email.trim().length > 3 && telephone.trim().length > 4

  async function handleSubmit() {
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vendeur/inscrire-commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          email: email.trim(),
          telephone: telephone.trim(),
          formule,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? "Impossible d'inscrire le commerce.")
      }
      setDone({ emailSent: !!data.emailSent })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      setLoading(false)
    }
  }

  // ── Écran de confirmation ────────────────────────────────────────────────
  if (done) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col gap-5 animate-fade-up">
        <div className="flex flex-col items-center gap-4 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#12190f] text-emerald-300">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold text-white">Commerce inscrit !</h1>
            <p className="text-sm text-[#c7c7c7] leading-relaxed">
              <span className="font-semibold text-white">{businessName.trim()}</span> apparaît dans ta
              liste avec le statut « en attente de paiement ».
            </p>
            <p className="text-sm text-[#8c8c8c] leading-relaxed">
              {done.emailSent
                ? 'Le patron reçoit un email pour créer son mot de passe et payer son abonnement. Ta commission se débloque dès qu’il a payé.'
                : "Le commerce est bien créé, mais l'email au patron n'a pas pu partir. Préviens l'équipe pour qu'il soit renvoyé."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(true)}
            className="w-full min-h-[48px] rounded-xl bg-gold text-[#12100e] text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    )
  }

  // ── Formulaire ───────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 animate-fade-up">
      <button
        type="button"
        onClick={() => onClose(false)}
        className="self-start min-h-[44px] inline-flex items-center gap-1.5 text-sm text-[#8c8c8c] hover:text-white transition-colors"
      >
        ← Annuler
      </button>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Inscrire un commerce</h1>
        <p className="text-sm text-[#8c8c8c] leading-relaxed">
          Renseigne le commerce et son patron. Il recevra un email pour payer et activer son
          abonnement — ta commission part de là.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Nom du commerce</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex : Boulangerie Martin"
            maxLength={200}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Email du patron</label>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="patron@commerce.fr"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Téléphone</label>
          <input
            type="tel"
            inputMode="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="06 12 34 56 78"
            maxLength={40}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#8c8c8c]">Formule choisie</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FORMULE_ORDER.map((f) => {
              const selected = formule === f
              const info = FORMULES[f]
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormule(f)}
                  aria-pressed={selected}
                  className={[
                    'flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all min-h-[64px]',
                    selected
                      ? 'border-gold bg-[#221c10] shadow-[0_8px_24px_-14px_rgba(201,151,58,0.6)]'
                      : 'border-[#292929] bg-[#0f0f0f] hover:border-[#4a4033]',
                  ].join(' ')}
                >
                  <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-[#e5e5e5]'}`}>
                    {info.label}
                  </span>
                  <span className={`text-sm ${selected ? 'text-gold' : 'text-[#8c8c8c]'}`}>
                    {info.prixMensuel} €/mois
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full min-h-[52px] rounded-2xl bg-gold text-[#12100e] text-[15px] font-bold active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Inscription…' : 'Inscrire le commerce'}
      </button>
    </div>
  )
}
