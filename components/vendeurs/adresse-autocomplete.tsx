'use client'

import { useEffect, useId, useRef, useState } from 'react'

// Champ adresse avec suggestions de la Base Adresse Nationale
// (api-adresse.data.gouv.fr : gratuite, sans clé, appelable depuis le
// navigateur). Seule une suggestion choisie est valide : on connaît alors la
// position exacte, la ville et le code postal.

export type AdresseChoisie = {
  label: string
  ville: string
  codePostal: string
  lat: number
  lng: number
}

type Feature = {
  geometry: { coordinates: [number, number] }
  properties: { label: string; city: string; postcode: string }
}

export function AdresseAutocomplete({
  value,
  onChange,
  className,
}: {
  value: AdresseChoisie | null
  onChange: (adresse: AdresseChoisie | null) => void
  className: string
}) {
  const [saisie, setSaisie] = useState(value?.label ?? '')
  const [suggestions, setSuggestions] = useState<AdresseChoisie[]>([])
  const [ouvert, setOuvert] = useState(false)
  const conteneurRef = useRef<HTMLDivElement | null>(null)
  const listeId = useId()

  useEffect(() => {
    const q = saisie.trim()
    if (q.length < 4 || value?.label === saisie) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`
        const res = await fetch(url, { signal: ctrl.signal })
        const data = (await res.json()) as { features?: Feature[] }
        setSuggestions(
          (data.features ?? []).map((f) => ({
            label: f.properties.label,
            ville: f.properties.city,
            codePostal: f.properties.postcode,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
          }))
        )
        setOuvert(true)
      } catch {
        // Service indisponible ou requête annulée : pas de suggestion.
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [saisie, value?.label])

  // Ferme la liste au clic en dehors.
  useEffect(() => {
    function fermer(e: MouseEvent) {
      if (!conteneurRef.current?.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', fermer)
    return () => document.removeEventListener('mousedown', fermer)
  }, [])

  const enAttente = saisie.trim().length >= 4 && !value

  return (
    <div ref={conteneurRef} className="relative">
      <input
        type="text"
        autoComplete="off"
        placeholder="12 rue de la République, Antibes"
        value={saisie}
        onChange={(e) => {
          setSaisie(e.target.value)
          if (value) onChange(null)
        }}
        onFocus={() => suggestions.length > 0 && !value && setOuvert(true)}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={ouvert}
        aria-controls={listeId}
        className={className}
      />
      {ouvert && suggestions.length > 0 && !value && (
        <ul
          id={listeId}
          role="listbox"
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-[#3a3a3a] bg-[#1d1d1d] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)]"
        >
          {suggestions.map((s) => (
            <li key={`${s.label}-${s.lat}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onChange(s)
                  setSaisie(s.label)
                  setOuvert(false)
                }}
                className="w-full min-h-[44px] px-4 py-2.5 text-left text-sm text-[#e5e5e5] hover:bg-[#262626] transition-colors"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className={`mt-1.5 text-[11px] ${enAttente ? 'text-[#e0a35a]' : 'text-[#6a6a6a]'}`}>
        {value
          ? '✓ Adresse trouvée. Elle sert uniquement à te placer sur ta carte de prospection.'
          : enAttente
            ? 'Choisis ton adresse dans la liste.'
            : 'Elle sert uniquement à te placer sur ta carte de prospection.'}
      </p>
    </div>
  )
}
