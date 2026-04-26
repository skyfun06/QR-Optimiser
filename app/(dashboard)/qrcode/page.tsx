'use client'

import { type CSSProperties, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { DashboardHeader } from '@/components/dashboard-header'
import { supabase } from '@/lib/supabase'
import { INPUT_LIMITS, isSafeHttpUrl } from '@/lib/security'

type BusinessRow = {
  id: string
  name: string | null
  menu_url: string | null
  custom_url: string | null
  logo_url: string | null
}

type TabId = 'avis' | 'menu' | 'lien'

type TemplateId = 'C' | 'D' | 'F' | 'G'

type TemplateMeta = {
  id: TemplateId
  label: string
}

const TEMPLATES: TemplateMeta[] = [
  { id: 'G', label: 'Template G — Premium Dark' },
  { id: 'D', label: 'Template D — Luxe Noir' },
  { id: 'C', label: 'Template C — Élégant' },
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
const POSTER_WIDTH_PX = 794
const POSTER_HEIGHT_PX = 1123
const POSTER_PREVIEW_SCALE = 0.42
const POSTER_GOLD = '#C9973A'

// Dimensions du conteneur d'aperçu calculées depuis le scale
const PREVIEW_W = Math.round(POSTER_WIDTH_PX * POSTER_PREVIEW_SCALE)
const PREVIEW_H = Math.round(POSTER_HEIGHT_PX * POSTER_PREVIEW_SCALE)

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

function truncateText(text: string, maxLength = 35) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function sanitizePosterText(text: string) {
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()
}

// -----------------------------------------------------------------------------
// Affiche unique (Template D) pour aperçu + export PDF
// -----------------------------------------------------------------------------

type PosterCanvasProps = {
  template: TemplateId
  selectedFont: string
  businessName: string
  inviteText: string
  qrValue: string
  logoUrl: string | null
  className?: string
  style?: CSSProperties
}

const PosterCanvas = forwardRef<HTMLDivElement, PosterCanvasProps>(function PosterCanvas(
  { template, selectedFont, businessName, inviteText, qrValue, logoUrl, className, style },
  ref
) {
  const name =
    sanitizePosterText(truncateText((businessName || 'Votre commerce').trim(), 48)) || 'Votre commerce'
  const invite =
    sanitizePosterText(truncateText(inviteText || DEFAULT_INVITE, 140)) || DEFAULT_INVITE

  return (
    <div
      ref={ref}
      className={['relative overflow-hidden', className ?? ''].join(' ').trim()}
      style={{
        width: `${POSTER_WIDTH_PX}px`,
        height: `${POSTER_HEIGHT_PX}px`,
        backgroundColor: '#0d0d0d',
        fontFamily: selectedFont,
        ...style,
      }}
    >
      {template === 'G' ? (
        <PosterContentG name={name} invite={invite} qrValue={qrValue} logoUrl={logoUrl} />
      ) : (
        <PosterContentD name={name} invite={invite} qrValue={qrValue} logoUrl={logoUrl} />
      )}
    </div>
  )
})

// -----------------------------------------------------------------------------
// Template D — Luxe Noir (design existant)
// -----------------------------------------------------------------------------

type PosterContentProps = {
  name: string
  invite: string
  qrValue: string
  logoUrl: string | null
}

function PosterContentD({ name, invite, qrValue, logoUrl }: PosterContentProps) {
  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${POSTER_WIDTH_PX} ${POSTER_HEIGHT_PX}`}
        aria-hidden
      >
        {[
          [36, 36, 138, 36, 36, 138],
          [POSTER_WIDTH_PX - 36, 36, POSTER_WIDTH_PX - 138, 36, POSTER_WIDTH_PX - 36, 138],
          [36, POSTER_HEIGHT_PX - 36, 138, POSTER_HEIGHT_PX - 36, 36, POSTER_HEIGHT_PX - 138],
          [
            POSTER_WIDTH_PX - 36,
            POSTER_HEIGHT_PX - 36,
            POSTER_WIDTH_PX - 138,
            POSTER_HEIGHT_PX - 36,
            POSTER_WIDTH_PX - 36,
            POSTER_HEIGHT_PX - 138,
          ],
        ].map((segment, i) => (
          <g key={i} stroke={POSTER_GOLD} strokeWidth="5" fill="none">
            <path
              d={`M ${segment[0]} ${segment[1]} L ${segment[2]} ${segment[3]} M ${segment[0]} ${segment[1]} L ${segment[4]} ${segment[5]}`}
            />
          </g>
        ))}
      </svg>

      <div className="relative h-full flex flex-col items-center">
        <div className="h-[60px]" />

        <div className="h-[180px] w-full max-w-[180px] flex items-center justify-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo commerce"
              className="w-full h-auto max-w-full max-h-[180px] object-contain"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full max-w-[180px] h-[180px] border border-[#2e2e2e] text-[#666666] text-sm flex items-center justify-center">
              Logo
            </div>
          )}
        </div>

        <div className="h-[52px]" />

        <div className="min-h-[168px] px-14 flex items-center justify-center">
          <h2 className="text-white text-[42px] font-bold text-center leading-tight">{name}</h2>
        </div>

        <div className="h-[34px]" />

        <div className="w-full max-w-[560px] h-px bg-[#C9973A]" />

        <div className="h-[36px]" />

        <div className="w-full max-w-[280px] h-[280px] bg-white p-0.5 rounded-[2px] flex items-center justify-center">
          {qrValue ? (
            <QRCodeSVG value={qrValue} size={280} bgColor="#ffffff" fgColor="#111111" level="H" />
          ) : (
            <div className="w-full max-w-[280px] h-[280px] border border-dashed border-[#2f2f2f]" />
          )}
        </div>

        <p className="min-h-[44px] mt-[20px] text-[16px] text-[#8c8c8c] text-center px-14">{invite}</p>

        <div className="h-[221px]" />

        <p className="min-h-[20px] text-[12px] text-[#8c8c8c]">Propulsé par ScanAvis</p>
      </div>
    </>
  )
}

// -----------------------------------------------------------------------------
// Template G — Premium Dark
// -----------------------------------------------------------------------------

function PosterContentG({ name, invite, qrValue, logoUrl }: PosterContentProps) {
  return (
    <>
      {/* 1. Barre gold de 8px en haut */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: '8px', backgroundColor: POSTER_GOLD }}
      />

      {/* 4. Barre gold de 8px en bas */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: '8px', backgroundColor: POSTER_GOLD }}
      />

      {/* 2. Rectangle intérieur avec border gold */}
      <div
        className="absolute"
        style={{
          left: '32px',
          right: '32px',
          top: '32px',
          bottom: '32px',
          border: `1px solid ${POSTER_GOLD}`,
          borderRadius: '10px',
        }}
      >
        <div
          className="w-full h-full flex flex-col items-center"
          style={{ paddingTop: '40px', paddingBottom: '20px', paddingLeft: '40px', paddingRight: '40px' }}
        >
          {/* a. 5 étoiles gold */}
          <div
            className="flex items-center justify-center"
            style={{ color: POSTER_GOLD, fontSize: '52px', letterSpacing: '8px', lineHeight: 1 }}
          >
            ★ ★ ★ ★ ★
          </div>

          <div style={{ height: '40px' }} />

          {/* b. Titre 2 lignes */}
          <div className="flex flex-col items-center" style={{ lineHeight: 0.95 }}>
            <h1
              className="text-white text-center"
              style={{ fontSize: '74px', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}
            >
              VOTRE AVIS
            </h1>
            <h1
              className="text-center"
              style={{ fontSize: '74px', fontWeight: 800, color: POSTER_GOLD, letterSpacing: '-1px', margin: 0, marginTop: '6px' }}
            >
              NOUS IMPORTE
            </h1>
          </div>

          <div style={{ height: '28px' }} />

          {/* c. Sous-titre */}
          <p className="text-center" style={{ fontSize: '18px', color: '#8c8c8c', margin: 0 }}>
            Partagez votre expérience en 10 secondes
          </p>

          <div style={{ height: '32px' }} />

          {/* d. Ligne séparatrice */}
          <div style={{ width: '60%', height: '1px', backgroundColor: '#292929' }} />

          <div style={{ height: '32px' }} />

          {/* e. Logo cercle */}
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              border: logoUrl ? 'none' : '1px solid #292929',
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo commerce"
                className="w-full h-full object-contain"
                style={{ borderRadius: '50%' }}
                crossOrigin="anonymous"
              />
            ) : null}
          </div>

          <div style={{ height: '20px' }} />

          {/* f. Nom du commerce */}
          <h2 className="text-white text-center" style={{ fontSize: '26px', fontWeight: 700, margin: 0 }}>
            {name}
          </h2>

          <div style={{ height: '24px' }} />

          {/* g. QR code */}
          <div
            className="bg-white flex items-center justify-center"
            style={{ padding: '16px', borderRadius: '16px' }}
          >
            {qrValue ? (
              <QRCodeSVG value={qrValue} size={220} bgColor="#ffffff" fgColor="#111111" level="H" />
            ) : (
              <div style={{ width: '220px', height: '220px', backgroundColor: '#f0f0f0' }} />
            )}
          </div>

          <div style={{ height: '28px' }} />

          {/* h. Bouton CTA */}
          <p
            style={{
              width: '70%',
              backgroundColor: POSTER_GOLD,
              borderRadius: '26px',
              paddingTop: '22px',
              paddingBottom: '36px',
              paddingLeft: '24px',
              paddingRight: '24px',
              color: '#0d0d0d',
              fontWeight: 700,
              fontSize: '18px',
              lineHeight: 1.2,
              textAlign: 'center',
              margin: 0,
              boxSizing: 'border-box',
            }}
          >
            {invite}
          </p>

          {/* spacer pour pousser le footer en bas du rectangle */}
          <div className="flex-1" />

          {/* i. Propulsé par ScanAvis */}
          <p className="text-center" style={{ fontSize: '11px', color: '#444444', margin: 0 }}>
            Propulsé par ScanAvis
          </p>
        </div>
      </div>
    </>
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
      {template === 'G' && (
        <>
          <rect x={0} y={0} width={70} height={98} fill="#0d0d0d" />
          {/* Barres gold haut/bas */}
          <rect x={0} y={0} width={70} height={2} fill={accent} />
          <rect x={0} y={96} width={70} height={2} fill={accent} />
          {/* Rectangle intérieur */}
          <rect x={4} y={6} width={62} height={86} fill="none" stroke={accent} strokeWidth={0.5} rx={1} />
          {/* Étoiles */}
          <text x={35} y={16} textAnchor="middle" fill={accent} fontSize={4.5}>★★★★★</text>
          {/* Titre 2 lignes */}
          <rect x={18} y={22} width={34} height={2.5} rx={0.4} fill="#ffffff" />
          <rect x={14} y={28} width={42} height={2.5} rx={0.4} fill={accent} />
          {/* Sous-titre */}
          <rect x={20} y={36} width={30} height={1.2} rx={0.3} fill="#888" />
          {/* Séparateur */}
          <line x1={22} y1={43} x2={48} y2={43} stroke="#444" strokeWidth={0.3} />
          {/* Logo cercle */}
          <circle cx={35} cy={50} r={3.5} fill="none" stroke="#444" strokeWidth={0.5} />
          {/* Nom commerce */}
          <rect x={24} y={56} width={22} height={1.5} rx={0.4} fill="#ddd" />
          {/* QR */}
          <rect x={26} y={61} width={18} height={18} rx={1} fill="#ffffff" />
          <rect x={29} y={64} width={12} height={12} fill="#111111" opacity={0.18} />
          {/* CTA */}
          <rect x={18} y={84} width={34} height={4} rx={2} fill={accent} />
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

  const [activeTab, setActiveTab] = useState<TabId>('avis')

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('G')
  const [accentColor, setAccentColor] = useState<string>('#C9973A')
  const [customAccent, setCustomAccent] = useState<string>('#C9973A')
  const [selectedFont, setSelectedFont] = useState('Space Grotesk, sans-serif')
  const [inviteText, setInviteText] = useState<string>(DEFAULT_INVITE)

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  const [menuUrl, setMenuUrl] = useState('')
  const [savingMenu, setSavingMenu] = useState(false)
  const [uploadingMenu, setUploadingMenu] = useState(false)
  const menuFileInputRef = useRef<HTMLInputElement | null>(null)

  const [customUrl, setCustomUrl] = useState('')
  const [savingCustom, setSavingCustom] = useState(false)

  const [downloading, setDownloading] = useState(false)
  const posterPdfRef = useRef<HTMLDivElement | null>(null)

  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorInputRef = useRef<HTMLInputElement | null>(null)

  // Animation states
  const [mounted, setMounted] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [posterOpacity, setPosterOpacity] = useState(1)
  const [savedMenu, setSavedMenu] = useState(false)
  const [savedCustom, setSavedCustom] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const isFirstTabRender = useRef(true)
  const isFirstPosterRender = useRef(true)

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Tab content transition
  useEffect(() => {
    if (isFirstTabRender.current) {
      isFirstTabRender.current = false
      return
    }
    setTabVisible(false)
    const t = setTimeout(() => setTabVisible(true), 30)
    return () => clearTimeout(t)
  }, [activeTab])

  // Poster micro-fade on option change
  useEffect(() => {
    if (isFirstPosterRender.current) {
      isFirstPosterRender.current = false
      return
    }
    setPosterOpacity(0.7)
    const t = setTimeout(() => setPosterOpacity(1), 200)
    return () => clearTimeout(t)
  }, [accentColor, selectedFont, selectedTemplate])

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

  const qrTargetUrl = useMemo(() => {
    if (!business) return ''
    if (activeTab === 'avis') return origin ? `${origin}/review/${business.id}` : ''
    if (activeTab === 'menu') return menuUrl.trim() ? `${origin}/menu/${business.id}` : ''
    return customUrl.trim() ? `${origin}/custom/${business.id}` : ''
  }, [activeTab, origin, business, menuUrl, customUrl])

  const needsTabConfig =
    (activeTab === 'menu' && !menuUrl.trim()) ||
    (activeTab === 'lien' && !customUrl.trim())

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePickCustomColor = useCallback(() => {
    setShowColorPicker(true)
    setTimeout(() => colorInputRef.current?.click(), 0)
  }, [])

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(qrTargetUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch {
      // fallback silencieux
    }
  }

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
      if (trimmed && !isSafeHttpUrl(trimmed)) {
        throw new Error('Le lien du menu doit être une URL HTTPS valide.')
      }
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ menu_url: trimmed })
        .eq('id', business.id)
      if (updateError) throw updateError
      setBusiness({ ...business, menu_url: trimmed })
      setSuccess('Lien du menu sauvegardé.')
      setSavedMenu(true)
      setTimeout(() => setSavedMenu(false), 2000)
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
      if (trimmed && !isSafeHttpUrl(trimmed)) {
        throw new Error('Le lien de destination doit être une URL HTTPS valide.')
      }
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ custom_url: trimmed })
        .eq('id', business.id)
      if (updateError) throw updateError
      setBusiness({ ...business, custom_url: trimmed })
      setSuccess('Lien de destination sauvegardé.')
      setSavedCustom(true)
      setTimeout(() => setSavedCustom(false), 2000)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sauvegarde impossible.'
      setError(message)
    } finally {
      setSavingCustom(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Export PDF — capture HTML (A4 fixe)
  // ---------------------------------------------------------------------------

  async function handleDownloadPdf() {
    if (!business || !qrTargetUrl) return
    if (!posterPdfRef.current) {
      setError('Affiche introuvable dans le DOM.')
      return
    }

    setDownloading(true)
    setError(null)
    setSuccess(null)

    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(posterPdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0d0d0d',
        width: POSTER_WIDTH_PX,
        height: POSTER_HEIGHT_PX,
        windowWidth: POSTER_WIDTH_PX,
        windowHeight: POSTER_HEIGHT_PX,
      })

      const imageData = canvas.toDataURL('image/png')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      doc.addImage(imageData, 'PNG', 0, 0, A4_W, A4_H)

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

  const gradientGold = 'linear-gradient(135deg, #C9973A, #e6b84a)'

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader
        subtitle={business?.name ?? null}
        onSignOutError={(message) => setError(message)}
      />

      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-start items-center gap-3 md:gap-6 py-6 md:py-8">
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
          <div className="w-full max-w-6xl flex flex-col justify-start items-start gap-3 md:gap-6">
            {/* Tabs */}
            <div className="w-full overflow-x-auto bg-[#171717] border border-[#292929] rounded-2xl p-2">
              <div className="flex min-w-max flex-row justify-start items-center gap-2">
                {tabs.map((t) => {
                  const active = activeTab === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={[
                        'flex flex-row items-center gap-2 text-xs md:text-sm px-3 md:px-4 py-2 rounded-xl min-h-[44px] transition-all duration-200 active:scale-[0.97] cursor-pointer whitespace-nowrap',
                        active
                          ? 'text-[#0d0d0d] font-semibold'
                          : 'text-[#8c8c8c] hover:text-white hover:bg-white/5',
                      ].join(' ')}
                      style={
                        active
                          ? {
                              background: gradientGold,
                              boxShadow: '0 0 16px rgba(201,151,58,0.3)',
                            }
                          : undefined
                      }
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
            </div>

            {/* Two-column content — animated on tab change */}
            <div
              className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6"
              style={{
                opacity: tabVisible ? 1 : 0,
                transform: tabVisible ? 'translateX(0)' : 'translateX(-10px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
            >
              {/* COLONNE GAUCHE — Aperçu (slide depuis la gauche) */}
              <div
                className="w-full flex flex-col items-center gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-40px)',
                  transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
                }}
              >
                <p className="w-full text-xs uppercase tracking-widest text-[#8c8c8c]">
                  Aperçu
                </p>

                {/* Zone aperçu centrée */}
                <div className="flex-1 flex items-center justify-center w-full py-2">
                  {needsTabConfig ? (
                    <div className="w-full rounded-xl border border-dashed border-[#292929] p-8 text-center">
                      <p className="text-sm text-[#8c8c8c]">
                        {activeTab === 'menu'
                          ? 'Configurez d\'abord votre menu pour voir l\'aperçu.'
                          : 'Configurez d\'abord votre lien pour voir l\'aperçu.'}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="rounded-xl overflow-hidden border border-[#292929]"
                      style={{
                        width: `${PREVIEW_W}px`,
                        height: `${PREVIEW_H}px`,
                        boxShadow: '0 0 40px rgba(201,151,58,0.08), 0 20px 60px rgba(0,0,0,0.6)',
                        opacity: posterOpacity,
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      <PosterCanvas
                        template={selectedTemplate}
                        selectedFont={selectedFont}
                        businessName={business.name ?? ''}
                        inviteText={inviteText || DEFAULT_INVITE}
                        qrValue={qrTargetUrl}
                        logoUrl={logoUrl}
                        style={{
                          transform: `scale(${POSTER_PREVIEW_SCALE})`,
                          transformOrigin: 'top left',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Bouton Télécharger PDF — gradient gold */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading || needsTabConfig}
                  className="group w-full min-h-[44px] flex flex-row justify-center items-center gap-2 text-[#0d0d0d] rounded-2xl py-2.5 font-bold cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                  {downloading ? 'Génération…' : 'Télécharger le PDF'}
                </button>
              </div>

              {/* COLONNE DROITE — Personnalisation (slide depuis la droite) */}
              <div
                className="w-full flex-1 flex flex-col bg-[#171717] border border-[#292929] rounded-2xl p-4 md:p-6 gap-4 md:gap-6"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(40px)',
                  transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
                }}
              >
                <p className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                  Personnalisation
                </p>

                {/* Section 1 — Template */}
                <section className="w-full flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                    Template d&apos;affiche
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {TEMPLATES.map((t) => {
                      const active = selectedTemplate === t.id
                      const isAvailable = t.id === 'D' || t.id === 'G'
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (isAvailable) setSelectedTemplate(t.id)
                          }}
                          disabled={!isAvailable}
                          title={!isAvailable ? 'Disponible prochainement' : undefined}
                          className={[
                            'relative flex flex-col items-center gap-2 p-2 rounded-xl border transition-all duration-200',
                            !isAvailable && 'cursor-not-allowed',
                            active
                              ? 'border-2 border-gold bg-[#1e1e1e] active:scale-[0.97]'
                              : isAvailable
                                ? 'border-[#292929] hover:border-[#C9973A80] cursor-pointer active:scale-[0.97]'
                                : 'border-[#292929]',
                          ].join(' ')}
                        >
                          {!isAvailable && (
                            <div className="absolute inset-0 bg-[#0d0d0d]/60 rounded-xl flex items-center justify-center z-10">
                              <span className="text-2xl select-none">🔒</span>
                            </div>
                          )}
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
                  <div className="flex flex-row flex-wrap gap-3 items-end">
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
                            'w-9 h-9 rounded-full cursor-pointer transition-all duration-200 active:scale-95 hover:scale-110',
                            active
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0d0d] scale-110'
                              : 'ring-1 ring-[#292929]',
                          ].join(' ')}
                          style={{ backgroundColor: c }}
                        />
                      )
                    })}

                    {/* Pastille personnalisée (rainbow) + label */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePickCustomColor}
                        aria-label="Couleur personnalisée"
                        className={[
                          'w-9 h-9 rounded-full cursor-pointer transition-all duration-200 active:scale-95 hover:scale-110',
                          showColorPicker
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0d0d] scale-110'
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
                    </div>

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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            active
                              ? 'border-gold bg-[#1e1e1e]'
                              : 'border-[#292929] hover:border-[#C9973A80]',
                          ].join(' ')}
                        >
                          <div
                            className={['text-xl leading-none', active ? 'text-gold' : 'text-[#e5e5e5]'].join(' ')}
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
                    🖼️ Logo du commerce
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
                    <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div className="w-10 h-10 rounded-lg bg-white p-1 border border-[#292929]">
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="w-full h-auto max-w-full max-h-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="w-full sm:flex-1 min-h-[44px] text-sm text-gold border border-gold rounded-xl py-2 font-medium cursor-pointer transition-all duration-200 hover:bg-gold/10 active:scale-[0.98] disabled:opacity-50"
                      >
                        {uploadingLogo ? 'Upload…' : 'Remplacer'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={removingLogo}
                        className="w-full sm:w-auto min-h-[44px] text-sm text-[#ef4343] border border-[#2e1515] rounded-xl px-3 py-2 cursor-pointer transition-all duration-200 hover:bg-[#2e1515] active:scale-[0.98] disabled:opacity-50"
                      >
                        {removingLogo ? '…' : 'Supprimer'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="w-full min-h-[44px] flex flex-row justify-center items-center gap-2 text-gold border border-gold rounded-xl py-2.5 font-medium cursor-pointer transition-all duration-200 hover:bg-gold/10 active:scale-[0.98] disabled:opacity-50"
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
                    💬 Texte d&apos;invitation
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
                      🔗 Destination
                    </label>
                    <div className="w-full flex flex-col gap-2">
                      <p className="text-xs text-[#8c8c8c]">
                        Ce QR code redirige automatiquement vers votre page d&apos;avis :
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={qrTargetUrl || '—'}
                          className="flex-1 min-w-0 bg-[#0d0d0d] border border-dashed border-[#292929] px-3 py-2 rounded-xl text-sm text-[#8c8c8c] font-mono cursor-default select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          disabled={!qrTargetUrl}
                          className={[
                            'shrink-0 min-h-[38px] px-3 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap',
                            copiedUrl
                              ? 'bg-[#22c55e] border-[#22c55e] text-white'
                              : 'border-[#292929] text-[#8c8c8c] hover:border-gold hover:text-gold',
                          ].join(' ')}
                        >
                          {copiedUrl ? 'Copié ✓' : 'Copier'}
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {activeTab === 'menu' && (
                  <section className="w-full flex flex-col gap-3">
                    <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                      📋 Configuration du menu
                    </label>
                    <div className="w-full flex flex-col gap-2">
                      <label className="text-sm text-[#8c8c8c]">
                        🔗 Lien de votre menu (URL ou PDF)
                      </label>
                      <input
                        type="url"
                        inputMode="url"
                        value={menuUrl}
                        onChange={(e) => setMenuUrl(e.target.value)}
                        placeholder="https://mon-menu.com ou lien PDF..."
                        maxLength={INPUT_LIMITS.url}
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

                    <div className="w-full flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => menuFileInputRef.current?.click()}
                        disabled={uploadingMenu}
                        className="w-full sm:flex-1 min-h-[44px] flex flex-row justify-center items-center gap-2 text-gold border border-gold rounded-xl py-2.5 font-medium cursor-pointer transition-all duration-200 hover:bg-gold/10 active:scale-[0.98] disabled:opacity-50"
                      >
                        📄 {uploadingMenu ? 'Upload…' : 'Uploader un PDF menu'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMenu}
                        disabled={savingMenu}
                        className="group w-full sm:flex-1 min-h-[44px] flex flex-row justify-center items-center gap-2 rounded-xl py-2.5 font-bold cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        style={{
                          background: savedMenu ? '#22c55e' : gradientGold,
                          color: '#0d0d0d',
                        }}
                      >
                        {savingMenu ? 'Sauvegarde…' : savedMenu ? 'Sauvegardé ✓' : 'Sauvegarder'}
                      </button>
                    </div>
                  </section>
                )}

                {activeTab === 'lien' && (
                  <section className="w-full flex flex-col gap-3">
                    <label className="text-xs uppercase tracking-widest text-[#8c8c8c]">
                      🔗 Configuration du lien
                    </label>
                    <div className="w-full flex flex-col gap-2">
                      <label className="text-sm text-[#8c8c8c]">
                        🌐 Votre lien de destination
                      </label>
                      <input
                        type="url"
                        inputMode="url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://..."
                        maxLength={INPUT_LIMITS.url}
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
                      className="w-full min-h-[44px] flex flex-row justify-center items-center gap-2 rounded-xl py-2.5 font-bold cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      style={{
                        background: savedCustom ? '#22c55e' : gradientGold,
                        color: '#0d0d0d',
                      }}
                    >
                      {savingCustom ? 'Sauvegarde…' : savedCustom ? 'Sauvegardé ✓' : 'Sauvegarder'}
                    </button>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {business && (
        <div className="absolute left-[-9999px] top-0 pointer-events-none" aria-hidden>
          <PosterCanvas
            ref={posterPdfRef}
            className="rounded-none"
            template={selectedTemplate}
            selectedFont={selectedFont}
            businessName={business.name ?? ''}
            inviteText={inviteText || DEFAULT_INVITE}
            qrValue={qrTargetUrl}
            logoUrl={logoUrl}
          />
        </div>
      )}
    </div>
  )
}
