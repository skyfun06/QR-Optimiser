'use client' // Cette page s'exécute côté navigateur (pas serveur)

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Next.js nous passe automatiquement l'id de l'URL dans "params"
export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    // Si aucune étoile sélectionnée, on ne fait rien
    if (!selectedRating) return

    setLoading(true)

    // On enregistre la note dans Supabase
    await supabase.from('reviews').insert({
      business_id: id,
      rating: selectedRating,
    })

    // Redirection intelligente selon la note
    if (selectedRating >= 4) {
      // On va chercher le lien Google du commerce
      const { data } = await supabase
        .from('businesses')
        .select('google_review_url')
        .eq('id', id)
        .single()

      // Redirige vers Google si le lien existe, sinon page merci
      if (data?.google_review_url) {
        window.location.href = data.google_review_url
      } else {
        router.push('/merci')
      }
    } else {
      // Note faible → page feedback privé avec l'id du commerce et la note
      router.push(`/feedback?business_id=${id}&rating=${selectedRating}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Votre avis compte !
        </h1>
        <p className="text-gray-500 mb-8">
          Comment s'est passée votre expérience ?
        </p>

        {/* Les 5 étoiles */}
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setSelectedRating(star)}
              className="text-5xl transition-transform duration-200 hover:scale-110 active:scale-95"
            >
              {/* Étoile pleine si sélectionnée ou survolée, vide sinon */}
              {star <= (selectedRating ?? 0) ? '⭐' : '☆'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedRating || loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                     hover:bg-blue-700 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          {loading ? 'Envoi...' : 'Valider mon avis'}
        </button>

      </div>
    </div>
  )
}