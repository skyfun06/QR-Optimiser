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

export default function ParrainagePage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

      <div className="w-full max-w-3xl mx-auto px-4 md:px-8 flex flex-col gap-4 md:gap-6 py-6 md:py-8">
        {error && (
          <div className="w-full rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="w-full rounded-2xl bg-[#171717] border border-[#292929] p-6">
            <p className="text-sm text-[#8c8c8c]">Chargement…</p>
          </div>
        ) : (
          <div className="w-full bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-8 flex flex-col gap-6">
            {/* En-tête */}
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 self-start rounded-full px-2.5 py-1 text-xs font-medium bg-[#3a2f1d] border border-[#C9973A]/40 text-gold">
                Programme de parrainage
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-white">Recommandez ScanAvis, soyez récompensé</h1>
              <p className="text-sm text-[#8c8c8c] leading-relaxed">
                Vous connaissez d&apos;autres patrons de commerce&nbsp;? Partagez-leur votre lien
                personnel. Dès qu&apos;un commerce que vous avez parrainé devient client payant,
                vous touchez une commission sur son abonnement. Simple, et sans limite de filleuls.
              </p>
            </div>

            <hr className="border-0 h-px bg-[#292929]" />

            {code ? (
              <>
                {/* Code de parrainage */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Votre code</p>
                  <div className="inline-flex items-center self-start rounded-xl bg-[#0d0d0d] border border-[#292929] px-4 py-3">
                    <span className="text-2xl md:text-3xl font-bold tracking-[0.2em] text-gold font-mono">{code}</span>
                  </div>
                </div>

                {/* Lien complet + copie */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Votre lien à partager</p>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                      readOnly
                      value={referralLink}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 bg-[#0d0d0d] border border-dashed border-[#292929] px-3 py-2.5 rounded-xl text-sm text-[#c7c7c7] font-mono cursor-default select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={[
                        'shrink-0 min-h-[44px] px-5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.97] whitespace-nowrap',
                        copied
                          ? 'bg-[#22c55e] border-[#22c55e] text-white'
                          : 'bg-gold border-gold text-[#12100e] hover:brightness-110',
                      ].join(' ')}
                    >
                      {copied ? 'Lien copié ✓' : 'Copier le lien'}
                    </button>
                  </div>
                </div>

                {/* Comment ça marche */}
                <div className="w-full bg-[#0f0f0f] border border-[#292929] rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Comment ça marche</p>
                  <ol className="flex flex-col gap-2.5">
                    {[
                      'Partagez votre lien à un autre commerçant.',
                      "Il crée son compte ScanAvis depuis votre lien.",
                      "S'il passe à un abonnement payant, vous êtes récompensé.",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-[#3a2f1d] border border-[#C9973A]/40 text-gold text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-[#c7c7c7] leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            ) : (
              <div className="w-full rounded-xl border border-dashed border-[#292929] p-6 text-center">
                <p className="text-sm text-[#8c8c8c]">
                  Votre code de parrainage est en cours de génération. Revenez dans un instant&nbsp;;
                  s&apos;il n&apos;apparaît toujours pas, contactez le support.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
