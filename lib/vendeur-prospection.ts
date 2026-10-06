// Config partagée de l'onglet « Prospection » de l'espace vendeur.
// Source unique de vérité pour : les statuts d'un prospect (et leur couleur
// sur la carte), les bornes du rayon, les seuils de filtrage des prospects,
// le plafond anti-coût, et l'appel à Google (Geocoding + Places API New).
//
// IMPORTANT coût : les fonctions qui appellent Google (geocodeAdresse,
// chercherProspects) ne doivent être utilisées QUE côté serveur, et jamais
// plus d'une fois par 24 h et par vendeur (plafond appliqué dans la route
// /api/vendeur/prospection/refresh). La clé n'est JAMAIS exposée au client.

// -------------------------------------------------------------------------
// Statuts d'un prospect (ordre = cycle de démarchage)
// -------------------------------------------------------------------------
export type ProspectStatut = 'a_faire' | 'a_revoir' | 'refuse' | 'signe'

export const PROSPECT_STATUTS: {
  id: ProspectStatut
  label: string
  /** Couleur du repère sur la carte + pastille dans la liste. */
  color: string
}[] = [
  { id: 'a_faire', label: 'À faire', color: '#C9973A' }, // doré = à démarcher
  { id: 'a_revoir', label: 'À revoir', color: '#6AA6FF' }, // bleu = à relancer
  { id: 'refuse', label: 'Refusé', color: '#8c8c8c' }, // gris = sans suite
  { id: 'signe', label: 'Signé', color: '#5fbf7f' }, // vert = gagné
]

export function isProspectStatut(value: unknown): value is ProspectStatut {
  return value === 'a_faire' || value === 'a_revoir' || value === 'refuse' || value === 'signe'
}

export function statutColor(statut: string): string {
  return PROSPECT_STATUTS.find((s) => s.id === statut)?.color ?? '#C9973A'
}

export function statutLabel(statut: string): string {
  return PROSPECT_STATUTS.find((s) => s.id === statut)?.label ?? 'À faire'
}

// -------------------------------------------------------------------------
// Bornes & seuils
// -------------------------------------------------------------------------
export const RAYON_MIN_KM = 2
export const RAYON_MAX_KM = 10
export const RAYON_DEFAULT_KM = 3

/** On ne garde que les commerces mal notés OU avec très peu d'avis. */
export const PROSPECT_NOTE_MAX = 3.9
export const PROSPECT_AVIS_MAX = 10
/** Nombre maximum de prospects stockés par vendeur. */
export const PROSPECT_LIMIT = 25

/** Plafond anti-coût : un appel Google par vendeur toutes les 24 h, grand max. */
export const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000

/** La clé Google est-elle configurée côté serveur ? (jamais appelé côté client) */
export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY)
}

export function clampRayon(value: unknown): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return RAYON_DEFAULT_KM
  return Math.min(RAYON_MAX_KM, Math.max(RAYON_MIN_KM, n))
}

// -------------------------------------------------------------------------
// Types échangés avec le client
// -------------------------------------------------------------------------
export type Prospect = {
  id: string
  place_id: string
  nom: string
  adresse: string | null
  note: number | null
  nb_avis: number
  telephone: string | null
  lat: number
  lng: number
  distance_m: number
  statut: ProspectStatut
}

export type ProspectionSettings = {
  adresse: string | null
  lat: number | null
  lng: number | null
  rayon_km: number
  derniere_recherche_at: string | null
}

// -------------------------------------------------------------------------
// Géométrie
// -------------------------------------------------------------------------
/** Distance haversine en mètres entre deux points lat/lng. */
export function distanceMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

// -------------------------------------------------------------------------
// Appels Google (SERVEUR UNIQUEMENT)
// -------------------------------------------------------------------------

/** Erreur « pas de résultat » distincte d'une panne réseau, pour l'UX. */
export class AdresseIntrouvableError extends Error {}

/**
 * Adresse libre → coordonnées, via Geocoding API. Restreint à la France
 * (le réseau vendeur y opère). Lève AdresseIntrouvableError si Google répond
 * mais ne trouve rien ; relaie toute autre erreur (réseau / quota) telle quelle.
 */
export async function geocodeAdresse(
  adresse: string
): Promise<{ lat: number; lng: number; adresseFormatee: string }> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY is not set')

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', adresse)
  url.searchParams.set('key', key)
  url.searchParams.set('language', 'fr')
  url.searchParams.set('region', 'fr')
  url.searchParams.set('components', 'country:FR')

  const res = await fetch(url, { cache: 'no-store' })
  const data = (await res.json()) as {
    status?: string
    results?: { geometry?: { location?: { lat: number; lng: number } }; formatted_address?: string }[]
  }

  if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
    const loc = data.results[0].geometry.location
    return {
      lat: loc.lat,
      lng: loc.lng,
      adresseFormatee: data.results[0].formatted_address ?? adresse,
    }
  }
  if (data.status === 'ZERO_RESULTS' || data.status === 'OK') {
    throw new AdresseIntrouvableError('Adresse introuvable')
  }
  throw new Error(`Geocoding error: ${data.status ?? res.status}`)
}

// Types de commerces de proximité démarchables (Places API New, Table A).
const INCLUDED_TYPES = [
  'restaurant',
  'bar',
  'cafe',
  'bakery',
  'meal_takeaway',
  'hair_salon',
  'barber_shop',
  'beauty_salon',
  'nail_salon',
  'hotel',
  'clothing_store',
  'florist',
  'grocery_store',
  'convenience_store',
  'book_store',
  'jewelry_store',
  'shoe_store',
  'pet_store',
  'store',
]

type PlaceNew = {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  nationalPhoneNumber?: string
  businessStatus?: string
}

/** Un prospect prêt à être inséré (hors id/statut, gérés par la base). */
export type ProspectBrut = {
  place_id: string
  nom: string
  adresse: string | null
  note: number | null
  nb_avis: number
  telephone: string | null
  lat: number
  lng: number
  distance_m: number
}

/**
 * Commerces mal notés / peu d'avis autour d'un point, via Places API (New)
 * « searchNearby » (1 seul appel : la note ET le téléphone sont renvoyés,
 * pas de Place Details facturé en plus). Les résultats sont filtrés selon
 * nos seuils, triés par distance et plafonnés à PROSPECT_LIMIT.
 */
export async function chercherProspects(opts: {
  lat: number
  lng: number
  rayonKm: number
}): Promise<ProspectBrut[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY is not set')

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.nationalPhoneNumber',
        'places.businessStatus',
      ].join(','),
    },
    body: JSON.stringify({
      includedTypes: INCLUDED_TYPES,
      maxResultCount: 20, // plafond de l'API « searchNearby »
      rankPreference: 'DISTANCE',
      languageCode: 'fr',
      regionCode: 'FR',
      locationRestriction: {
        circle: {
          center: { latitude: opts.lat, longitude: opts.lng },
          radius: Math.min(opts.rayonKm, RAYON_MAX_KM) * 1000,
        },
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Places error ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = (await res.json()) as { places?: PlaceNew[] }
  const centre = { lat: opts.lat, lng: opts.lng }

  const prospects: ProspectBrut[] = (data.places ?? [])
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .filter((p) => p.location && p.id && (p.displayName?.text ?? '').trim())
    // Meilleurs prospects : mal notés OU très peu d'avis (y compris 0 avis).
    .filter((p) => {
      const note = typeof p.rating === 'number' ? p.rating : null
      const avis = typeof p.userRatingCount === 'number' ? p.userRatingCount : 0
      return note === null || note < PROSPECT_NOTE_MAX || avis < PROSPECT_AVIS_MAX
    })
    .map((p) => {
      const lat = p.location!.latitude
      const lng = p.location!.longitude
      return {
        place_id: p.id,
        nom: (p.displayName?.text ?? '').trim(),
        adresse: p.formattedAddress ?? null,
        note: typeof p.rating === 'number' ? p.rating : null,
        nb_avis: typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
        telephone: p.nationalPhoneNumber ?? null,
        lat,
        lng,
        distance_m: distanceMetres(centre, { lat, lng }),
      }
    })

  prospects.sort((a, b) => a.distance_m - b.distance_m)
  return prospects.slice(0, PROSPECT_LIMIT)
}
