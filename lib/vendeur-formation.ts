// Contenu de la formation vendeur (vraie formation structurée en modules) +
// questionnaire final. Source unique partagée par le composant de formation
// (components/vendeurs/formation) et l'API de correction (app/api/vendeur/test).
//
// IMPORTANT — anti-triche : ce fichier est importé côté navigateur. Les bonnes
// réponses du QUESTIONNAIRE final NE SONT PAS ici (le client pourrait les lire).
// Elles vivent uniquement côté serveur dans app/api/vendeur/test/route.ts,
// alignées par `id`. La formation elle-même n'a plus de mini-questions : c'est
// un vrai parcours d'apprentissage, validé par le seul questionnaire final.

export type Section = {
  titre: string
  texte: string
}

export type Chapitre = {
  id: string
  titre: string
  sousTitre: string
  accroche: string
  points: Section[]
  // Astuce terrain mise en avant (encadré doré).
  astuce?: string
}

export type Module = {
  id: string
  titre: string
  sousTitre: string
  chapitres: Chapitre[]
}

export const MODULES: Module[] = [
  {
    id: 'produit',
    titre: 'Comprendre le produit',
    sousTitre: 'Savoir exactement ce que tu vends',
    chapitres: [
      {
        id: 'pitch',
        titre: 'ScanAvis en une phrase',
        sousTitre: 'Le pitch qui déclenche tout',
        accroche:
          'Un commerçant doit comprendre ce que tu proposes en 30 secondes. Voici la phrase-clé et comment la dérouler.',
        points: [
          {
            titre: 'La promesse',
            texte:
              'ScanAvis transforme les clients satisfaits d’un commerce en avis Google positifs, grâce à un support à scanner ou à approcher du téléphone.',
          },
          {
            titre: 'Le filtre intelligent',
            texte:
              'Les clients mécontents sont dirigés vers un formulaire privé : le commerçant récupère le retour en interne, sans avis négatif public.',
          },
          {
            titre: 'Le résultat',
            texte:
              'Plus d’avis positifs, moins d’avis négatifs visibles : une meilleure note, plus de visibilité sur Google, plus de clients.',
          },
          {
            titre: 'Ton rôle',
            texte:
              'Rendre ce bénéfice limpide et concret, adapté au commerce que tu as en face de toi.',
          },
        ],
        astuce:
          'Entraîne-toi à dire ton pitch à voix haute jusqu’à ce qu’il sorte naturellement, sans réciter.',
      },
      {
        id: 'probleme',
        titre: 'Le problème que ça résout',
        sousTitre: 'Pourquoi le commerçant en a besoin',
        accroche:
          'Tu ne vends pas un gadget : tu résous un problème que le commerçant vit tous les jours sans toujours le formuler.',
        points: [
          {
            titre: 'Les satisfaits se taisent',
            texte: '9 clients satisfaits sur 10 ne laissent jamais d’avis spontanément.',
          },
          {
            titre: 'Google récompense la fraîcheur',
            texte:
              'Google met en avant les commerces aux avis récents et nombreux. Sans ça, on remonte moins bien dans les recherches locales.',
          },
          {
            titre: 'Le déséquilibre fait mal',
            texte:
              'Les avis négatifs, eux, arrivent seuls. Sans contrepoids, la réputation se dégrade toute seule.',
          },
          {
            titre: 'La conséquence concrète',
            texte:
              'Un concurrent mieux noté capte les clients qui hésitaient. C’est du chiffre d’affaires perdu chaque mois.',
          },
        ],
        astuce:
          'Fais-lui visualiser le problème : « Sur 100 clients contents cette semaine, combien ont laissé un avis ? »',
      },
      {
        id: 'demo',
        titre: 'Comment ça marche',
        sousTitre: 'Le parcours client, étape par étape',
        accroche:
          'Sache décrire l’expérience concrète : c’est ce qui rend la solution simple et crédible aux yeux du commerçant.',
        points: [
          {
            titre: '1. L’interaction',
            texte:
              'Le client interagit avec le support : il scanne le QR code, ou approche son téléphone de la puce NFC.',
          },
          {
            titre: '2. L’aiguillage',
            texte:
              'Content → il arrive directement sur la page d’avis Google. Pas content → formulaire privé, et le commerçant est alerté.',
          },
          {
            titre: '3. Le suivi',
            texte:
              'Le commerçant retrouve tout sur son tableau de bord : avis générés, nombre de scans, retours privés à traiter.',
          },
          {
            titre: 'Tout est automatique',
            texte: 'Une fois le support posé, il travaille seul. Aucune charge de travail au quotidien.',
          },
        ],
        astuce: 'Une mini-démo en direct avec ton propre téléphone vaut mille explications.',
      },
      {
        id: 'supports',
        titre: 'Les supports : QR, plaques & NFC',
        sousTitre: 'Ce que tu installes réellement',
        accroche:
          'ScanAvis, ce n’est pas « juste un QR code ». C’est une gamme de supports physiques adaptés à chaque commerce.',
        points: [
          {
            titre: 'Le QR code',
            texte:
              'Imprimé sur autocollant, chevalet ou carte, posé en caisse, sur la table ou en vitrine. Le client le scanne avec l’appareil photo de son téléphone.',
          },
          {
            titre: 'La plaque',
            texte:
              'Un support physique élégant, souvent posé au comptoir, qui porte le QR code : plus durable, plus visible et plus pro qu’un simple autocollant.',
          },
          {
            titre: 'La puce NFC',
            texte:
              'Intégrée à la plaque : le client n’a qu’à approcher son téléphone, comme un paiement sans contact, sans rien scanner. Encore plus simple.',
          },
          {
            titre: 'QR et NFC ensemble',
            texte:
              'Sur le même support, les deux coexistent : certains clients scannent, d’autres approchent le téléphone. Chacun choisit ce qui lui parle.',
          },
        ],
        astuce:
          'Précise toujours : « La puce NFC, c’est sans contact, comme quand vous payez avec le téléphone. » Ça parle à tout le monde.',
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
              'Le QR seul (autocollant / support simple), ou la formule complète avec la plaque QR + puce NFC.',
          },
          {
            titre: 'Un essai avant de payer',
            texte: 'Un essai est proposé avant le premier paiement réel : le commerçant teste sans risque.',
          },
          {
            titre: 'Un abonnement simple',
            texte: 'Un abonnement mensuel clair, sans engagement lourd.',
          },
          {
            titre: 'La valeur d’abord',
            texte:
              'Plus d’avis, meilleure note, plus de clients : la valeur justifie largement le coût. Reste sur le bénéfice.',
          },
        ],
        astuce:
          'Ne t’excuse jamais du prix. Annonce-le clairement, puis laisse un silence : c’est un signe de confiance.',
      },
    ],
  },
  {
    id: 'vente',
    titre: 'Vendre sur le terrain',
    sousTitre: 'La méthode, de l’approche à la signature',
    chapitres: [
      {
        id: 'cible',
        titre: 'À qui vendre en priorité',
        sousTitre: 'Les bons commerces, les bons interlocuteurs',
        accroche:
          'Ton temps est précieux : concentre-le là où le besoin est évident et la décision rapide.',
        points: [
          {
            titre: 'Les commerces de proximité',
            texte:
              'Ceux qui vivent de leur réputation : restaurants, bars, coiffeurs, instituts, garages, cavistes…',
          },
          {
            titre: 'Les réputations fragiles',
            texte: 'Cible en priorité ceux qui ont peu d’avis ou une note fragile : le besoin saute aux yeux.',
          },
          {
            titre: 'Le bon interlocuteur',
            texte: 'Le gérant ou le propriétaire — le seul à pouvoir décider. Ne perds pas ton énergie ailleurs.',
          },
          {
            titre: 'Le bon moment',
            texte: 'Évite les coups de feu (service du midi). Privilégie les heures creuses, quand on peut t’écouter.',
          },
        ],
        astuce: 'Avant d’entrer, jette un œil à leur fiche Google : tu sauras déjà quoi leur dire.',
      },
      {
        id: 'methode',
        titre: 'Structurer ton approche',
        sousTitre: 'La méthode en 5 temps',
        accroche: 'Une vente n’est pas une improvisation : c’est un enchaînement que tu maîtrises.',
        points: [
          {
            titre: '1. L’accroche',
            texte: 'Une phrase courte qui capte l’attention et donne envie d’écouter la suite.',
          },
          {
            titre: '2. La découverte',
            texte: 'Quelques questions pour comprendre sa situation : ses avis actuels, sa clientèle.',
          },
          {
            titre: '3. La démonstration',
            texte: 'Montre concrètement, avec ton téléphone, comment ça marche en 30 secondes.',
          },
          {
            titre: '4. L’offre',
            texte: 'Présente la formule adaptée et le prix, simplement, sans détour.',
          },
          {
            titre: '5. Le closing',
            texte: 'Propose l’essai et accompagne-le à l’inscription tout de suite, tant qu’il est chaud.',
          },
        ],
        astuce: 'Garde toujours la main sur l’étape suivante : « Je vous montre en 30 secondes ? »',
      },
      {
        id: 'objections',
        titre: 'Répondre aux objections',
        sousTitre: 'Transformer un frein en argument',
        accroche:
          'Une objection n’est pas un refus : c’est une demande de réassurance. Reste calme et rebondis.',
        points: [
          {
            titre: '« C’est trop cher »',
            texte: 'Combien vaut un nouveau client par mois ? Un seul avis supplémentaire peut le ramener.',
          },
          {
            titre: '« J’ai pas le temps »',
            texte: 'L’installation prend 2 minutes, tout est automatique ensuite. Zéro charge au quotidien.',
          },
          {
            titre: '« Les gens ne scanneront pas »',
            texte:
              'Avec la puce NFC, ils n’ont même pas à scanner : ils approchent le téléphone. Et le support est présenté au bon moment.',
          },
          {
            titre: '« J’ai déjà des avis »',
            texte: 'Justement : Google valorise la fraîcheur, un compte qui stagne recule face aux concurrents.',
          },
          {
            titre: '« Je vais réfléchir »',
            texte: 'Propose l’essai sans risque : réfléchir en testant vaut mieux que réfléchir dans le vide.',
          },
        ],
        astuce: 'Accueille l’objection (« Je comprends »), puis réponds. Ne contredis jamais frontalement.',
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
            texte: 'Rappelle le bénéfice en une phrase, puis propose l’essai : c’est l’étape qui fait passer à l’action.',
          },
          {
            titre: 'Ton code = ta commission',
            texte:
              'Ton code personnel est saisi à l’inscription du commerce : c’est lui qui t’attribue la vente et déclenche tes commissions.',
          },
          {
            titre: 'Rester présent',
            texte: 'Accompagne-le pendant l’inscription : tu lèves les derniers doutes et tu sécurises la vente.',
          },
          {
            titre: 'Suivre tes résultats',
            texte: 'Tu retrouves chaque commerce signé et l’état de tes versements sur ton espace vendeur.',
          },
        ],
        astuce: 'Le meilleur moment pour conclure, c’est juste après un « oui » à une petite question. Enchaîne.',
      },
    ],
  },
  {
    id: 'posture',
    titre: 'Prise de parole & posture',
    sousTitre: 'Convaincre commence par toi',
    chapitres: [
      {
        id: 'stress',
        titre: 'Gérer le stress avant d’aborder',
        sousTitre: 'Aborder un inconnu sans trembler',
        accroche: 'Le trac est normal, même chez les meilleurs. Ça se prépare et ça se dompte.',
        points: [
          {
            titre: 'La préparation',
            texte: 'Quand tu sais quoi dire, ton cerveau a moins de raisons de paniquer. Prépare ton accroche à l’avance.',
          },
          {
            titre: 'La respiration',
            texte:
              'Avant d’entrer : 3 respirations lentes (4 secondes d’inspiration, 6 d’expiration). Ça calme le corps immédiatement.',
          },
          {
            titre: 'Le regard sur le « non »',
            texte: 'Un refus n’est pas un rejet de toi : c’est juste un « pas maintenant ». Ça n’a rien de personnel.',
          },
          {
            titre: 'L’action tue le stress',
            texte: 'Plus tu abordes de commerçants, moins chaque échange pèse. Le volume te libère du trac.',
          },
        ],
        astuce: 'Ton premier commerçant de la journée est un échauffement. Vise l’entraînement, pas la perfection.',
      },
      {
        id: 'parole',
        titre: 'Prendre la parole avec assurance',
        sousTitre: 'Ta voix et ton corps parlent avant tes mots',
        accroche:
          'Ce que tu dégages compte autant que ce que tu dis. La confiance se voit et s’entend.',
        points: [
          {
            titre: 'Le débit',
            texte: 'Parle lentement. Le stress accélère le débit ; ralentir donne une impression de maîtrise.',
          },
          {
            titre: 'Les silences',
            texte: 'Après une phrase importante, marque une pause. Le silence appuie tes mots, il ne te trahit pas.',
          },
          {
            titre: 'Le regard',
            texte: 'Regarde ton interlocuteur dans les yeux : c’est ce qui installe la confiance.',
          },
          {
            titre: 'Le corps',
            texte: 'Épaules ouvertes, ancré sur tes deux pieds, sourire naturel. Une posture ouverte rassure l’autre.',
          },
        ],
        astuce: 'Souris avant même de parler : ça détend ton visage et ça s’entend dans ta voix.',
      },
      {
        id: 'idees',
        titre: 'Exprimer ses idées clairement',
        sousTitre: 'Être compris du premier coup',
        accroche:
          'Un message clair et simple convainc plus qu’un discours parfait mais fouillis.',
        points: [
          {
            titre: 'Une idée par phrase',
            texte: 'Phrases courtes, une idée à la fois. On te suit facilement, tu ne te perds pas.',
          },
          {
            titre: 'Le bénéfice avant la fonction',
            texte: 'Dis « vous aurez plus d’avis » avant « il y a une puce NFC ». Le pourquoi avant le comment.',
          },
          {
            titre: 'Les images concrètes',
            texte: 'Utilise des comparaisons : « comme un paiement sans contact », « comme une carte de fidélité ».',
          },
          {
            titre: 'La mini-histoire',
            texte: 'Un exemple vaut mille arguments : « un caviste que j’accompagne est passé de 12 à 60 avis en deux mois ».',
          },
        ],
        astuce: 'Si tu ne peux pas résumer ton idée en une phrase, c’est qu’elle n’est pas encore claire pour toi.',
      },
      {
        id: 'ecoute',
        titre: 'Écouter et rebondir',
        sousTitre: 'La vente est un dialogue',
        accroche:
          'Le meilleur vendeur écoute plus qu’il ne parle. Les réponses du commerçant sont tes meilleurs arguments.',
        points: [
          {
            titre: 'Les questions ouvertes',
            texte: '« Comment gérez-vous vos avis aujourd’hui ? » ouvre le dialogue mieux qu’une question à oui/non.',
          },
          {
            titre: 'La reformulation',
            texte: '« Donc si je comprends bien, vos clients contents ne laissent rien. » Il se sent écouté et compris.',
          },
          {
            titre: 'Parler de SON commerce',
            texte: 'Note ses mots et réutilise-les : parle de son cas précis, pas d’un exemple général.',
          },
          {
            titre: 'Laisser finir',
            texte: 'Ne coupe jamais la parole : ça casse la confiance et te fait rater l’information clé.',
          },
        ],
        astuce: 'Le silence est ton ami : après ta question, tais-toi et laisse-le répondre, même si c’est inconfortable.',
      },
    ],
  },
]

// Liste à plat des chapitres, enrichie du contexte de module (pour la navigation
// pas-à-pas et l'affichage du programme).
export const CHAPITRES = MODULES.flatMap((m, mi) =>
  m.chapitres.map((c) => ({
    ...c,
    moduleId: m.id,
    moduleTitre: m.titre,
    moduleIndex: mi + 1,
  }))
)
export type ChapitreFlat = (typeof CHAPITRES)[number]

export const NB_MODULES = MODULES.length

export type TestQuestion = {
  id: string
  question: string
  // Les options sont publiques ; l'index de la bonne réponse est côté serveur.
  options: string[]
}

// Questionnaire final. Les bonnes réponses vivent côté serveur
// (app/api/vendeur/test/route.ts), alignées par `id`.
export const TEST_QUESTIONS: TestQuestion[] = [
  {
    id: 'q_pitch',
    question: 'En une phrase, que fait ScanAvis pour un commerce ?',
    options: [
      'Il crée le site internet du commerce',
      'Il transforme les clients satisfaits en avis Google et garde les mécontents en privé',
      'Il gère les réservations en ligne',
      'Il supprime les avis négatifs déjà publiés',
    ],
  },
  {
    id: 'q_supports',
    question: 'Que peut contenir un support ScanAvis ?',
    options: [
      'Uniquement un QR code en autocollant',
      'Un QR code à scanner et une puce NFC à approcher du téléphone',
      'Une carte bancaire',
      'Un terminal de paiement',
    ],
  },
  {
    id: 'q_nfc',
    question: 'Comment expliquer simplement la puce NFC à un commerçant ?',
    options: [
      'C’est un scanner de code-barres',
      'Sans contact, comme payer avec son téléphone — pas besoin de scanner',
      'Il faut télécharger une application',
      'Ça ne marche que sur ordinateur',
    ],
  },
  {
    id: 'q_mecontent',
    question: 'Que se passe-t-il quand un client mécontent utilise le support ?',
    options: [
      'Il est envoyé sur Google pour laisser une mauvaise note',
      'Rien ne se passe',
      'Il arrive sur un formulaire privé et le commerçant est alerté',
      'Il reçoit un bon de réduction',
    ],
  },
  {
    id: 'q_probleme',
    question: 'Quel problème central ScanAvis résout-il ?',
    options: [
      'Les clients satisfaits ne laissent presque jamais d’avis spontanément',
      'Les commerces ont trop de clients',
      'Google fait payer chaque avis',
      'Les commerçants n’ont pas de téléphone',
    ],
  },
  {
    id: 'q_cible',
    question: 'À qui faut-il s’adresser en priorité dans le commerce ?',
    options: [
      'Le premier employé venu',
      'Un client présent sur place',
      'Le gérant ou le propriétaire',
      'Le livreur',
    ],
  },
  {
    id: 'q_methode',
    question: 'Quelle est la bonne structure d’approche sur le terrain ?',
    options: [
      'Annoncer le prix puis partir',
      'Accroche → découverte → démonstration → offre → closing',
      'Faire la démo puis dire au revoir',
      'Attendre une objection en silence',
    ],
  },
  {
    id: 'q_objection_nfc',
    question: 'Un commerçant dit « les gens ne scanneront pas ». Meilleure réponse ?',
    options: [
      'Vous avez raison, c’est un vrai problème',
      'Avec la puce NFC, ils n’ont même pas à scanner : ils approchent le téléphone',
      'Il faut les obliger à scanner',
      'On peut baisser le prix',
    ],
  },
  {
    id: 'q_prix',
    question: 'Quelle est la bonne posture face au prix ?',
    options: [
      'Proposer d’emblée la plus grosse remise possible',
      'Éviter d’en parler',
      'L’annoncer clairement, face à la valeur, en rappelant l’essai sans risque',
      'Dire qu’il est négociable à l’infini',
    ],
  },
  {
    id: 'q_commission',
    question: 'Comment une vente t’est-elle attribuée et déclenche ta commission ?',
    options: [
      'Dès que tu parles à un commerçant',
      'Par ton code personnel, saisi à l’inscription du commerce',
      'En prévenant l’équipe par téléphone',
      'Au bout d’un an d’ancienneté',
    ],
  },
  {
    id: 'q_conclure',
    question: 'Le commerçant est convaincu. Quelle est la bonne dernière étape ?',
    options: [
      'Le laisser réfléchir seul et repartir',
      'Lui résumer le bénéfice, proposer l’essai et l’accompagner à l’inscription',
      'Lui envoyer un devis par courrier',
      'Attendre qu’il te rappelle',
    ],
  },
  {
    id: 'q_stress',
    question: 'Comment gérer le stress avant d’aborder un commerçant ?',
    options: [
      'Attendre d’être 100 % à l’aise avant de commencer',
      'Se préparer, respirer, et enchaîner les abords — l’action réduit le stress',
      'Éviter de parler et envoyer un email à la place',
      'Aborder le plus vite possible, sans aucune préparation',
    ],
  },
  {
    id: 'q_parole',
    question: 'Comment dégager de l’assurance à l’oral ?',
    options: [
      'Parler très vite pour montrer qu’on maîtrise',
      'Regarder ses pieds et parler à voix basse',
      'Ralentir le débit, marquer des silences, garder le regard et une posture ouverte',
      'Réciter un texte par cœur sans respirer',
    ],
  },
  {
    id: 'q_idees',
    question: 'Comment exprimer une idée clairement ?',
    options: [
      'Une idée par phrase, phrases courtes, le bénéfice avant la fonctionnalité',
      'Le plus de détails techniques possible',
      'Des phrases très longues et exhaustives',
      'Parler de tout en même temps',
    ],
  },
  {
    id: 'q_ecoute',
    question: 'Quelle attitude adopter pendant l’entretien ?',
    options: [
      'Parler sans s’arrêter pour convaincre',
      'Poser des questions ouvertes, reformuler et laisser le commerçant finir',
      'Couper la parole pour garder le contrôle',
      'Répondre avant même qu’il ait terminé',
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
