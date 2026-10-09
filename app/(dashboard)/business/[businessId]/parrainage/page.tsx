'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

// Domaine de production réel (jamais localhost) : le lien de parrainage doit
// être partageable tel quel par le commerçant.
const REFERRAL_BASE_URL = 'https://qrscanavis.fr/activation'

type BusinessRow = { id: string; name: string | null }
type ReferrerRow = { code: string | null }

const STEPS: { title: string; desc: string }[] = [
  { title: 'Partagez votre lien', desc: 'Envoyez-le à un autre commerçant (SMS, email, en personne…).' },
  { title: 'Il crée son compte', desc: 'Il s’inscrit sur ScanAvis depuis votre lien personnel.' },
  { title: 'Vous êtes récompensé', desc: 'Dès qu’il passe à un abonnement payant, vous touchez une commission.' },
]

export default function ParrainagePage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) { if (!cancelled) setError('Vous devez être connecté.'); return }

        // Commerce (nom) + sa ligne referrers (code) — lecture directe :
        // la policy RLS referrers_select_own restreint déjà à SON commerce.
        const [{ data: biz, error: bizError }, { data: referrer, error: refError }] = await Promise.all([
          supabase.from('businesses').select('id,name').eq('id', businessId).maybeSingle<BusinessRow>(),
          supabase.from('referrers').select('code').eq('business_id', businessId).maybeSingle<ReferrerRow>(),
        ])
        if (bizError) throw bizError
        if (refError) throw refError
        if (!cancelled) {
          setBusiness(biz ?? null)
          setCode(referrer?.code ?? null)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [businessId])

  const referralLink = code ? `${REFERRAL_BASE_URL}?ref=${code}` : ''

  async function handleCopy() {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback silencieux : sur navigateur bloquant le presse-papier, on
      // n'affiche pas d'erreur (le lien reste sélectionnable à la main).
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle={business?.name ?? null} onSignOutError={(m) => setError(m)} />

      <div className="w-full max-w-3xl mx-auto px-4 md:px-8 flex flex-col gap-4 md:gap-6 py-6 md:py-10">
        {error && (
          <div className="w-full rounded-2xl bg-[#181010] border border-[#2e1515] p-4 animate-fade-in">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}

        {loading ? (
          <>
            <div className="skeleton w-full h-44 rounded-3xl" />
            <div className="skeleton w-full h-28 rounded-2xl" />
            <div className="skeleton w-full h-40 rounded-2xl" />
          </>
        ) : (
          <>
            {/* ════════ HERO ════════ */}
            <div
              className={[
                'relative overflow-hidden rounded-3xl border border-[#292929] p-6 md:p-8',
                mounted ? 'animate-fade-up' : 'opacity-0',
              ].join(' ')}
              style={{ background: 'radial-gradient(120% 140% at 85% -10%, rgba(201,151,58,0.14) 0%, transparent 55%), linear-gradient(160deg, #181818, #101010)' }}
            >
              {/* Cadeau flottant */}
              <span
                aria-hidden
                className="absolute -top-2 right-5 md:right-8 grid place-items-center h-16 w-16 rounded-2xl bg-[#C9973A]/10 text-gold animate-float"
                style={{ boxShadow: '0 0 40px -8px rgba(201,151,58,0.4)' }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="8" width="18" height="4" rx="1" />
                  <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                  <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
                </svg>
              </span>

              <div className="relative flex flex-col gap-3 max-w-[85%]">
                <span className="inline-flex items-center gap-2 self-start rounded-full px-2.5 py-1 text-xs font-medium bg-[#C9973A]/10 border border-[#C9973A]/30 text-gold">
                  Programme de parrainage
                </span>
                <h1 className="text-2xl md:text-[30px] font-bold text-white leading-tight">
                  Recommandez ScanAvis,<br className="hidden sm:block" /> soyez <span className="animate-gradient-text">récompensé</span>
                </h1>
                <p className="text-sm text-[#a9a9a9] leading-relaxed">
                  Partagez votre lien personnel aux autres commerçants. Dès qu&apos;un filleul devient
                  client payant, vous touchez une commission sur son abonnement — sans limite de filleuls.
                </p>
              </div>
            </div>

            {code ? (
              <>
                {/* ════════ CODE ════════ */}
                <div className={['w-full bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-3', mounted ? 'animate-fade-up stagger-1' : 'opacity-0'].join(' ')}>
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Votre code</p>
                  <div className="relative inline-flex items-center justify-center self-start rounded-2xl bg-[#0d0d0d] border border-dashed border-[#C9973A]/40 px-6 py-4 overflow-hidden">
                    <span
                      aria-hidden
                      className="absolute top-0 left-0 h-full w-1/3 animate-sheen pointer-events-none"
                      style={{ background: 'linear-gradient(100deg, transparent, rgba(201,151,58,0.14), transparent)' }}
                    />
                    <span className="relative text-3xl md:text-4xl font-bold tracking-[0.24em] text-gold font-mono">{code}</span>
                  </div>
                </div>

                {/* ════════ LIEN ════════ */}
                <div className={['w-full bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-3', mounted ? 'animate-fade-up stagger-2' : 'opacity-0'].join(' ')}>
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Votre lien à partager</p>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2 bg-[#0d0d0d] border border-[#292929] px-3 rounded-xl">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <input
                        readOnly
                        value={referralLink}
                        onFocus={(e) => e.currentTarget.select()}
                        className="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-[#c7c7c7] font-mono cursor-default select-all focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={[
                        'shrink-0 min-h-[46px] px-5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer active:scale-[0.97] whitespace-nowrap hover:brightness-110',
                        copied ? 'bg-[#22c55e] text-white' : 'bg-gold text-[#12100e]',
                      ].join(' ')}
                    >
                      {copied ? 'Lien copié ✓' : 'Copier le lien'}
                    </button>
                  </div>
                </div>

                {/* ════════ COMMENT ÇA MARCHE ════════ */}
                <div className={['w-full bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-6 flex flex-col gap-4', mounted ? 'animate-fade-up stagger-3' : 'opacity-0'].join(' ')}>
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Comment ça marche</p>
                  <div className="flex flex-col gap-4">
                    {STEPS.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 grid place-items-center h-7 w-7 shrink-0 rounded-full text-[13px] font-bold text-[#0d0d0d]"
                          style={{ background: 'linear-gradient(135deg, #C9973A, #e6b84a)', boxShadow: '0 4px 12px -4px rgba(201,151,58,0.6)' }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-[#e5e5e5]">{step.title}</p>
                          <p className="text-xs text-[#8c8c8c] leading-snug">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className={['w-full rounded-2xl border border-dashed border-[#292929] bg-[#171717] p-8 text-center flex flex-col items-center gap-3', mounted ? 'animate-fade-up stagger-1' : 'opacity-0'].join(' ')}>
                <span className="w-6 h-6 rounded-full border-2 border-[#333] border-t-gold animate-spin" />
                <p className="text-sm text-[#8c8c8c] max-w-sm">
                  Votre code de parrainage est en cours de génération. Revenez dans un instant ;
                  s&apos;il n&apos;apparaît toujours pas, contactez le support.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
