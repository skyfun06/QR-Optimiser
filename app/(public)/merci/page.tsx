import Link from 'next/link'

export default function MerciPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">

        <div className="text-6xl mb-4">🙏</div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Merci pour votre retour !
        </h1>
        <p className="text-gray-500">
          Votre avis nous aide à nous améliorer chaque jour.
        </p>

      </div>
    </div>
  )
}