'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DemoBanner from '@/components/demo/DemoBanner'

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Très décevant', color: '#ef4444' },
  2: { text: 'Décevant',      color: '#f97316' },
  3: { text: 'Correct',       color: '#eab308' },
  4: { text: 'Bien',          color: '#C9973A' },
  5: { text: 'Excellent !',   color: '#22c55e' },
}

export default function DemoPage() {
  const router = useRouter()
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  function handleSubmit() {
    if (!selectedRating) return
    if (selectedRating >= 4) {
      router.push('/demo/google')
    } else {
      router.push('/demo/feedback')
    }
  }

  const activeRating = hoverRating ?? selectedRating
  const labelInfo = activeRating ? RATING_LABELS[activeRating] : null

  return (
    <div
      className="w-full min-h-screen flex flex-col justify-center items-center gap-4 bg-[#0d0d0d]"
      style={{ paddingBottom: 80 }}
    >
      <div className="w-[400px] flex flex-col justify-center items-center gap-8 p-6 border border-[#292929] rounded-2xl bg-[#171717]">

        <h1 className="text-2xl font-bold">Restaurant Le Provençal</h1>
        <p className="text-sm text-[#8c8c8c]">Comment s'est passée votre expérience ?</p>

        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-row justify-center items-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= (hoverRating ?? selectedRating ?? 0)
              return (
                <button
                  key={star}
                  type="button"
                  className="cursor-pointer active:scale-95 transition-transform duration-150"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setSelectedRating(star)}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill={filled ? '#C9973A' : '#333333'}
                    stroke={filled ? '#C9973A' : '#333333'}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    className="transition-colors duration-150"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              )
            })}
          </div>

          <div className="h-5 flex items-center">
            <p
              className="text-sm font-medium transition-opacity duration-200"
              style={{
                color: labelInfo?.color ?? 'transparent',
                opacity: labelInfo ? 1 : 0,
              }}
            >
              {labelInfo?.text ?? '\u00A0'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedRating}
          className={[
            'w-full bg-gold py-3 rounded-2xl text-sm font-medium text-[#12100e]',
            'active:scale-95 transition-transform duration-150',
            !selectedRating ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          Valider mon avis
        </button>

      </div>

      <p className="text-xs text-[#8c8c8c]">
        Propulsé par <span className="text-gold">ScanAvis</span>
      </p>

      <DemoBanner />
    </div>
  )
}
