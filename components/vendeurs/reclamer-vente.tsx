'use client'

import { useState } from 'react'

// Formulaire court de réclamation d'une vente : un vendeur a démarché un commerce
// qui s'est inscrit sans son code. L'admin tranchera. Mobile-first.

const inputClass =
  'w-full min-h-[48px] bg-[#0f0f0f] border border-[#292929] px-4 py-3 rounded-xl text-[15px] text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all duration-200'

export function ReclamerVenteForm({ onClose }: { onClose: (reload?: boolean) => void }) {
  const [businessNom, setBusinessNom] = useState('')
  const [ville, setVille] = useState('')
  const [dateVisite, setDateVisite] = useState('')
  const [explication, setExplication] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const canSubmit = businessNom.trim().length > 1 && explication.trim().length > 4

  async function handleSubmit() {
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vendeur/reclamer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessNom: businessNom.trim(),
          ville: ville.trim(),
          dateVisite: dateVisite.trim(),
          explication: explication.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Impossible d'envoyer ta réclamation.")
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col gap-5 animate-fade-up">
        <div className="flex flex-col items-center gap-4 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#221c10] text-gold">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold text-white">Réclamation envoyée</h1>
            <p className="text-sm text-[#c7c7c7] leading-relaxed">
              <span className="font-semibold text-white">{businessNom.trim()}</span> apparaît dans ta
              liste avec le statut « en cours d’examen ». On vérifie et on te répond ici.
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
        <h1 className="text-2xl font-bold text-white">Réclamer une vente</h1>
        <p className="text-sm text-[#8c8c8c] leading-relaxed">
          Tu as démarché un commerce qui s’est inscrit sans ton code ? Décris-le, on vérifie et on te
          le rattache si tout concorde.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Nom du commerce</label>
          <input
            type="text"
            value={businessNom}
            onChange={(e) => setBusinessNom(e.target.value)}
            placeholder="Ex : Boulangerie Martin"
            maxLength={200}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Ville</label>
          <input
            type="text"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Ex : Lyon"
            maxLength={200}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Date approximative de ta visite</label>
          <input
            type="date"
            value={dateVisite}
            onChange={(e) => setDateVisite(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Explique en quelques mots</label>
          <textarea
            value={explication}
            onChange={(e) => setExplication(e.target.value)}
            placeholder="Qui tu as vu, ce que vous vous êtes dit, pourquoi c'est bien toi qui l'as démarché…"
            rows={4}
            maxLength={5000}
            className={`${inputClass} min-h-[112px] resize-y`}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full min-h-[52px] rounded-2xl bg-gold text-[#12100e] text-[15px] font-bold active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Envoi…' : 'Envoyer ma réclamation'}
      </button>
    </div>
  )
}
