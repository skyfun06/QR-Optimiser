'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function MerciPage() {
  const circleRef = useRef<SVGCircleElement>(null)
  const checkRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const circle = circleRef.current
    const check = checkRef.current
    if (!circle || !check) return

    circle.style.strokeDashoffset = '226'
    check.style.strokeDashoffset = '50'

    const t1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        circle.style.strokeDashoffset = '0'
        check.style.strokeDashoffset = '0'
      })
    })

    return () => cancelAnimationFrame(t1)
  }, [])

  return (
    <div className="w-full h-[100vh] flex flex-col justify-center items-center gap-4">
        <div className="w-[450px] flex flex-col justify-center items-center gap-6 p-7 border border-[#222222] rounded-2xl bg-[#171717]">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle
                ref={circleRef}
                cx="40" cy="40" r="36"
                stroke="#C9973A" strokeWidth="3"
                strokeDasharray="226"
                strokeDashoffset="226"
                style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
              />
              <path
                ref={checkRef}
                d="M25 42 L35 52 L55 30"
                stroke="#C9973A" strokeWidth="3.5"
                strokeLinecap="round" strokeLinejoin="round"
                fill="none"
                strokeDasharray="50"
                strokeDashoffset="50"
                style={{ transition: 'stroke-dashoffset 0.5s ease-out 0.6s' }}
              />
            </svg>
            <h2 className="text-2xl font-bold">Merci pour votre retour !</h2>
            <p className="text-sm text-[#8c8c8c]">Votre avis nous aide à améliorer notre service chaque jour.</p>
            <hr className="h-[1px] w-full text-[#292929]" />
            <p className="text-[#4a4a4a] text-sm">Vous pouvez fermer cette page</p>
        </div>
        <p className="text-xs text-[#8c8c8c]">Propulsé par <span className="text-gold">ScanAvis</span></p>
    </div>
  )
}
