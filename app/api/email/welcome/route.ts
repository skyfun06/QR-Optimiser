import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function getWelcomeEmailHtml(businessName?: string) {
  const safeBusinessName =
    businessName && businessName.trim().length > 0
      ? escapeHtml(businessName.trim())
      : 'votre commerce'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return `
    <div style="margin:0;padding:32px 16px;background:#0d0d0d;color:#ffffff;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#171717;border:1px solid #292929;border-radius:16px;padding:32px;">
        <p style="margin:0 0 16px 0;color:#C9973A;font-size:26px;font-weight:700;letter-spacing:0.5px;">ScanAvis</p>
        <h1 style="margin:0 0 14px 0;color:#ffffff;font-size:32px;line-height:1.2;">Bienvenue sur ScanAvis !</h1>
        <p style="margin:0 0 26px 0;color:#d4d4d4;font-size:16px;line-height:1.6;">
          Votre compte pour <strong style="color:#ffffff;">${safeBusinessName}</strong> est cree. Vous etes a quelques minutes de recevoir vos premiers avis Google.
        </p>

        <div style="background:#0f0f0f;border:1px solid #262626;border-radius:12px;padding:20px 18px;margin-bottom:28px;">
          <p style="margin:0 0 10px 0;color:#C9973A;font-size:14px;font-weight:600;">Etapes rapides</p>
          <p style="margin:0;color:#f0f0f0;font-size:15px;line-height:1.8;">
            🏪 1. Configurez votre commerce<br />
            📥 2. Telechargez votre QR code<br />
            ⭐ 3. Commencez a recevoir des avis
          </p>
        </div>

        <a href="${appUrl}/dashboard"
           style="display:inline-block;background:#C9973A;color:#12100e;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;">
          Acceder a mon dashboard
        </a>

        <p style="margin:26px 0 0 0;color:#8c8c8c;font-size:12px;line-height:1.5;">
          Propulse par ScanAvis • <a href="${appUrl}/settings" style="color:#C9973A;text-decoration:none;">Se desabonner</a>
        </p>
      </div>
    </div>
  `
}

export async function POST(req: NextRequest) {
  try {
    const { email, businessName } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    const resend = getResend()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const from = process.env.RESEND_FROM ?? 'ScanAvis <noreply@scanavis.fr>'

    await resend.emails.send({
      from,
      to: email,
      subject: 'Bienvenue sur ScanAvis 🌟',
      html: getWelcomeEmailHtml(typeof businessName === 'string' ? businessName : undefined),
      tags: [{ name: 'type', value: 'welcome-signup' }],
      headers: {
        'List-Unsubscribe': `<${appUrl}/settings>`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Welcome email error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
