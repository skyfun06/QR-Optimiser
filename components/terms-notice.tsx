import Link from 'next/link'

// Mention d'acceptation des CGU sous les boutons d'inscription.
export function TermsNotice({ action = 'En créant un compte, vous acceptez', className = '' }: { action?: string; className?: string }) {
  return (
    <p className={`text-xs text-[#6a6a6a] text-center leading-relaxed ${className}`.trim()}>
      {action} les{' '}
      <Link href="/cgu" target="_blank" className="text-[#a3a3a3] underline underline-offset-2 hover:text-gold">CGU</Link>
      {' '}et la{' '}
      <Link href="/confidentialite" target="_blank" className="text-[#a3a3a3] underline underline-offset-2 hover:text-gold">politique de confidentialité</Link>.
    </p>
  )
}
