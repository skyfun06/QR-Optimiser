import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isValidEmail, getClientIp, rateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * Parcours d'activation en libre-service (QR sur carte de visite → /activation).
 *
 * Cette route crée UNIQUEMENT le compte (email + mot de passe CHOISI par
 * l'utilisateur, jamais généré). Le commerce, lui, n'est PAS créé ici : il l'est
 * à l'étape d'onboarding, comme pour le parcours /signup. C'est à ce moment que
 * le trigger enforce_business_billing_guard applique l'essai (status='trial',
 * trial_ends_at = now()+30j) — le décompte des 30 jours part donc de la création
 * du commerce, et ni le client ni cette route ne fixent ces valeurs.
 */
export async function POST(request: NextRequest) {
  // Anti-spam basique : 5 tentatives / 10 min / IP.
  const ip = getClientIp(request)
  const limit = rateLimit(`activation:${ip}`, { limit: 5, windowMs: 10 * 60_000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const payload = body as { email?: unknown; password?: unknown }
  const email = typeof payload.email === 'string' ? payload.email.trim() : ''
  const password = typeof payload.password === 'string' ? payload.password : ''

  // --- Validation ---
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
      { status: 400 }
    )
  }
  if (password.length > 200) {
    return NextResponse.json({ error: 'Le mot de passe est trop long.' }, { status: 400 })
  }

  // --- Création du compte (auto-confirmé pour un parcours sans friction) ---
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !created?.user) {
    const msg = createError?.message ?? ''
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cette adresse email.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Impossible de créer le compte.' }, { status: 500 })
  }

  // Le compte est prêt. Le commerce sera créé à l'onboarding (client anon), où
  // le trigger appliquera l'essai de 30 jours.
  return NextResponse.json({ ok: true })
}
