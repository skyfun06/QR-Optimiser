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

type TemplateId = 'C' | 'D' | 'F'

type TemplateMeta = {
  id: TemplateId
  label: string
}

const TEMPLATES: TemplateMeta[] = [
  { id: 'C', label: 'Template C — Élégant' },
  { id: 'D', label: 'Template D — Luxe Noir' },
  { id: 'F', label: 'Template F — Brasserie' },
]

const ACCENT_PALETTE = [
  '#C9973A',
  '#185FA5',
  '#1D9E75',
  '#993C1D',
  '#534AB7',
  '#000000',
] as const

const DEFAULT_INVITE = 'Scannez pour noter votre expérience'

const A4_W = 210
const A4_H = 297

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

function truncatePreviewText(text: string, maxLength = 35) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function sanitizePdfText(text: string) {
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : clean
  const value = Number.parseInt(normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

async function qrSvgToPngDataUrl(svgEl: SVGSVGElement): Promise<string> {
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
    canvas.width = 500
    canvas.height = 500
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas non supporté.')
    ctx.clearRect(0, 0, 500, 500)
    ctx.drawImage(img, 0, 0, 500, 500)
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
// Aperçu HTML/CSS (ratio A4) + miniatures SVG
// -----------------------------------------------------------------------------

type PosterPreviewProps = {
  template: TemplateId
  accent: string
  selectedFont: string
  businessName: string
  inviteText: string
  qrValue: string
  logoUrl: string | null
}

function PosterPreview({
  template,
  accent,
  selectedFont,
  businessName,
  inviteText,
  qrValue,
  logoUrl,
}: PosterPreviewProps) {
  const name = truncatePreviewText((businessName || 'Votre commerce').trim(), 28)
  const invite = truncatePreviewText(inviteText || DEFAULT_INVITE, 52)

  const renderLogoBlock = (className: string) =>
    logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="Logo commerce" className={className} />
    ) : (
      <div className={`${className} flex items-center justify-center text-[10px] text-[#6f6f6f]`}>Logo</div>
    )

  const qrColors = template === 'D' ? { bg: '#1a1a1a', fg: accent } : { bg: '#ffffff', fg: '#111111' }

  return (
    <div className="w-[220px] h-[310px] rounded-xl overflow-hidden shadow-xl shadow-black/50 bg-white relative">
      <div
        className="absolute top-0 left-0"
        style={{
          width: '210px',
          height: '297px',
          transform: `scale(${220 / 210}, ${310 / 297})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          className="relative w-full h-full"
          style={{
            aspectRatio: '210 / 297',
            fontFamily: selectedFont,
          }}
        >
          {template === 'C' && (
            <>
              <div className="absolute inset-0 bg-white" />
              <div
                className="absolute"
                style={{ left: 6, top: 6, right: 6, bottom: 6, border: `2.5px solid ${accent}`, borderRadius: 6 }}
              />
              <div
                className="absolute"
                style={{ left: 10, top: 10, right: 10, bottom: 10, border: `0.8px solid ${accent}`, borderRadius: 4 }}
              />

              {renderLogoBlock(
                'absolute left-1/2 -translate-x-1/2 top-[24px] max-w-[80px] h-[60px] object-contain'
              )}
              <div className="absolute left-1/2 -translate-x-1/2 top-[100px] text-[18px]" style={{ color: accent }}>
                ★★★★★
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2 top-[118px] text-[16px] font-bold text-[#1d1d1d]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {name}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-[128px] flex items-center gap-2">
                <span className="w-8 h-px block" style={{ backgroundColor: accent }} />
                <span className="text-[9px]" style={{ color: accent }}>
                  •
                </span>
                <span className="w-8 h-px block" style={{ backgroundColor: accent }} />
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 top-[140px] w-[140px] h-[140px] border border-[#dfdfdf] rounded-md bg-white p-2">
                {qrValue && <QRCodeSVG value={qrValue} size={124} bgColor="#ffffff" fgColor="#101010" level="H" />}
              </div>
              <p className="absolute left-1/2 -translate-x-1/2 top-[294px] text-[10px] text-[#666] text-center w-[180px]">
                {invite}
              </p>
              <p className="absolute left-1/2 -translate-x-1/2 top-[286px] text-[10px] text-center w-[180px]" style={{ color: accent }}>
                ✦ Propulsé par ScanAvis ✦
              </p>
            </>
          )}

          {template === 'D' && (
            <>
              <div className="absolute inset-0 bg-[#111111]" />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 210 297" aria-hidden>
                {[
                  [10, 10, 34, 10, 10, 34],
                  [200, 10, 176, 10, 200, 34],
                  [10, 287, 34, 287, 10, 263],
                  [200, 287, 176, 287, 200, 263],
                ].map((segment, i) => (
                  <g key={i} stroke={accent} strokeWidth="2.5" fill="none">
                    <path d={`M ${segment[0]} ${segment[1]} L ${segment[2]} ${segment[3]} M ${segment[0]} ${segment[1]} L ${segment[4]} ${segment[5]}`} />
                  </g>
                ))}
              </svg>

              <div className="absolute left-1/2 -translate-x-1/2 top-[14px] w-[76px] h-[76px] rounded-full border-2 flex items-center justify-center bg-[#1e1e1e]" style={{ borderColor: accent }}>
                {renderLogoBlock('w-[62px] h-[62px] rounded-full object-contain bg-[#1e1e1e]')}
              </div>
              <div className="absolute left-[20px] right-[20px] top-[96px] h-px bg-[#333333]" />
              <div className="absolute left-1/2 -translate-x-1/2 top-[114px] text-[17px] font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                {name}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-[130px] text-[14px]" style={{ color: accent }}>
                ★ ★ ★ ★ ★
              </div>
              <div className="absolute left-[20px] right-[20px] top-[140px] h-px bg-[#333333]" />
              <div className="absolute left-1/2 -translate-x-1/2 top-[150px] w-[150px] h-[150px] rounded-[10px] bg-[#1a1a1a] p-[8px]">
                {qrValue && (
                  <QRCodeSVG value={qrValue} size={134} bgColor={qrColors.bg} fgColor={qrColors.fg} level="H" />
                )}
              </div>
              <p className="absolute left-1/2 -translate-x-1/2 top-[274px] text-[10px] text-[#8c8c8c] text-center w-[190px]">
                {invite}
              </p>
              <p className="absolute left-1/2 -translate-x-1/2 top-[286px] text-[10px] text-center w-[190px]" style={{ color: accent }}>
                ✦ Propulsé par ScanAvis ✦
              </p>
            </>
          )}

          {template === 'F' && (
            <>
              <div className="absolute inset-0 bg-[#faf7f2]" />
              <div
                className="absolute"
                style={{ left: 10, top: 10, right: 10, bottom: 10, border: '1px solid #8B6914', borderRadius: 2 }}
              />
              <div
                className="absolute"
                style={{ left: 14, top: 14, right: 14, bottom: 14, border: `2.5px solid ${accent}`, borderRadius: 2 }}
              />
              <div
                className="absolute"
                style={{ left: 18, top: 18, right: 18, bottom: 18, border: '0.5px solid #8B6914', borderRadius: 1 }}
              />
              {[{ left: 14, top: 14 }, { right: 14, top: 14 }, { left: 14, bottom: 14 }, { right: 14, bottom: 14 }].map((p, i) => (
                <div key={i} className="absolute w-[10px] h-[10px] rounded-full -translate-x-1/2 -translate-y-1/2" style={{ ...p, backgroundColor: accent }} />
              ))}

              <div className="absolute left-[14px] right-[14px] top-[14px] h-[40px] flex items-center justify-center" style={{ backgroundColor: accent }}>
                <span className="text-white text-[13px] tracking-[0.2em]" style={{ fontFamily: 'Georgia, serif' }}>
                  VOTRE AVIS
                </span>
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 top-[66px] w-[70px] h-[70px] bg-white border border-[#e6ded1] shadow-sm flex items-center justify-center">
                {renderLogoBlock('w-[60px] h-[60px] object-contain')}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-[152px] text-[16px] font-bold text-[#2a1f0e]" style={{ fontFamily: 'Georgia, serif' }}>
                {name}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-[162px] flex items-center gap-2">
                <span className="w-8 h-px block" style={{ backgroundColor: accent }} />
                <span className="text-[10px]" style={{ color: accent }}>
                  ✦
                </span>
                <span className="w-8 h-px block" style={{ backgroundColor: accent }} />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-[178px] text-[15px]" style={{ color: accent }}>
                ★★★★★
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-[188px] w-[130px] h-[130px] bg-white border border-[#e8e0d0] p-[8px]">
                {qrValue && <QRCodeSVG value={qrValue} size={114} bgColor="#ffffff" fgColor="#111111" level="H" />}
              </div>

              <div className="absolute left-[14px] right-[14px] top-[271px] h-[19px] flex items-center justify-center" style={{ backgroundColor: accent }}>
                <p className="text-white text-[9px] text-center">Scannez pour noter votre expérience</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div id="qr-hidden" className="sr-only" aria-hidden>
        {qrValue && (
          <QRCodeSVG
            value={qrValue}
            size={1024}
            bgColor={template === 'D' ? '#1a1a1a' : '#ffffff'}
            fgColor={template === 'D' ? accent : '#111111'}
            level="H"
          />
        )}
      </div>
    </div>
  )
}

function TemplateThumb({ template, accent }: { template: TemplateId; accent: string }) {
  return (
    <svg width={70} height={98} viewBox="0 0 70 98" aria-hidden>
      {template === 'C' && (
        <>
          <rect x={0} y={0} width={70} height={98} fill="#ffffff" />
          <rect x={2} y={2} width={66} height={94} fill="none" stroke={accent} strokeWidth={1} rx={2} />
          <rect x={4} y={4} width={62} height={90} fill="none" stroke={accent} strokeWidth={0.5} rx={1.5} />
          <rect x={28} y={10} width={14} height={10} rx={1} fill="#ededed" />
          <text x={35} y={28} textAnchor="middle" fill={accent} fontSize={5}>*****</text>
          <rect x={22} y={36} width={26} height={26} rx={1.5} fill="#ffffff" stroke="#dfdfdf" strokeWidth={0.8} />
          <rect x={27} y={41} width={16} height={16} fill="#111111" opacity={0.12} />
          <rect x={14} y={82} width={42} height={3} rx={1.5} fill="#dcdcdc" />
        </>
      )}
      {template === 'D' && (
        <>
          <rect x={0} y={0} width={70} height={98} fill="#111111" />
          <path d="M4 4 L14 4 M4 4 L4 14" stroke={accent} strokeWidth={1.5} />
          <path d="M66 4 L56 4 M66 4 L66 14" stroke={accent} strokeWidth={1.5} />
          <path d="M4 94 L14 94 M4 94 L4 84" stroke={accent} strokeWidth={1.5} />
          <path d="M66 94 L56 94 M66 94 L66 84" stroke={accent} strokeWidth={1.5} />
          <circle cx={35} cy={18} r={8} fill="#1e1e1e" stroke={accent} strokeWidth={1} />
          <rect x={10} y={30} width={50} height={0.8} fill="#333333" />
          <rect x={20} y={38} width={30} height={2} rx={1} fill="#ffffff" />
          <rect x={17} y={45} width={36} height={36} rx={2} fill="#1a1a1a" />
          <rect x={24} y={52} width={22} height={22} fill={accent} opacity={0.15} />
        </>
      )}
      {template === 'F' && (
        <>
          <rect x={0} y={0} width={70} height={98} fill="#faf7f2" />
          <rect x={3} y={3} width={64} height={92} fill="none" stroke="#8B6914" strokeWidth={0.7} />
          <rect x={5} y={5} width={60} height={88} fill="none" stroke={accent} strokeWidth={1.4} />
          <rect x={7} y={7} width={56} height={84} fill="none" stroke="#8B6914" strokeWidth={0.5} />
          <rect x={5} y={5} width={60} height={12} fill={accent} />
          <rect x={28} y={22} width={14} height={14} fill="#ffffff" stroke="#e5dccf" />
          <rect x={21} y={44} width={28} height={28} fill="#ffffff" stroke="#e8e0d0" />
          <rect x={27} y={50} width={16} height={16} fill="#111111" opacity={0.12} />
          <rect x={5} y={79} width={60} height={8} fill={accent} />
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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('C')
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
  // Export PDF — templates C / D / F (A4: 210x297 mm)
  // ---------------------------------------------------------------------------

  async function handleDownloadPdf() {
    if (!business || !qrTargetUrl) return
    const qrHidden = document.getElementById('qr-hidden')
    const qrSvg = qrHidden?.querySelector('svg') as SVGSVGElement | null
    if (!qrSvg) {
      setError('QR introuvable dans le rendu caché.')
      return
    }

    setDownloading(true)
    setError(null)
    setSuccess(null)

    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const name =
        sanitizePdfText(truncatePreviewText((business.name || 'Votre commerce').trim(), 36)) ||
        'Votre commerce'
      const invite = sanitizePdfText(inviteText || DEFAULT_INVITE) || DEFAULT_INVITE

      const accentRgb = hexToRgb(accentColor)
      const drawCenteredText = (text: string, y: number) => doc.text(text, 105, y, { align: 'center' })

      const qrPngDataUrl = await qrSvgToPngDataUrl(qrSvg)

      let logoDataUrl: string | null = null
      if (logoUrl) {
        try {
          logoDataUrl = await fetchImageAsDataUrl(logoUrl)
        } catch {
          logoDataUrl = null
        }
      }
      const logoFormat = logoDataUrl?.toLowerCase().includes('png') ? 'PNG' : 'JPEG'

      // 1) Fonds et formes
      if (selectedTemplate === 'C') {
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, A4_W, A4_H, 'F')

        doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setLineWidth(2.5)
        doc.roundedRect(6, 6, 198, 285, 6, 6, 'S')
        doc.setLineWidth(0.8)
        doc.roundedRect(10, 10, 190, 277, 4, 4, 'S')

        doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setLineWidth(0.6)
        doc.line(77, 128, 95, 128)
        doc.circle(105, 128, 0.9, 'F')
        doc.line(115, 128, 133, 128)

        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(223, 223, 223)
        doc.setLineWidth(0.5)
        doc.roundedRect(35, 140, 140, 140, 2, 2, 'FD')
      }

      if (selectedTemplate === 'D') {
        doc.setFillColor(17, 17, 17)
        doc.rect(0, 0, A4_W, A4_H, 'F')

        doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setLineWidth(2.5)
        doc.line(10, 10, 34, 10)
        doc.line(10, 10, 10, 34)
        doc.line(200, 10, 176, 10)
        doc.line(200, 10, 200, 34)
        doc.line(10, 287, 34, 287)
        doc.line(10, 287, 10, 263)
        doc.line(200, 287, 176, 287)
        doc.line(200, 287, 200, 263)

        doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setFillColor(30, 30, 30)
        doc.setLineWidth(1)
        doc.circle(105, 52, 38, 'FD')

        doc.setDrawColor(51, 51, 51)
        doc.setLineWidth(0.3)
        doc.line(20, 96, 190, 96)
        doc.line(20, 140, 190, 140)

        doc.setFillColor(26, 26, 26)
        doc.setDrawColor(26, 26, 26)
        doc.roundedRect(30, 150, 150, 150, 10, 10, 'FD')
      }

      if (selectedTemplate === 'F') {
        doc.setFillColor(250, 247, 242)
        doc.rect(0, 0, A4_W, A4_H, 'F')

        doc.setDrawColor(139, 105, 20)
        doc.setLineWidth(1)
        doc.roundedRect(10, 10, 190, 277, 2, 2, 'S')
        doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setLineWidth(2.5)
        doc.roundedRect(14, 14, 182, 269, 2, 2, 'S')
        doc.setDrawColor(139, 105, 20)
        doc.setLineWidth(0.5)
        doc.roundedRect(18, 18, 174, 261, 1, 1, 'S')

        doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.circle(14, 14, 2.5, 'F')
        doc.circle(196, 14, 2.5, 'F')
        doc.circle(14, 283, 2.5, 'F')
        doc.circle(196, 283, 2.5, 'F')

        doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.rect(14, 14, 182, 40, 'F')
        doc.setFillColor(255, 255, 255)
        doc.rect(70, 66, 70, 70, 'F')

        doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.rect(14, 271, 182, 19, 'F')

        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(232, 224, 208)
        doc.setLineWidth(0.5)
        doc.rect(40, 188, 130, 130, 'FD')
      }

      // 2) Images (logo + QR)
      if (logoDataUrl) {
        if (selectedTemplate === 'C') {
          doc.addImage(logoDataUrl, logoFormat, 65, 24, 80, 60)
        }
        if (selectedTemplate === 'D') {
          doc.addImage(logoDataUrl, logoFormat, 74, 21, 62, 62)
        }
        if (selectedTemplate === 'F') {
          doc.addImage(logoDataUrl, logoFormat, 75, 71, 60, 60)
        }
      }

      if (selectedTemplate === 'C') {
        doc.addImage(qrPngDataUrl, 'PNG', 43, 148, 124, 124)
      }
      if (selectedTemplate === 'D') {
        doc.addImage(qrPngDataUrl, 'PNG', 38, 158, 134, 134)
      }
      if (selectedTemplate === 'F') {
        doc.addImage(qrPngDataUrl, 'PNG', 48, 196, 114, 114)
      }

      // 3) Textes
      if (selectedTemplate === 'C') {
        doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setFont('times', 'bold')
        doc.setFontSize(15)
        drawCenteredText('*****', 100)

        doc.setTextColor(25, 25, 25)
        doc.setFont('times', 'bold')
        doc.setFontSize(16)
        drawCenteredText(name, 118)

        doc.setTextColor(102, 102, 102)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.splitTextToSize(invite, 160).slice(0, 2).forEach((line: string, index: number) => {
          drawCenteredText(line, 286 + index * 4)
        })

        doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setFont('times', 'normal')
        doc.setFontSize(10)
        drawCenteredText('- Propulse par ScanAvis -', 294)
      }

      if (selectedTemplate === 'D') {
        doc.setTextColor(255, 255, 255)
        doc.setFont('times', 'bold')
        doc.setFontSize(17)
        drawCenteredText(name, 114)

        doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setFont('times', 'normal')
        doc.setFontSize(14)
        drawCenteredText('* * * * *', 130)

        doc.setTextColor(140, 140, 140)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.splitTextToSize(invite, 160).slice(0, 2).forEach((line: string, index: number) => {
          drawCenteredText(line, 286 + index * 4)
        })

        doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setFont('times', 'normal')
        doc.setFontSize(10)
        drawCenteredText('- Propulse par ScanAvis -', 294)
      }

      if (selectedTemplate === 'F') {
        doc.setTextColor(255, 255, 255)
        doc.setFont('times', 'bold')
        doc.setFontSize(14)
        drawCenteredText('VOTRE AVIS', 39)

        doc.setTextColor(42, 31, 14)
        doc.setFont('times', 'bold')
        doc.setFontSize(16)
        drawCenteredText(name, 152)

        doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        drawCenteredText('----- * -----', 162)

        doc.setFont('times', 'normal')
        doc.setFontSize(14)
        drawCenteredText('*****', 178)

        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const footer = doc.splitTextToSize('Scannez pour noter votre experience', 160)
        footer.forEach((line: string, index: number) => {
          drawCenteredText(line, 281 + index * 3.5)
        })
      }

      const suffix = activeTab === 'avis' ? '' : activeTab === 'menu' ? '-menu' : '-lien'
      doc.save(`affiche-${slugify(business.name ?? 'commerce')}${suffix}.pdf`)
      setSuccess('PDF téléchargé !')
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
            <p
              className={[
                'text-sm font-medium',
                success === 'PDF téléchargé !' ? 'text-[#39d98a]' : 'text-gold',
              ].join(' ')}
            >
              {success}
            </p>
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
                  />
                )}

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading || needsTabConfig}
                  className="w-full flex flex-row justify-center items-center gap-2 bg-gold text-[#12100e] rounded-2xl py-2.5 font-semibold cursor-pointer transition-all duration-200 hover:bg-gold/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                    >
                      <path d="M12 15V3" />
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                  )}
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
                              ? 'border-2 border-gold bg-gold/5'
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
