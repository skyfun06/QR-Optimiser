'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STYLES = `
  @keyframes cardReveal {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .review-card {
    animation: cardReveal 0.5s ease-out forwards;
  }
  @keyframes starPop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.4); }
    100% { transform: scale(1); }
  }
  @keyframes starBounce {
    0%, 100% { transform: scale(1) translateY(0); }
    45%      { transform: scale(1.18) translateY(-5px); }
  }
  .star-pop    { animation: starPop 0.3s ease; }
  .star-bounce { animation: starBounce 0.38s ease; }
  @media (prefers-reduced-motion: reduce) {
    .review-card { animation: none !important; opacity: 1 !important; transform: none !important; }
    .star-pop    { animation: none !important; }
    .star-bounce { animation: none !important; }
  }
`

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Très décevant', color: '#ef4444' },
  2: { text: 'Décevant',      color: '#f97316' },
  3: { text: 'Correct',       color: '#eab308' },
  4: { text: 'Bien',          color: '#C9973A' },
  5: { text: 'Excellent !',   color: '#22c55e' },
}

type ReviewClientPageProps = {
  businessId: string
}

export default function ReviewClientPage({ businessId }: ReviewClientPageProps) {
  const router = useRouter()
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating]       = useState<number | null>(null)
  const [loading, setLoading]               = useState(false)
  const [googleUrl, setGoogleUrl]           = useState<string | null>(null)
  const [showGoogleCTA, setShowGoogleCTA]   = useState(false)

  // Chargement anticipé de google_review_url pour l'afficher dans le CTA
  // sans délai supplémentaire une fois le rating validé.
  useEffect(() => {
    supabase
      .from('businesses')
      .select('google_review_url')
      .eq('id', businessId)
      .single()
      .then(({ data }) => {
        setGoogleUrl(data?.google_review_url || null)
      })
  }, [businessId])

  /* Animation state */
  const [animKey, setAnimKey]   = useState(0)          // increments each click → forces star remount
  const [popStar, setPopStar]   = useState<number | null>(null)
  const [bounceMax, setBounceMax] = useState<number | null>(null)

  function handleStarClick(star: number) {
    setSelectedRating(star)
    setAnimKey((k) => k + 1)   // restart animations
    setPopStar(star)
    setBounceMax(null)

    // After pop, trigger staggered bounce on all selected stars
    setTimeout(() => {
      setPopStar(null)
      setBounceMax(star)
      setTimeout(() => setBounceMax(null), (star - 1) * 50 + 420)
    }, 270)
  }

  async function handleSubmit() {
    if (!selectedRating) return
    setLoading(true)

    await supabase.from('reviews').insert({
      business_id: businessId,
      rating: selectedRating,
    })

    if (selectedRating >= 4) {
      setShowGoogleCTA(true)
      setLoading(false)
    } else {
      router.push(`/feedback?business_id=${businessId}&rating=${selectedRating}`)
    }
  }

  const activeRating = hoverRating ?? selectedRating
  const labelInfo    = activeRating ? RATING_LABELS[activeRating] : null

  const background =
    'radial-gradient(ellipse 600px 400px at center, rgba(201,151,58,0.06) 0%, transparent 70%), #0d0d0d'

  if (showGoogleCTA) {
    return (
      <>
        <style>{STYLES}</style>
        <div
          className="w-full min-h-screen flex flex-col justify-center items-center px-4 py-8"
          style={{ background }}
        >
          <div className="review-card w-[90%] sm:w-full max-w-md flex flex-col justify-center items-center gap-6 md:gap-8 p-5 sm:p-6 md:p-8 border border-[#222222] rounded-2xl bg-[#171717] text-center">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xl md:text-2xl font-bold">Merci&nbsp;! 🙏</p>
              <p className="text-base md:text-lg font-semibold text-white">Votre avis compte beaucoup</p>
              <p className="text-sm md:text-base text-[#8c8c8c] mt-1">
                Cliquez ci-dessous pour partager votre expérience sur Google
              </p>
            </div>

            <a
              href={googleUrl ?? '#'}
              target="_top"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                backgroundColor: '#C9973A',
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '18px',
                textAlign: 'center',
                padding: '16px 24px',
                borderRadius: '16px',
                textDecoration: 'none',
                marginTop: '24px',
                width: '100%',
              }}
            >
              ⭐ Laisser mon avis sur Google
            </a>
          </div>

          <p className="mt-4 text-xs text-[#8c8c8c] text-center">
            Propulsé par <span className="text-gold">ScanAvis</span>
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{STYLES}</style>

      {/* Radial-gradient background */}
      <div
        className="w-full min-h-screen flex flex-col justify-center items-center px-4 py-8"
        style={{ background }}
      >
        {/* Card — 90% width on mobile, max-md on larger screens */}
        <div className="review-card w-[90%] sm:w-full max-w-md flex flex-col justify-center items-center gap-6 md:gap-8 p-5 sm:p-6 md:p-8 border border-[#222222] rounded-2xl bg-[#171717]">

          {/* Header */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-xl md:text-2xl font-bold">Nom du commerce</h1>
            <p className="text-sm md:text-base text-[#8c8c8c]">
              Comment s'est passée votre expérience&nbsp;?
            </p>
          </div>

          {/* Stars */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-row justify-center items-center gap-1 sm:gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled      = star <= (hoverRating ?? selectedRating ?? 0)
                const isPopping   = popStar === star
                const isBouncing  = bounceMax !== null && star <= bounceMax && !isPopping
                const animClass   = isPopping ? 'star-pop' : isBouncing ? 'star-bounce' : ''
                const animDelay   = isBouncing ? `${(star - 1) * 50}ms` : '0ms'

                return (
                  <button
                    key={`${star}-${animKey}`}
                    type="button"
                    className="cursor-pointer flex items-center justify-center"
                    style={{ minWidth: '48px', minHeight: '48px' }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => handleStarClick(star)}
                    aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                  >
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill={filled ? '#C9973A' : '#333333'}
                      stroke={filled ? '#C9973A' : '#444444'}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      className={`transition-colors duration-150 ${animClass}`}
                      style={{ animationDelay: animDelay }}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )
              })}
            </div>

            {/* Rating label */}
            <div className="h-5 flex items-center">
              <p
                className="text-sm md:text-base font-medium transition-all duration-200"
                style={{
                  color:   labelInfo?.color ?? 'transparent',
                  opacity: labelInfo ? 1 : 0,
                }}
              >
                {labelInfo?.text ?? '\u00A0'}
              </p>
            </div>
          </div>

          {/* Submit button — full width on all sizes */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedRating || loading}
            className={[
              'w-full min-h-[52px] bg-gold rounded-2xl text-sm font-semibold text-[#12100e]',
              'active:scale-95 transition-all duration-150',
              !selectedRating || loading
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:opacity-90',
            ].join(' ')}
          >
            {loading ? 'Envoi en cours…' : 'Valider mon avis'}
          </button>
        </div>

        <p className="mt-4 text-xs text-[#8c8c8c] text-center">
          Propulsé par <span className="text-gold">ScanAvis</span>
        </p>
      </div>
    </>
  )
}
