import { SuccessScreen } from '@/components/state-screen'

export const metadata = {
  title: 'Merci pour votre retour',
}

export default function MerciPage() {
  return (
    <SuccessScreen
      title="Merci pour votre retour !"
      message="Votre avis nous aide à améliorer notre service chaque jour."
    >
      <hr className="h-px w-full border-0 bg-[#292929]" />
      <p className="text-sm text-[#4a4a4a]">Vous pouvez fermer cette page</p>
    </SuccessScreen>
  )
}
