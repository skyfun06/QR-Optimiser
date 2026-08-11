'use client'

import { SuccessScreen } from '@/components/state-screen'
import { LanguageToggle } from '@/components/language-toggle'
import { useTranslations } from '@/lib/i18n/use-language'

export default function MerciClient() {
  const { t } = useTranslations()
  return (
    <>
      <LanguageToggle />
      <SuccessScreen title={t.merci.title} message={t.merci.message}>
        <hr className="h-px w-full border-0 bg-[#292929]" />
        <p className="text-sm text-[#4a4a4a]">{t.merci.close}</p>
      </SuccessScreen>
    </>
  )
}
