'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'

type BusinessRow = {
  id: string
  name: string | null
  menu_url: string | null
  custom_url: string | null
  logo_url: string | null
}

type TabId = 'avis' | 'menu' | 'lien'

type TemplateId = 0 | 1 | 2 | 3 | 4 | 5

type TemplateMeta = {
  id: TemplateId
  label: string
}

const TEMPLATES: TemplateMeta[] = [
  { id: 0, label: 'Gold Top' },
  { id: 1, label: 'Dark' },
  { id: 2, label: 'Bordure' },
  { id: 3, label: 'Split' },
  { id: 4, label: 'Minimaliste' },
  { id: 5, label: 'Bandeau Bas' },
]

const ACCENT_PALETTE = [
  '#C9973A',
  '#185FA5',
  '#1D9E75',
  '#993C1D',
  '#534AB7',
  '#000000',
] as const

const DEFAULT_INVITE = 'Scannez pour noter votre expérience ⭐'

// Dimensions logiques de l'affiche (ratio ≈ A4 portrait).
const POSTER_W = 200
const POSTER_H = 280

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'commerce'
  )
}

function isDarkColor(hex: string) {
  // Heuristique simple pour choisir le texte dans le bandeau coloré.
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luma < 140
}

function truncatePreviewText(text: string, maxLength = 35) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

async function svgElementToPngDataUrl(
  svgEl: SVGSVGElement,
  size: number,
  bg: string
): Promise<string> {
  const serializer = new XMLSerializer()
  const svgText = serializer.serializeToString(svgEl)
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Impossible de convertir le SVG en image.'))
      img.src = svgUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas non supporté.')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, 0, 0, size, size)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Logo introuvable.')
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Lecture du logo impossible.'))
    reader.readAsDataURL(blob)
  })
}

// -----------------------------------------------------------------------------
// Layout de l'affiche (partagé preview SVG ↔ PDF)
// -----------------------------------------------------------------------------
//
// Tout est calculé en unités logiques (POSTER_W × POSTER_H) pour que l'aperçu
// SVG et le rendu PDF soient strictement cohérents.

type PosterLayout = {
  bg: string
  accent: string
  textColor: string
  subTextColor: string
  bands: { x: number; y: number; w: number; h: number; color: string }[]
  borderRect?: { x: number; y: number; w: number; h: number; thickness: number; color: string }
  accentLine?: { x: number; y: number; w: number; h: number; color: string }
  qr: { x: number; y: number; size: number; bg: string; fg: string }
  name: { x: number; y: number; size: number; color: string }
  invite: { x: number; y: number; size: number; color: string }
  inviteBg?: { fill: string; rx: number }
  logo?: { x: number; y: number; w: number; h: number }
}

function buildLayout(template: TemplateId, accent: string): PosterLayout {
  const W = POSTER_W
  const H = POSTER_H
  // Valeurs "par défaut" mutées selon le template.
  const common = {
    accent,
    qr: { x: W / 2 - 55, y: H / 2 - 16, size: 110, bg: '#ffffff', fg: '#000000' },
    logo: { x: W / 2 - 35, y: 18, w: 70, h: 55 },
    name: { x: W / 2, y: 92, size: 13, color: '#0d0d0d' },
    invite: { x: W / 2, y: H - 22, size: 9, color: '#5c5c5c' },
  }

  switch (template) {
    case 0:
      // Gold Top : bandeau couleur en haut, fond blanc, QR centré.
      return {
        bg: '#ffffff',
        accent,
        textColor: '#0d0d0d',
        subTextColor: '#5c5c5c',
        bands: [{ x: 0, y: 0, w: W, h: 14, color: accent }],
        qr: { ...common.qr, y: H / 2 - 18 },
        logo: { ...common.logo, y: 18 },
        name: { x: W / 2, y: 92, size: 13, color: '#0d0d0d' },
        invite: { x: W / 2, y: H - 24, size: 9, color: '#5c5c5c' },
        inviteBg: { fill: '#f2f2f2', rx: 3 },
      }
    case 1:
      // Dark : fond sombre, bandeau couleur en haut, textes blancs.
      return {
        bg: '#0d0d0d',
        accent,
        textColor: '#ffffff',
        subTextColor: '#b5b5b5',
        bands: [{ x: 0, y: 0, w: W, h: 14, color: accent }],
        qr: { ...common.qr, y: H / 2 - 18, bg: '#ffffff', fg: '#0d0d0d' },
        logo: { ...common.logo, y: 18 },
        name: { x: W / 2, y: 92, size: 13, color: '#ffffff' },
        invite: { x: W / 2, y: H - 24, size: 9, color: '#b5b5b5' },
        inviteBg: { fill: '#1f1f1f', rx: 3 },
      }
    case 2:
      // Bordure : fond blanc, bordure couleur + bandeau couleur en bas.
      return {
        bg: '#ffffff',
        accent,
        textColor: '#0d0d0d',
        subTextColor: '#5c5c5c',
        bands: [{ x: 0, y: H - 20, w: W, h: 20, color: accent }],
        borderRect: { x: 0, y: 0, w: W, h: H, thickness: 6, color: accent },
        qr: { ...common.qr, y: H / 2 - 25 },
        logo: { ...common.logo, y: 20 },
        name: { x: W / 2, y: 94, size: 13, color: '#0d0d0d' },
        invite: {
          x: W / 2,
          y: H - 10,
          size: 9,
          color: isDarkColor(accent) ? '#ffffff' : '#0d0d0d',
        },
      }
    case 3:
      // Split : moitié haute couleur, moitié basse blanche.
      return {
        bg: '#ffffff',
        accent,
        textColor: '#0d0d0d',
        subTextColor: '#5c5c5c',
        bands: [{ x: 0, y: 0, w: W, h: H / 2, color: accent }],
        qr: { ...common.qr, y: H / 2 + 4 },
        logo: { ...common.logo, y: 14 },
        name: {
          x: W / 2,
          y: H / 2 - 8,
          size: 13,
          color: isDarkColor(accent) ? '#ffffff' : '#0d0d0d',
        },
        invite: { x: W / 2, y: H - 18, size: 9, color: '#5c5c5c' },
        inviteBg: { fill: '#efefef', rx: 3 },
      }
    case 4:
      // Minimaliste : fond blanc pur, ligne couleur sous le nom.
      return {
        bg: '#ffffff',
        accent,
        textColor: '#0d0d0d',
        subTextColor: '#8c8c8c',
        bands: [],
        accentLine: { x: W / 2 - 18, y: 96, w: 36, h: 1.4, color: accent },
        qr: { ...common.qr, y: H / 2 - 18, fg: '#0d0d0d' },
        logo: { ...common.logo, y: 22 },
        name: { x: W / 2, y: 94, size: 13, color: '#0d0d0d' },
        invite: { x: W / 2, y: H - 22, size: 9, color: '#8c8c8c' },
      }
    case 5:
      // Bandeau bas : fond sombre, bandeau couleur en bas.
      return {
        bg: '#0d0d0d',
        accent,
        textColor: '#ffffff',
        subTextColor: '#b5b5b5',
        bands: [{ x: 0, y: H - 30, w: W, h: 30, color: accent }],
        qr: { ...common.qr, y: H / 2 - 22, bg: '#ffffff', fg: '#0d0d0d' },
        logo: { ...common.logo, y: 18 },
        name: { x: W / 2, y: 92, size: 13, color: '#ffffff' },
        invite: {
          x: W / 2,
          y: H - 14,
          size: 9,
          color: isDarkColor(accent) ? '#ffffff' : '#0d0d0d',
        },
        inviteBg: { fill: 'transparent', rx: 0 },
      }
  }
}

// -----------------------------------------------------------------------------
// Composant : aperçu d'affiche SVG
// -----------------------------------------------------------------------------

type PosterPreviewProps = {
  template: TemplateId
  accent: string
  selectedFont: string
  businessName: string
  inviteText: string
  qrValue: string
  logoUrl: string | null
  width?: number
  height?: number
  qrHostRef?: React.RefObject<HTMLDivElement | null>
}

function PosterPreview({
  template,
  accent,
  selectedFont,
  businessName,
  inviteText,
  qrValue,
  logoUrl,
  width = POSTER_W,
  height = POSTER_H,
  qrHostRef,
}: PosterPreviewProps) {
  const L = buildLayout(template, accent)
  const displayName = (businessName || 'Votre commerce').trim()
  const invitePreview = truncatePreviewText(inviteText || DEFAULT_INVITE, 35)
  const inviteBgWidth = Math.min(POSTER_W - 20, Math.max(74, invitePreview.length * 4.7))
  const inviteBgX = POSTER_W / 2 - inviteBgWidth / 2
  const placeholderText = truncatePreviewText(displayName, 18)

  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-xl shadow-black/40"
      style={{ width, height, backgroundColor: L.bg }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${POSTER_W} ${POSTER_H}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Aperçu affiche QR"
      >
        <rect x={0} y={0} width={POSTER_W} height={POSTER_H} fill={L.bg} />
        {L.bands.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.color} />
        ))}
        {L.borderRect && (
          <rect
            x={L.borderRect.thickness / 2}
            y={L.borderRect.thickness / 2}
            width={POSTER_W - L.borderRect.thickness}
            height={POSTER_H - L.borderRect.thickness}
            fill="none"
            stroke={L.borderRect.color}
            strokeWidth={L.borderRect.thickness}
          />
        )}
        {L.accentLine && (
          <rect
            x={L.accentLine.x}
            y={L.accentLine.y}
            width={L.accentLine.w}
            height={L.accentLine.h}
            fill={L.accentLine.color}
          />
        )}

        {L.logo &&
          (logoUrl ? (
            <image
              href={logoUrl}
              x={L.logo.x}
              y={L.logo.y}
              width={L.logo.w}
              height={L.logo.h}
              preserveAspectRatio="xMidYMid meet"
              crossOrigin="anonymous"
            />
          ) : (
            <text
              x={POSTER_W / 2}
              y={L.logo.y + L.logo.h / 2 + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily={selectedFont}
              fontSize={16}
              fontWeight="700"
              fill={L.name.color}
              opacity={0.88}
            >
              {placeholderText}
            </text>
          ))}

        <text
          x={POSTER_W / 2}
          y={L.name.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={selectedFont}
          fontSize={13}
          fontWeight="bold"
          fill={L.name.color}
        >
          {displayName}
        </text>

        <rect
          x={L.qr.x}
          y={L.qr.y}
          width={L.qr.size}
          height={L.qr.size}
          fill={L.qr.bg}
          rx={4}
          ry={4}
        />
        {qrValue && (
          <g transform={`translate(${L.qr.x + 4}, ${L.qr.y + 4})`}>
            <QRCodeSVG
              value={qrValue}
              size={L.qr.size - 8}
              bgColor={L.qr.bg}
              fgColor={L.qr.fg}
              level="H"
            />
          </g>
        )}

        {L.inviteBg && (
          <rect
            x={inviteBgX}
            y={L.invite.y - 7.5}
            width={inviteBgWidth}
            height={15}
            fill={L.inviteBg.fill}
            opacity={L.inviteBg.fill === 'transparent' ? 0 : 1}
            rx={L.inviteBg.rx}
            ry={L.inviteBg.rx}
          />
        )}
        <text
          x={POSTER_W / 2}
          y={L.invite.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={selectedFont}
          fontSize={9}
          fill={L.invite.color}
        >
          {invitePreview}
        </text>
      </svg>

      <div ref={qrHostRef} className="sr-only" aria-hidden>
        {qrValue && (
          <QRCodeSVG
            value={qrValue}
            size={1024}
            bgColor={L.qr.bg}
            fgColor={L.qr.fg}
            level="H"
          />
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Composant : miniature de template (60x80)
// -----------------------------------------------------------------------------

function TemplateThumb({ template, accent }: { template: TemplateId; accent: string }) {
  const W = 60
  const H = 80
  const qrCell = 2
  const qrSize = qrCell * 4
  const qrX = W / 2 - qrSize / 2
  const qrY = H / 2 - qrSize / 2 + 2
  const accentText = isDarkColor(accent) ? '#ffffff' : '#0d0d0d'

  const MiniQr = ({ fg = '#0d0d0d', bg = '#ffffff' }: { fg?: string; bg?: string }) => (
    <>
      <rect x={qrX - 2} y={qrY - 2} width={qrSize + 4} height={qrSize + 4} rx={1.5} fill={bg} />
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3].map((col) =>
          (row + col) % 2 === 0 ? (
            <rect
              key={`${row}-${col}`}
              x={qrX + col * qrCell}
              y={qrY + row * qrCell}
              width={qrCell}
              height={qrCell}
              fill={fg}
            />
          ) : null
        )
      )}
    </>
  )

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      {template === 0 && (
        <>
          <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
          <rect x={0} y={0} width={W} height={20} fill={accent} />
          <rect x={16} y={24} width={28} height={3} rx={1.5} fill="#0d0d0d" opacity={0.9} />
          <MiniQr />
          <rect x={10} y={68} width={40} height={4} rx={2} fill="#f1f1f1" />
        </>
      )}
      {template === 1 && (
        <>
          <rect x={0} y={0} width={W} height={H} fill="#0d0d0d" />
          <rect x={0} y={0} width={W} height={20} fill={accent} />
          <rect x={16} y={24} width={28} height={3} rx={1.5} fill="#ffffff" opacity={0.95} />
          <MiniQr fg="#0d0d0d" bg="#ffffff" />
          <rect x={10} y={68} width={40} height={4} rx={2} fill="#1f1f1f" />
        </>
      )}
      {template === 2 && (
        <>
          <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
          <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke={accent} strokeWidth={2} />
          <rect x={16} y={24} width={28} height={3} rx={1.5} fill="#0d0d0d" opacity={0.9} />
          <MiniQr />
        </>
      )}
      {template === 3 && (
        <>
          <rect x={0} y={0} width={W} height={40} fill={accent} />
          <rect x={0} y={40} width={W} height={40} fill="#ffffff" />
          <rect x={16} y={28} width={28} height={3} rx={1.5} fill={accentText} opacity={0.95} />
          <MiniQr />
          <rect x={10} y={68} width={40} height={4} rx={2} fill="#ededed" />
        </>
      )}
      {template === 4 && (
        <>
          <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
          <rect x={16} y={24} width={28} height={3} rx={1.5} fill="#0d0d0d" opacity={0.9} />
          <rect x={21} y={29} width={18} height={1.2} rx={0.6} fill={accent} />
          <MiniQr />
          <rect x={10} y={68} width={40} height={2} rx={1} fill="#8c8c8c" opacity={0.8} />
        </>
      )}
      {template === 5 && (
        <>
          <rect x={0} y={0} width={W} height={H} fill="#0d0d0d" />
          <rect x={0} y={H - 16} width={W} height={16} fill={accent} />
          <rect x={16} y={24} width={28} height={3} rx={1.5} fill="#ffffff" opacity={0.95} />
          <MiniQr fg="#0d0d0d" bg="#ffffff" />
        </>
      )}
    </svg>
  )
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function QrCodePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [origin, setOrigin] = useState('')

  // Tab actif
  const [activeTab, setActiveTab] = useState<TabId>('avis')

  // Personnalisation (partagée par les 3 tabs)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(0)
  const [accentColor, setAccentColor] = useState<string>('#C9973A')
  const [customAccent, setCustomAccent] = useState<string>('#C9973A')
  const [selectedFont, setSelectedFont] = useState('Space Grotesk, sans-serif')
  const [inviteText, setInviteText] = useState<string>(DEFAULT_INVITE)

  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  // Tab Menu
  const [menuUrl, setMenuUrl] = useState('')
  const [savingMenu, setSavingMenu] = useState(false)
  const [uploadingMenu, setUploadingMenu] = useState(false)
  const menuFileInputRef = useRef<HTMLInputElement | null>(null)

  // Tab Custom
  const [customUrl, setCustomUrl] = useState('')
  const [savingCustom, setSavingCustom] = useState(false)

  // Export PDF
  const [downloading, setDownloading] = useState(false)

  // Color picker
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorInputRef = useRef<HTMLInputElement | null>(null)

  // Ref vers le host du QR dans l'aperçu (utilisé pour l'export PDF)
  const posterQrRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
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
          .select('id,name,menu_url,custom_url,logo_url')
          .eq('user_id', user.id)
          .maybeSingle<BusinessRow>()

        if (bizError) throw bizError
        if (!cancelled) {
          setBusiness(data ?? null)
          setMenuUrl(data?.menu_url ?? '')
          setCustomUrl(data?.custom_url ?? '')
          setLogoUrl(data?.logo_url ?? null)
        }
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

  // URL cible du QR selon le tab actif
  const qrTargetUrl = useMemo(() => {
    if (!business) return ''
    if (activeTab === 'avis') return origin ? `${origin}/review/${business.id}` : ''
    if (activeTab === 'menu') return menuUrl.trim()
    return customUrl.trim()
  }, [activeTab, origin, business, menuUrl, customUrl])

  const needsTabConfig =
    (activeTab === 'menu' && !menuUrl.trim()) ||
    (activeTab === 'lien' && !customUrl.trim())

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePickCustomColor = useCallback(() => {
    setShowColorPicker(true)
    // Ouvre le sélecteur natif au prochain tick.
    setTimeout(() => colorInputRef.current?.click(), 0)
  }, [])

  async function handleUploadLogo(file: File) {
    if (!business) return
    if (!file.type.startsWith('image/')) {
      setError('Seuls les fichiers image sont acceptés.')
      return
    }
    setUploadingLogo(true)
    setError(null)
    setSuccess(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${business.id}/logo.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from('logos').getPublicUrl(path)
      const publicUrl = publicData?.publicUrl
      if (!publicUrl) throw new Error('URL publique introuvable.')
      const finalUrl = `${publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('businesses')
        .update({ logo_url: finalUrl })
        .eq('id', business.id)
      if (updateError) throw updateError

      setLogoUrl(finalUrl)
      setBusiness({ ...business, logo_url: finalUrl })
      setSuccess('Logo mis à jour.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Upload impossible.'
      setError(message)
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  async function handleRemoveLogo() {
    if (!business) return
    setRemovingLogo(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ logo_url: null })
        .eq('id', business.id)
      if (updateError) throw updateError
      setLogoUrl(null)
      setBusiness({ ...business, logo_url: null })
      setSuccess('Logo supprimé.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Suppression impossible.'
      setError(message)
    } finally {
      setRemovingLogo(false)
    }
  }

  async function handleSaveMenu() {
    if (!business) return
    setSavingMenu(true)
    setError(null)
    setSuccess(null)
    try {
      const trimmed = menuUrl.trim() || null
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ menu_url: trimmed })
        .eq('id', business.id)
      if (updateError) throw updateError
      setBusiness({ ...business, menu_url: trimmed })
      setSuccess('Lien du menu sauvegardé.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sauvegarde impossible.'
      setError(message)
    } finally {
      setSavingMenu(false)
    }
  }

  async function handleUploadMenuPdf(file: File) {
    if (!business) return
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés.')
      return
    }
    setUploadingMenu(true)
    setError(null)
    setSuccess(null)
    try {
      const path = `${business.id}/menu.pdf`
      const { error: uploadError } = await supabase.storage
        .from('menus')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' })
      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from('menus').getPublicUrl(path)
      const publicUrl = publicData?.publicUrl
      if (!publicUrl) throw new Error('URL publique introuvable.')
      const finalUrl = `${publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('businesses')
        .update({ menu_url: finalUrl })
        .eq('id', business.id)
      if (updateError) throw updateError

      setMenuUrl(finalUrl)
      setBusiness({ ...business, menu_url: finalUrl })
      setSuccess('Menu PDF uploadé.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Upload impossible.'
      setError(message)
    } finally {
      setUploadingMenu(false)
      if (menuFileInputRef.current) menuFileInputRef.current.value = ''
    }
  }

  async function handleSaveCustom() {
    if (!business) return
    setSavingCustom(true)
    setError(null)
    setSuccess(null)
    try {
      const trimmed = customUrl.trim() || null
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ custom_url: trimmed })
        .eq('id', business.id)
      if (updateError) throw updateError
      setBusiness({ ...business, custom_url: trimmed })
      setSuccess('Lien de destination sauvegardé.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sauvegarde impossible.'
      setError(message)
    } finally {
      setSavingCustom(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Export PDF — reproduit le template sélectionné à l'échelle A4
  // ---------------------------------------------------------------------------

  async function handleDownloadPdf() {
    if (!business || !qrTargetUrl) return
    const host = posterQrRef.current
    const svg = host?.querySelector('svg') as SVGSVGElement | null
    if (!svg) return

    setDownloading(true)
    setError(null)
    setSuccess(null)
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = 210
      const pageH = 297
      const L = buildLayout(selectedTemplate, accentColor)
      const pdfFont = selectedFont.includes('Georgia') || selectedFont.includes('Playfair')
        ? 'times'
        : 'helvetica'

      // Conversion unités logiques → mm
      const sx = pageW / POSTER_W
      const sy = pageH / POSTER_H

      // 1) Fond
      pdf.setFillColor(L.bg)
      pdf.rect(0, 0, pageW, pageH, 'F')

      // 2) Bandeaux colorés
      for (const b of L.bands) {
        pdf.setFillColor(b.color)
        pdf.rect(b.x * sx, b.y * sy, b.w * sx, b.h * sy, 'F')
      }

      // 3) Bordure (template "Bordure")
      if (L.borderRect) {
        pdf.setDrawColor(L.borderRect.color)
        pdf.setLineWidth(L.borderRect.thickness * sx)
        const t = L.borderRect.thickness * sx
        pdf.rect(t / 2, t / 2, pageW - t, pageH - t, 'S')
      }

      // 4) Ligne d'accent (minimaliste)
      if (L.accentLine) {
        pdf.setFillColor(L.accentLine.color)
        pdf.rect(
          L.accentLine.x * sx,
          L.accentLine.y * sy,
          L.accentLine.w * sx,
          Math.max(0.5, L.accentLine.h * sy),
          'F'
        )
      }

      // 5) Logo si dispo
      if (L.logo && logoUrl) {
        try {
          const dataUrl = await fetchImageAsDataUrl(logoUrl)
          const mime = dataUrl.substring(5, dataUrl.indexOf(';'))
          const fmt = mime.includes('png') ? 'PNG' : mime.includes('jpeg') ? 'JPEG' : 'PNG'
          pdf.addImage(
            dataUrl,
            fmt,
            L.logo.x * sx,
            L.logo.y * sy,
            L.logo.w * sx,
            L.logo.h * sy,
            undefined,
            'FAST'
          )
        } catch {
          // Logo distant indisponible → on l'ignore sans bloquer l'export.
        }
      }

      // 6) Nom du commerce
      const displayName = business.name ?? 'Mon commerce'
      pdf.setFont(pdfFont, 'bold')
      pdf.setFontSize((L.name.size / POSTER_H) * pageH * 2.2)
      pdf.setTextColor(L.name.color)
      pdf.text(displayName, pageW / 2, L.name.y * sy, { align: 'center', baseline: 'middle' })

      // 7) QR code (SVG → PNG → PDF)
      const qrMm = L.qr.size * sx
      const pngDataUrl = await svgElementToPngDataUrl(svg, 1024, L.qr.bg)
      pdf.addImage(pngDataUrl, 'PNG', L.qr.x * sx, L.qr.y * sy, qrMm, qrMm, undefined, 'FAST')

      // 8) Texte d'invitation
      pdf.setFont(pdfFont, 'normal')
      pdf.setFontSize((L.invite.size / POSTER_H) * pageH * 2.2)
      pdf.setTextColor(L.invite.color)
      const inviteLines = pdf.splitTextToSize(inviteText || DEFAULT_INVITE, pageW - 24)
      const lineHeightMm = 4
      const totalHeight = (inviteLines.length - 1) * lineHeightMm
      const preferredCenterY = Math.max(L.invite.y * sy, pageH - 24)
      const minStartY = pageH - 40
      const maxStartY = pageH - 8 - totalHeight
      const startY = Math.min(
        Math.max(preferredCenterY - totalHeight / 2, minStartY),
        Math.max(minStartY, maxStartY)
      )
      inviteLines.forEach((line: string, index: number) => {
        pdf.text(line, pageW / 2, startY + index * lineHeightMm, { align: 'center' })
      })

      const suffix = activeTab === 'avis' ? '' : activeTab === 'menu' ? '-menu' : '-lien'
      pdf.save(`affiche-${slugify(business.name ?? 'commerce')}${suffix}.pdf`)
      setSuccess('Affiche téléchargée.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Export PDF impossible.'
      setError(message)
    } finally {
      setDownloading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------

  const tabs: { id: TabId; label: string; badge?: 'NEW' }[] = [
    { id: 'avis', label: '⭐ Avis Google' },
    { id: 'menu', label: '🍽️ Menu', badge: 'NEW' },
    { id: 'lien', label: '🔗 Lien custom', badge: 'NEW' },
  ]

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader
        subtitle={business?.name ?? null}
        onSignOutError={(message) => setError(message)}
      />

      <div className="w-full flex flex-col justify-start items-center gap-4 p-4">
        {error && (
          <div className="w-full max-w-5xl rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm font-medium text-[#ef4343]">{error}</p>
          </div>
        )}
        {success && (
          <div className="w-full max-w-5xl rounded-2xl bg-[#171717] border border-[#292929] p-4">
            <p className="text-sm font-medium text-gold">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[#171717] p-6 border border-[#292929]">
            <p className="text-[#8c8c8c]">Chargement…</p>
          </div>
        ) : !business ? (
          <div className="rounded-2xl bg-[#171717] p-6 border border-[#292929] max-w-xl">
            <h2 className="text-lg font-semibold mb-2">
              Configurez d&apos;abord votre commerce
            </h2>
            <p className="text-sm text-[#8c8c8c] mb-4">
              Nous avons besoin d&apos;un commerce associé à votre compte pour générer votre affiche.
            </p>
            <Link
              href="/settings"
              className="inline-flex text-gold font-semibold transition-all duration-200 hover:underline active:scale-[0.98]"
            >
              Aller aux paramètres →
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-5xl flex flex-col justify-start items-start gap-4">
            {/* Tabs */}
            <div className="w-full flex flex-row flex-wrap justify-start items-center gap-2 bg-[#171717] border border-[#292929] rounded-2xl p-2">
              {tabs.map((t) => {
                const active = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={[
                      'flex flex-row items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.97] cursor-pointer',
                      active
                        ? 'bg-gold text-[#0d0d0d] font-semibold hover:bg-gold/90'
                        : 'text-[#8c8c8c] hover:text-[#e5e5e5] hover:bg-white/5',
                    ].join(' ')}
                  >
                    <span>{t.label}</span>
                    {t.badge === 'NEW' && (
                      <span
                        className={[
                          'text-[10px] font-bold py-0.5 px-1.5 rounded-full tracking-wider',
                          active ? 'bg-[#1D9E75] text-white' : 'bg-[#12362b] text-[#1D9E75]',
                        ].join(' ')}
                      >
                        NEW
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="w-full flex flex-col md:flex-row justify-start items-start gap-4">
              {/* COLONNE GAUCHE — Aperçu */}
              <div className="w-full md:w-[360px] flex flex-col items-center gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
                <p className="w-full text-xs uppercase tracking-widest text-[#8c8c8c]">
                  Aperçu
                </p>

                {needsTabConfig ? (
                  <div className="w-full rounded-xl border border-dashed border-[#292929] p-8 text-center">
                    <p className="text-sm text-[#8c8c8c]">
                      {activeTab === 'menu'
                        ? 'Configurez d\'abord votre menu pour voir l\'aperçu.'
                        : 'Configurez d\'abord votre lien pour voir l\'aperçu.'}
                    </p>
                  </div>
                ) : (
                  <PosterPreview
                    template={selectedTemplate}
                    accent={accentColor}
                    selectedFont={selectedFont}
                    businessName={business.name ?? ''}
                    inviteText={inviteText || DEFAULT_INVITE}
                    qrValue={qrTargetUrl}
                    logoUrl={logoUrl}
                    qrHostRef={posterQrRef}
                  />
                )}

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading || needsTabConfig}
                  className="w-full flex flex-row justify-center items-center gap-2 bg-gold text-[#12100e] rounded-2xl py-2.5 font-semibold cursor-pointer transition-all duration-200 hover:bg-gold/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
                  >
                    <path d="M12 15V3" />
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                  </svg>
                  {downloading ? 'Génération…' : 'Télécharger le PDF'}
                </button>
              </div>

              {/* COLONNE DROITE — Personnalisation */}
              <div className="w-full flex-1 flex flex-col bg-[#171717] border border-[#292929] rounded-2xl p-6 gap-6">
                <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                  Personnalisation
                </p>

                {/* Section 1 — Template */}
                <section className="w-full flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                    Template d&apos;affiche
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {TEMPLATES.map((t) => {
                      const active = selectedTemplate === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTemplate(t.id)}
                          className={[
                            'flex flex-col items-center gap-2 p-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.97]',
                            active
                              ? 'border-gold bg-gold/5'
                              : 'border-[#292929] hover:border-[#3a3a3a]',
                          ].join(' ')}
                        >
                          <TemplateThumb template={t.id} accent={accentColor} />
                          <span
                            className={[
                              'text-[11px] font-medium',
                              active ? 'text-gold' : 'text-[#8c8c8c]',
                            ].join(' ')}
                          >
                            {t.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <hr className="w-full border-0 h-px bg-[#292929]" />

                {/* Section 2 — Couleur d'accent */}
                <section className="w-full flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                    Couleur d&apos;accent
                  </label>
                  <div className="flex flex-row flex-wrap gap-3 items-center">
                    {ACCENT_PALETTE.map((c) => {
                      const active = accentColor === c
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setAccentColor(c)
                            setShowColorPicker(false)
                          }}
                          aria-label={`Couleur ${c}`}
                          className={[
                            'w-9 h-9 rounded-full cursor-pointer transition-all duration-200 active:scale-95',
                            active
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-[#171717]'
                              : 'ring-1 ring-[#292929]',
                          ].join(' ')}
                          style={{ backgroundColor: c }}
                        />
                      )
                    })}

                    {/* Pastille personnalisée (rainbow) */}
                    <button
                      type="button"
                      onClick={handlePickCustomColor}
                      aria-label="Couleur personnalisée"
                      className={[
                        'w-9 h-9 rounded-full cursor-pointer transition-all duration-200 active:scale-95',
                        showColorPicker
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#171717]'
                          : 'ring-1 ring-[#292929]',
                      ].join(' ')}
                      style={
                        showColorPicker && customAccent
                          ? { backgroundColor: customAccent }
                          : {
                              backgroundImage:
                                'conic-gradient(#ef4343,#f59e0b,#eab308,#22c55e,#06b6d4,#6366f1,#a855f7,#ef4343)',
                            }
                      }
                    />

                    <input
                      ref={colorInputRef}
                      type="color"
                      value={customAccent}
                      onChange={(e) => {
                        setCustomAccent(e.target.value)
                        setAccentColor(e.target.value)
                        setShowColorPicker(true)
                      }}
                      className="sr-only"
                    />
                  </div>
                </section>

                <hr className="w-full border-0 h-px bg-[#292929]" />

                {/* Section 3 — Typographie */}
                <section className="w-full flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                    Typographie
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Moderne', font: 'Space Grotesk, sans-serif' },
                      { label: 'Classique', font: 'Georgia, serif' },
                      { label: 'Élégant', font: '"Playfair Display", serif' },
                      { label: 'Technique', font: '"JetBrains Mono", monospace' },
                    ].map((option) => {
                      const active = selectedFont === option.font
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => setSelectedFont(option.font)}
                          className={[
                            'rounded-xl border p-3 transition-all duration-200 cursor-pointer active:scale-[0.98]',
                            active ? 'border-gold bg-gold/5' : 'border-[#292929] hover:border-[#3a3a3a]',
                          ].join(' ')}
                        >
                          <div
                            className={['text-xl leading-none', active ? 'text-gold' : 'text-[#e5e5e5]'].join(
                              ' '
                            )}
                            style={{ fontFamily: option.font }}
                          >
                            Aa
                          </div>
                          <div className={['text-xs mt-2', active ? 'text-gold' : 'text-[#8c8c8c]'].join(' ')}>
                            {option.label}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <hr className="w-full border-0 h-px bg-[#292929]" />

                {/* Section 4 — Logo */}
                <section className="w-full flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                    Logo du commerce
                  </label>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadLogo(file)
                    }}
                  />

                  {logoUrl ? (
                    <div className="w-full flex flex-row items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-10 h-10 rounded-lg bg-white object-contain p-1 border border-[#292929]"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="flex-1 text-sm text-gold border border-gold rounded-xl py-2 font-medium cursor-pointer transition-all duration-200 hover:bg-gold/10 active:scale-[0.98] disabled:opacity-50"
                      >
                        {uploadingLogo ? 'Upload…' : 'Remplacer'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={removingLogo}
                        className="text-sm text-[#ef4343] border border-[#2e1515] rounded-xl px-3 py-2 cursor-pointer transition-all duration-200 hover:bg-[#2e1515] active:scale-[0.98] disabled:opacity-50"
                      >
                        {removingLogo ? '…' : 'Supprimer'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="w-full flex flex-row justify-center items-center gap-2 text-gold border border-gold rounded-xl py-2.5 font-medium cursor-pointer transition-all duration-200 hover:bg-gold/10 active:scale-[0.98] disabled:opacity-50"
                    >
                      📁 {uploadingLogo ? 'Upload…' : 'Uploader votre logo (PNG recommandé)'}
                    </button>
                  )}

                  <p className="text-xs text-[#5c5c5c]">
                    Le logo apparaît au-dessus du QR code sur l&apos;affiche.
                  </p>
                </section>

                <hr className="w-full border-0 h-px bg-[#292929]" />

                {/* Section 5 — Texte d'invitation */}
                <section className="w-full flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                    Texte d&apos;invitation
                  </label>
                  <input
                    value={inviteText}
                    onChange={(e) => setInviteText(e.target.value)}
                    placeholder={DEFAULT_INVITE}
                    className="w-full bg-[#292929] px-3 py-2 rounded-xl text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold/60"
                  />
                </section>

                <hr className="w-full border-0 h-px bg-[#292929]" />

                {/* Section 6 — Configuration spécifique au tab */}
                {activeTab === 'avis' && (
                  <section className="w-full flex flex-col gap-3">
                    <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                      Destination
                    </label>
                    <div className="w-full bg-[#0f0f0f] border border-[#292929] rounded-xl p-4">
                      <p className="text-xs text-[#8c8c8c] mb-2">
                        Ce QR code redirige automatiquement vers votre page d&apos;avis :
                      </p>
                      <p className="text-sm text-[#e5e5e5] break-all font-mono">
                        {qrTargetUrl || '—'}
                      </p>
                    </div>
                  </section>
                )}

                {activeTab === 'menu' && (
                  <section className="w-full flex flex-col gap-3">
                    <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                      Configuration du menu
                    </label>
                    <div className="w-full flex flex-col gap-2">
                      <label className="text-sm text-[#8c8c8c]">
                        Lien de votre menu (URL ou PDF)
                      </label>
                      <input
                        value={menuUrl}
                        onChange={(e) => setMenuUrl(e.target.value)}
                        placeholder="https://mon-menu.com ou lien PDF..."
                        className="w-full bg-[#292929] px-3 py-2 rounded-xl text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold/60"
                      />
                    </div>

                    <input
                      ref={menuFileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadMenuPdf(file)
                      }}
                    />

                    <div className="w-full flex flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => menuFileInputRef.current?.click()}
                        disabled={uploadingMenu}
                        className="flex-1 flex flex-row justify-center items-center gap-2 text-gold border border-gold rounded-xl py-2.5 font-medium cursor-pointer transition-all duration-200 hover:bg-gold/10 active:scale-[0.98] disabled:opacity-50"
                      >
                        📄 {uploadingMenu ? 'Upload…' : 'Uploader un PDF menu'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMenu}
                        disabled={savingMenu}
                        className="flex-1 flex flex-row justify-center items-center gap-2 bg-gold text-[#12100e] rounded-xl py-2.5 font-semibold cursor-pointer transition-all duration-200 hover:bg-gold/90 active:scale-[0.98] disabled:opacity-50"
                      >
                        {savingMenu ? 'Sauvegarde…' : 'Sauvegarder'}
                      </button>
                    </div>
                  </section>
                )}

                {activeTab === 'lien' && (
                  <section className="w-full flex flex-col gap-3">
                    <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                      Configuration du lien
                    </label>
                    <div className="w-full flex flex-col gap-2">
                      <label className="text-sm text-[#8c8c8c]">
                        Votre lien de destination
                      </label>
                      <input
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#292929] px-3 py-2 rounded-xl text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold/60"
                      />
                    </div>

                    <div className="w-full bg-[#0f0f0f] border border-[#292929] rounded-xl p-4">
                      <p className="text-xs uppercase tracking-widest text-[#8c8c8c] mb-2">
                        Exemples
                      </p>
                      <ul className="text-sm text-[#8c8c8c] space-y-1">
                        <li>• Google Maps</li>
                        <li>• Instagram / Facebook</li>
                        <li>• Site web</li>
                        <li>• Lien de réservation</li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveCustom}
                      disabled={savingCustom}
                      className="w-full flex flex-row justify-center items-center gap-2 bg-gold text-[#12100e] rounded-xl py-2.5 font-semibold cursor-pointer transition-all duration-200 hover:bg-gold/90 active:scale-[0.98] disabled:opacity-50"
                    >
                      {savingCustom ? 'Sauvegarde…' : 'Sauvegarder'}
                    </button>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
