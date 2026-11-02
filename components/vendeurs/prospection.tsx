'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as LeafletNS from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import {
  CENTRE_PAR_DEFAUT,
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
// toutes les 24h. Sans clé Google, la carte affiche les commerces ajoutés à la
// main par l'équipe (admin), et le formulaire de recherche est masqué.

type ApiPayload = {
  apiConfigured: boolean
  settings: ProspectionSettings
  prospects: Prospect[]
  nextRefreshAt: string | null
  partiel?: boolean
  vendeur?: { prenom: string | null; ville: string | null }
  error?: string
}

// Tuiles OpenStreetMap, sans clé (CARTO en exige une désormais), assombries en
// CSS pour la charte. Usage modéré uniquement (règles OSM) : prévoir un
// fournisseur payant si le réseau vendeur grandit.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTR = '&copy; OpenStreetMap'
// Habillage ScanAvis de la carte : fond anthracite chaud, contrôles sombres,
// repères dorés. Les animations décoratives se figent en « reduced motion ».
const MAP_CSS = `
.sa-tuiles-sombres{filter:grayscale(1) invert(1) sepia(.22) brightness(.72) contrast(1.18)}
.sa-map .leaflet-container{background:#121110;font-family:inherit}
.sa-map .leaflet-bar{border:1px solid #2c2519!important;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px -12px rgba(0,0,0,.8)}
.sa-map .leaflet-bar a{width:38px;height:38px;line-height:38px;background:rgba(23,23,23,.92);color:#e5e5e5;border-bottom:1px solid #2c2519;font-weight:400}
.sa-map .leaflet-bar a:last-child{border-bottom:none}
.sa-map.fiche-ouverte .leaflet-control-zoom{display:none}
.sa-map .leaflet-bar a:hover{background:#1e1a12;color:#C9973A}
.sa-map .leaflet-control-attribution{background:rgba(13,13,13,.72);color:#6a6a6a;font-size:10px;border-top-left-radius:8px}
.sa-map .leaflet-control-attribution a{color:#8c8c8c}
.sa-pin{position:relative;width:36px;height:46px;transition:transform .2s cubic-bezier(.22,1,.36,1);transform-origin:50% 100%}
.sa-pin.is-sel{transform:scale(1.22)}
.sa-pin svg{filter:drop-shadow(0 6px 8px rgba(0,0,0,.7))}
.sa-pin-note{position:absolute;left:30px;top:6px;padding:2px 6px;border-radius:999px;background:rgba(13,13,13,.9);border:1px solid #2c2519;color:#f0e6d2;font-size:10px;font-weight:600;white-space:nowrap}
.sa-moi{position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center}
.sa-moi-halo{position:absolute;inset:0;border-radius:50%;background:rgba(201,151,58,.28);animation:sa-moi-pulse 2.4s ease-out infinite}
.sa-moi-pastille{position:relative;width:30px;height:30px;border-radius:50%;background:linear-gradient(145deg,#e6c27a,#C9973A);color:#12100e;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;border:2px solid #0d0d0d;box-shadow:0 6px 16px -4px rgba(201,151,58,.7)}
.sa-moi-label{position:absolute;top:44px;left:50%;transform:translateX(-50%);padding:2px 8px;border-radius:999px;background:rgba(13,13,13,.9);border:1px solid #3a2f18;color:#C9973A;font-size:10px;font-weight:600;white-space:nowrap}
@keyframes sa-moi-pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.6);opacity:0}}
@media (prefers-reduced-motion:reduce){.sa-moi-halo{animation:none;opacity:.5}.sa-pin{transition:none}}
`

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

/** Repère commerce : goutte sombre cerclée de la couleur du statut, avec la note. */
function pinHtml(color: string, selected: boolean, note: number | null): string {
  const chip = note != null ? `<span class="sa-pin-note">★ ${note.toFixed(1).replace('.', ',')}</span>` : ''
  return `<div class="sa-pin${selected ? ' is-sel' : ''}">
    <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 44S33 29.6 33 18.2A15 15 0 0 0 3 18.2C3 29.6 18 44 18 44z" fill="#171717" stroke="${color}" stroke-width="2.5"/>
      <circle cx="18" cy="18" r="10" fill="${color}"/>
      <path d="M12.5 16.5l1.2-3.5h8.6l1.2 3.5M13.5 16.5v6h9v-6M16.5 22.5v-3h3v3" stroke="#12100e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>${chip}
  </div>`
}

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Pastille du vendeur : son initiale sur fond doré, avec un halo qui pulse. */
function moiHtml(prenom: string | null, lieu: string | null): string {
  const initiale = echapper((prenom?.trim()[0] ?? 'T').toUpperCase())
  const label = echapper(lieu ? `Toi · ${lieu}` : 'Toi')
  return `<div class="sa-moi"><span class="sa-moi-halo"></span><span class="sa-moi-pastille">${initiale}</span><span class="sa-moi-label">${label}</span></div>`
}

export function VendeurProspection() {
  const [loading, setLoading] = useState(true)
  const [apiConfigured, setApiConfigured] = useState(true)
  const [settings, setSettings] = useState<ProspectionSettings | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [nextRefreshAt, setNextRefreshAt] = useState<string | null>(null)
  const [moi, setMoi] = useState<{ prenom: string | null; ville: string | null }>({ prenom: null, ville: null })

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
  const cadreRef = useRef<HTMLDivElement | null>(null)
  const [mapReady, setMapReady] = useState(false)
  // Liste de prospects déjà cadrée : un changement de statut ne recentre pas la carte.
  const cadrageRef = useRef<string | null>(null)

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
        if (data.vendeur) setMoi(data.vendeur)
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

  const hasCenter = settings?.lat != null && settings?.lng != null
  // Avec Google, la carte n'existe qu'une fois l'adresse saisie (comme avant).
  const showMap = !apiConfigured || hasCenter
  const prospectsKey = useMemo(() => prospects.map((p) => p.id).sort().join(','), [prospects])

  // -------- Création de la carte (une fois, dès qu'elle est affichée). --------
  useEffect(() => {
    if (loading || !showMap || mapRef.current) return
    let cancelled = false
    ;(async () => {
      let L = LRef.current
      if (!L) {
        const mod = await import('leaflet')
        // Interop CJS/ESM : selon le bundler, l'objet Leaflet est sur `default`
        // ou directement sur le namespace.
        L = ((mod as unknown as { default?: typeof LeafletNS }).default ?? mod) as typeof LeafletNS
      }
      const container = mapContainerRef.current
      if (cancelled || !container || mapRef.current) return
      LRef.current = L
      const map = L.map(container, {
        center: [CENTRE_PAR_DEFAUT.lat, CENTRE_PAR_DEFAUT.lng],
        zoom: CENTRE_PAR_DEFAUT.zoom,
        zoomControl: false,
        attributionControl: true,
      })
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR, className: 'sa-tuiles-sombres' }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      // Toucher la carte en dehors d'un commerce referme sa fiche.
      map.on('click', () => setSelectedId(null))
      mapRef.current = map
      setTimeout(() => map.invalidateSize(), 0)
      setMapReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [loading, showMap])

  /** Vue d'ensemble : le vendeur et tous ses prospects, sinon sa position, sinon Antibes. */
  const vueEnsemble = useCallback(
    (animate: boolean) => {
      const L = LRef.current
      const map = mapRef.current
      if (!L || !map) return
      if (prospects.length > 0) {
        const points = prospects.map((p) => [p.lat, p.lng] as [number, number])
        if (settings?.lat != null && settings?.lng != null) points.push([settings.lat, settings.lng])
        map.fitBounds(L.latLngBounds(points), {
          padding: [56, 56],
          maxZoom: 16,
          animate,
        })
      } else if (settings?.lat != null && settings?.lng != null) {
        map.setView([settings.lat, settings.lng], 14, { animate })
      } else {
        map.setView([CENTRE_PAR_DEFAUT.lat, CENTRE_PAR_DEFAUT.lng], CENTRE_PAR_DEFAUT.zoom, { animate })
      }
    },
    [prospects, settings?.lat, settings?.lng]
  )

  // -------- Cadrage sans Google : à l'ouverture et quand la liste change. --------
  useEffect(() => {
    if (!mapReady || apiConfigured) return
    if (cadrageRef.current === prospectsKey) return
    cadrageRef.current = prospectsKey
    vueEnsemble(false)
  }, [mapReady, apiConfigured, prospectsKey, vueEnsemble])

  // -------- Point de départ + rayon (et recentrage, avec Google). --------
  useEffect(() => {
    const L = LRef.current
    const map = mapRef.current
    if (!mapReady || !L || !map) return
    const lat = settings?.lat
    const lng = settings?.lng
    if (lat == null || lng == null) return

    // Premier affichage au zoom 14, ensuite on garde le zoom choisi par le vendeur.
    if (apiConfigured) map.setView([lat, lng], circleRef.current ? map.getZoom() : 14)

    // Repère « Toi » (centre de recherche).
    const youIcon = L.divIcon({
      className: '',
      iconSize: [46, 46],
      iconAnchor: [23, 23],
      html: moiHtml(moi.prenom, moi.ville),
    })
    if (youRef.current) {
      youRef.current.setLatLng([lat, lng])
      youRef.current.setIcon(youIcon)
    } else youRef.current = L.marker([lat, lng], { icon: youIcon, interactive: false, zIndexOffset: -500 }).addTo(map)

    // Cercle du rayon : seulement avec la recherche Google, qui en dépend.
    if (!apiConfigured) return
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
  }, [mapReady, apiConfigured, settings?.lat, settings?.lng, settings?.rayon_km, moi.prenom, moi.ville])

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
    const cadre = cadreRef.current
    if (cadre && cadre.getBoundingClientRect().top < 0) cadre.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const map = mapRef.current
    if (!map) return
    // La fiche occupe le bas de la carte : on remonte le repère au-dessus.
    const zoom = Math.max(map.getZoom(), 15)
    const point = map.project([p.lat, p.lng], zoom).add([0, 120])
    map.setView(map.unproject(point, zoom), zoom, { animate: true })
  }, [])

  // Échap referme la fiche.
  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelectedId(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  // La carte grandit quand une fiche est ouverte : Leaflet doit le savoir.
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 320)
    return () => clearTimeout(t)
  }, [selectedId])

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
        iconSize: [36, 46],
        iconAnchor: [18, 44],
        html: pinHtml(statutColor(p.statut), p.id === selectedId, p.note),
      })
      const current = existing.get(p.id)
      if (current) {
        current.setLatLng([p.lat, p.lng])
        current.setIcon(icon)
      } else {
        const marker = L.marker([p.lat, p.lng], { icon, title: p.nom }).addTo(map)
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
  }, [mapReady, prospects, selectedId, focusProspect])

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
            ? 'Aucun commerce noté moins de 4 étoiles dans ce secteur.'
            : `${n} commerce${n > 1 ? 's' : ''} noté${n > 1 ? 's' : ''} moins de 4 étoiles.` +
              (data.partiel ? ' Secteur très dense : réduis le rayon pour tout voir.' : ''),
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

  // -------- Rendus d'état. --------
  if (loading) {
    return <p className="text-sm text-[#8c8c8c] px-1">Chargement…</p>
  }

  return (
    <div className="px-1 pt-2 flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">Prospection</h2>
        <p className="text-sm text-[#8c8c8c]">
          {apiConfigured
            ? 'Les commerces autour de toi notés moins de 4 étoiles sur Google : ceux qui ont le plus besoin de ScanAvis.'
            : 'Les commerces à démarcher autour de toi.'}
        </p>
        <style>{MAP_CSS}</style>
      </header>

      {/* ── Formulaire adresse + rayon (recherche Google uniquement) ── */}
      {!apiConfigured ? (
        <p className="px-1 text-xs text-[#8c8c8c]">
          Les commerces à démarcher sont ajoutés par l&apos;équipe ScanAvis.
        </p>
      ) : (
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
      )}

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
      {showMap ? (
        <div
          ref={cadreRef}
          className={`sa-map${selected ? ' fiche-ouverte' : ''} relative isolate scroll-mt-4 rounded-3xl overflow-hidden border border-[#2c2519] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.9)]`}
        >
          {/* La hauteur change sur ce cadre, jamais sur le conteneur Leaflet : React
              écraserait les classes que Leaflet y pose (la carte deviendrait noire). */}
          <div className={`w-full transition-[height] duration-300 ${selected ? 'h-[66vh] min-h-[520px]' : 'h-[52vh] min-h-[340px]'}`}>
            <div ref={mapContainerRef} className="h-full w-full bg-[#121110]" />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[400]"
            style={{
              boxShadow: 'inset 0 0 70px 12px rgba(0,0,0,0.6)',
              background: 'radial-gradient(120% 70% at 50% 0%, rgba(201,151,58,0.08), transparent 60%)',
            }}
          />
          {/* Pastilles : où est le vendeur, et ce qu'il reste à démarcher */}
          <div className="pointer-events-none absolute top-3 left-3 z-[500] flex flex-col items-start gap-1.5">
            {(moi.ville || settings?.adresse) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d0d0d]/85 border border-[#3a2f18] backdrop-blur text-xs font-semibold text-gold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {apiConfigured ? settings?.adresse ?? moi.ville : moi.ville ?? settings?.adresse}
              </span>
            )}
            {prospects.length > 0 && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#0d0d0d]/85 border border-[#292929] backdrop-blur text-xs text-[#c7c7c7]">
                <span className="font-semibold text-white mr-1">{prospects.filter((p) => p.statut === 'a_faire').length}</span>
                à démarcher
              </span>
            )}
          </div>
          {!apiConfigured && prospects.length === 0 && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] px-4 py-3 rounded-2xl bg-[#0d0d0d]/85 border border-[#292929] backdrop-blur text-center">
              <p className="text-sm text-[#c7c7c7]">
                Aucun commerce pour l&apos;instant. De nouveaux commerces vont bientôt apparaître ici.
              </p>
            </div>
          )}
          {/* Fiche du commerce, posée sur la carte */}
          {selected && (
            <div
              role="dialog"
              aria-label={selected.nom}
              className="absolute inset-x-3 bottom-3 z-[1100] flex flex-col gap-3 p-4 rounded-2xl bg-[#141414]/95 border border-[#2c2519] backdrop-blur shadow-[0_20px_50px_-12px_rgba(0,0,0,0.95)] md:left-auto md:w-[380px]"
              style={{ animation: 'sa-fiche-in 0.25s cubic-bezier(.22,1,.36,1) both' }}
            >
              <style>{`@keyframes sa-fiche-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){[role=dialog]{animation:none!important}}`}</style>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white leading-snug">{selected.nom}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8c8c8c]">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium"
                      style={{ color: statutColor(selected.statut), borderColor: `${statutColor(selected.statut)}55` }}
                    >
                      {statutLabel(selected.statut)}
                    </span>
                    <span>
                      {selected.note != null ? (
                        <>
                          <span className="text-gold">★</span>{' '}
                          <span className="text-white font-medium">{selected.note.toFixed(1).replace('.', ',')}</span>
                          {' · '}
                          {selected.nb_avis} avis
                        </>
                      ) : (
                        'Aucun avis Google'
                      )}
                    </span>
                    {hasCenter && <span>· {formatDistance(selected.distance_m)}</span>}
                  </div>
                  {selected.adresse && <p className="mt-1.5 text-xs text-[#b5b5b5] truncate">{selected.adresse}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Fermer la fiche"
                  className="shrink-0 -mr-1 -mt-1 w-10 h-10 flex items-center justify-center rounded-full text-[#8c8c8c] hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {selected.telephone ? (
                  <a
                    href={`tel:${selected.telephone.replace(/\s/g, '')}`}
                    className="min-h-[44px] px-3 rounded-xl bg-[#0f0f0f] border border-[#292929] text-white text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
                    </svg>
                    Appeler
                  </a>
                ) : (
                  <span className="min-h-[44px] px-3 rounded-xl bg-[#0f0f0f] border border-[#292929] text-[#5a5a5a] text-sm flex items-center justify-center">
                    Pas de numéro
                  </span>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 rounded-xl bg-gold text-[#12100e] text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 11l19-9-9 19-2-8-8-2z" />
                  </svg>
                  Itinéraire
                </a>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[#8c8c8c]">Où en es-tu avec ce commerce ?</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {PROSPECT_STATUTS.map((st) => {
                    const actif = selected.statut === st.id
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => changerStatut(selected, st.id)}
                        aria-pressed={actif}
                        className={`min-h-[40px] px-1 rounded-xl text-xs font-medium border transition-colors ${
                          actif ? 'text-[#0d0d0d]' : 'text-[#e5e5e5] bg-[#0f0f0f] border-[#292929] hover:border-[#3a3a3a]'
                        }`}
                        style={actif ? { background: st.color, borderColor: st.color } : undefined}
                      >
                        {st.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bouton recentrer */}
          <button
            type="button"
            onClick={() => {
              const map = mapRef.current
              if (!apiConfigured) vueEnsemble(true)
              else if (map && settings?.lat != null && settings?.lng != null) {
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
        <div className="flex flex-wrap items-center gap-2">
          {PROSPECT_STATUTS.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#171717] border border-[#292929] text-[11px] text-[#c7c7c7]">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
              <span className="text-[#6a6a6a] tabular-nums">{prospects.filter((p) => p.statut === s.id).length}</span>
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
                  {hasCenter ? formatDistance(p.distance_m) : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

    </div>
  )
}
