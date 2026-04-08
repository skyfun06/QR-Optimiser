'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            ← Retour
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QR Code</h1>
            <p className="text-sm text-gray-500">
              {business?.name ? `Commerce : ${business.name}` : 'Partagez votre lien d’avis'}
            </p>
          </div>
        </div>

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
          <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-center rounded-2xl bg-gray-50 p-6" ref={qrWrapperRef}>
              <QRCodeSVG value={qrUrl} size={260} bgColor="#ffffff" fgColor="#111827" />
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

