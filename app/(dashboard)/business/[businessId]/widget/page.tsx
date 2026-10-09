'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

type VariantId = 'pill' | 'card' | 'compact' | 'banner'
type ThemeId = 'dark' | 'light'

type VariantMeta = {
  id: VariantId
  label: string
  desc: string
  w: number
  h: number
}

const VARIANTS: VariantMeta[] = [
  { id: 'pill', label: 'Barre', desc: 'Note, étoiles et nombre d’avis sur une ligne.', w: 300, h: 72 },
  { id: 'card', label: 'Carte', desc: 'Format vertical avec bouton « Laisser un avis ».', w: 320, h: 248 },
  { id: 'compact', label: 'Mini-badge', desc: 'Étoiles + note, ultra compact.', w: 220, h: 56 },
  { id: 'banner', label: 'Bannière', desc: 'Large, avec appel à l’action. Idéal pleine largeur.', w: 496, h: 104 },
]

const GRADIENT_GOLD = 'linear-gradient(135deg, #C9973A, #e6b84a)'

function Segment({
  value,
  options,
  onChange,
}: {
  value: string
  options: { id: ThemeId; label: string }[]
  onChange: (id: ThemeId) => void
}) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-[#0d0d0d] border border-[#292929] gap-1">
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.97]',
              active ? 'text-[#0d0d0d]' : 'text-[#8c8c8c] hover:text-white',
            ].join(' ')}
            style={active ? { background: GRADIENT_GOLD } : undefined}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function VariantGlyph({ id, active }: { id: VariantId; active: boolean }) {
  const c = active ? '#C9973A' : '#5c5c5c'
  const soft = active ? 'rgba(201,151,58,0.35)' : '#3a3a3a'
  return (
    <svg width="54" height="40" viewBox="0 0 54 40" fill="none" aria-hidden>
      {id === 'pill' && (
        <>
          <rect x="4" y="15" width="46" height="10" rx="5" stroke={c} strokeWidth="1.5" />
          <circle cx="12" cy="20" r="1.4" fill={c} />
          <circle cx="17" cy="20" r="1.4" fill={c} />
          <circle cx="22" cy="20" r="1.4" fill={c} />
          <rect x="30" y="18.5" width="14" height="3" rx="1.5" fill={soft} />
        </>
      )}
      {id === 'card' && (
        <>
          <rect x="16" y="3" width="22" height="34" rx="4" stroke={c} strokeWidth="1.5" />
          <rect x="21" y="8" width="12" height="4" rx="2" fill={c} />
          <rect x="20" y="15" width="14" height="2.5" rx="1.25" fill={soft} />
          <rect x="21" y="27" width="12" height="5" rx="2.5" fill={c} />
        </>
      )}
      {id === 'compact' && (
        <>
          <rect x="12" y="15" width="30" height="10" rx="5" stroke={c} strokeWidth="1.5" />
          <circle cx="19" cy="20" r="1.4" fill={c} />
          <circle cx="24" cy="20" r="1.4" fill={c} />
          <rect x="30" y="18.5" width="8" height="3" rx="1.5" fill={soft} />
        </>
      )}
      {id === 'banner' && (
        <>
          <rect x="2" y="11" width="50" height="18" rx="4" stroke={c} strokeWidth="1.5" />
          <rect x="7" y="17" width="8" height="6" rx="1.5" fill={c} />
          <rect x="19" y="18" width="14" height="2.5" rx="1.25" fill={soft} />
          <rect x="38" y="16" width="9" height="8" rx="2" fill={c} />
        </>
      )}
    </svg>
  )
}

export default function WidgetTabPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL ?? '')
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [variant, setVariant] = useState<VariantId>('pill')
  const [theme, setTheme] = useState<ThemeId>('dark')
  const [previewBg, setPreviewBg] = useState<ThemeId>('light')

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

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

  const meta = useMemo(() => VARIANTS.find((v) => v.id === variant)!, [variant])

  const widgetUrl = origin
    ? `${origin}/widget/${businessId}?variant=${variant}&theme=${theme}`
    : ''

  const snippet = useMemo(
    () =>
      widgetUrl
        ? `<iframe src="${widgetUrl}" width="${meta.w}" height="${meta.h}" style="border:none;overflow:hidden" loading="lazy" title="Avis ScanAvis"></iframe>`
        : '',
    [widgetUrl, meta.w, meta.h]
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

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-4 md:gap-6">
        {error && (
          <div className="w-full rounded-2xl bg-[#181010] border border-[#2e1515] p-4 animate-fade-in">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}

        <div className={mounted ? 'animate-fade-up' : 'opacity-0'}>
          <h1 className="text-2xl md:text-[28px] font-bold text-white leading-tight">
            Votre <span className="animate-gradient-text">widget d&apos;avis</span>
          </h1>
          <p className="text-sm text-[#8c8c8c] mt-1">
            Affichez votre note Google sur votre site. Choisissez un style, copiez le code, collez-le où vous voulez.
          </p>
        </div>

        {/* ════════ SCÈNE — aperçu live ════════ */}
        <div
          className={[
            'relative overflow-hidden rounded-3xl border border-[#292929] p-5 md:p-8',
            'flex flex-col items-center justify-center min-h-[260px] md:min-h-[300px]',
            mounted ? 'animate-fade-up stagger-1' : 'opacity-0',
          ].join(' ')}
          style={{
            background:
              previewBg === 'light'
                ? 'radial-gradient(130% 100% at 50% 0%, #fafafa 0%, #ececee 100%)'
                : 'radial-gradient(130% 100% at 50% 0%, #17171a 0%, #0b0b0c 100%)',
          }}
        >
          {/* Toggle fond d'aperçu */}
          <div className="absolute top-4 right-4 z-10">
            <Segment
              value={previewBg}
              onChange={setPreviewBg}
              options={[
                { id: 'light', label: '☀︎ Clair' },
                { id: 'dark', label: '☾ Sombre' },
              ]}
            />
          </div>
          <span
            className={[
              'absolute top-5 left-6 text-xs uppercase tracking-widest z-10',
              previewBg === 'light' ? 'text-[#9a9aa0]' : 'text-[#8c8c8c]',
            ].join(' ')}
          >
            Aperçu
          </span>

          <div className="flex-1 flex items-center justify-center w-full py-4 overflow-x-auto">
            {widgetUrl ? (
              <iframe
                key={`${variant}-${theme}`}
                src={widgetUrl}
                width={meta.w}
                height={meta.h}
                style={{ border: 'none', overflow: 'hidden', colorScheme: 'normal' }}
                title="Aperçu du widget ScanAvis"
              />
            ) : (
              <div className="skeleton rounded-2xl" style={{ width: meta.w, height: meta.h }} />
            )}
          </div>
        </div>

        {/* ════════ CONTRÔLES ════════ */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
          {/* Choix du type + thème */}
          <div
            className={[
              'w-full flex flex-col gap-5 bg-[#171717] border border-[#292929] rounded-3xl p-5 md:p-6',
              mounted ? 'animate-fade-up stagger-2' : 'opacity-0',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Type de widget</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8c8c8c]">Thème</span>
                <Segment
                  value={theme}
                  onChange={setTheme}
                  options={[
                    { id: 'dark', label: 'Sombre' },
                    { id: 'light', label: 'Clair' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VARIANTS.map((v) => {
                const active = variant === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariant(v.id)}
                    className={[
                      'group text-left flex items-start gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-[0.98]',
                      active
                        ? 'border-gold bg-[#1e1a12]'
                        : 'border-[#292929] hover:border-[#C9973A80] bg-[#0f0f0f]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'shrink-0 grid place-items-center h-12 w-16 rounded-xl border',
                        active ? 'border-[#C9973A66] bg-[#0d0d0d]' : 'border-[#292929] bg-[#0d0d0d]',
                      ].join(' ')}
                    >
                      <VariantGlyph id={v.id} active={active} />
                    </span>
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className={['text-sm font-semibold', active ? 'text-gold' : 'text-[#e5e5e5]'].join(' ')}>
                        {v.label}
                      </span>
                      <span className="text-xs text-[#8c8c8c] leading-snug">{v.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Code à intégrer */}
          <div
            className={[
              'w-full flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-3xl p-5 md:p-6',
              mounted ? 'animate-fade-up stagger-3' : 'opacity-0',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">Code à intégrer</p>
              <span className="text-[11px] text-[#5c5c5c] font-mono">{meta.w} × {meta.h}px</span>
            </div>

            <div className="w-full bg-[#0d0d0d] border border-[#292929] rounded-xl p-3 overflow-x-auto">
              <code className="text-xs text-[#cfcfcf] font-mono whitespace-pre-wrap break-all">
                {snippet || '…'}
              </code>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!snippet}
              className={[
                'w-full min-h-[48px] flex justify-center items-center gap-2 rounded-2xl py-3 font-bold text-sm cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50',
                copied ? 'bg-[#22c55e] text-white' : 'bg-gold text-[#0d0d0d]',
              ].join(' ')}
            >
              {copied ? (
                'Copié ✓'
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copier le code
                </>
              )}
            </button>

            <div className="w-full rounded-xl bg-[#0f0f0f] border border-[#242424] p-4 flex flex-col gap-2">
              <p className="text-xs text-[#8c8c8c] leading-relaxed">
                Collez ce code dans le HTML de votre site (pied de page, page « Avis »…). Compatible avec
                tous les hébergeurs — le widget se met à jour automatiquement.
              </p>
              {widgetUrl && (
                <a
                  href={widgetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold font-semibold hover:underline inline-flex items-center gap-1 w-fit"
                >
                  Ouvrir l&apos;aperçu dans un onglet
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 17 17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
