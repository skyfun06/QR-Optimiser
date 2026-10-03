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

/**
 * Origine absolue pour les liens/images des emails. On privilégie
 * NEXT_PUBLIC_APP_URL quand elle est définie et publique, sinon on la dérive des
 * en-têtes de la requête (derrière le proxy Vercel). Sans ça, un lien relatif
 * se retrouve dans l'email et le bouton est inerte.
 */
function getPublicOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  // On ignore une valeur localhost (utile en dev, inutilisable dans un email réel).
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    return `${proto}://${host}`
  }
  return env ?? ''
}

/** Email brandé envoyé au patron pour finaliser (mot de passe + paiement). */
function finaliserEmailHtml(opts: {
  businessName: string
  vendeurPrenom: string | null
  formuleLabel: string
  prixMensuel: number
  actionUrl: string
  isNew: boolean
  origin: string
}) {
  const safeName = escapeHtml(opts.businessName)
  const safeVendeur = opts.vendeurPrenom ? escapeHtml(opts.vendeurPrenom) : 'Un conseiller ScanAvis'
  const logoUrl = `${opts.origin}/images/logo.png`
  const intro = opts.isNew
    ? `${safeVendeur} vient de créer votre espace ScanAvis pour <strong style="color:#ffffff;">${safeName}</strong>. Il ne reste qu'une étape pour recevoir vos premiers avis Google : créez votre mot de passe et activez votre abonnement.`
    : `${safeVendeur} vient d'inscrire <strong style="color:#ffffff;">${safeName}</strong> sur votre compte ScanAvis. Il ne reste qu'une étape : connectez-vous et activez votre abonnement.`
  const cta = opts.isNew ? 'Créer mon mot de passe' : 'Me connecter et payer'

  // Layout en tableaux (compatibilité maximale entre clients mail). Styles inline
  // uniquement, palette alignée sur la marque (noir profond + doré #C9973A).
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:#0d0d0d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- En-tête : logo + marque -->
        <tr><td align="center" style="padding:8px 0 28px 0;">
          <img src="${logoUrl}" width="56" height="56" alt="ScanAvis" style="display:block;width:56px;height:56px;border:0;outline:none;margin:0 auto 10px auto;" />
          <div style="color:#C9973A;font-family:'Segoe UI',Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:1px;">ScanAvis</div>
        </td></tr>

        <!-- Carte principale -->
        <tr><td style="background:#171717;border:1px solid #292929;border-radius:18px;padding:36px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td>
              <h1 style="margin:0 0 16px 0;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:26px;line-height:1.3;font-weight:700;">Activez ${safeName}</h1>
              <p style="margin:0 0 28px 0;color:#c7c7c7;font-family:'Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.65;">${intro}</p>

              <!-- Formule -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px 0;">
                <tr><td style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:14px;padding:18px 20px;">
                  <div style="color:#8c8c8c;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0;">Votre formule</div>
                  <div style="color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:20px;font-weight:700;">${escapeHtml(opts.formuleLabel)} <span style="color:#C9973A;">· ${opts.prixMensuel} €/mois</span></div>
                </td></tr>
              </table>

              <!-- Bouton bulletproof -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr><td align="center" style="border-radius:12px;background:#C9973A;">
                  <a href="${opts.actionUrl}" style="display:inline-block;padding:15px 34px;color:#12100e;font-family:'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;">${cta} →</a>
                </td></tr>
              </table>

              <p style="margin:26px 0 0 0;color:#9a9a9a;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.6;text-align:center;">
                Le bouton ne s'ouvre pas ? Copiez ce lien dans votre navigateur :<br />
                <a href="${opts.actionUrl}" style="color:#C9973A;text-decoration:none;word-break:break-all;">${opts.actionUrl}</a>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Pied -->
        <tr><td style="padding:22px 24px 8px 24px;">
          <p style="margin:0;color:#6a6a6a;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.6;text-align:center;">
            Ce lien vous est personnel. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.<br />
            Propulsé par ScanAvis
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
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
    const origin = getPublicOrigin(request)
    const next = isNew ? '/finaliser' : '/subscription'
    const actionUrl = `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=${encodeURIComponent(next)}`

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
          origin,
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
