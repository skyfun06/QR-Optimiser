'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DemoBanner from '@/components/demo/DemoBanner'

const chips = ['Attente', 'Accueil', 'Qualité', 'Prix', 'Autre']

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Très décevant', color: '#ef4444' },
  2: { text: 'Décevant',      color: '#f97316' },
  3: { text: 'Correct',       color: '#eab308' },
  4: { text: 'Bien',          color: '#C9973A' },
  5: { text: 'Excellent !',   color: '#22c55e' },
}

function DemoFeedbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ratingParam = Number(searchParams.get('rating') ?? 0)
  const ratingNum = Math.min(5, Math.max(1, ratingParam)) || 1
  const labelInfo = RATING_LABELS[ratingNum]

  const [message, setMessage] = useState('')
  const [selectedChips, setSelectedChips] = useState<string[]>([])

  function toggleChip(chip: string) {
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    )
  }

  return (
    <div
      className="w-full min-h-screen flex flex-col justify-center items-center gap-4 bg-[#0d0d0d]"
      style={{ paddingBottom: 80 }}
    >
      <div className="w-[400px] flex flex-col justify-center items-center gap-6 p-6 border border-[#292929] rounded-2xl bg-[#171717]">

        {/* Étoiles avec la note sélectionnée */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-row justify-center items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= ratingNum
              return (
                <svg
                  key={star}
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill={filled ? '#C9973A' : '#333333'}
                  stroke={filled ? '#C9973A' : '#444444'}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              )
            })}
          </div>
          <p className="text-sm font-medium" style={{ color: labelInfo.color }}>
            {labelInfo.text}
          </p>
        </div>

        <h1 className="text-2xl font-bold text-center">Votre avis nous aide à nous améliorer</h1>

        <p className="text-sm text-[#8c8c8c] text-center">
          Ce message sera transmis directement au gérant, en privé.
        </p>

        <div className="w-[300px] flex flex-row justify-center items-center flex-wrap gap-3">
          {chips.map((chip) => {
            const active = selectedChips.includes(chip)
            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggleChip(chip)}
                className={[
                  'border rounded-full px-4 py-2 text-sm cursor-pointer',
                  'transition-colors duration-150 active:scale-95',
                  active
                    ? 'border-[#C9973A] text-[#C9973A] bg-[#28231a]'
                    : 'border-[#292929] text-[#8c8c8c] bg-transparent',
                ].join(' ')}
              >
                {chip}
              </button>
            )
          })}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Dites-nous ce qui n'a pas été à la hauteur..."
          rows={5}
          className="w-full bg-[#222222] border border-[#292929] rounded-xl p-4 text-sm text-white placeholder-[#555] resize-none focus:outline-none focus:border-gold transition-colors duration-150"
        />

        <button
          type="button"
          onClick={() => router.push('/demo/merci')}
          className="w-full bg-gold py-3 rounded-2xl text-sm font-medium text-[#12100e] active:scale-95 transition-transform duration-150"
        >
          Envoyer mon feedback
        </button>

      </div>

      <p className="text-xs text-[#8c8c8c]">
        Propulsé par <span className="text-gold">ScanAvis</span>
      </p>

      <DemoBanner />
    </div>
  )
}

export default function DemoFeedbackPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-[#0d0d0d]" />}>
      <DemoFeedbackContent />
    </Suspense>
  )
}
