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

  // Affiche : la plaque + le QR réel incrusté dans le carré blanc.
  const poster = (
    <div
      ref={posterRef}
      className="relative w-full max-w-[420px] aspect-square select-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/plaque.png"
        alt="Affiche QR ScanAvis"
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
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
      <DashboardHeader
        subtitle={business?.name ?? null}
        onSignOutError={(message) => setError(message)}
      />

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 flex flex-col items-center gap-3 md:gap-6 py-6 md:py-8">
        {error && (
          <div className="w-full rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}
        {success && (
          <div className="w-full rounded-2xl bg-[#171717] border border-[#292929] p-4">
            <p className="text-sm font-medium text-[#39d98a]">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[#171717] p-6 border border-[#292929]">
            <p className="text-[#8c8c8c]">Chargement…</p>
          </div>
        ) : !business ? (
          <div className="rounded-2xl bg-[#171717] p-6 border border-[#292929] max-w-xl">
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
          <div
            className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 items-stretch"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
            }}
          >
            {/* Colonne gauche — Affiche */}
            <div className="w-full flex flex-col items-center gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-7">
              <p className="w-full text-xs uppercase tracking-widest text-[#8c8c8c]">Votre affiche</p>
              <div
                className="flex-1 flex items-center justify-center w-full py-2"
                style={{ filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.6)) drop-shadow(0 0 40px rgba(201,151,58,0.1))' }}
              >
                {poster}
              </div>
            </div>

            {/* Colonne droite — Lien de destination + actions */}
            <div className="w-full flex flex-col bg-[#171717] border border-[#292929] rounded-2xl p-5 md:p-7 gap-5 md:gap-6">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl font-bold text-white leading-tight">
                  Le lien de votre <span className="animate-gradient-text">QR code</span>
                </h1>
                <p className="text-sm text-[#8c8c8c]">
                  Votre affiche redirige vos clients vers votre page d&apos;avis. Voici le lien exact
                  vers lequel pointe le QR code.
                </p>
              </div>

              <section className="w-full flex flex-col gap-3">
                <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">🔗 Destination</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={qrTargetUrl || '—'}
                    className="flex-1 min-w-0 bg-[#0d0d0d] border border-dashed border-[#292929] px-3 py-2.5 rounded-xl text-sm text-[#8c8c8c] font-mono cursor-default select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    disabled={!qrTargetUrl}
                    className={[
                      'shrink-0 min-h-[42px] px-4 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap',
                      copiedUrl
                        ? 'bg-[#22c55e] border-[#22c55e] text-white'
                        : 'border-[#292929] text-[#8c8c8c] hover:border-gold hover:text-gold',
                    ].join(' ')}
                  >
                    {copiedUrl ? 'Copié ✓' : 'Copier'}
                  </button>
                </div>
              </section>

              <div className="w-full rounded-xl bg-[#0f0f0f] border border-[#292929] p-4 flex items-start gap-3">
                <span className="mt-0.5 grid place-items-center h-6 w-6 shrink-0 rounded-full bg-[#C9973A]/10 text-gold">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </span>
                <p className="text-xs leading-relaxed text-[#8c8c8c]">
                  Partagez ce lien ou téléchargez l&apos;affiche ci-dessous pour l&apos;imprimer. Le QR
                  code mène directement à cette destination.
                </p>
              </div>

              <div className="flex-1" />

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || !qrTargetUrl}
                className="group w-full min-h-[46px] flex flex-row justify-center items-center gap-2 text-[#0d0d0d] rounded-2xl py-3 font-bold cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: gradientGold }}
              >
                {downloading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-[#12100e]/40 border-t-[#12100e] animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
