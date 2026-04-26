import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { escapeHtml, getClientIp, INPUT_LIMITS, isValidEmail, rateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

function getContactEmailHtml(nom: string, email: string, message: string) {
  return `
    <div style="margin:0;padding:32px 16px;background:#0d0d0d;color:#ffffff;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#171717;border:1px solid #292929;border-radius:16px;padding:32px;">
        <p style="margin:0 0 24px 0;color:#C9973A;font-size:22px;font-weight:700;">ScanAvis — Nouveau message de contact</p>

        <div style="background:#0f0f0f;border:1px solid #262626;border-radius:12px;padding:20px 18px;margin-bottom:24px;">
          <p style="margin:0 0 6px 0;color:#8c8c8c;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Expéditeur</p>
          <p style="margin:0 0 4px 0;color:#ffffff;font-size:15px;font-weight:600;">${escapeHtml(nom)}</p>
          <a href="mailto:${escapeHtml(email)}" style="color:#C9973A;font-size:14px;text-decoration:none;">${escapeHtml(email)}</a>
        </div>

        <div style="background:#0f0f0f;border:1px solid #262626;border-radius:12px;padding:20px 18px;">
          <p style="margin:0 0 10px 0;color:#8c8c8c;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Message</p>
          <p style="margin:0;color:#f0f0f0;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(message)}</p>
        </div>

        <p style="margin:28px 0 0 0;color:#555;font-size:12px;">
          Reçu via le formulaire de contact ScanAvis — <a href="https://qr-optimiser.vercel.app/contact" style="color:#C9973A;text-decoration:none;">qr-optimiser.vercel.app/contact</a>
        </p>
      </div>
    </div>
  `
}

const CONTACT_RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 } // 5 / heure / IP

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = rateLimit(`contact:${ip}`, CONTACT_RATE_LIMIT)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de messages envoyés. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() } }
      )
    }

    const body = await req.json()
    const { nom, email, message } = body

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json({ error: 'Le champ nom est requis.' }, { status: 400 })
    }
    if (nom.length > INPUT_LIMITS.shortName) {
      return NextResponse.json({ error: 'Nom trop long.' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Le message ne peut pas être vide.' }, { status: 400 })
    }
    if (message.length > INPUT_LIMITS.message) {
      return NextResponse.json({ error: 'Message trop long.' }, { status: 400 })
    }

    const resend = getResend()

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'lborrelli248@gmail.com',
      subject: `Nouveau message de contact ScanAvis - ${nom.trim()}`,
      html: getContactEmailHtml(nom.trim(), email.trim(), message.trim()),
      replyTo: email.trim(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact email error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi. Réessayez ou écrivez directement à lborrelli248@gmail.com.' }, { status: 500 })
  }
}
