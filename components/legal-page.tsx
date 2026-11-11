import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

// Gabarit commun des pages légales (CGU, confidentialité, mentions légales) :
// header + footer du site, titre, date de mise à jour, sections en cartes.

export const LEGAL_EMAIL = 'lborrelli248@gmail.com'

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="w-full max-w-3xl mx-auto px-4 md:px-8 pt-32 pb-20 flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-3 mb-2">
          <p className="text-xs uppercase tracking-widest text-gold font-bold">Légal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{title}</h1>
          <p className="text-sm text-[#8c8c8c]">Dernière mise à jour : {updated}</p>
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8 text-[#a3a3a3] text-sm leading-relaxed [&_strong]:text-white [&_strong]:font-medium">
      <h2 className="text-gold font-semibold text-lg mb-1">{title}</h2>
      {children}
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-1.5 ml-4 list-disc marker:text-[#5c5c5c]">{children}</ul>
}

export function MailLink() {
  return (
    <a href={`mailto:${LEGAL_EMAIL}`} className="text-gold hover:underline">
      {LEGAL_EMAIL}
    </a>
  )
}
