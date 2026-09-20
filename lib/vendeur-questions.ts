// Questionnaire de motivation rempli à l'inscription vendeur. Source unique
// partagée par le formulaire (app/rejoindre/inscription) et l'affichage admin
// (app/(backoffice)/admin/vendeurs) pour que les libellés ne divergent jamais.
// Les réponses sont stockées dans vendeurs.reponses (jsonb) : { [key]: valeur }.

export type VendeurQuestion = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select'
  options?: string[]
}

export const VENDEUR_QUESTIONS: VendeurQuestion[] = [
  {
    key: 'motivation',
    label: 'Pourquoi veux-tu porter ScanAvis auprès des commerçants ?',
    type: 'textarea',
  },
  {
    key: 'experience',
    label: 'Ton expérience en vente ou en prospection',
    type: 'select',
    options: ['Aucune', 'Un peu', 'Solide'],
  },
  {
    key: 'dispo',
    label: 'Temps que tu peux y consacrer par semaine',
    type: 'select',
    options: ['Moins de 5h', '5 à 15h', 'Plus de 15h'],
  },
  {
    key: 'zone',
    label: 'Quels types de commerces et quelle zone comptes-tu prospecter ?',
    type: 'text',
  },
  {
    key: 'atout',
    label: "Qu'est-ce qui te rend convaincant face à un commerçant ?",
    type: 'textarea',
  },
]
