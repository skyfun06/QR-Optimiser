'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .biz-fade { animation: fadeUp 0.45s ease-out both; }
  .biz-card { transition: border-color 0.2s ease, transform 0.2s ease; }
  .biz-card:hover { border-color: #C9973A !important; transform: translateY(-2px); }
  @media (prefers-reduced-motion: reduce) {
    .biz-fade { animation: none; opacity: 1; transform: none; }
    .biz-card:hover { transform: none; }
  }
`

const STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

type BusinessRow = { id: string; name: string | null; created_at: string | null }
type ReviewRow = { rating: number | null; business_id: string | null; created_at: string | null }

type BizStats = { avisMois: number; note: number | null }

function GoldStar({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#C9973A" stroke="none" aria-hidden>
      <path d={STAR_PATH} />
    </svg>
  )
}

export default function BusinessesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businesses, setBusinesses] = useState<BusinessRow[]>([])
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [scansCount, setScansCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr) throw userErr
        if (!user) { if (!cancelled) setError('Vous devez être connecté.'); return }

        const { data: biz, error: bizErr } = await supabase
          .from('businesses')
          .select('id,name,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
        if (bizErr) throw bizErr

        const list = (biz as BusinessRow[] | null) ?? []

        // Un seul commerce → on va direct à son dashboard (pas de clic inutile).
        if (list.length === 1) {
          router.replace(`/business/${list[0].id}`)
          return
        }
        if (!cancelled) setBusinesses(list)
        if (list.length === 0) { if (!cancelled) setLoading(false); return }

        const ids = list.map((b) => b.id)
        const [{ data: rev, error: revErr }, { count: scanCount, error: scanErr }] = await Promise.all([
          supabase.from('reviews').select('rating,business_id,created_at').in('business_id', ids),
          supabase.from('scans').select('id', { count: 'exact', head: true }).in('business_id', ids),
        ])
        if (revErr) throw revErr
        if (scanErr) throw scanErr
        if (!cancelled) {
          setReviews((rev as ReviewRow[] | null) ?? [])
          setScansCount(scanCount ?? 0)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  /* Agrégat global */
  const overview = useMemo(() => {
    const ratings = reviews.map((r) => r.rating).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    const avg = ratings.length ? ratings.reduce((a, v) => a + v, 0) / ratings.length : null
    return { totalAvis: reviews.length, note: avg, totalScans: scansCount }
  }, [reviews, scansCount])

  /* Métriques par commerce */
  const statsByBiz = useMemo(() => {
    const now = new Date()
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const map = new Map<string, BizStats>()
    for (const b of businesses) map.set(b.id, { avisMois: 0, note: null })
    const sums = new Map<string, { sum: number; n: number }>()
    for (const r of reviews) {
      if (!r.business_id) continue
      const s = map.get(r.business_id)
      if (!s) continue
      if (r.created_at && new Date(r.created_at).getTime() >= mStart) s.avisMois++
      if (typeof r.rating === 'number' && Number.isFinite(r.rating)) {
        const acc = sums.get(r.business_id) ?? { sum: 0, n: 0 }
        acc.sum += r.rating; acc.n++
        sums.set(r.business_id, acc)
      }
    }
    for (const [id, acc] of sums) {
      const s = map.get(id)
      if (s) s.note = acc.n ? acc.sum / acc.n : null
    }
    return map
  }, [businesses, reviews])

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <style>{STYLES}</style>
      <DashboardHeader subtitle="Mes commerces" onSignOutError={(m) => setError(m)} />

      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 flex flex-col gap-4 md:gap-6 py-6 md:py-8">
        {error && (
          <div className="w-full rounded-2xl bg-[#181010] border border-[#2e1515] p-4 md:p-6">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="w-full rounded-2xl bg-[#171717] border border-[#222222] p-6">
            <p className="text-[#8c8c8c] text-sm">Chargement…</p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="w-full rounded-2xl bg-[#171717] border border-[#292929] p-8 flex flex-col items-start gap-4 biz-fade">
            <div>
              <h2 className="text-lg font-semibold mb-1">Aucun commerce pour le moment</h2>
              <p className="text-sm text-[#8c8c8c]">Ajoutez votre premier commerce pour générer votre QR code et suivre vos avis.</p>
            </div>
            <Link href="/businesses/new" className="inline-flex items-center gap-2 bg-gold text-[#0d0d0d] font-semibold rounded-2xl px-4 py-2.5 text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98]">
              + Ajouter un commerce
            </Link>
          </div>
        ) : (
          <>
            {/* En-tête + bouton ajouter */}
            <div className="w-full flex items-center justify-between flex-wrap gap-3 biz-fade">
              <p className="text-sm text-[#8c8c8c]">Vue d&apos;ensemble · <span className="text-[#e5e5e5]">{businesses.length} commerces</span></p>
              <Link href="/businesses/new" className="inline-flex items-center gap-2 text-sm text-[#8c8c8c] border border-[#292929] rounded-2xl px-3 md:px-4 py-2 min-h-[40px] transition-colors duration-200 hover:text-white hover:border-[#3a3a3a]">
                + Ajouter un commerce
              </Link>
            </div>

            {/* Vue d'ensemble agrégée */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6 biz-fade">
              {[
                { label: 'Total des avis', value: String(overview.totalAvis), gold: false },
                { label: 'Note moyenne', value: overview.note != null ? `${overview.note.toFixed(1)}★` : '—', gold: true },
                { label: 'Total des scans', value: String(overview.totalScans), gold: false },
              ].map(({ label, value, gold }) => (
                <div key={label} className="w-full flex flex-col items-start bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6 gap-1.5">
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">{label}</p>
                  <p className={`text-3xl md:text-4xl font-bold ${gold ? 'text-gold' : 'text-white'}`}>{value}</p>
                  <p className="text-xs text-[#666]">tous commerces confondus</p>
                </div>
              ))}
            </div>

            {/* Cards par commerce */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
              {businesses.map((b) => {
                const s = statsByBiz.get(b.id)
                return (
                  <Link
                    key={b.id}
                    href={`/business/${b.id}`}
                    className="biz-card biz-fade w-full flex flex-col items-start bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6 gap-4 cursor-pointer"
                  >
                    <div className="w-full flex items-start justify-between gap-2">
                      <p className="text-base md:text-lg font-semibold text-white truncate">{b.name?.trim() || 'Commerce sans nom'}</p>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 mt-1">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                    <div className="w-full flex items-center gap-5">
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-white">{s?.avisMois ?? 0}</span>
                        <span className="text-xs text-[#8c8c8c]">avis ce mois</span>
                      </div>
                      <div className="w-px self-stretch bg-[#292929]" />
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-xl font-bold text-gold">
                          {s?.note != null ? s.note.toFixed(1) : '—'}
                          {s?.note != null && <GoldStar size={15} />}
                        </span>
                        <span className="text-xs text-[#8c8c8c]">note moyenne</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
