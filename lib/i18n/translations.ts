// -----------------------------------------------------------------------------
// Dictionnaire de traductions des pages publiques (client final : /review, /feedback)
// -----------------------------------------------------------------------------
// Système volontairement minimal, sans librairie i18n externe. Deux objets `fr`
// et `en` couvrant TOUS les textes en dur relevés dans review-client.tsx et
// feedback/page.tsx. Traductions anglaises pensées pour un client/touriste dans
// un commerce (naturelles, pas du mot-à-mot).
// -----------------------------------------------------------------------------

export type Lang = 'fr' | 'en'

/** Clés internes stables des catégories de feedback (indépendantes de la langue). */
export const CHIP_KEYS = ['attente', 'accueil', 'qualite', 'prix', 'autre'] as const
export type ChipKey = (typeof CHIP_KEYS)[number]

export type Translations = {
  review: {
    defaultTitle: string
    question: string
    ratings: Record<1 | 2 | 3 | 4 | 5, string>
    star: string
    stars: string
    submit: string
    submitting: string
  }
  feedback: {
    title: string
    subtitle: string
    categories: Record<ChipKey, string>
    placeholder: string
    submit: string
    submitting: string
    skip: string
    or: string
    googleCta: string
    loading: string
  }
  common: {
    poweredBy: string
    toggleAria: string
  }
}

export const translations: Record<Lang, Translations> = {
  fr: {
    review: {
      defaultTitle: 'Votre avis',
      question: 'Comment s’est passée votre expérience ?',
      ratings: {
        1: 'Très décevant',
        2: 'Décevant',
        3: 'Correct',
        4: 'Bien',
        5: 'Excellent !',
      },
      star: 'étoile',
      stars: 'étoiles',
      submit: 'Valider mon avis',
      submitting: 'Envoi en cours…',
    },
    feedback: {
      title: 'Dites-nous ce qui s’est passé',
      subtitle: 'Votre retour nous aide à nous améliorer.',
      categories: {
        attente: 'Attente',
        accueil: 'Accueil',
        qualite: 'Qualité',
        prix: 'Prix',
        autre: 'Autre',
      },
      placeholder: 'Décrivez votre expérience…',
      submit: 'Envoyer mon retour',
      submitting: 'Envoi…',
      skip: 'Passer sans laisser de commentaire',
      or: 'ou',
      googleCta: 'Laisser plutôt un avis public sur Google',
      loading: 'Chargement…',
    },
    common: {
      poweredBy: 'Propulsé par',
      toggleAria: 'Changer de langue',
    },
  },
  en: {
    review: {
      defaultTitle: 'Your review',
      question: 'How was your experience?',
      ratings: {
        1: 'Very disappointing',
        2: 'Disappointing',
        3: 'Okay',
        4: 'Good',
        5: 'Excellent!',
      },
      star: 'star',
      stars: 'stars',
      submit: 'Submit my review',
      submitting: 'Sending…',
    },
    feedback: {
      title: 'Tell us what happened',
      subtitle: 'Your feedback helps us improve.',
      categories: {
        attente: 'Wait time',
        accueil: 'Welcome',
        qualite: 'Quality',
        prix: 'Price',
        autre: 'Other',
      },
      placeholder: 'Describe your experience…',
      submit: 'Send my feedback',
      submitting: 'Sending…',
      skip: 'Skip without leaving a comment',
      or: 'or',
      googleCta: 'Post a public review on Google instead',
      loading: 'Loading…',
    },
    common: {
      poweredBy: 'Powered by',
      toggleAria: 'Change language',
    },
  },
}
