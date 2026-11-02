// Questionnaire de motivation rempli à l'inscription vendeur. Source unique
// partagée par le formulaire (app/rejoindre/inscription) et l'affichage admin
// (app/(backoffice)/admin/vendeurs) pour que les libellés ne divergent jamais.
// Les réponses sont stockées dans vendeurs.reponses (jsonb) : { [key]: valeur }.
// Une seule question ouverte : le reste se répond en un geste, et chaque
// réponse aide à décider (sérieux, disponibilité, rayon d'action, réseau).

export type VendeurQuestion = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select'
  options?: string[]
}

export const VENDEUR_QUESTIONS: VendeurQuestion[] = [
  {
    key: 'motivation',
    label: 'Pourquoi as-tu envie de devenir vendeur ScanAvis ?',
    type: 'textarea',
  },
  {
    key: 'situation',
    label: 'Quelle est ta situation actuelle ?',
    type: 'select',
    options: ['Étudiant(e)', 'Salarié(e)', 'Indépendant(e) ou auto-entrepreneur', 'En recherche d’emploi', 'Autre'],
  },
  {
    key: 'experience',
    label: 'As-tu déjà fait de la vente ou du contact client ?',
    type: 'select',
    options: ['Jamais', 'Un peu (job, stage, associatif…)', 'Oui, régulièrement'],
  },
  {
    key: 'dispo',
    label: 'Combien de temps peux-tu y consacrer par semaine ?',
    type: 'select',
    options: ['Moins de 5 h', '5 à 15 h', 'Plus de 15 h'],
  },
  {
    key: 'deplacement',
    label: 'Comment te déplaces-tu pour aller voir les commerces ?',
    type: 'select',
    options: ['À pied', 'Vélo ou trottinette', 'Transports en commun', 'Voiture ou scooter'],
  },
  {
    key: 'reseau',
    label: 'Connais-tu déjà des commerçants autour de chez toi ?',
    type: 'select',
    options: ['Non, pas encore', 'Quelques-uns', 'Oui, plusieurs (famille, amis, quartier)'],
  },
  {
    key: 'source',
    label: 'Comment as-tu connu ScanAvis ?',
    type: 'select',
    options: ['Réseaux sociaux', 'Bouche-à-oreille', 'Un vendeur ScanAvis', 'Recherche sur internet', 'Autre'],
  },
]

/** Libellés des questions retirées, pour relire les anciennes candidatures. */
export const ANCIENNES_QUESTIONS: Record<string, string> = {
  zone: 'Quels types de commerces et quelle zone comptes-tu prospecter ?',
  atout: "Qu'est-ce qui te rend convaincant face à un commerçant ?",
}
