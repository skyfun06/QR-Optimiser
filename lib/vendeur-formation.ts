// Contenu de la formation vendeur (parcours guidé pas-à-pas) + questions du
// test de validation. Source unique partagée par le composant de formation
// (components/vendeurs/formation) et l'API de correction (app/api/vendeur/test).
//
// IMPORTANT — anti-triche : ce fichier est importé côté navigateur. Les bonnes
// réponses du TEST final NE SONT PAS ici (le client pourrait les lire). Elles
// vivent uniquement côté serveur dans app/api/vendeur/test/route.ts, alignées
// par `id`. Les mini-questions de vérification des chapitres (`check`), elles,
// sont purement pédagogiques (ne débloquent rien de sensible) : leur réponse
// peut rester côté client.

export type ChapitrePoint = {
  titre: string
  texte: string
}

export type ChapitreCheck = {
  question: string
  options: string[]
  correct: number
  explication: string
}

export type Chapitre = {
  id: string
  titre: string
  sousTitre: string
  accroche: string
  points: ChapitrePoint[]
  check: ChapitreCheck
}

export const CHAPITRES: Chapitre[] = [
  {
    id: 'pitch',
    titre: 'ScanAvis en une phrase',
    sousTitre: 'Le pitch que tu dois maîtriser',
    accroche:
      'Un commerçant doit comprendre ce que tu vends en 30 secondes. Voici la phrase qui déclenche tout.',
    points: [
      {
        titre: 'La promesse',
        texte:
          'ScanAvis transforme les clients satisfaits d’un commerce en avis Google, grâce à un simple QR code posé en caisse ou sur la table.',
      },
      {
        titre: 'Le filtre intelligent',
        texte:
          'Les clients mécontents sont redirigés vers un formulaire privé : le commerçant récupère le retour en interne, sans avis négatif public.',
      },
      {
        titre: 'Ton rôle',
        texte:
          'Faire comprendre ce double gain — plus d’avis positifs, moins d’avis négatifs publics — de façon simple et concrète.',
      },
    ],
    check: {
      question: 'Que deviennent les clients mécontents qui scannent le QR code ?',
      options: [
        'Ils sont envoyés directement sur Google pour laisser leur avis',
        'Ils tombent sur un formulaire privé, sans avis négatif public',
        'Ils ne peuvent rien faire, le QR est bloqué',
      ],
      correct: 1,
      explication:
        'C’est le cœur de la valeur : le retour négatif reste privé et remonte au commerçant, au lieu de s’afficher sur Google.',
    },
  },
  {
    id: 'probleme',
    titre: 'Le problème que ça résout',
    sousTitre: 'Pourquoi le commerçant en a besoin',
    accroche:
      'Tu ne vends pas un QR code : tu vends une solution à un problème que le commerçant vit déjà.',
    points: [
      {
        titre: 'Les satisfaits se taisent',
        texte:
          '9 clients satisfaits sur 10 ne laissent jamais d’avis spontanément. Le commerçant perd cette preuve sociale chaque jour.',
      },
      {
        titre: 'Google récompense la fraîcheur',
        texte:
          'Sans avis récents, un commerce remonte moins bien dans les recherches locales et inspire moins confiance.',
      },
      {
        titre: 'Le déséquilibre fait mal',
        texte:
          'Les avis négatifs, eux, arrivent tout seuls. Sans contrepoids d’avis positifs, la réputation se dégrade toute seule.',
      },
    ],
    check: {
      question: 'Quel est le vrai problème que vit le commerçant au quotidien ?',
      options: [
        'Il a trop d’avis positifs et ne sait pas quoi en faire',
        'Ses clients satisfaits ne laissent presque jamais d’avis, alors que les mécontents s’expriment',
        'Google supprime ses avis chaque mois',
      ],
      correct: 1,
      explication:
        'Le déséquilibre est la clé : les satisfaits se taisent, les mécontents parlent. ScanAvis rééquilibre la balance.',
    },
  },
  {
    id: 'demo',
    titre: 'Comment ça marche',
    sousTitre: 'Le parcours client, étape par étape',
    accroche:
      'Sache décrire l’expérience concrète : c’est ce qui rend la solution crédible et simple aux yeux du commerçant.',
    points: [
      {
        titre: '1. Le scan',
        texte:
          'Le client scanne le QR code posé en caisse ou sur la table, au bon moment (fin de repas, encaissement).',
      },
      {
        titre: '2. L’aiguillage',
        texte:
          'Content → il est envoyé directement sur la page d’avis Google. Pas content → formulaire privé, et le commerçant est alerté.',
      },
      {
        titre: '3. Le suivi',
        texte:
          'Le commerçant retrouve tout sur son tableau de bord : avis générés, scans, retours privés à traiter.',
      },
    ],
    check: {
      question: 'À quel moment le QR code doit-il idéalement être présenté au client ?',
      options: [
        'Dès son arrivée, avant même le service',
        'Au bon moment : fin de repas ou encaissement, quand il est satisfait',
        'Par email, plusieurs jours après sa visite',
      ],
      correct: 1,
      explication:
        'Le bon timing maximise les scans et cible le client au pic de satisfaction — un argument à donner au commerçant.',
    },
  },
  {
    id: 'offre',
    titre: 'L’offre et le prix',
    sousTitre: 'Parler d’argent avec assurance',
    accroche:
      'Le prix ne se justifie pas, il se met en face de la valeur. Reste factuel et confiant.',
    points: [
      {
        titre: 'Deux formules',
        texte:
          'QR seul, ou QR + carte NFC (le client approche son téléphone du support, sans même scanner).',
      },
      {
        titre: 'Un essai avant de payer',
        texte:
          'Un essai est proposé avant le premier paiement réel : le commerçant teste sans risque.',
      },
      {
        titre: 'Un abonnement simple',
        texte:
          'Un abonnement mensuel clair, sans engagement lourd. La valeur (plus d’avis, meilleure réputation) justifie le coût.',
      },
    ],
    check: {
      question: 'Comment aborder le prix face à un commerçant ?',
      options: [
        'Le baisser tout de suite pour être sûr de conclure',
        'Le poser factuellement en face de la valeur, en rappelant l’essai sans risque',
        'Éviter le sujet le plus longtemps possible',
      ],
      correct: 1,
      explication:
        'Un prix assumé + un essai sans risque rassurent. On vend une valeur, pas un tarif à négocier.',
    },
  },
  {
    id: 'cible',
    titre: 'À qui vendre en priorité',
    sousTitre: 'Viser les bons commerces, les bons interlocuteurs',
    accroche:
      'Ton temps est précieux : concentre-le sur les cibles où le besoin est le plus évident.',
    points: [
      {
        titre: 'Les commerces de proximité',
        texte:
          'Restaurants, bars, coiffeurs, instituts, garages, cavistes… tout commerce qui vit de sa réputation locale.',
      },
      {
        titre: 'Les réputations fragiles',
        texte:
          'Cible ceux qui ont peu d’avis ou une note fragile : le besoin est immédiat et facile à démontrer.',
      },
      {
        titre: 'Le bon interlocuteur',
        texte:
          'Parle au gérant ou au propriétaire, pas à un employé de passage qui ne peut rien décider.',
      },
    ],
    check: {
      question: 'Quel est le meilleur interlocuteur pour conclure une vente ?',
      options: [
        'N’importe quel employé présent au comptoir',
        'Le gérant ou le propriétaire, seul à pouvoir décider',
        'Un client fidèle du commerce',
      ],
      correct: 1,
      explication:
        'Sans le décideur, tu perds ton temps : identifie et demande toujours à parler au gérant.',
    },
  },
  {
    id: 'objections',
    titre: 'Répondre aux objections',
    sousTitre: 'Transformer un frein en argument',
    accroche:
      'Une objection n’est pas un refus : c’est une question déguisée. Voici comment y répondre calmement.',
    points: [
      {
        titre: '« C’est trop cher »',
        texte:
          'Combien vaut un nouveau client par mois ? Un seul avis supplémentaire peut le ramener — et le rentabiliser.',
      },
      {
        titre: '« J’ai pas le temps »',
        texte:
          'L’installation prend 2 minutes, tout est automatique ensuite. Zéro charge de travail au quotidien.',
      },
      {
        titre: '« Les gens ne scanneront pas »',
        texte:
          'Le QR est présenté au bon moment, quand le client est satisfait : le taux de scan est bien meilleur qu’on ne le croit.',
      },
      {
        titre: '« J’ai déjà des avis »',
        texte:
          'Justement, il faut les entretenir : Google valorise la fraîcheur, un compte qui stagne perd du terrain.',
      },
    ],
    check: {
      question: 'Face à « c’est trop cher », quelle est la meilleure réponse ?',
      options: [
        'Accorder immédiatement une grosse remise',
        'Comparer le coût à la valeur d’un seul nouveau client ramené par un avis',
        'Dire que tous les concurrents paient déjà',
      ],
      correct: 1,
      explication:
        'On recentre sur la valeur : un client gagné couvre souvent l’abonnement. C’est un investissement, pas une dépense.',
    },
  },
  {
    id: 'conclure',
    titre: 'Conclure la vente',
    sousTitre: 'De l’intérêt à la signature',
    accroche:
      'Un commerçant convaincu qui repart sans s’inscrire, c’est une vente perdue. Accompagne-le jusqu’au bout.',
    points: [
      {
        titre: 'Résumer et proposer l’essai',
        texte:
          'Rappelle le bénéfice en une phrase, puis propose l’essai : c’est l’étape qui fait passer à l’action.',
      },
      {
        titre: 'Ton code = ta commission',
        texte:
          'Ton code personnel est saisi à l’inscription du commerce : c’est lui qui t’attribue la vente et déclenche tes commissions.',
      },
      {
        titre: 'Suivre tes résultats',
        texte:
          'Tu retrouves chaque commerce signé et l’état de tes versements sur ton espace vendeur.',
      },
    ],
    check: {
      question: 'Comment une vente t’est-elle attribuée et déclenche ta commission ?',
      options: [
        'En envoyant un email à l’équipe après chaque rendez-vous',
        'Par ton code personnel, saisi lors de l’inscription du commerce',
        'Automatiquement, dès que tu parles à un commerçant',
      ],
      correct: 1,
      explication:
        'Pas de code saisi = pas de commission. Accompagne toujours le commerçant jusqu’à la saisie de ton code.',
    },
  },
]

export type TestQuestion = {
  id: string
  question: string
  // Les options sont publiques ; l'index de la bonne réponse est côté serveur.
  options: string[]
}

// Test de validation final. Les bonnes réponses vivent côté serveur
// (app/api/vendeur/test/route.ts), alignées par `id`.
export const TEST_QUESTIONS: TestQuestion[] = [
  {
    id: 'q_pitch',
    question: 'En une phrase, que fait ScanAvis pour un commerce ?',
    options: [
      'Il crée un site internet pour le commerce',
      'Il transforme les clients satisfaits en avis Google via un QR code, et garde les mécontents en privé',
      'Il gère les réservations et les paiements du commerce',
      'Il supprime automatiquement les avis négatifs existants',
    ],
  },
  {
    id: 'q_mecontent',
    question: 'Que se passe-t-il quand un client mécontent scanne le QR code ?',
    options: [
      'Il est envoyé sur Google pour laisser une mauvaise note',
      'Rien, le QR ne fonctionne pas pour lui',
      'Il est redirigé vers un formulaire privé et le commerçant est alerté',
      'Il reçoit un bon de réduction automatique',
    ],
  },
  {
    id: 'q_probleme',
    question: 'Quel problème central ScanAvis résout-il ?',
    options: [
      'Les clients satisfaits ne laissent presque jamais d’avis spontanément',
      'Les commerces ont trop de clients',
      'Google fait payer chaque avis',
      'Les commerçants ne savent pas utiliser un ordinateur',
    ],
  },
  {
    id: 'q_timing',
    question: 'Quel est le bon moment pour présenter le QR code au client ?',
    options: [
      'Dès son arrivée, avant le service',
      'Au moment de satisfaction : fin de repas ou encaissement',
      'Uniquement par email le lendemain',
      'Jamais, le client le trouve seul',
    ],
  },
  {
    id: 'q_prix',
    question: 'Quelle est la bonne posture face au prix ?',
    options: [
      'Proposer d’emblée la plus grosse remise possible',
      'Éviter d’en parler',
      'Le poser factuellement face à la valeur, en rappelant l’essai sans risque',
      'Dire qu’il est négociable à l’infini',
    ],
  },
  {
    id: 'q_cible',
    question: 'À qui faut-il s’adresser en priorité dans le commerce ?',
    options: [
      'Le premier employé venu',
      'Le gérant ou le propriétaire',
      'Un client présent sur place',
      'Le comptable',
    ],
  },
  {
    id: 'q_objection',
    question: 'Un commerçant dit « je n’ai pas le temps ». Que réponds-tu ?',
    options: [
      'Que ce n’est pas grave, tu repasseras dans un an',
      'Que l’installation prend 2 minutes et que tout est automatique ensuite',
      'Qu’il doit embaucher quelqu’un pour gérer ça',
      'Que le temps, c’est de l’argent, sans plus d’explication',
    ],
  },
  {
    id: 'q_objection_prix',
    question: 'Face à « c’est trop cher », quel angle est le plus efficace ?',
    options: [
      'Comparer le coût à la valeur d’un seul nouveau client ramené par un avis',
      'Baisser le prix immédiatement',
      'Dire que les concurrents paient plus cher',
      'Changer de sujet',
    ],
  },
  {
    id: 'q_commission',
    question: 'Comment une vente t’est-elle attribuée et déclenche ta commission ?',
    options: [
      'Dès que tu parles à un commerçant',
      'En prévenant l’équipe par téléphone',
      'Par ton code personnel, saisi à l’inscription du commerce',
      'Au bout d’un an d’ancienneté',
    ],
  },
  {
    id: 'q_conclure',
    question: 'Un commerçant est convaincu. Quelle est la bonne dernière étape ?',
    options: [
      'Le laisser réfléchir seul et repartir',
      'Lui résumer le bénéfice, proposer l’essai et l’accompagner à l’inscription',
      'Lui envoyer un devis par courrier',
      'Attendre qu’il te rappelle',
    ],
  },
]

// Réglages du test, partagés (affichage + serveur applique les mêmes règles).
export const TEST_CONFIG = {
  // Part de bonnes réponses requise pour réussir (80 %).
  seuilReussite: 0.8,
  // Nombre de tentatives avant blocage temporaire.
  maxTentatives: 3,
  // Durée du blocage (cooldown) après tentatives épuisées.
  cooldownHeures: 24,
}

// Seuil en nombre de bonnes réponses (arrondi au supérieur).
export const TEST_SCORE_REQUIS = Math.ceil(TEST_QUESTIONS.length * TEST_CONFIG.seuilReussite)
