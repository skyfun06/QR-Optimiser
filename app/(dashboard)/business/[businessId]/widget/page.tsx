'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

const WIDGET_W = 340
const WIDGET_H = 140

export default function WidgetTabPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL ?? '')
  const [copied, setCopied] = useState(false)

  // En prod, NEXT_PUBLIC_APP_URL donne le bon domaine. Repli local sur l'origin
  // courant (via rAF pour ne pas faire de setState synchrone dans l'effet).
  useEffect(() => {
    if (origin) return
    const id = requestAnimationFrame(() => setOrigin(window.location.origin))
    return () => cancelAnimationFrame(id)
  }, [origin])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .maybeSingle<{ name: string | null }>()
      if (!cancelled) setBusinessName(data?.name ?? null)
    }
    load()
    return () => { cancelled = true }
  }, [businessId])

  const widgetUrl = origin ? `${origin}/widget/${businessId}` : ''
  const snippet = useMemo(
    () =>
      widgetUrl
        ? `<iframe src="${widgetUrl}" width="${WIDGET_W}" height="${WIDGET_H}" style="border:none;overflow:hidden;border-radius:16px" loading="lazy" title="Avis ScanAvis"></iframe>`
        : '',
    [widgetUrl]
  )

  async function handleCopy() {
    if (!snippet) return
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* silencieux */
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle={businessName} onSignOutError={(m) => setError(m)} />

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col gap-4 md:gap-6">
        {error && (
          <div className="w-full rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}

        <div>
          <h1 className="text-lg font-semibold">Widget avis</h1>
          <p className="text-sm text-[#8c8c8c]">
            Affichez votre note et votre nombre d&apos;avis sur votre site web. Copiez le code et collez-le où vous voulez.
          </p>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
          {/* Aperçu live */}
          <div className="w-full flex flex-col gap-3 bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6">
            <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Aperçu</p>
            <div className="flex-1 flex items-center justify-center py-2">
              {widgetUrl ? (
                <iframe
                  src={widgetUrl}
                  width={WIDGET_W}
                  height={WIDGET_H}
                  style={{ border: 'none', overflow: 'hidden', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                  title="Aperçu du widget ScanAvis"
                />
              ) : (
                <div className="w-[340px] h-[140px] rounded-2xl border border-dashed border-[#292929]" />
              )}
            </div>
            <p className="text-xs text-[#5c5c5c]">Le widget se met à jour automatiquement avec vos nouveaux avis.</p>
          </div>

          {/* Code à copier */}
          <div className="w-full flex flex-col gap-3 bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6">
            <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Code à intégrer</p>
            <div className="w-full bg-[#0d0d0d] border border-[#292929] rounded-xl p-3 overflow-x-auto">
              <code className="text-xs text-[#cfcfcf] font-mono whitespace-pre-wrap break-all">{snippet || '…'}</code>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!snippet}
              className={[
                'w-full min-h-[44px] flex justify-center items-center gap-2 rounded-2xl py-2.5 font-semibold text-sm cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-50',
                copied ? 'bg-[#22c55e] text-white' : 'bg-gold text-[#0d0d0d] hover:brightness-110',
              ].join(' ')}
            >
              {copied ? 'Copié ✓' : 'Copier le code'}
            </button>
            <p className="text-xs text-[#5c5c5c]">
              Collez ce code dans le HTML de votre site (pied de page, page « Avis »…). Compatible avec tous les hébergeurs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
