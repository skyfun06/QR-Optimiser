import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { escapeHtml, getClientIp, isValidEmail, INPUT_LIMITS, rateLimit } from '@/lib/security'
import { FORMULES, isFormule } from '@/lib/vendeur-commerce'

export const dynamic = 'force-dynamic'

// Expéditeur isolé, aligné sur les autres emails transactionnels.
const EMAIL_FROM = 'ScanAvis <contact@qrscanavis.fr>'

// Anti-abus : un vendeur ne peut pas inscrire des dizaines de commerces/heure.
const RATE_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 }

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

type VendeurRow = { id: string; statut: string | null; prenom: string | null }

/** Vendeur (actif) lié à la session appelante, ou null. */
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
    .select('id,statut,prenom')
    .eq('user_id', user.id)
    .maybeSingle<VendeurRow>()
  return data ?? null
}

/** Email brandé envoyé au patron pour finaliser (mot de passe + paiement). */
function finaliserEmailHtml(opts: {
  businessName: string
  vendeurPrenom: string | null
  formuleLabel: string
  prixMensuel: number
  actionUrl: string
  isNew: boolean
}) {
  const safeName = escapeHtml(opts.businessName)
  const safeVendeur = opts.vendeurPrenom ? escapeHtml(opts.vendeurPrenom) : 'Un conseiller ScanAvis'
  const intro = opts.isNew
    ? `${safeVendeur} vient de créer votre espace ScanAvis pour <strong style="color:#ffffff;">${safeName}</strong>. Dernière étape : créez votre mot de passe et activez votre abonnement.`
    : `${safeVendeur} vient d'inscrire <strong style="color:#ffffff;">${safeName}</strong> sur votre compte ScanAvis. Dernière étape : connectez-vous et activez votre abonnement.`
  const cta = opts.isNew ? 'Créer mon mot de passe' : 'Me connecter et payer'

  return `
    <div style="margin:0;padding:32px 16px;background:#0d0d0d;color:#ffffff;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#171717;border:1px solid #292929;border-radius:16px;padding:32px;">
        <p style="margin:0 0 16px 0;color:#C9973A;font-size:26px;font-weight:700;letter-spacing:0.5px;">ScanAvis</p>
        <h1 style="margin:0 0 14px 0;color:#ffffff;font-size:28px;line-height:1.25;">Activez ${safeName}</h1>
        <p style="margin:0 0 24px 0;color:#d4d4d4;font-size:16px;line-height:1.6;">${intro}</p>

        <div style="background:#0f0f0f;border:1px solid #262626;border-radius:12px;padding:18px;margin-bottom:26px;">
          <p style="margin:0 0 6px 0;color:#8c8c8c;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Votre formule</p>
          <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${escapeHtml(opts.formuleLabel)} — ${opts.prixMensuel} €/mois</p>
        </div>

        <a href="${opts.actionUrl}"
           style="display:inline-block;background:#C9973A;color:#12100e;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:700;">
          ${cta}
        </a>

        <p style="margin:26px 0 0 0;color:#8c8c8c;font-size:12px;line-height:1.5;">
          Ce lien vous est personnel. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
        </p>
      </div>
    </div>
  `
}

export async function POST(request: NextRequest) {
  try {
    const vendeur = await getVendeur()
    if (!vendeur) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (vendeur.statut !== 'actif') {
      return NextResponse.json(
        { error: "Ton compte n'est pas encore actif." },
        { status: 403 }
      )
    }

    const ip = getClientIp(request)
    const rl = rateLimit(`inscrire-commerce:${vendeur.id}:${ip}`, RATE_LIMIT)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessaie dans un moment.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() } }
      )
    }

    const body = await request.json().catch(() => null)
    const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const telephone = typeof body?.telephone === 'string' ? body.telephone.trim() : ''
    const formule = body?.formule

    // --- Validation ---
    if (!businessName || businessName.length > INPUT_LIMITS.shortName) {
      return NextResponse.json({ error: 'Nom du commerce invalide.' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email du patron invalide.' }, { status: 400 })
    }
    if (!telephone || telephone.length > 40) {
      return NextResponse.json({ error: 'Téléphone invalide.' }, { status: 400 })
    }
    if (!isFormule(formule)) {
      return NextResponse.json({ error: 'Formule invalide.' }, { status: 400 })
    }

    // --- Compte patron : on crée s'il n'existe pas, sinon on rattache. ---
    let isNew = false
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { phone: telephone, cree_par_vendeur: true },
    })
    if (created?.user) {
      isNew = true
    } else {
      const msg = (createErr?.message ?? '').toLowerCase()
      const alreadyExists =
        msg.includes('already') || msg.includes('registered') || msg.includes('exists')
      if (!alreadyExists) {
        console.error('[inscrire-commerce] createUser failed:', createErr)
        return NextResponse.json({ error: 'Impossible de créer le compte du patron.' }, { status: 500 })
      }
      // Le patron a déjà un compte ScanAvis : on rattache la vente à son compte.
    }

    // Lien de finalisation (magic link) : donne aussi l'id du user (existant ou créé).
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    const userId = linkData?.user?.id
    const hashedToken = linkData?.properties?.hashed_token
    if (linkErr || !userId || !hashedToken) {
      console.error('[inscrire-commerce] generateLink failed:', linkErr)
      return NextResponse.json({ error: 'Impossible de préparer le lien de finalisation.' }, { status: 500 })
    }

    // --- Commerce : créé sans accès tant que le patron n'a pas payé. ---
    const { data: biz, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .insert({ user_id: userId, name: businessName, subscription_status: 'pending_payment' })
      .select('id')
      .single<{ id: string }>()
    if (bizErr || !biz) {
      console.error('[inscrire-commerce] business insert failed:', bizErr)
      return NextResponse.json({ error: 'Impossible de créer le commerce.' }, { status: 500 })
    }

    // --- Vente : le lien vendeur ↔ commerce (déclenchera la commission au paiement). ---
    const { error: venteErr } = await supabaseAdmin.from('ventes').insert({
      vendeur_id: vendeur.id,
      business_id: biz.id,
      business_nom: businessName,
      formule,
      statut_commerce: 'en_attente_paiement',
    })
    if (venteErr) {
      console.error('[inscrire-commerce] vente insert failed:', venteErr)
      // On retire le commerce orphelin pour ne pas laisser d'état partiel.
      await supabaseAdmin.from('businesses').delete().eq('id', biz.id)
      return NextResponse.json({ error: "Impossible d'enregistrer la vente." }, { status: 500 })
    }

    // Best-effort : chaque commerce devient son propre parrain (parité onboarding).
    try {
      await supabaseAdmin.rpc('create_business_referrer', { p_business_id: biz.id })
    } catch (e) {
      console.error('[inscrire-commerce] create_business_referrer failed:', e)
    }

    // --- Email de finalisation au patron. ---
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const next = isNew ? '/finaliser' : '/subscription'
    const actionUrl = `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=${encodeURIComponent(next)}`

    let emailSent = false
    try {
      await getResend().emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `Activez ${businessName} sur ScanAvis`,
        html: finaliserEmailHtml({
          businessName,
          vendeurPrenom: vendeur.prenom,
          formuleLabel: FORMULES[formule].label,
          prixMensuel: FORMULES[formule].prixMensuel,
          actionUrl,
          isNew,
        }),
        tags: [{ name: 'type', value: 'vendeur-inscription-commerce' }],
      })
      emailSent = true
    } catch (e) {
      // Le commerce est créé et visible côté vendeur ; l'email pourra être renvoyé.
      console.error('[inscrire-commerce] email send failed:', e)
    }

    return NextResponse.json({ ok: true, emailSent })
  } catch (error) {
    console.error('[inscrire-commerce] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
