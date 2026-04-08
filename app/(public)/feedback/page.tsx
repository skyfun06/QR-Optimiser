'use client' // Cette page s'exécute côté navigateur (pas serveur)

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function FeedbackPage() {
  const router = useRouter()
  // useSearchParams permet de lire les paramètres dans l'URL
  // ex: /feedback?business_id=abc123&rating=2
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')
  const rating = searchParams.get('rating')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!message.trim()) return
    setLoading(true)
  
    console.log('business_id:', businessId)
    console.log('rating:', rating)
    console.log('message:', message.trim())
  
    const { data, error } = await supabase.from('feedback').insert({
      business_id: businessId,
      rating: Number(rating),
      message: message.trim(),
    })
  
    console.log('data:', data)
    console.log('error:', error)
  
    router.push('/merci')
  }

  // Affiche une étoile pleine ou vide selon la note reçue
  function renderStars() {
    return [1, 2, 3, 4, 5].map((star) => (
      <span key={star} className="text-2xl">
        {star <= Number(rating) ? '⭐' : '☆'}
      </span>
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">

        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Dites-nous ce qui s'est passé
        </h1>

        {/* On rappelle au client la note qu'il a mise */}
        <div className="flex justify-center gap-1 mb-2">
          {renderStars()}
        </div>

        <p className="text-gray-500 text-center text-sm mb-6">
          Votre retour nous aide à nous améliorer. Il restera privé.
        </p>

        {/* Zone de texte pour le message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Qu'est-ce qui n'a pas été à votre goût ?"
          rows={5}
          className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 
                     resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={!message.trim() || loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-blue-700 transition-colors"
        >
          {loading ? 'Envoi...' : 'Envoyer mon retour'}
        </button>

        {/* Option pour quitter sans laisser de feedback */}
        <button
          onClick={() => router.push('/merci')}
          className="w-full text-gray-400 text-sm mt-3 hover:text-gray-600"
        >
          Passer sans laisser de commentaire
        </button>

      </div>
    </div>
  )
}