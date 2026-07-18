import Link from 'next/link'

export const metadata = {
  title: 'Votre accès ScanAvis',
}

export default function EssaiTerminePage() {
  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center gap-4 px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-6 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Votre accès est en pause
          </h1>
          <p className="text-sm md:text-base text-[#c7c7c7] leading-relaxed">
            Votre tableau de bord n&apos;est plus accessible pour le moment.
            Vos données sont conservées : dès la réactivation, vous retrouvez
            tout à l&apos;identique.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Link
            href="/contact"
            className="w-full min-h-[48px] flex justify-center items-center gap-2 bg-gold text-[#12100e] font-semibold rounded-2xl py-3 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Nous contacter
          </Link>
          <Link
            href="/login"
            className="w-full min-h-[44px] flex justify-center items-center text-sm text-[#8c8c8c] hover:text-white transition-colors"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
      <p className="text-xs text-[#8c8c8c]">Propulsé par <span className="text-gold">ScanAvis</span></p>
    </div>
  )
}
