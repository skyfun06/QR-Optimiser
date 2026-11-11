import Link from 'next/link'
import { BrandLogo } from '@/components/brand-logo'

// Footer du site, partagé (landing, recrutement, à propos, contact, pages
// légales). Les ancres de la landing sont en /#… pour rester cliquables depuis
// n'importe quelle page.
const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { href: '/#resolutions', label: 'Avis Google' },
      { href: '/#fidelite', label: 'Fidélité' },
      { href: '/#tarifs', label: 'Tarifs' },
      { href: '/#parrainage', label: 'Parrainage' },
      { href: '/#faq', label: 'FAQ' },
      { href: '/demo', label: 'Démo en direct' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { href: '/a-propos', label: 'À propos' },
      { href: '/contact', label: 'Contact' },
      { href: '/rejoindre', label: 'Devenir vendeur' },
      { href: '/login', label: 'Espace commerçant' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { href: '/mentions-legales', label: 'Mentions légales' },
      { href: '/cgu', label: 'CGU' },
      { href: '/confidentialite', label: 'Confidentialité' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="w-full max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-12 flex flex-col gap-10 border-t border-t-[#292929]">
      <div className="w-full grid grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-x-6 gap-y-10">
        <div className="col-span-2 lg:col-span-1 flex flex-col items-start gap-4">
          <BrandLogo href="/" iconSize={28} textClassName="text-base" />
          <p className="max-w-xs text-sm text-[#8c8c8c] leading-relaxed">
            Plus d&apos;avis Google et des clients qui reviennent, avec un simple QR code sur votre comptoir.
          </p>
          <a href="mailto:lborrelli248@gmail.com" className="text-sm text-[#bdbdbd] transition-colors duration-200 hover:text-gold">
            lborrelli248@gmail.com
          </a>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col items-start gap-4">
            <p className="text-xs text-gold font-bold uppercase tracking-[1px]">{col.title}</p>
            <div className="flex flex-col items-start gap-3">
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-6 border-t border-[#262626]">
        <p className="text-xs text-[#8c8c8c]">© {new Date().getFullYear()} ScanAvis · Fait en France</p>
        <p className="text-xs text-[#5c5c5c]">Paiements sécurisés par Stripe</p>
      </div>
    </footer>
  )
}
