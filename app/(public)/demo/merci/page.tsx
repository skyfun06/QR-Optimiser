'use client'

import { useRouter } from 'next/navigation'
import DemoBanner from '@/components/demo/DemoBanner'

export default function DemoMerciPage() {
  const router = useRouter()

  return (
    <div
      className="w-full min-h-screen flex flex-col justify-center items-center gap-4 bg-[#0d0d0d]"
      style={{ paddingBottom: 80 }}
    >
      <div className="w-[400px] flex flex-col justify-center items-center gap-6 p-6 border border-[#292929] rounded-2xl bg-[#171717]">

        <div
          className="w-16 h-16 flex items-center justify-center rounded-full"
          style={{ backgroundColor: '#2a1f00' }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#C9973A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-center">Merci pour votre retour !</h1>

        <p className="text-sm text-[#8c8c8c] text-center">
          Le gérant a été notifié et prendra en compte votre avis.
        </p>

        <div className="w-full p-4 bg-[#222222] border border-[#292929] rounded-xl">
          <p className="text-xs text-[#8c8c8c] text-center">
            Dans la vraie version, ce feedback est enregistré dans le dashboard du commerçant et il reçoit une notification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/demo')}
          className="w-full py-3 rounded-2xl text-sm font-medium border border-[#292929] text-[#8c8c8c] hover:border-gold hover:text-gold transition-colors duration-150 active:scale-95"
        >
          ← Recommencer la démo
        </button>

      </div>

      <DemoBanner />
    </div>
  )
}
