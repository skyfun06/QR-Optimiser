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

        {/* Lien Google discret — conformité : même après un retour négatif, le
            client garde la possibilité de publier son avis sur Google. */}
        <div className="w-full flex items-center gap-3">
          <hr className="flex-1 h-px border-0 bg-[#262626]" />
          <span className="text-xs text-[#555]">ou</span>
          <hr className="flex-1 h-px border-0 bg-[#262626]" />
        </div>
        <button
          type="button"
          onClick={() => router.push(`/demo/google?rating=${ratingNum}`)}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl border border-[#2e2e2e] text-[#9a9a9a] text-sm hover:border-[#404040] hover:text-[#cfcfcf] transition-colors active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
            <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
            <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
          </svg>
          Laisser plutôt un avis public sur Google
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
