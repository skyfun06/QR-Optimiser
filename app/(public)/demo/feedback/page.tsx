'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DemoBanner from '@/components/demo/DemoBanner'

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
