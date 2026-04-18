import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_EMAIL = 'lborrelli248@gmail.com'
const MONTHLY_PRICE_EUR = 19.99

type BusinessRow = {
  id: string
  user_id: string
  name: string | null
  subscription_status: 'free' | 'active' | 'canceling' | null
  created_at: string | null
}

type ScanRow = {
  business_id: string | null
  created_at: string | null
}

async function requireAdmin() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  }

  if (user.email !== ADMIN_EMAIL) {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck.error) return adminCheck.error

    const { data: businesses, error: businessesError } = await supabaseAdmin
      .from('businesses')
      .select('id,user_id,name,subscription_status,created_at')
      .order('created_at', { ascending: false })

    if (businessesError) {
      return NextResponse.json({ error: businessesError.message }, { status: 500 })
    }

    const businessRows = (businesses ?? []) as BusinessRow[]
    const totalClients = businessRows.length
    const activeClients = businessRows.filter((b) => b.subscription_status === 'active').length
    const estimatedMonthlyRevenue = activeClients * MONTHLY_PRICE_EUR

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    nextMonthStart.setHours(0, 0, 0, 0)

    const [{ count: scansThisMonthCount, error: monthCountError }, { data: scans, error: scansError }] =
      await Promise.all([
        supabaseAdmin
          .from('scans')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', nextMonthStart.toISOString()),
        supabaseAdmin.from('scans').select('business_id,created_at').order('created_at', { ascending: false }),
      ])

    if (monthCountError) {
      return NextResponse.json({ error: monthCountError.message }, { status: 500 })
    }
    if (scansError) {
      return NextResponse.json({ error: scansError.message }, { status: 500 })
    }

    const scansRows = (scans ?? []) as ScanRow[]
    const scansByBusiness = new Map<string, { totalScans: number; lastScanAt: string | null }>()

    for (const scan of scansRows) {
      if (!scan.business_id) continue
      const current = scansByBusiness.get(scan.business_id)
      if (!current) {
        scansByBusiness.set(scan.business_id, {
          totalScans: 1,
          lastScanAt: scan.created_at ?? null,
        })
      } else {
        current.totalScans += 1
      }
    }

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    const userEmailById = new Map(
      (usersData?.users ?? []).map((u) => [u.id, u.email ?? '—'])
    )

    const clients = businessRows.map((business) => {
      const scanStats = scansByBusiness.get(business.id)

      return {
        id: business.id,
        userId: business.user_id,
        name: business.name?.trim() || 'Commerce sans nom',
        email: userEmailById.get(business.user_id) ?? '—',
        subscriptionStatus: business.subscription_status ?? 'free',
        createdAt: business.created_at,
        totalScans: scanStats?.totalScans ?? 0,
        lastScanAt: scanStats?.lastScanAt ?? null,
      }
    })

    return NextResponse.json({
      kpis: {
        totalClients,
        activeClients,
        estimatedMonthlyRevenue,
        scansThisMonth: scansThisMonthCount ?? 0,
      },
      clients,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
