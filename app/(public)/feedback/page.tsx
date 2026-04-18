'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const chips = ['Attente', 'Accueil', 'Qualité', 'Prix', 'Autre']

function FeedbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')
  const rating = searchParams.get('rating')

  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleChip(chip: string) {
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    )
  }

  async function handleSubmit() {
    setLoading(true)

    const fullMessage = [selectedChips.join(', '), message.trim()]
      .filter(Boolean).join(' — ')

    const ratingValue = Number(rating)

    const { data, error } = await supabase.from('feedback').insert({
      business_id: businessId,
      rating: ratingValue,
      message: fullMessage,
    })

    console.log('data:', data)
    console.log('error:', error)

    // Notification email au commerçant pour les feedbacks négatifs (1-3 étoiles)
    // On n'attend pas la réponse et on avale toute erreur : la redirection /merci ne doit jamais être bloquée.
    if (!error && businessId && ratingValue >= 1 && ratingValue <= 3 && fullMessage) {
      try {
        await fetch('/api/notify-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            rating: ratingValue,
            message: fullMessage,
          }),
        })
      } catch (e) {
        console.error('notify-feedback error:', e)
      }
    }

    router.push('/merci')
  }

  const ratingNum = Number(rating)
  const canSubmit = selectedChips.length > 0 || message.trim() !== ''

  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center gap-4 px-4 py-6 md:px-6">
      <div className="w-full max-w-md flex flex-col justify-center items-center gap-6 p-4 md:p-6 border border-[#222222] rounded-2xl bg-[#171717]">

        {/* Étoiles SVG en lecture seule, même style que /review/[id] */}
        <div className="flex flex-row justify-center items-center gap-3">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= ratingNum
            return (
              <svg
                key={star}
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill={filled ? '#C9973A' : '#333333'}
                stroke={filled ? '#C9973A' : '#333333'}
                strokeWidth="1.5"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            )
          })}
        </div>

        <div className="flex flex-col justify-center items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-center">Dites-nous ce qui s'est passé</h1>
          <p className="text-sm md:text-base text-[#8c8c8c] text-center">Votre retour nous aide à nous améliorer. Il restera privé.</p>
        </div>

        {/* Chips de raisons */}
        <div className="w-full flex flex-row justify-center items-center flex-wrap gap-2 md:gap-3">
          {chips.map((chip) => {
            const active = selectedChips.includes(chip)
            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggleChip(chip)}
                className={[
                  'border rounded-full px-3 py-2 min-h-[44px] text-sm cursor-pointer',
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

        {/* Textarea */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre expérience..."
          rows={4}
          className="w-full bg-[#222] border border-[#333] rounded-2xl p-4 text-white text-sm resize-none focus:outline-none focus:border-[#C9973A] transition-colors placeholder:text-[#555]"
        />

        {/* Bouton envoyer */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className={[
            'w-full min-h-[44px] py-3 rounded-2xl text-sm font-semibold',
            'active:scale-95 transition-all duration-150',
            canSubmit && !loading
              ? 'bg-[#C9973A] text-black cursor-pointer'
              : 'bg-[#C9973A] text-black opacity-40 cursor-not-allowed',
          ].join(' ')}
        >
          {loading ? 'Envoi...' : 'Envoyer mon retour'}
        </button>

        {/* Bouton passer */}
        <button
          type="button"
          onClick={() => router.push('/merci')}
          className="w-full min-h-[44px] text-[#555] text-sm hover:text-[#888] transition-colors cursor-pointer"
        >
          Passer sans laisser de commentaire
        </button>

        <p className="text-xs text-[#444] text-center">Votre avis ne sera jamais publié</p>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <FeedbackContent />
    </Suspense>
  )
}
