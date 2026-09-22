import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TEST_QUESTIONS, TEST_CONFIG, TEST_SCORE_REQUIS } from '@/lib/vendeur-formation'

export const dynamic = 'force-dynamic'

// -------------------------------------------------------------------------
// Barème du test — CÔTÉ SERVEUR UNIQUEMENT (jamais envoyé au navigateur).
// Aligné par `id` avec TEST_QUESTIONS de lib/vendeur-formation.ts. C'est ce qui
// empêche un vendeur de lire les bonnes réponses depuis le client.
// -------------------------------------------------------------------------
const SOLUTIONS: Record<string, number> = {
  q_pitch: 1,
  q_mecontent: 2,
  q_probleme: 0,
  q_timing: 1,
  q_prix: 2,
  q_cible: 1,
  q_objection: 1,
  q_objection_prix: 0,
  q_commission: 2,
  q_conclure: 1,
}

const COOLDOWN_MS = TEST_CONFIG.cooldownHeures * 60 * 60 * 1000

type VendeurTestRow = {
  id: string
  statut: 'en_attente' | 'formation' | 'actif' | 'suspendu'
  test_tentatives: number
  test_reussi_le: string | null
  test_dernier_echec_le: string | null
  test_meilleur_score: number | null
  formation_terminee_le: string | null
}

const SELECT_COLS =
  'id,statut,test_tentatives,test_reussi_le,test_dernier_echec_le,test_meilleur_score,formation_terminee_le'

/** Client Supabase lié à la session du vendeur (lecture seule des cookies). */
async function getUser() {
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
  return user
}

/** Cooldown restant en ms si les tentatives sont épuisées, sinon 0. */
function cooldownRestant(row: VendeurTestRow): number {
  if (row.test_tentatives < TEST_CONFIG.maxTentatives) return 0
  if (!row.test_dernier_echec_le) return 0
  const fin = new Date(row.test_dernier_echec_le).getTime() + COOLDOWN_MS
  return Math.max(0, fin - Date.now())
}

/** État courant renvoyé au client pour afficher le bon écran. */
function etatPublic(row: VendeurTestRow) {
  return {
    reussi: !!row.test_reussi_le,
    formationTerminee: !!row.formation_terminee_le,
    tentatives: row.test_tentatives,
    maxTentatives: TEST_CONFIG.maxTentatives,
    meilleurScore: row.test_meilleur_score,
    total: TEST_QUESTIONS.length,
    scoreRequis: TEST_SCORE_REQUIS,
    cooldownRestantMs: cooldownRestant(row),
  }
}

/** Charge la ligne vendeur du user (service role : lecture fiable, hors RLS). */
async function loadVendeur(userId: string) {
  return supabaseAdmin
    .from('vendeurs')
    .select(SELECT_COLS)
    .eq('user_id', userId)
    .maybeSingle<VendeurTestRow>()
}

// GET : état courant du test (pour afficher le bon écran au chargement).
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: row, error } = await loadVendeur(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Profil vendeur introuvable' }, { status: 404 })

  return NextResponse.json(etatPublic(row))
}

// POST : deux actions, discriminées par le corps de la requête.
//   • { action: 'terminer_formation' } → marque le parcours guidé comme terminé
//     (garde-fou serveur qui débloque le test).
//   • { reponses: { [questionId]: index } } → correction d'un passage du test.
// Tout passe par le service role : le vendeur ne peut ni tricher sur le barème,
// ni modifier son suivi lui-même (garde-fou SQL).
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json().catch(() => null)

  const { data: row, error } = await loadVendeur(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Profil vendeur introuvable' }, { status: 404 })

  // Seuls les vendeurs en formation interagissent avec le parcours / test.
  if (row.statut !== 'formation') {
    return NextResponse.json({ error: 'Indisponible pour ton statut actuel.' }, { status: 409 })
  }

  // --- Action : marquer la formation comme terminée -----------------------
  if (body?.action === 'terminer_formation') {
    // Idempotent : si déjà posé, on ne réécrit pas l'horodatage.
    if (row.formation_terminee_le) {
      return NextResponse.json(etatPublic(row))
    }
    const { data: updated, error: upErr } = await supabaseAdmin
      .from('vendeurs')
      .update({ formation_terminee_le: new Date().toISOString() })
      .eq('id', row.id)
      .select(SELECT_COLS)
      .maybeSingle<VendeurTestRow>()
    if (upErr || !updated) {
      return NextResponse.json({ error: upErr?.message ?? 'Enregistrement impossible' }, { status: 500 })
    }
    return NextResponse.json(etatPublic(updated))
  }

  // --- Action : correction du test ---------------------------------------
  const reponses = body?.reponses
  if (!reponses || typeof reponses !== 'object') {
    return NextResponse.json({ error: 'Réponses manquantes' }, { status: 400 })
  }

  // Garde-fou serveur : pas de test tant que la formation n'est pas terminée.
  if (!row.formation_terminee_le) {
    return NextResponse.json(
      { error: 'Termine d’abord la formation.', ...etatPublic(row) },
      { status: 409 }
    )
  }

  // Déjà réussi : on ne rejoue pas (en attente de validation admin).
  if (row.test_reussi_le) {
    return NextResponse.json({ ...etatPublic(row), dejaReussi: true })
  }

  // Cooldown : tentatives épuisées et délai non écoulé.
  let tentatives = row.test_tentatives
  const restant = cooldownRestant(row)
  if (restant > 0) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Reviens plus tard.', ...etatPublic(row) },
      { status: 429 }
    )
  }
  // Cooldown écoulé après épuisement : on repart sur une nouvelle fenêtre.
  if (tentatives >= TEST_CONFIG.maxTentatives) {
    tentatives = 0
  }

  // Correction serveur.
  let score = 0
  for (const q of TEST_QUESTIONS) {
    if (reponses[q.id] === SOLUTIONS[q.id]) score += 1
  }
  const total = TEST_QUESTIONS.length
  const scorePct = Math.round((score / total) * 100)
  const passed = score >= TEST_SCORE_REQUIS

  const now = new Date().toISOString()
  const meilleur = Math.max(row.test_meilleur_score ?? 0, scorePct)
  const update: Record<string, unknown> = {
    test_tentatives: tentatives + 1,
    test_meilleur_score: meilleur,
  }
  if (passed) update.test_reussi_le = now
  else update.test_dernier_echec_le = now

  const { data: updated, error: upErr } = await supabaseAdmin
    .from('vendeurs')
    .update(update)
    .eq('id', row.id)
    .select(SELECT_COLS)
    .maybeSingle<VendeurTestRow>()
  if (upErr || !updated) {
    return NextResponse.json({ error: upErr?.message ?? 'Enregistrement impossible' }, { status: 500 })
  }

  return NextResponse.json({
    passed,
    score,
    scorePct,
    ...etatPublic(updated),
  })
}
