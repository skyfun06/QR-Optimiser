import Image from 'next/image'
import Link from 'next/link'

// Lockup officiel ScanAvis : icône carrée (le S dans le cadre de scan) + le
// wordmark bicolore "Scan" (blanc) / "Avis" (or). Partagé entre les headers
// pour garantir la cohérence.
export function BrandLogo({
  href = '/',
  iconSize = 32,
  textClassName = 'text-lg md:text-xl',
  className = '',
}: {
  href?: string
  iconSize?: number
  textClassName?: string
  className?: string
}) {
  return (
    <Link href={href} aria-label="ScanAvis" className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <Image
        src="/images/logo.png"
        alt="ScanAvis"
        width={iconSize}
        height={iconSize}
        priority
        className="object-contain shrink-0"
      />
      <span className={`font-bold leading-none ${textClassName}`}>
        <span className="text-white">Scan</span><span className="text-gold">Avis</span>
      </span>
    </Link>
  )
}
