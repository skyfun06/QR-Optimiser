'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

type BusinessRow = {
  id: string
  name: string | null
}

// Position du carré blanc « QR CODE » dans public/images/plaque.png
// (mesuré au pixel près sur l'image 500×499). Le QR réel s'incruste ici.
const QR_BOX = {
  left: '35.4%',
  top: '35.27%',
  size: '29.2%',
} as const

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'commerce'
  )
}

const STEPS: { title: string; desc: string }[] = [
  { title: 'Affichez la plaque', desc: 'Posez-la sur votre comptoir, une table ou une vitrine.' },
  { title: 'Vos clients scannent', desc: 'Un simple scan du QR code, aucune application requise.' },
  { title: 'Vous récoltez des avis', desc: 'Ils arrivent directement sur votre page d’avis Google.' },
]

export default function QrCodePage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [origin, setOrigin] = useState('')

  const [copiedUrl, setCopiedUrl] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const posterRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) {
          if (!cancelled) setError('Vous devez être connecté.')
          return
        }

        const { data, error: bizError } = await supabase
          .from('businesses')
          .select('id,name')
          .eq('id', businessId)
          .maybeSingle<BusinessRow>()

        if (bizError) throw bizError
        if (!cancelled) setBusiness(data ?? null)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
        if (!cancelled) setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [businessId])

  // Destination unique : la page d'avis Google du commerce.
  const qrTargetUrl = useMemo(() => {
    if (!business || !origin) return ''
    return `${origin}/review/${business.id}`
  }, [business, origin])

  async function handleCopyUrl() {
    if (!qrTargetUrl) return
    try {
      await navigator.clipboard.writeText(qrTargetUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch {
      // fallback silencieux
    }
  }

  async function handleDownload() {
    if (!business || !qrTargetUrl || !posterRef.current) return
    setDownloading(true)
    setError(null)
    setSuccess(null)
    try {
      const html2canvas = (await import('html2canvas')).default
      const node = posterRef.current
      const canvas = await html2canvas(node, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        width: node.offsetWidth,
        height: node.offsetHeight,
      })
      const link = document.createElement('a')
      link.download = `affiche-${slugify(business.name ?? 'commerce')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setSuccess('Affiche téléchargée !')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Téléchargement impossible.'
      setError(message)
    } finally {
      setDownloading(false)
    }
  }

  const gradientGold = 'linear-gradient(135deg, #C9973A, #e6b84a)'

  // La plaque + le QR réel incrusté dans le carré blanc (capturé tel quel au PDF/PNG).
  const poster = (
    <div ref={posterRef} className="relative w-full max-w-[440px] aspect-square select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/plaque.png"
        alt="Affiche QR ScanAvis"
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        draggable={false}
      />
      <div
        className="absolute flex items-center justify-center"
        style={{ left: QR_BOX.left, top: QR_BOX.top, width: QR_BOX.size, height: QR_BOX.size }}
      >
        {qrTargetUrl ? (
          <QRCodeSVG
            value={qrTargetUrl}
            size={256}
            bgColor="#ffffff"
            fgColor="#111111"
            level="H"
            style={{ width: '88%', height: '88%' }}
          />
        ) : null}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle={business?.name ?? null} onSignOutError={(message) => setError(message)} />

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 flex flex-col items-center gap-3 md:gap-5 py-6 md:py-10">
        {error && (
          <div className="w-full rounded-2xl bg-[#181010] border border-[#2e1515] p-4 animate-fade-in">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}
        {success && (
          <div className="w-full rounded-2xl bg-[#171717] border border-[#292929] p-4 animate-fade-in">
            <p className="text-sm font-medium text-[#39d98a]">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="skeleton w-full aspect-square rounded-3xl" />
            <div className="skeleton w-full h-[420px] rounded-3xl" />
          </div>
        ) : !business ? (
          <div className="rounded-2xl bg-[#171717] p-6 border border-[#292929] max-w-xl animate-scale-in">
            <h2 className="text-lg font-semibold mb-2">Configurez d&apos;abord votre commerce</h2>
            <p className="text-sm text-[#8c8c8c] mb-4">
              Nous avons besoin d&apos;un commerce associé à votre compte pour générer votre affiche.
            </p>
            <Link
              href={`/business/${businessId}/settings`}
              className="inline-flex text-gold font-semibold transition-all duration-200 hover:underline active:scale-[0.98]"
            >
              Aller aux paramètres →
            </Link>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 lg:grid-cols-[1.02fr_1fr] gap-4 lg:gap-6 items-stretch">
            {/* ════════ SCÈNE — plaque mise en valeur ════════ */}
            <div
              className={[
                'relative overflow-hidden rounded-3xl border border-[#292929] bg-gradient-to-b from-[#161616] to-[#101010] p-6 md:p-8',
                'flex flex-col items-center justify-center min-h-[380px] md:min-h-[520px]',
                mounted ? 'animate-fade-up' : 'opacity-0',
              ].join(' ')}
            >
              {/* Halo doré radial */}
              <div
                aria-hidden
                className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[115%] aspect-square rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(201,151,58,0.20) 0%, rgba(201,151,58,0.07) 34%, transparent 62%)',
                }}
              />
              {/* Anneaux pointillés en rotation lente */}
              <svg
                aria-hidden
                className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[135%] max-w-none aspect-square animate-spin-slow pointer-events-none"
                viewBox="0 0 100 100"
                fill="none"
                stroke="#C9973A"
                strokeWidth="0.25"
                strokeOpacity="0.28"
                strokeDasharray="2.4 5"
              >
                <circle cx="50" cy="50" r="49" />
                <circle cx="50" cy="50" r="38" strokeDasharray="1 6" strokeOpacity="0.18" />
              </svg>
              {/* Étoiles flottantes (clin d'œil aux avis) */}
              {[
                { top: '14%', left: '16%', size: 16, delay: '0s', o: 0.3 },
                { top: '22%', left: '82%', size: 12, delay: '1.1s', o: 0.22 },
                { top: '78%', left: '20%', size: 13, delay: '1.9s', o: 0.22 },
                { top: '72%', left: '84%', size: 18, delay: '0.6s', o: 0.28 },
              ].map((s, i) => (
                <svg
                  key={i}
                  aria-hidden
                  className="absolute animate-float pointer-events-none"
                  style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay, opacity: s.o }}
                  viewBox="0 0 24 24"
                  fill="#C9973A"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
              {/* Balayage lumineux */}
              <span
                aria-hidden
                className="absolute top-0 left-0 h-full w-1/3 animate-sheen pointer-events-none"
                style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.06), transparent)' }}
              />

              {/* Label */}
              <p className="absolute top-5 left-6 text-xs uppercase tracking-widest text-[#8c8c8c] z-10">
                Votre affiche
              </p>

              {/* Plaque flottante + ombre au sol */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className="animate-float"
                  style={{ filter: 'drop-shadow(0 26px 50px rgba(0,0,0,0.65)) drop-shadow(0 0 48px rgba(201,151,58,0.14))' }}
                >
                  {poster}
                </div>
                {/* Ombre / halo au sol */}
                <div
                  aria-hidden
                  className="mt-4 h-5 w-[60%] rounded-[50%] blur-md pointer-events-none animate-pulse-glow"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(201,151,58,0.22), rgba(0,0,0,0.5) 55%, transparent 72%)' }}
                />
              </div>
            </div>

            {/* ════════ PANNEAU — lien + actions ════════ */}
            <div
              className={[
                'w-full flex flex-col bg-[#171717] border border-[#292929] rounded-3xl p-5 md:p-7 gap-5',
                mounted ? 'animate-fade-up stagger-2' : 'opacity-0',
              ].join(' ')}
            >
              {/* Étoiles + titre */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1 text-gold" style={{ letterSpacing: '2px' }} aria-hidden>
                  {'★★★★★'.split('').map((s, i) => (
                    <span key={i} className="text-sm">{s}</span>
                  ))}
                </div>
                <h1 className="text-2xl md:text-[28px] font-bold text-white leading-tight">
                  Votre affiche est <span className="animate-gradient-text">prête</span>
                </h1>
                <p className="text-sm text-[#8c8c8c] leading-relaxed">
                  Le QR code de votre plaque redirige vos clients vers votre page d&apos;avis. Imprimez-la ou
                  téléchargez-la en un clic.
                </p>
              </div>

              {/* Destination */}
              <section className="w-full flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">Lien de destination</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2 bg-[#0d0d0d] border border-[#292929] px-3 py-2.5 rounded-xl">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <input
                      readOnly
                      value={qrTargetUrl || '—'}
                      className="flex-1 min-w-0 bg-transparent text-sm text-[#c7c7c7] font-mono cursor-default select-all focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    disabled={!qrTargetUrl}
                    className={[
                      'shrink-0 min-h-[46px] px-4 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap',
                      copiedUrl
                        ? 'bg-[#22c55e] border-[#22c55e] text-white'
                        : 'border-[#292929] text-[#8c8c8c] hover:border-gold hover:text-gold',
                    ].join(' ')}
                  >
                    {copiedUrl ? 'Copié ✓' : 'Copier'}
                  </button>
                </div>
              </section>

              {/* Mini-guide 3 étapes */}
              <section className="w-full flex flex-col gap-3 rounded-2xl bg-[#0f0f0f] border border-[#242424] p-4">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid place-items-center h-7 w-7 shrink-0 rounded-full text-[13px] font-bold text-[#0d0d0d]"
                      style={{ background: gradientGold, boxShadow: '0 4px 12px -4px rgba(201,151,58,0.6)' }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-[#e5e5e5]">{step.title}</p>
                      <p className="text-xs text-[#8c8c8c] leading-snug">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </section>

              <div className="flex-1" />

              {/* CTA télécharger */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || !qrTargetUrl}
                className="group w-full min-h-[50px] flex flex-row justify-center items-center gap-2 text-[#0d0d0d] bg-gold rounded-2xl py-3 font-bold cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-[#12100e]/40 border-t-[#12100e] animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-200 group-hover:translate-y-0.5"
                  >
                    <path d="M12 15V3" />
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                  </svg>
                )}
                {downloading ? 'Génération…' : "Télécharger l'affiche"}
              </button>
              <p className="text-center text-[11px] text-[#5c5c5c]">Image PNG haute résolution · prête à imprimer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
