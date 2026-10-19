import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientIp, rateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

// Résout un code saisi / reçu sur /activation pour afficher « Vous avez été
// recommandé par … ». Couvre les deux familles de codes (uniques entre elles) :
// parrain commerçant (nom du commerce) et vendeur actif (prénom). Public car
// l'appelant n'est pas encore connecté, limité en débit, n'expose que ce nom.
const CODE_RE = /^[A-Za-z0-9_-]{1,64}$/

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(`referral-resolve:${ip}`, { limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ found: false }, { status: 429 })

  const code = request.nextUrl.searchParams.get('code')?.trim() ?? ''
  if (!code || !CODE_RE.test(code)) return NextResponse.json({ found: false })

  const { data: referrer } = await supabaseAdmin
    .from('referrers')
    .select('name,business_id')
    .eq('code', code)
    .maybeSingle<{ name: string | null; business_id: string | null }>()

  if (referrer) {
    let label = referrer.name?.trim() || null
    if (referrer.business_id) {
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('name')
        .eq('id', referrer.business_id)
        .maybeSingle<{ name: string | null }>()
      label = biz?.name?.trim() || label
    }
    return NextResponse.json({
      found: true,
      kind: referrer.business_id ? 'commerce' : 'parrain',
      label: label || 'un commerçant ScanAvis',
    })
  }

  const { data: vendeur } = await supabaseAdmin
    .from('vendeurs')
    .select('prenom,statut')
    .eq('code', code)
    .maybeSingle<{ prenom: string | null; statut: string | null }>()

  // On ne « recommande » que par un vendeur actif.
  if (vendeur && vendeur.statut === 'actif') {
    return NextResponse.json({ found: true, kind: 'vendeur', label: vendeur.prenom?.trim() || 'un vendeur ScanAvis' })
  }

  return NextResponse.json({ found: false })
}
