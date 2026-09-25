import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientIp, rateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

// Résout un code de recommandation → prénom du vendeur (actif), pour afficher
// « Tu as été recommandé par … » sur l'inscription commerçant. Public (l'appelant
// n'est pas encore connecté) et limité en débit. N'expose que le prénom.
const CODE_RE = /^[A-Za-z0-9_-]{1,64}$/

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(`resolve-code:${ip}`, { limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ found: false }, { status: 429 })

  const code = request.nextUrl.searchParams.get('code')?.trim() ?? ''
  if (!code || !CODE_RE.test(code)) return NextResponse.json({ found: false })

  const { data } = await supabaseAdmin
    .from('vendeurs')
    .select('prenom,statut')
    .eq('code', code)
    .maybeSingle<{ prenom: string | null; statut: string | null }>()

  // On ne "recommande" que par un vendeur actif.
  if (!data || data.statut !== 'actif') return NextResponse.json({ found: false })

  return NextResponse.json({ found: true, prenom: (data.prenom ?? '').trim() || null })
}
