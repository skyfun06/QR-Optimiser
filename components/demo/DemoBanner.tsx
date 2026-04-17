'use client'

import { useRouter } from 'next/navigation'

export default function DemoBanner() {
  const router = useRouter()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#171717',
        borderTop: '1px solid #292929',
        padding: '16px 24px',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <p className="text-white text-sm">Vous voulez ça pour votre commerce ?</p>
      <button
        type="button"
        onClick={() => router.push('/signup')}
        style={{
          backgroundColor: '#C9973A',
          color: '#12100e',
          fontWeight: 500,
          padding: '8px 16px',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Créer un compte gratuit →
      </button>
    </div>
  )
}
