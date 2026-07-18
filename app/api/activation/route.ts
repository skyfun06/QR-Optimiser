import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { INPUT_LIMITS, isValidEmail, getClientIp, rateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

const TRIAL_DAYS = 30

/**
 * Parcours d'activation en libre-service (QR sur carte de visite → /activation).
 *
 * Création CÔTÉ SERVEUR uniquement :
 *   - le compte (email + mot de passe CHOISI par l'utilisateur, jamais généré) ;
 *   - le commerce, en essai : status='trial', trial_ends_at = now()+30j.
 *
 * Le statut et la date de fin d'essai sont écrits ici via la service role — le
 * navigateur ne les fixe jamais (cf. trigger enforce_business_billing_guard).
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

  const payload = body as { businessName?: unknown; email?: unknown; password?: unknown }
  const businessName = typeof payload.businessName === 'string' ? payload.businessName.trim() : ''
  const email = typeof payload.email === 'string' ? payload.email.trim() : ''
  const password = typeof payload.password === 'string' ? payload.password : ''

  // --- Validation ---
  if (!businessName) {
    return NextResponse.json({ error: 'Le nom du commerce est requis.' }, { status: 400 })
  }
  if (businessName.length > INPUT_LIMITS.shortName) {
    return NextResponse.json({ error: 'Le nom du commerce est trop long.' }, { status: 400 })
  }
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

  const userId = created.user.id

  // --- Création du commerce en essai (statut + date fixés par le serveur) ---
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString()

  const { error: insertError } = await supabaseAdmin.from('businesses').insert({
    user_id: userId,
    name: businessName,
    subscription_status: 'trial',
    trial_ends_at: trialEndsAt,
    subscription_plan: 'free',
  })

  if (insertError) {
    // On nettoie le compte orphelin pour permettre une nouvelle tentative.
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})
    return NextResponse.json({ error: 'Impossible de créer le commerce.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
