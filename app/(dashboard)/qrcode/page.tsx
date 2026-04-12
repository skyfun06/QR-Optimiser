'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
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

async function svgElementToPngBlob(svgEl: SVGSVGElement, size: number) {
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

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export PNG impossible.'))), 'image/png')
    })

    return blob
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export default function QrCodePage() {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [origin, setOrigin] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

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

  async function handleSignOut() {
    setSigningOut(true)
    setError(null)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      router.push('/login')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue.'
      setError(message)
    } finally {
      setSigningOut(false)
    }
  }

  const navClass = (href: string, active: boolean) =>
    [
      'text-sm px-4 py-2 rounded-xl transition-all duration-200 active:scale-95',
      active ? 'bg-gold text-[#0d0d0d]' : 'text-[#8c8c8c]',
    ].join(' ')

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <header className="w-full flex flex-col justify-start items-start border-b border-b-[#222222]">
        <div className="w-full flex flex-row justify-between items-center p-6">
          <p className="text-gold font-bold text-xl">ScanAvis</p>
          <div className="flex flex-row justify-center items-center gap-4">
            <p className="text-xs text-[#8c8c8c]">
              {business?.name ? `${business.name}` : 'Suivi de vos performances'}
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="cursor-pointer text-xs text-[#8c8c8c] px-2.5 py-1.5 border border-[#222222] rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors duration-200 disabled:opacity-50"
            >
              {signingOut ? 'Déconnexion...' : 'Déconnexion'}
            </button>
          </div>
        </div>
        <hr className="h-[1px] w-full text-[#222222]" />
        <div className="flex flex-row flex-wrap justify-start items-center p-6 gap-4">
          <Link href="/dashboard" className={navClass('/dashboard', pathname === '/dashboard')}>
            Dashboard
          </Link>
          <Link href="/qrcode" className={navClass('/qrcode', pathname === '/qrcode')}>
            QR Code
          </Link>
          <Link href="/settings" className={navClass('/settings', pathname === '/settings')}>
            Paramètres
          </Link>
          <Link
            href="/feedback-history"
            className={navClass('/feedback-history', pathname === '/feedback-history')}
          >
            Tous les feedbacks
          </Link>
        </div>
      </header>
      <div className="w-full flex flex-col justify-start items-start gap-4 p-6">

        {error && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-200">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-gray-600">Chargement…</p>
          </div>
        ) : !business ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Configurez d&apos;abord votre commerce dans les paramètres
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Pour générer votre QR code, nous avons besoin d&apos;un commerce associé à votre compte.
            </p>
            <Link href="/settings" className="text-blue-600 font-semibold hover:underline">
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
                            <button className="w-full flex flex-row justify-center items-center gap-2 text-gold border border-gold rounded-2xl py-2 font-medium cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-download-icon lucide-download"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>
                                Télécharger en PDF
                            </button>
                            <p className="text-xs text-[#8c8c8c]">Imprimez-le et placez-le dans votre commerce</p>
                        </div> 
                    </div>
                    <div className="w-full h-[422px] flex flex-col justify-start items-start gap-6 bg-[#171717] border border-[#222222] p-6 rounded-xl">
                        <p className="text-sm text-[#8c8c8c] uppercase tracking-[0.5px]">Votre lien</p>
                        <div className="w-full flex flex-col justify-start items-start gap-4">
                            <p className="w-full text-left text-sm font-medium bg-[#292929] p-4 rounded-2xl">{qrUrl}</p>
                            <button className="w-full flex flex-row justify-center items-center gap-4 text-sm text-gold border border-gold rounded-2xl p-2 cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-copy-icon lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                Copier le lien
                            </button>
                        </div>
                        <hr className="h-[1px] w-full text-[#222222]" />
                        <div className="w-full flex flex-col justify-start items-start gap-6">
                            <p className="text-sm text-[#8c8c8c] uppercase tracking-[0.5px]">Partager</p>
                            <div className="w-full flex flex-row justify-center items-center gap-4">
                                <a href="#" className="w-full flex flex-row justify-center items-center gap-2 border border-[#222222] text-sm text-[#8c8c8c] p-2 rounded-2xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-message-circle-icon lucide-message-circle"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>
                                    Whatsapp
                                </a>
                                <a href="#" className="w-full flex flex-row justify-center items-center gap-2 border border-[#222222] text-sm text-[#8c8c8c] p-2 rounded-2xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-mail-icon lucide-mail"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>                                    
                                    Email
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                

                <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">URL</p>
                <p className="break-all rounded-xl bg-gray-50 p-3 text-sm text-gray-800 ring-1 ring-gray-100">
                    {qrUrl}
                </p>
                </div>

                <button
                onClick={handleDownloadPng}
                disabled={!qrUrl || downloading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                            disabled:opacity-40 disabled:cursor-not-allowed
                            hover:bg-blue-700 transition-colors"
                >
                {downloading ? 'Téléchargement...' : 'Télécharger en PNG'}
                </button>
            </div>
        )}
      </div>
    </div>
  )
}

