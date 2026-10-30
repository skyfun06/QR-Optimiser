'use client'

import { useMemo, useState, useTransition } from 'react'
import { SuccessScreen } from '@/components/state-screen'
import type { BusinessOption } from '@/lib/plaques-admin'
import { activatePlaqueAction } from './actions'

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function formatDateFr(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Écran d'activation (admin uniquement) : on scanne la plaque chez le
 * commerçant, on choisit son commerce, on confirme. La plaque redirige ensuite
 * immédiatement vers la page d'avis de ce commerce.
 */
export default function ActivationClient({
  code,
  numero,
  businesses,
}: {
  code: string
  numero: number
  businesses: BusinessOption[]
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<BusinessOption | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<BusinessOption | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return businesses
    return businesses.filter((b) => normalize(`${b.name} ${b.email}`).includes(q))
  }, [businesses, query])

  function confirm() {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const res = await activatePlaqueAction(code, selected.id)
      if (res.ok) setDone(selected)
      else setError(res.error)
    })
  }

  if (done) {
    return (
      <SuccessScreen
        title={`Plaque n°${numero} activée`}
        message={<>Elle redirige maintenant vers <span className="text-white">{done.name}</span>. Scannez-la à nouveau pour vérifier.</>}
        action={{ label: 'Tester la plaque', href: `/p/${code}` }}
        secondaryAction={{ label: 'Voir toutes les plaques', href: '/admin/plaques' }}
      />
    )
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-widest text-gold">Activation de plaque</p>
          <h1 className="text-2xl font-bold text-white">Plaque n°{numero}</h1>
          <p className="text-sm text-[#8c8c8c]">Code {code} — choisissez le commerce à lier.</p>
        </div>

        {selected ? (
          <div className="bg-[#171717] border border-[#292929] rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sm text-[#8c8c8c]">Lier la plaque n°{numero} à :</p>
            <div>
              <p className="text-lg font-semibold text-white">{selected.name}</p>
              <p className="text-sm text-[#8c8c8c] break-all">{selected.email}</p>
            </div>
            {error && <p className="text-sm text-[#ef4343]">{error}</p>}
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="w-full min-h-[48px] bg-gold text-[#12100e] font-semibold rounded-2xl py-3 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? 'Activation…' : 'Confirmer l’activation'}
            </button>
            <button
              type="button"
              onClick={() => { setSelected(null); setError(null) }}
              disabled={pending}
              className="w-full min-h-[44px] text-sm text-[#8c8c8c] hover:text-white transition-colors"
            >
              Choisir un autre commerce
            </button>
          </div>
        ) : (
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un commerce ou un email…"
              className="w-full min-h-[48px] bg-[#171717] border border-[#292929] rounded-2xl px-4 text-white placeholder:text-[#5c5c5c] focus:outline-none focus:border-gold"
            />
            <ul className="flex flex-col gap-2">
              {filtered.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(b)}
                    className="w-full text-left bg-[#171717] border border-[#292929] rounded-2xl px-4 py-3 hover:border-gold transition-colors"
                  >
                    <p className="font-semibold text-white">{b.name}</p>
                    <p className="text-xs text-[#8c8c8c] break-all">
                      {b.email}{b.createdAt ? ` · créé le ${formatDateFr(b.createdAt)}` : ''}
                    </p>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="text-sm text-[#8c8c8c] text-center py-6">Aucun commerce trouvé.</li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
