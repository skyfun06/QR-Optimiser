'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DemoBanner from '@/components/demo/DemoBanner'

function DemoGoogleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ratingParam = Number(searchParams.get('rating') ?? 5)
  const ratingNum = Math.min(5, Math.max(1, ratingParam)) || 5

  return (
    <div
      className="w-full min-h-screen flex flex-col justify-center items-center gap-4 bg-[#0d0d0d]"
      style={{ paddingBottom: 80 }}
    >
      <div className="w-[400px] flex flex-col justify-center items-center gap-6 p-6 border border-[#292929] rounded-2xl bg-[#171717]">

        <p className="text-3xl font-bold" style={{ color: '#4285F4' }}>Google</p>

        <h1 className="text-2xl font-bold text-center">Merci pour votre avis !</h1>

        <p className="text-sm text-[#8c8c8c] text-center">
          Vous allez être redirigé vers Google Reviews pour laisser votre avis public.
        </p>

        <div className="flex flex-row gap-2">
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

        <div className="w-full p-4 bg-[#222222] border border-[#292929] rounded-xl">
          <p className="text-xs text-[#8c8c8c] text-center">
            Dans la vraie version, votre client serait redirigé directement vers votre page Google Reviews.
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

export default function DemoGooglePage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-[#0d0d0d]" />}>
      <DemoGoogleContent />
    </Suspense>
  )
}
