import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientIp, rateLimit } from '@/lib/security'
import {
  AdresseIntrouvableError,
  chercherProspects,
  clampRayon,
  distanceMetres,
  geocodeAdresse,
  geocodeVille,
  isGoogleConfigured,
  PROSPECT_MANUEL_PREFIX,
  REFRESH_INTERVAL_MS,
  type Prospect,
  type ProspectionSettings,
} from '@/lib/vendeur-prospection'

export const dynamic = 'force-dynamic'

const ADRESSE_MAX = 300

// Garde-fou endpoint (le vrai plafond anti-coût est en base, sur 24h) : on
// borne simplement le nombre de requêtes HTTP pour bloquer le spam trivial.
const RATE_LIMIT = { limit: 30, windowMs: 60 * 60 * 1000 }

type VendeurRow = {
  id: string
  statut: string | null
  prenom: string | null
  ville: string | null
  code_postal: string | null
  /** Adresse choisie à l'inscription (métadonnées du compte), si elle existe. */
  adresseInscription: { label: string; lat: number; lng: number } | null
}

/** Adresse + position enregistrées à l'inscription, si valides. */
function lireAdresseInscription(meta: Record<string, unknown> | undefined): VendeurRow['adresseInscription'] {
  const label = typeof meta?.adresse === 'string' ? meta.adresse.trim() : ''
  const lat = Number(meta?.adresse_lat)
  const lng = Number(meta?.adresse_lng)
  if (!label || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { label, lat, lng }
}

/** Vendeur lié à la session appelante, ou null. */
async function getVendeur(): Promise<VendeurRow | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Lecture seule : on ne rafraîchit pas la session ici.
        },
      },
    }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('vendeurs')
    .select('id,statut,prenom,ville,code_postal')
    .eq('user_id', user.id)
    .maybeSingle<Omit<VendeurRow, 'adresseInscription'>>()
  return data ? { ...data, adresseInscription: lireAdresseInscription(user.user_metadata) } : null
}

type SettingsRow = {
  adresse: string | null
  lat: number | null
  lng: number | null
  rayon_km: number
  derniere_recherche_at: string | null
}

async function loadSettings(vendeurId: string): Promise<SettingsRow | null> {
  const { data } = await supabaseAdmin
    .from('vendeur_prospection')
    .select('adresse,lat,lng,rayon_km,derniere_recherche_at')
    .eq('vendeur_id', vendeurId)
    .maybeSingle<SettingsRow>()
  return data ?? null
}

/**
 * Prospects du vendeur, distances recalculées depuis sa position actuelle
 * (les commerces ajoutés par l'admin avant qu'elle soit connue valent 0 en base).
 */
async function loadProspects(vendeurId: string, settings: SettingsRow | null): Promise<Prospect[]> {
  const { data } = await supabaseAdmin
    .from('vendeur_prospects')
    .select('id,place_id,nom,adresse,note,nb_avis,telephone,lat,lng,distance_m,statut')
    .eq('vendeur_id', vendeurId)
    .order('distance_m', { ascending: true })
  const prospects = (data as Prospect[] | null) ?? []
  if (settings?.lat == null || settings?.lng == null) return prospects
  const centre = { lat: settings.lat, lng: settings.lng }
  return prospects
    .map((p) => ({ ...p, distance_m: distanceMetres(centre, p) }))
    .sort((a, b) => a.distance_m - b.distance_m)
}

/**
 * Place le vendeur sur sa carte d'après son inscription : l'adresse exacte
 * s'il l'a donnée, sinon le centre de sa ville. Une recherche Google fixe son
 * propre point de départ : on n'y touche plus. Ne modifie jamais la date du
 * dernier appel Google (le plafond 24 h reste intact).
 */
async function positionDepuisInscription(vendeur: VendeurRow, settings: SettingsRow | null): Promise<SettingsRow | null> {
  if (settings?.derniere_recherche_at) return settings

  let position: { adresse: string; lat: number; lng: number } | null = null
  const inscrite = vendeur.adresseInscription
  if (inscrite) {
    if (settings?.adresse === inscrite.label && settings.lat != null) return settings
    position = { adresse: inscrite.label, lat: inscrite.lat, lng: inscrite.lng }
  } else {
    if (settings?.lat != null && settings?.lng != null) return settings
    const ville = vendeur.ville?.trim()
    if (!ville) return settings
    const centre = await geocodeVille(ville, vendeur.code_postal)
    if (!centre) return settings
    const cp = vendeur.code_postal?.trim()
    position = { adresse: cp ? `${cp} ${centre.nom}` : centre.nom, lat: centre.lat, lng: centre.lng }
  }

  const { error } = await supabaseAdmin.from('vendeur_prospection').upsert(
    {
      vendeur_id: vendeur.id,
      adresse: position.adresse,
      lat: position.lat,
      lng: position.lng,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'vendeur_id' }
  )
  if (error) {
    console.error('[prospection] position depuis la ville impossible:', error)
    return settings
  }
  return loadSettings(vendeur.id)
}

/** Date à laquelle un nouvel appel Google redevient possible, ou null. */
function nextRefreshAt(settings: SettingsRow | null): string | null {
  if (!settings?.derniere_recherche_at) return null
  const next = new Date(settings.derniere_recherche_at).getTime() + REFRESH_INTERVAL_MS
  return next > Date.now() ? new Date(next).toISOString() : null
}

function toSettingsPayload(settings: SettingsRow | null): ProspectionSettings {
  return {
    adresse: settings?.adresse ?? null,
    lat: settings?.lat ?? null,
    lng: settings?.lng ?? null,
    rayon_km: settings?.rayon_km ?? 0,
    derniere_recherche_at: settings?.derniere_recherche_at ?? null,
  }
}

// -------------------------------------------------------------------------
// GET : lecture seule (base + config). Aucun appel Google.
// -------------------------------------------------------------------------
export async function GET() {
  try {
    const vendeur = await getVendeur()
    if (!vendeur) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (vendeur.statut !== 'actif') {
      return NextResponse.json({ error: "Ton compte n'est pas encore actif." }, { status: 403 })
    }

    const settings = await positionDepuisInscription(vendeur, await loadSettings(vendeur.id))
    const prospects = await loadProspects(vendeur.id, settings)

    return NextResponse.json({
      apiConfigured: isGoogleConfigured(),
      settings: toSettingsPayload(settings),
      prospects,
      nextRefreshAt: nextRefreshAt(settings),
      vendeur: { prenom: vendeur.prenom?.trim() || null, ville: vendeur.ville?.trim() || null },
    })
  } catch (error) {
    console.error('[prospection][GET] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// -------------------------------------------------------------------------
// POST : « Actualiser ». Appelle Google AU PLUS une fois / 24h / vendeur
// (plafond dur), puis remplace la liste de prospects en conservant les
// statuts déjà posés par le vendeur.
// -------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const vendeur = await getVendeur()
    if (!vendeur) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (vendeur.statut !== 'actif') {
      return NextResponse.json({ error: "Ton compte n'est pas encore actif." }, { status: 403 })
    }

    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: "La prospection n'est pas encore activée." },
        { status: 503 }
      )
    }

    const ip = getClientIp(request)
    const rl = rateLimit(`prospection:${vendeur.id}:${ip}`, RATE_LIMIT)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessaie dans un moment.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() } }
      )
    }

    const body = await request.json().catch(() => null)
    const adresse = typeof body?.adresse === 'string' ? body.adresse.trim() : ''
    const rayon = clampRayon(body?.rayon)
    if (!adresse || adresse.length > ADRESSE_MAX) {
      return NextResponse.json({ error: 'Adresse invalide.' }, { status: 400 })
    }

    // --- Plafond dur : un seul appel Google par 24h, quel que soit le déclencheur. ---
    const settings = await loadSettings(vendeur.id)
    const blockedUntil = nextRefreshAt(settings)
    if (blockedUntil) {
      return NextResponse.json(
        {
          error: 'Déjà actualisé récemment. Un nouvel essai sera possible plus tard.',
          nextRefreshAt: blockedUntil,
        },
        { status: 429 }
      )
    }

    const nowIso = new Date().toISOString()

    // Écrit l'état de prospection (consomme le créneau 24h). Centralisé pour
    // être réutilisé sur les chemins d'échec « après appel Google facturé ».
    async function persistSettings(coords: { lat: number | null; lng: number | null; adresse: string }) {
      await supabaseAdmin
        .from('vendeur_prospection')
        .upsert(
          {
            vendeur_id: vendeur!.id,
            adresse: coords.adresse,
            lat: coords.lat,
            lng: coords.lng,
            rayon_km: rayon,
            derniere_recherche_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: 'vendeur_id' }
        )
    }

    // --- 1. Géocodage de l'adresse. ---
    let coords: { lat: number; lng: number; adresseFormatee: string }
    try {
      coords = await geocodeAdresse(adresse)
    } catch (e) {
      if (e instanceof AdresseIntrouvableError) {
        // Appel Google facturé mais sans résultat : le créneau est consommé.
        await persistSettings({ lat: settings?.lat ?? null, lng: settings?.lng ?? null, adresse })
        const after = await loadSettings(vendeur.id)
        return NextResponse.json(
          {
            error: "Adresse introuvable. Vérifie-la : un nouvel essai sera possible dans 24 h.",
            nextRefreshAt: nextRefreshAt(after),
          },
          { status: 422 }
        )
      }
      // Panne réseau / quota : rien n'a été facturé de façon fiable, on ne
      // consomme pas le créneau pour ne pas bloquer le vendeur 24h pour rien.
      console.error('[prospection][POST] geocode failed:', e)
      return NextResponse.json(
        { error: 'Service de localisation indisponible. Réessaie dans un moment.' },
        { status: 502 }
      )
    }

    // --- 2. Recherche des commerces à démarrer. ---
    let prospectsBruts
    let partiel = false
    try {
      ;({ prospects: prospectsBruts, partiel } = await chercherProspects({
        lat: coords.lat,
        lng: coords.lng,
        rayonKm: rayon,
      }))
    } catch (e) {
      // Le géocodage a déjà été facturé : on consomme le créneau et on garde
      // la liste existante inchangée.
      console.error('[prospection][POST] places failed:', e)
      await persistSettings({ lat: coords.lat, lng: coords.lng, adresse: coords.adresseFormatee })
      const after = await loadSettings(vendeur.id)
      return NextResponse.json(
        {
          error: 'Recherche des commerces indisponible. Réessaie plus tard.',
          nextRefreshAt: nextRefreshAt(after),
        },
        { status: 502 }
      )
    }

    // --- 3. Remplace la liste en reconduisant les statuts déjà posés. ---
    const { data: existing } = await supabaseAdmin
      .from('vendeur_prospects')
      .select('place_id,statut')
      .eq('vendeur_id', vendeur.id)
    const prevStatut = new Map<string, string>(
      (existing ?? []).map((r: { place_id: string; statut: string }) => [r.place_id, r.statut])
    )

    // Les commerces ajoutés à la main par l'admin restent en place.
    await supabaseAdmin
      .from('vendeur_prospects')
      .delete()
      .eq('vendeur_id', vendeur.id)
      .not('place_id', 'like', `${PROSPECT_MANUEL_PREFIX}%`)

    if (prospectsBruts.length > 0) {
      const rows = prospectsBruts.map((p) => ({
        vendeur_id: vendeur.id,
        place_id: p.place_id,
        nom: p.nom,
        adresse: p.adresse,
        note: p.note,
        nb_avis: p.nb_avis,
        telephone: p.telephone,
        lat: p.lat,
        lng: p.lng,
        distance_m: p.distance_m,
        statut: prevStatut.get(p.place_id) ?? 'a_faire',
      }))
      const { error: insErr } = await supabaseAdmin.from('vendeur_prospects').insert(rows)
      if (insErr) {
        console.error('[prospection][POST] insert failed:', insErr)
        // On consomme tout de même le créneau (Google a été facturé).
        await persistSettings({ lat: coords.lat, lng: coords.lng, adresse: coords.adresseFormatee })
        return NextResponse.json({ error: 'Impossible d’enregistrer les prospects.' }, { status: 500 })
      }
    }

    await persistSettings({ lat: coords.lat, lng: coords.lng, adresse: coords.adresseFormatee })

    const after = await loadSettings(vendeur.id)
    const prospects = await loadProspects(vendeur.id, after)
    return NextResponse.json({
      ok: true,
      partiel,
      apiConfigured: true,
      settings: toSettingsPayload(after),
      prospects,
      nextRefreshAt: nextRefreshAt(after),
    })
  } catch (error) {
    console.error('[prospection][POST] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
