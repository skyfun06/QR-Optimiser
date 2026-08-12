import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from '@/lib/security'
import { hasAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'

// =========================================================================
// GARDE-FOUS ANTI-SPAM — AJUSTABLES ICI
// -------------------------------------------------------------------------
//   • INACTIVITY_DAYS_THRESHOLD : nombre de jours sans AUCUN scan (tous
//     qr_type confondus) avant de déclencher un rappel.
//   • REMINDER_COOLDOWN_DAYS    : délai minimum entre deux rappels envoyés au
//     MÊME commerce, même s'il reste inactif (évite de le spammer).
//
// Un commerce est éligible si :
//   (aucun scan OU dernier scan > INACTIVITY_DAYS_THRESHOLD jours)
//   ET (jamais rappelé OU dernier rappel > REMINDER_COOLDOWN_DAYS jours)
// =========================================================================
const INACTIVITY_DAYS_THRESHOLD = 7
const REMINDER_COOLDOWN_DAYS = 14

// =========================================================================
// EXPÉDITEUR — à changer en UN SEUL endroit dès que le domaine Resend est
// vérifié (remplacer par ex. 'ScanAvis <hello@votre-domaine.fr>'). Tant que le
// domaine n'est pas validé, onboarding@resend.dev (bac-à-sable Resend) reste en
// place, avec une délivrabilité limitée.
// =========================================================================
const EMAIL_FROM_ADDRESS = 'ScanAvis <onboarding@resend.dev>'

const DAY_MS = 86_400_000

// Client Supabase en service role (BYPASSRLS) — mêmes clés que notify-feedback.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Resend instancié paresseusement pour ne pas casser `next build` si la clé
// n'est pas présente à la phase de collecte des pages.
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

type BusinessRow = {
  id: string
  name: string | null
  user_id: string
  subscription_status: string | null
  trial_ends_at: string | null
  last_scan_reminder_sent_at: string | null
}

function reminderEmailHtml(businessName: string, dashboardUrl: string) {
  const safeName = escapeHtml(businessName)
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0d0d0d; color: white; border-radius: 12px;">
      <h1 style="color: #C9973A; font-size: 24px; margin-bottom: 8px;">ScanAvis</h1>
      <p style="color: #8c8c8c; margin-bottom: 32px;">Petit rappel</p>

      <div style="background: #171717; border: 1px solid #292929; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="color: #8c8c8c; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Commerce</p>
        <p style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 0;">${safeName}</p>
      </div>

      <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        Bonjour,
      </p>
      <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        On a remarqué que votre QR code n'a pas été scanné ces derniers jours — rien d'inquiétant&nbsp;! Souvent, il suffit de le remettre bien en évidence pour que les avis repartent.
      </p>
      <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Quelques idées&nbsp;: sur le comptoir, à côté de la caisse, sur les tables ou glissé dans l'addition. Un client met quelques secondes à le scanner, et chaque avis compte pour votre visibilité sur Google.
      </p>

      <a href="${dashboardUrl}"
         style="display: inline-block; background: #C9973A; color: #12100e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Ouvrir mon tableau de bord →
      </a>

      <p style="color: #5c5c5c; font-size: 12px; margin-top: 32px;">
        Vous recevez cet email car vous utilisez ScanAvis.
      </p>
    </div>
  `
}

export async function GET(req: NextRequest) {
  // --- Sécurité : Vercel Cron ajoute automatiquement le header
  //     `Authorization: Bearer <CRON_SECRET>` à ses appels dès qu'une variable
  //     d'env CRON_SECRET existe sur le projet. Toute requête sans ce secret est
  //     rejetée (empêche un déclenchement manuel non autorisé de l'envoi).
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = Date.now()
  const inactivityCutoff = now - INACTIVITY_DAYS_THRESHOLD * DAY_MS
  const cooldownCutoff = now - REMINDER_COOLDOWN_DAYS * DAY_MS
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  let checked = 0
  let sent = 0
  let failures = 0

  try {
    // 1. Tous les commerces + champs nécessaires au filtrage.
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('id,name,user_id,subscription_status,trial_ends_at,last_scan_reminder_sent_at')
    if (bizError) {
      return NextResponse.json({ error: bizError.message }, { status: 500 })
    }

    for (const b of (businesses ?? []) as BusinessRow[]) {
      // 2. Statut effectif trial/active uniquement (exclut les essais expirés
      //    non réécrits en base) — même logique que le reste de l'app.
      if (!hasAccess({ subscription_status: b.subscription_status, trial_ends_at: b.trial_ends_at })) {
        continue
      }
      checked += 1

      try {
        // 3. Cooldown (in-memory, peu coûteux) : on écarte tout de suite les
        //    commerces rappelés récemment avant d'aller interroger les scans.
        const lastReminder = b.last_scan_reminder_sent_at
          ? new Date(b.last_scan_reminder_sent_at).getTime()
          : null
        if (lastReminder !== null && lastReminder > cooldownCutoff) {
          continue
        }

        // 4. Dernier scan (tous qr_type confondus). Absent = jamais scanné.
        const { data: lastScan, error: scanError } = await supabase
          .from('scans')
          .select('created_at')
          .eq('business_id', b.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle<{ created_at: string | null }>()
        if (scanError) throw scanError

        const lastScanMs = lastScan?.created_at ? new Date(lastScan.created_at).getTime() : null
        const isInactive = lastScanMs === null || lastScanMs < inactivityCutoff
        if (!isInactive) {
          continue
        }

        // 5. Email du propriétaire (même mécanisme que notify-feedback).
        const { data: userData } = await supabase.auth.admin.getUserById(b.user_id)
        const ownerEmail = userData?.user?.email
        if (!ownerEmail) {
          console.error(`[scan-reminders] owner email not found for business ${b.id}`)
          failures += 1
          continue
        }

        // 6. Envoi du rappel.
        const resend = getResend()
        await resend.emails.send({
          from: EMAIL_FROM_ADDRESS,
          to: ownerEmail,
          subject: `Un petit rappel pour ${b.name?.trim() || 'votre commerce'} 👋`,
          html: reminderEmailHtml(b.name?.trim() || 'Votre commerce', `${appUrl}/business/${b.id}`),
        })

        // 7. Marque le rappel comme envoyé (anti-spam via le cooldown).
        const { error: updateError } = await supabase
          .from('businesses')
          .update({ last_scan_reminder_sent_at: new Date().toISOString() })
          .eq('id', b.id)
        if (updateError) throw updateError

        sent += 1
      } catch (e) {
        // Un échec sur un commerce ne doit jamais interrompre les autres.
        console.error(`[scan-reminders] failed for business ${b.id}:`, e)
        failures += 1
      }
    }

    return NextResponse.json({ checked, sent, failures })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    console.error('[scan-reminders] fatal:', message)
    return NextResponse.json({ error: message, checked, sent, failures }, { status: 500 })
  }
}
