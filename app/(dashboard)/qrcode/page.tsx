'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

type BusinessRow = {
  id: string
  name: string | null
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function svgElementToCanvas(svgEl: SVGSVGElement, size: number): Promise<HTMLCanvasElement> {
  const serializer = new XMLSerializer()
  const svgText = serializer.serializeToString(svgEl)
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const img = new Image()
    img.decoding = 'async'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Impossible de convertir le SVG en image."))
      img.src = svgUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas non supporté.')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, 0, 0, size, size)

    return canvas
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

async function svgElementToPngBlob(svgEl: SVGSVGElement, size: number) {
  const canvas = await svgElementToCanvas(svgEl, size)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export PNG impossible.'))), 'image/png')
  })
}

export default function QrCodePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [origin, setOrigin] = useState<string>('')
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const qrWrapperRef = useRef<HTMLDivElement | null>(null)

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

        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id,name')
          .eq('user_id', user.id)
          .maybeSingle<BusinessRow>()

        if (businessError) throw businessError
        if (!cancelled) setBusiness(businessData ?? null)
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
  }, [])

  const qrUrl = useMemo(() => {
    if (!origin || !business?.id) return ''
    return `${origin}/review/${business.id}`
  }, [origin, business?.id])

  async function handleDownloadPng() {
    if (!qrWrapperRef.current) return
    const svg = qrWrapperRef.current.querySelector('svg')
    if (!svg) return

    setDownloading(true)
    setError(null)
    try {
      const blob = await svgElementToPngBlob(svg as unknown as SVGSVGElement, 1024)
      downloadBlob(blob, `qrcode-${business?.id ?? 'business'}.png`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Export PNG impossible.'
      setError(message)
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownloadPdf() {
    if (!qrWrapperRef.current) return
    const svg = qrWrapperRef.current.querySelector('svg')
    if (!svg) return

    setDownloading(true)
    setError(null)
    try {
      const canvas = await svgElementToCanvas(svg as unknown as SVGSVGElement, 1024)
      const imgData = canvas.toDataURL('image/png')

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const qrSize = 80
      const x = (pageWidth - qrSize) / 2
      const y = (pageHeight - qrSize) / 2 - 20

      pdf.setFontSize(18)
      pdf.setTextColor(40, 40, 40)
      const title = business?.name ?? 'Mon commerce'
      pdf.text(title, pageWidth / 2, y - 14, { align: 'center' })

      pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize)

      pdf.setFontSize(10)
      pdf.setTextColor(120, 120, 120)
      pdf.text('Scannez ce QR code pour laisser un avis', pageWidth / 2, y + qrSize + 10, { align: 'center' })
      pdf.setFontSize(8)
      pdf.text(qrUrl, pageWidth / 2, y + qrSize + 16, { align: 'center' })

      pdf.save(`qrcode-${business?.id ?? 'business'}.pdf`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Export PDF impossible.'
      setError(message)
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopyLink() {
    if (!qrUrl) return
    try {
      await navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Impossible de copier le lien.')
    }
  }

  function handleShareWhatsapp() {
    const text = encodeURIComponent(`Laissez-nous un avis en scannant ce QR code ou en cliquant sur ce lien : ${qrUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  function handleShareEmail() {
    const subject = encodeURIComponent(`Laissez un avis sur ${business?.name ?? 'notre commerce'}`)
    const body = encodeURIComponent(`Bonjour,\n\nNous serions ravis de recevoir votre avis. Vous pouvez scanner notre QR code ou cliquer sur ce lien :\n\n${qrUrl}\n\nMerci !`)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader
        subtitle={business?.name ?? null}
        onSignOutError={(message) => setError(message)}
      />
      <div className="w-full flex flex-col justify-center items-center gap-4 p-6">

        {error && (
          <div className="rounded-2xl bg-[#171717] p-6 border border-[#222222]">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[#171717] p-6 border border-[#222222]">
            <p className="text-[#8c8c8c]">Chargement…</p>
          </div>
        ) : !business ? (
          <div className="rounded-2xl bg-[#171717] p-6 border border-[#222222]">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Configurez d&apos;abord votre commerce dans les paramètres
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Pour générer votre QR code, nous avons besoin d&apos;un commerce associé à votre compte.
            </p>
            <Link
              href="/settings"
              className="inline-flex text-blue-600 font-semibold underline-offset-2 transition-all duration-200 hover:text-blue-700 hover:underline active:scale-[0.98]"
            >
              Aller aux paramètres
            </Link>
          </div>
        ) : (
            <div className="w-full flex flex-col justify-start items-start gap-4">
                <div className="w-full flex flex-row justify-start items-start gap-4">
                    <div className="w-full flex flex-col justify-start items-start gap-6 bg-[#171717] border border-[#222222] p-6 rounded-xl">
                        <p className="text-sm text-[#8c8c8c] uppercase tracking-[0.5px]">Votre QR Code</p>
                        <div className="w-full flex items-center justify-center">
                            <div className=" rounded-2xl bg-[#ffffff] p-4" ref={qrWrapperRef}>
                                <QRCodeSVG value={qrUrl} size={200} bgColor="#ffffff" fgColor="#111827" />
                            </div>
                        </div>
                        <div className="w-full flex flex-col justify-center items-center gap-4">
                            <button
                              type="button"
                              onClick={handleDownloadPdf}
                              disabled={downloading}
                              className="w-full flex flex-row justify-center items-center gap-2 text-gold border border-gold rounded-2xl py-2 font-medium cursor-pointer transition-all duration-200 hover:bg-gold/10 hover:shadow-[0_0_20px_rgba(201,151,58,0.15)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download-icon lucide-download"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>
                                {downloading ? 'Génération…' : 'Télécharger en PDF'}
                            </button>
                            <p className="text-xs text-[#8c8c8c]">Imprimez-le et placez-le dans votre commerce</p>
                        </div> 
                    </div>
                    <div className="w-full h-[422px] flex flex-col justify-start items-start gap-6 bg-[#171717] border border-[#222222] p-6 rounded-xl">
                        <p className="text-sm text-[#8c8c8c] uppercase tracking-[0.5px]">Votre lien</p>
                        <div className="w-full flex flex-col justify-start items-start gap-4">
                            <p className="w-full text-left text-sm font-medium bg-[#292929] p-4 rounded-2xl">{qrUrl}</p>
                            <button
                              type="button"
                              onClick={handleCopyLink}
                              className="w-full flex flex-row justify-center items-center gap-4 text-sm text-gold border border-gold rounded-2xl p-2 cursor-pointer transition-all duration-200 hover:bg-gold/10 hover:shadow-[0_0_20px_rgba(201,151,58,0.15)] active:scale-[0.98]"
                            >
                                {copied ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy-icon lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                )}
                                {copied ? 'Lien copié !' : 'Copier le lien'}
                            </button>
                        </div>
                        <hr className="h-[1px] w-full text-[#222222]" />
                        <div className="w-full flex flex-col justify-start items-start gap-6">
                            <p className="text-sm text-[#8c8c8c] uppercase tracking-[0.5px]">Partager sur :</p>
                            <div className="w-full flex flex-row justify-center items-center gap-4">
                                <button
                                  type="button"
                                  onClick={handleShareWhatsapp}
                                  className="w-full flex flex-row justify-center items-center gap-2 border border-[#222222] text-sm text-[#8c8c8c] p-2 rounded-2xl transition-all duration-200 hover:border-[#3a3a3a] hover:bg-[#1f1f1f] hover:text-[#c4c4c4] active:scale-[0.98] cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle-icon lucide-message-circle"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>
                                    Whatsapp
                                </button>
                                <button
                                  type="button"
                                  onClick={handleShareEmail}
                                  className="w-full flex flex-row justify-center items-center gap-2 border border-[#222222] text-sm text-[#8c8c8c] p-2 rounded-2xl transition-all duration-200 hover:border-[#3a3a3a] hover:bg-[#1f1f1f] hover:text-[#c4c4c4] active:scale-[0.98] cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail-icon lucide-mail"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
                                    Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full flex flex-col justify-start items-start gap-4 bg-[#171717] border border-[#222222] p-6 rounded-xl">
                    <p className="text-sm text-[#8c8c8c] uppercase tracking-[0.5px]">Instructions</p>
                    <div className="w-full flex flex-row justify-center items-center gap-12">
                        <div className="w-full flex flex-col justify-center items-center gap-3">
                            <p className="text-gold text-3xl font-bold">1</p>
                            <div className="flex flex-col justify-center items-center gap-2">
                                <h3 className="text-xl font-bold">Télécharger</h3>
                                <span className="text-sm text-[#8c8c8c]">Imprimez le QR code en haute qualité</span>
                            </div>
                        </div>
                        <div className="w-full flex flex-col justify-center items-center gap-3">
                            <p className="text-gold text-3xl font-bold">2</p>
                            <div className="flex flex-col justify-center items-center gap-2">
                                <h3 className="text-xl font-bold">Placez-le</h3>
                                <span className="text-sm text-[#8c8c8c]">À la caisse ou sur les tables de votre commerce</span>
                            </div>
                        </div>
                        <div className="w-full flex flex-col justify-center items-center gap-3">
                            <p className="text-gold text-3xl font-bold">3</p>
                            <div className="flex flex-col justify-center items-center gap-2">
                                <h3 className="text-xl font-bold">Recevez</h3>
                                <span className="text-sm text-[#8c8c8c]">Des avis clients automatiquement sur Google</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}

