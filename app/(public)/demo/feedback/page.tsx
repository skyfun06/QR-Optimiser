'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DemoBanner from '@/components/demo/DemoBanner'

const chips = ['Attente', 'Accueil', 'Qualité', 'Prix', 'Autre']
const [selectedChips, setSelectedChips] = useState<string[]>([])

function toggleChip(chip: string) {
  setSelectedChips(prev =>
    prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
  )
}

export default function DemoFeedbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('')

  return (
    <div
      className="w-full min-h-screen flex flex-col justify-center items-center gap-4 bg-[#0d0d0d]"
      style={{ paddingBottom: 80 }}
    >
      <div className="w-[400px] flex flex-col justify-center items-center gap-6 p-6 border border-[#292929] rounded-2xl bg-[#171717]">

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
