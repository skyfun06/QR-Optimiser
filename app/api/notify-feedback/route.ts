import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// ⚠️ On instancie Resend à l'intérieur du handler pour éviter un crash lors de la
// phase "Collecting page data" de next build si RESEND_API_KEY n'est pas défini.
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { business_id, rating, message } = await req.json()

    if (!business_id || !rating || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('name, user_id')
      .eq('id', business_id)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: userData } = await supabase.auth.admin.getUserById(business.user_id)
    const ownerEmail = userData?.user?.email

    if (!ownerEmail) {
      return NextResponse.json({ error: 'Owner email not found' }, { status: 404 })
    }

    const stars = '⭐'.repeat(rating)

    const resend = getResend()

    await resend.emails.send({
      from: 'ScanAvis <onboarding@resend.dev>',
      to: "loulou181208@gmail.com",
      subject: `⚠️ Nouveau feedback négatif — ${business.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0d0d0d; color: white; border-radius: 12px;">
          <h1 style="color: #C9973A; font-size: 24px; margin-bottom: 8px;">ScanAvis</h1>
          <p style="color: #8c8c8c; margin-bottom: 32px;">Notification feedback</p>

          <div style="background: #171717; border: 1px solid #292929; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #8c8c8c; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Commerce</p>
            <p style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 0;">${business.name}</p>
          </div>

          <div style="background: #171717; border: 1px solid #292929; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #8c8c8c; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Note</p>
            <p style="font-size: 24px; margin-bottom: 0;">${stars} ${rating}/5</p>
          </div>

          <div style="background: #171717; border: 1px solid #292929; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <p style="color: #8c8c8c; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Message du client</p>
            <p style="color: white; font-size: 16px; line-height: 1.6; margin-bottom: 0;">"${message}"</p>
          </div>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/feedback-history"
             style="display: inline-block; background: #C9973A; color: #12100e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Voir dans le dashboard →
          </a>

          <p style="color: #5c5c5c; font-size: 12px; margin-top: 32px;">
            Vous recevez cet email car vous êtes abonné à ScanAvis.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Notify feedback error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
