'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type * as LeafletNS from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import {
  PROSPECT_STATUTS,
  RAYON_MAX_KM,
  RAYON_MIN_KM,
  RAYON_DEFAULT_KM,
  isProspectStatut,
  statutColor,
  statutLabel,
  type Prospect,
  type ProspectStatut,
  type ProspectionSettings,
} from '@/lib/vendeur-prospection'

// Onglet « Prospection » : la liste des commerces à démarcher autour du vendeur.
// 100 % mobile-first (utilisé debout, dans la rue, d'une seule main).
//
// L'appel à Google (coûteux, à ma charge) ne part JAMAIS d'ici : ce composant
// lit la base via GET /api/vendeur/prospection, et ne déclenche un appel
// qu'en POSTant « Actualiser » — le serveur applique le plafond d'un appel
// toutes les 24h. Tant que la clé Google n'est pas configurée, on affiche un
// message clair sans rien casser du reste de l'espace vendeur.

type ApiPayload = {
  apiConfigured: boolean
  settings: ProspectionSettings
  prospects: Prospect[]
  nextRefreshAt: string | null
  error?: string
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; OpenStreetMap, &copy; CARTO'

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`
  return `${(m / 1000).toFixed(1)} km`.replace('.', ',')
}

/** « Disponible dans 5 h 12 » à partir d'une date ISO future. */
function formatCountdown(targetIso: string, now: number): string {
  const diff = new Date(targetIso).getTime() - now
  if (diff <= 0) return ''
  const h = Math.floor(diff / 3_600_000)
  const min = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h} h${min > 0 ? ` ${min} min` : ''}`
  return `${Math.max(1, min)} min`
}

/** SVG d'un repère en forme de goutte, coloré selon le statut. */
function pinHtml(color: string, selected: boolean): string {
  const scale = selected ? 1.25 : 1
  const ring = selected
    ? `box-shadow:0 0 0 3px rgba(201,151,58,0.35);border-radius:50%;`
    : ''
  return `<div style="transform:translateZ(0) scale(${scale});transform-origin:bottom center;${ring}">
    <svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 4px rgba(0,0,0,0.6))">
      <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20 12 32 12 32s12-12 12-20.1C24 5.3 18.6 0 12 0z" fill="${color}" stroke="#0d0d0d" stroke-width="1.5"/>
      <circle cx="12" cy="11.5" r="4" fill="#0d0d0d" fill-opacity="0.45"/>
    </svg>
  </div>`
}

export function VendeurProspection() {
  const [loading, setLoading] = useState(true)
  const [apiConfigured, setApiConfigured] = useState(true)
  const [settings, setSettings] = useState<ProspectionSettings | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [nextRefreshAt, setNextRefreshAt] = useState<string | null>(null)

  const [adresse, setAdresse] = useState('')
  const [rayon, setRayon] = useState<number>(RAYON_DEFAULT_KM)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Leaflet (chargé dynamiquement, jamais côté serveur).
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const LRef = useRef<typeof LeafletNS | null>(null)
  const mapRef = useRef<LeafletNS.Map | null>(null)
  const markersRef = useRef<Map<string, LeafletNS.Marker>>(new Map())
  const youRef = useRef<LeafletNS.Marker | null>(null)
  const circleRef = useRef<LeafletNS.Circle | null>(null)

  // Horloge basse fréquence : rafraîchit le compte à rebours du plafond 24h.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // -------- Chargement initial (lecture base, aucun appel Google). --------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/vendeur/prospection', { cache: 'no-store' })
        const data = (await res.json()) as ApiPayload
        if (cancelled) return
        if (!res.ok) {
          setApiConfigured(true)
          setMessage({ kind: 'error', text: data.error ?? 'Chargement impossible.' })
          return
        }
        setApiConfigured(data.apiConfigured)
        setSettings(data.settings)
        setProspects(data.prospects ?? [])
        setNextRefreshAt(data.nextRefreshAt)
        if (data.settings?.adresse) setAdresse(data.settings.adresse)
        if (data.settings?.rayon_km) setRayon(data.settings.rayon_km)
      } catch {
        if (!cancelled) setMessage({ kind: 'error', text: 'Chargement impossible pour l’instant.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // -------- Initialisation / recentrage de la carte. --------
  useEffect(() => {
    if (!apiConfigured) return
    const lat = settings?.lat
    const lng = settings?.lng
    if (lat == null || lng == null) return
    let cancelled = false

    ;(async () => {
      let L = LRef.current
      if (!L) {
        const mod = await import('leaflet')
        // Interop CJS/ESM : selon le bundler, l'objet Leaflet est sur `default`
        // ou directement sur le namespace.
        L = ((mod as unknown as { default?: typeof LeafletNS }).default ?? mod) as typeof LeafletNS
      }
      if (cancelled) return
      LRef.current = L
      const container = mapContainerRef.current
      if (!container) return

      if (!mapRef.current) {
        const map = L.map(container, {
          center: [lat, lng],
          zoom: 14,
          zoomControl: false,
          attributionControl: true,
        })
        L.tileLayer(TILE_URL, { subdomains: 'abcd', maxZoom: 20, attribution: TILE_ATTR }).addTo(map)
        L.control.zoom({ position: 'bottomright' }).addTo(map)
        mapRef.current = map
        setTimeout(() => map.invalidateSize(), 0)
      } else {
        mapRef.current.setView([lat, lng], mapRef.current.getZoom())
      }

      const map = mapRef.current!
      // Repère « Toi » (centre de recherche).
      const youIcon = L.divIcon({
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#C9973A;border:2px solid #0d0d0d;box-shadow:0 0 0 4px rgba(201,151,58,0.3)"></div>`,
      })
      if (youRef.current) youRef.current.setLatLng([lat, lng])
      else youRef.current = L.marker([lat, lng], { icon: youIcon, interactive: false, zIndexOffset: -500 }).addTo(map)

      // Cercle du rayon.
      const radius = (settings?.rayon_km ?? RAYON_DEFAULT_KM) * 1000
      if (circleRef.current) {
        circleRef.current.setLatLng([lat, lng])
        circleRef.current.setRadius(radius)
      } else {
        circleRef.current = L.circle([lat, lng], {
          radius,
          color: '#C9973A',
          weight: 1,
          opacity: 0.5,
          fillColor: '#C9973A',
          fillOpacity: 0.05,
        }).addTo(map)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiConfigured, settings?.lat, settings?.lng, settings?.rayon_km])

  // Nettoyage de la carte au démontage de l'onglet.
  useEffect(() => {
    // La Map des repères a une identité stable (jamais réassignée) : on la
    // capture pour la vider proprement au démontage.
    const markers = markersRef.current
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markers.clear()
      youRef.current = null
      circleRef.current = null
    }
  }, [])

  const focusProspect = useCallback((p: Prospect) => {
    setSelectedId(p.id)
    const map = mapRef.current
    if (map) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 15), { animate: true })
  }, [])

  // -------- (Re)construction des repères commerces. --------
  useEffect(() => {
    const L = LRef.current
    const map = mapRef.current
    if (!L || !map) return

    const existing = markersRef.current
    const seen = new Set<string>()

    for (const p of prospects) {
      seen.add(p.id)
      const icon = L.divIcon({
        className: '',
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        html: pinHtml(statutColor(p.statut), p.id === selectedId),
      })
      const current = existing.get(p.id)
      if (current) {
        current.setLatLng([p.lat, p.lng])
        current.setIcon(icon)
      } else {
        const marker = L.marker([p.lat, p.lng], { icon }).addTo(map)
        marker.on('click', () => focusProspect(p))
        existing.set(p.id, marker)
      }
    }
    // Retire les repères qui ne sont plus dans la liste.
    for (const [id, marker] of existing) {
      if (!seen.has(id)) {
        marker.remove()
        existing.delete(id)
      }
    }
  }, [prospects, selectedId, focusProspect])

  // -------- « Actualiser » : seul déclencheur d'un appel Google. --------
  async function handleRefresh() {
    if (refreshing) return
    const adresseTrim = adresse.trim()
    if (!adresseTrim) {
      setMessage({ kind: 'error', text: 'Saisis une adresse pour chercher autour de toi.' })
      return
    }
    setRefreshing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/vendeur/prospection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adresse: adresseTrim, rayon }),
      })
      const data = (await res.json()) as ApiPayload
      if (!res.ok) {
        if (typeof data.nextRefreshAt === 'string') setNextRefreshAt(data.nextRefreshAt)
        setMessage({ kind: 'error', text: data.error ?? 'Actualisation impossible.' })
        return
      }
      setSettings(data.settings)
      setProspects(data.prospects ?? [])
      setNextRefreshAt(data.nextRefreshAt)
      setSelectedId(null)
      if (data.settings?.adresse) setAdresse(data.settings.adresse)
      const n = (data.prospects ?? []).length
      setMessage({
        kind: 'info',
        text:
          n === 0
            ? 'Aucun commerce à démarcher trouvé dans ce secteur.'
            : `${n} commerce${n > 1 ? 's' : ''} à démarcher mis à jour.`,
      })
    } catch {
      setMessage({ kind: 'error', text: 'Actualisation impossible pour l’instant.' })
    } finally {
      setRefreshing(false)
    }
  }

  // -------- Changement de statut d'un prospect (direct en base, RLS). --------
  async function changerStatut(p: Prospect, statut: ProspectStatut) {
    if (!isProspectStatut(statut) || p.statut === statut) return
    const previous = p.statut
    setProspects((list) => list.map((x) => (x.id === p.id ? { ...x, statut } : x)))
    const { error } = await supabase.from('vendeur_prospects').update({ statut }).eq('id', p.id)
    if (error) {
      // Rollback : on remet l'ancien statut et on prévient.
      setProspects((list) => list.map((x) => (x.id === p.id ? { ...x, statut: previous } : x)))
      setMessage({ kind: 'error', text: 'Changement de statut impossible. Réessaie.' })
    }
  }

  const blockedUntil = nextRefreshAt && new Date(nextRefreshAt).getTime() > now ? nextRefreshAt : null
  const selected = prospects.find((p) => p.id === selectedId) ?? null
  const hasCenter = settings?.lat != null && settings?.lng != null

  // -------- Rendus d'état. --------
  if (loading) {
    return <p className="text-sm text-[#8c8c8c] px-1">Chargement…</p>
  }

  if (!apiConfigured) {
    return (
      <div className="px-1 pt-2">
        <div className="flex flex-col items-center gap-4 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#221c10] text-gold">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">La prospection arrive bientôt</h2>
            <p className="mt-2 text-sm text-[#8c8c8c] leading-relaxed">
              La recherche des commerces autour de toi n’est pas encore activée sur ton
              espace. Reviens très vite — tes autres outils restent disponibles.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-1 pt-2 flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">Prospection</h2>
        <p className="text-sm text-[#8c8c8c]">
          Les commerces à démarcher autour de toi — ceux mal notés ou avec peu d’avis.
        </p>
      </header>

      {/* ── Formulaire adresse + rayon ── */}
      <section className="flex flex-col gap-3 p-4 bg-[#171717] border border-[#292929] rounded-2xl">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[#8c8c8c]">Adresse de départ</span>
          <input
            type="text"
            inputMode="text"
            autoComplete="street-address"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="12 rue de la Paix, Paris"
            className="min-h-[48px] px-4 rounded-xl bg-[#0f0f0f] border border-[#292929] text-white text-sm
                       placeholder:text-[#5a5a5a] focus:border-gold focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8c8c8c]">Rayon</span>
            <span className="text-sm font-semibold text-gold">{rayon} km</span>
          </div>
          <input
            type="range"
            min={RAYON_MIN_KM}
            max={RAYON_MAX_KM}
            step={1}
            value={rayon}
            onChange={(e) => setRayon(Number(e.target.value))}
            className="w-full accent-[#C9973A] h-11"
            aria-label="Rayon de recherche en kilomètres"
          />
          <div className="flex justify-between text-[10px] text-[#5a5a5a]">
            <span>{RAYON_MIN_KM} km</span>
            <span>{RAYON_MAX_KM} km</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || !!blockedUntil}
          className="min-h-[48px] px-5 rounded-2xl bg-gold text-[#12100e] text-sm font-semibold
                     active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100
                     flex items-center justify-center gap-2"
        >
          {refreshing ? (
            'Recherche en cours…'
          ) : blockedUntil ? (
            `Disponible dans ${formatCountdown(blockedUntil, now)}`
          ) : (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              Actualiser
            </>
          )}
        </button>
        <p className="text-[11px] text-[#5a5a5a] leading-relaxed">
          Pour limiter les coûts, la recherche Google n’est possible qu’une fois toutes
          les 24 h. Vérifie bien ton adresse avant d’actualiser.
        </p>
      </section>

      {message && (
        <p
          className={`text-sm px-4 py-3 rounded-xl border ${
            message.kind === 'error'
              ? 'text-[#ff9b8a] bg-[#2a1512] border-[#5a2a22]'
              : 'text-[#9fe0b4] bg-[#13231a] border-[#285038]'
          }`}
        >
          {message.text}
        </p>
      )}

      {/* ── Carte ── */}
      {hasCenter ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#292929]">
          <div ref={mapContainerRef} className="h-[46vh] min-h-[300px] w-full bg-[#0f0f0f]" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 60px 10px rgba(0,0,0,0.55)' }}
          />
          {/* Bouton recentrer */}
          <button
            type="button"
            onClick={() => {
              const map = mapRef.current
              if (map && settings?.lat != null && settings?.lng != null) {
                map.setView([settings.lat, settings.lng], 14, { animate: true })
              }
            }}
            aria-label="Recentrer la carte"
            className="absolute top-3 right-3 z-[500] w-10 h-10 flex items-center justify-center rounded-full
                       bg-[#171717]/90 border border-[#333] backdrop-blur active:scale-95 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center">
          <p className="text-sm text-[#8c8c8c]">
            Saisis ton adresse puis touche « Actualiser » pour découvrir les commerces
            autour de toi.
          </p>
        </div>
      )}

      {/* ── Légende des statuts ── */}
      {prospects.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
          {PROSPECT_STATUTS.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-[11px] text-[#8c8c8c]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Liste triée par distance ── */}
      {prospects.length > 0 && (
        <ul className="flex flex-col gap-2">
          {prospects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => focusProspect(p)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl bg-[#171717] border text-left
                            active:scale-[0.99] transition-all ${
                              p.id === selectedId ? 'border-gold' : 'border-[#292929] hover:border-[#3a3a3a]'
                            }`}
              >
                <span
                  className="shrink-0 w-2.5 h-2.5 rounded-full mt-1 self-start"
                  style={{ background: statutColor(p.statut) }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white truncate">{p.nom}</span>
                  <span className="block text-xs text-[#8c8c8c] mt-0.5">
                    {p.note != null ? `★ ${p.note.toFixed(1).replace('.', ',')}` : 'Aucun avis'}
                    {' · '}
                    {p.nb_avis} avis
                  </span>
                </span>
                <span className="shrink-0 text-xs text-[#8c8c8c] tabular-nums">
                  {formatDistance(p.distance_m)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Fiche (bottom-sheet) ── */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setSelectedId(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#171717] border-t border-[#292929]
                       p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)]"
            style={{ animation: 'sa-sheet-up 0.28s cubic-bezier(.22,1,.36,1) both' }}
          >
            <style>{`@keyframes sa-sheet-up{from{transform:translateY(100%)}to{transform:none}}`}</style>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#3a3a3a]" aria-hidden />

            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-white leading-snug">{selected.nom}</h3>
              <span
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border"
                style={{ color: statutColor(selected.statut), borderColor: `${statutColor(selected.statut)}55` }}
              >
                {statutLabel(selected.statut)}
              </span>
            </div>

            {selected.adresse && (
              <p className="mt-2 text-sm text-[#b5b5b5] leading-relaxed">{selected.adresse}</p>
            )}

            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-white">
                {selected.note != null ? (
                  <>
                    <span className="text-gold">★</span> {selected.note.toFixed(1).replace('.', ',')}
                  </>
                ) : (
                  <span className="text-[#8c8c8c]">Aucun avis</span>
                )}
              </span>
              <span className="text-[#8c8c8c]">{selected.nb_avis} avis Google</span>
              <span className="text-[#8c8c8c] ml-auto">{formatDistance(selected.distance_m)}</span>
            </div>

            {/* Actions : appeler + itinéraire */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {selected.telephone ? (
                <a
                  href={`tel:${selected.telephone.replace(/\s/g, '')}`}
                  className="min-h-[48px] px-4 rounded-xl bg-[#0f0f0f] border border-[#292929] text-white text-sm
                             font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
                  </svg>
                  Appeler
                </a>
              ) : (
                <span className="min-h-[48px] px-4 rounded-xl bg-[#0f0f0f] border border-[#292929] text-[#5a5a5a] text-sm flex items-center justify-center">
                  Pas de numéro
                </span>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-4 rounded-xl bg-gold text-[#12100e] text-sm font-semibold
                           flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 11l19-9-9 19-2-8-8-2z" />
                </svg>
                Itinéraire
              </a>
            </div>

            {/* Changement de statut */}
            <div className="mt-5">
              <p className="text-xs font-medium text-[#8c8c8c] mb-2">Statut du démarchage</p>
              <div className="grid grid-cols-2 gap-2">
                {PROSPECT_STATUTS.map((s) => {
                  const active = selected.statut === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => changerStatut(selected, s.id)}
                      className={`min-h-[46px] px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2
                                  border transition-colors ${
                                    active
                                      ? 'text-[#0d0d0d]'
                                      : 'text-white bg-[#0f0f0f] border-[#292929] hover:border-[#3a3a3a]'
                                  }`}
                      style={active ? { background: s.color, borderColor: s.color } : undefined}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: active ? '#0d0d0d' : s.color }}
                      />
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
