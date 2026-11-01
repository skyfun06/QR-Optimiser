// Contenu de la formation vendeur (vraie formation structurée en modules) +
// questionnaire final. Source unique partagée par le composant de formation
// (components/vendeurs/formation) et l'API de correction (app/api/vendeur/test).
//
// IMPORTANT — anti-triche : ce fichier est importé côté navigateur. Les bonnes
// réponses du QUESTIONNAIRE final NE SONT PAS ici (le client pourrait les lire).
// Elles vivent uniquement côté serveur dans app/api/vendeur/test/route.ts,
// alignées par `id`. La formation elle-même n'a plus de mini-questions : c'est
// un vrai parcours d'apprentissage, validé par le seul questionnaire final.

export type QuestionPatron = {
  question: string
  // Pourquoi le patron la pose / ce qui peut déstabiliser le vendeur.
  piege: string
  // Réponse à donner, formulée à l'oral. Toujours vraie : la crédibilité d'abord.
  reponse: string
  aEviter: string
}

export type CategorieQuestions = {
  id: string
  titre: string
  questions: QuestionPatron[]
}

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
            titre: 'Un canal privé pour les déçus',
            texte:
              'Un client déçu peut écrire d’abord au commerçant en privé, qui peut alors réagir. Il reste libre de publier sur Google : le lien est sur la même page, et on ne bloque jamais personne.',
          },
          {
            titre: 'Le résultat',
            texte:
              'Plus de clients contents qui prennent le temps de publier, des problèmes remontés au commerçant, et des habitués qui reviennent grâce à la carte de fidélité.',
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
            texte: 'La plupart des clients satisfaits repartent sans laisser d’avis. Ils ne sont pas contre : personne ne le leur a proposé au bon moment.',
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
              'Il donne une note. 4 ou 5 étoiles → page d’avis Google. 1 à 3 étoiles → il peut écrire au commerçant en privé, ou publier sur Google grâce au lien juste en dessous. Il peut aussi ne rien faire.',
          },
          {
            titre: '3. Le suivi',
            texte:
              'Le commerçant retrouve tout sur son tableau de bord : avis générés, nombre de scans, retours privés à traiter.',
          },
          {
            titre: 'Tout est automatique',
            texte: 'Une fois le support posé, il travaille seul. Il reste juste au commerçant à traiter les retours privés et à honorer les récompenses de fidélité.',
          },
        ],
        astuce: 'Une mini-démo en direct avec ton propre téléphone vaut mille explications.',
      },
      {
        id: 'fidelite',
        titre: 'La carte de fidélité',
        sousTitre: 'Le deuxième argument de vente',
        accroche:
          'ScanAvis ne sert pas qu’à récolter des avis : le même support fait aussi revenir les clients. Pour beaucoup de commerces de quartier, c’est l’argument qui fait pencher la balance.',
        points: [
          {
            titre: 'Le même QR code',
            texte:
              'Pas de deuxième support ni d’application. Le client scanne ou approche son téléphone, et sa carte s’ouvre dans le navigateur, sous la demande d’avis.',
          },
          {
            titre: 'Le commerçant décide',
            texte:
              'Il choisit ses paliers et ses récompenses, par exemple un café offert au 5ᵉ passage. Il peut les modifier ou mettre le programme en pause. Il ne s’active pas tout seul : pense à le faire avec lui.',
          },
          {
            titre: 'Un tampon par jour',
            texte:
              'Chaque passage donne un tampon, au maximum un par jour, même si le client scanne dix fois. Au palier, il montre l’écran de récompense au comptoir.',
          },
          {
            titre: 'La règle d’or : la visite, jamais l’avis',
            texte:
              'Le tampon récompense la visite, avec ou sans avis. Ne dis jamais « laissez un avis pour gagner un tampon » : c’est faux, et Google interdit de récompenser un avis.',
          },
          {
            titre: 'Rien à perdre pour le client',
            texte:
              'La carte reste sur son téléphone. S’il le souhaite, il ajoute son email ou son numéro pour la retrouver en changeant d’appareil. Ces données ne servent qu’à ça.',
          },
        ],
        astuce:
          'Demande-lui : « Vos habitués, vous les faites revenir comment aujourd’hui ? » S’il a des cartes papier, tu as ton ouverture : elles se perdent, celle-ci reste sur le téléphone.',
      },
      {
        id: 'liberte-avis',
        titre: 'Le client reste libre sur Google',
        sousTitre: 'La question qui peut te déstabiliser',
        accroche:
          'Un patron malin te demandera : « Donc un client mécontent peut quand même me mettre un mauvais avis ? » La réponse est oui. Dis-le sans hésiter : c’est ta franchise qui te rend crédible.',
        points: [
          {
            titre: 'La vérité en une phrase',
            texte:
              '« Oui. Tout client peut publier ce qu’il veut sur Google, à tout moment. ScanAvis n’empêche aucun avis et n’en supprime aucun. »',
          },
          {
            titre: 'Ce qui se passe vraiment',
            texte:
              'Entre 1 et 3 étoiles, le client se voit proposer d’écrire au commerçant en privé. Sur la même page, un lien lui permet de publier plutôt sur Google. Il peut aussi passer, ou aller directement sur Google sans jamais scanner.',
          },
          {
            titre: 'Pourquoi c’est quand même utile',
            texte:
              'Le client déçu a un moyen simple de parler au commerçant, qui peut réagir et arranger les choses. Et les clients contents, souvent silencieux, sont enfin sollicités.',
          },
          {
            titre: 'Ce que tu ne dis jamais',
            texte:
              '« Vous n’aurez plus de mauvais avis », « on bloque les avis négatifs », « on filtre les mécontents ». C’est faux, et un patron déçu résiliera : tu perdrais tes versements suivants.',
          },
        ],
        astuce:
          'Réponds sans te justifier : « Oui, il peut, et c’est normal. » Puis enchaîne sur ce que le commerçant y gagne. Une réponse calme rassure plus qu’un long discours.',
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
            texte: 'Si le patron s’inscrit lui-même avec ton QR, il profite de la période offerte affichée à l’inscription. Si tu l’inscris sur place, il reçoit un email pour payer et activer tout de suite.',
          },
          {
            titre: 'Un abonnement simple',
            texte: 'Un abonnement mensuel sans engagement : 35 € pour le QR, 40 € avec la plaque NFC. Avis et fidélité sont inclus dans les deux.',
          },
          {
            titre: 'La valeur d’abord',
            texte:
              'Plus d’avis et des habitués qui reviennent : mets le prix en face de ce que rapporte un client de plus. Reste sur le bénéfice, sans promettre de résultat chiffré.',
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
            texte: 'L’installation prend 2 minutes, et le support travaille ensuite tout seul. Il n’y a que les retours privés et les récompenses à gérer.',
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
            titre: '« J’ai déjà une carte de fidélité »',
            texte:
              'Le papier se perd et ne vous dit rien de vos habitués. Ici, la carte reste sur le téléphone du client et se remplit avec le même QR que les avis.',
          },
          {
            titre: '« Un client pourra quand même me mettre un mauvais avis ? »',
            texte:
              'Oui, tout client reste libre de publier sur Google. Mais le client déçu peut aussi vous écrire directement, et vous pouvez réagir. Retrouve les autres questions dans « Questions des patrons ».',
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
            titre: 'Plus il reste, plus tu gagnes',
            texte:
              'Tes gains suivent les mois payés par le commerce : la moitié d’un abonnement au 1er mois, un abonnement au 3ᵉ, deux abonnements et demi au 6ᵉ, soit 100 € au total sur la formule à 40 €. Un client bien accompagné vaut bien plus qu’une signature forcée.',
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
            texte: 'Un exemple vaut mille arguments, à condition qu’il soit vrai. Raconte uniquement ce que tu as vu chez un de tes commerces, jamais un résultat inventé.',
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

// Questions difficiles que les patrons peuvent poser, consultables à tout moment
// (voir components/vendeurs/questions-patrons). Règle de rédaction : ne rien
// affirmer que le produit ne fait pas, et autoriser « je vérifie » plutôt
// qu'une réponse inventée.
export const QUESTIONS_PATRONS: CategorieQuestions[] = [
  {
    id: 'avis',
    titre: 'Les avis Google',
    questions: [
      {
        question: 'Donc un client mécontent peut quand même me mettre un mauvais avis ?',
        piege: 'Il teste si tu vends un miracle. Hésiter ici te décrédibilise pour tout le reste.',
        reponse:
          'Oui, tout client peut publier sur Google, et personne ne peut l’en empêcher. Ce qu’on ajoute, c’est que s’il met 1 à 3 étoiles, on lui propose de vous écrire d’abord en privé, avec le lien Google juste en dessous s’il préfère. Vous avez une chance de réagir, c’est tout.',
        aEviter: '« Non, ça bloque les mauvais avis. »',
      },
      {
        question: 'Alors à quoi ça sert, si les mauvais avis passent quand même ?',
        piege: 'Il retourne ta franchise contre toi. Ne recule pas, reviens au vrai problème.',
        reponse:
          'Ça ne sert pas à cacher les mauvais avis. Ça sert à faire parler les clients contents, qui ne pensent pas à publier, à vous donner un canal direct avec les déçus, et à faire revenir vos habitués avec la carte de fidélité.',
        aEviter: 'Promettre que les mauvais avis vont diminuer.',
      },
      {
        question: 'Vous filtrez les clients selon leur note ? C’est autorisé, ça ?',
        piege: 'Question de patron informé. Décris le fonctionnement exact, sans jouer au juriste.',
        reponse:
          'Je vous explique exactement ce qui se passe : 4 ou 5 étoiles, le client arrive sur Google. 1 à 3 étoiles, il peut vous écrire en privé ou publier sur Google depuis la même page. Personne n’est bloqué. Pour une question juridique précise, je transmets à l’équipe plutôt que de m’avancer.',
        aEviter: '« C’est 100 % légal, aucun risque », dit sans savoir.',
      },
      {
        question: 'Est-ce que vous pouvez supprimer mes mauvais avis existants ?',
        piege: 'Il espère un service que beaucoup promettent à tort.',
        reponse:
          'Non. ScanAvis ne supprime aucun avis, et personne ne peut sérieusement vous le garantir. Ce qu’on peut faire, c’est vous aider à obtenir de nouveaux avis récents.',
        aEviter: '« On peut voir ce qu’on peut faire. »',
      },
      {
        question: 'Les avis sont vrais ? Vous n’en achetez pas ?',
        piege: 'Il a peur d’être associé à des faux avis.',
        reponse:
          'Aucun faux avis. Ce sont vos vrais clients qui publient depuis leur propre compte Google, avec leurs mots.',
        aEviter: 'Rester flou ou plaisanter sur le sujet.',
      },
      {
        question: 'Vous me garantissez combien d’avis ou quelle note ?',
        piege: 'Un chiffre promis devient une promesse qu’il te reprochera.',
        reponse:
          'Je ne garantis aucun chiffre : ça dépend de votre passage et de l’endroit où le support est posé. Je préfère vous laisser juger sur vos propres résultats dans le tableau de bord.',
        aEviter: 'Annoncer une note ou un nombre d’avis.',
      },
      {
        question: 'Vous tenez ce chiffre d’où ?',
        piege: 'Il vérifie si tu récites. Un chiffre inventé fait s’écrouler tout le discours.',
        reponse:
          'Si tu as une source, donne-la. Sinon, dis-le : « Je n’ai pas la source sous la main, je préfère ne pas vous l’affirmer. Regardons plutôt votre fiche Google ensemble. »',
        aEviter: 'Inventer une étude ou défendre un chiffre que tu ne connais pas.',
      },
    ],
  },
  {
    id: 'fidelite',
    titre: 'La carte de fidélité',
    questions: [
      {
        question: 'Le client gagne un tampon s’il laisse un avis ?',
        piege: 'Un « oui » serait faux et mettrait sa fiche Google en danger.',
        reponse:
          'Non, et c’est volontaire. Le tampon récompense la visite, qu’il laisse un avis ou pas. Les deux sont indépendants.',
        aEviter: '« Oui, ça les motive à laisser un avis. »',
      },
      {
        question: 'Un client peut tricher et scanner dix fois ?',
        piege: 'Il pense à ses récompenses offertes pour rien.',
        reponse:
          'Il aura un seul tampon par jour, même s’il scanne dix fois. Pour la récompense, il doit vous montrer un écran animé au comptoir, avec une heure qui défile, pour éviter les captures d’écran.',
        aEviter: 'Dire que c’est impossible à contourner.',
      },
      {
        question: 'Et s’il photographie le QR et scanne depuis chez lui ?',
        piege: 'C’est une vraie limite. Ne la nie pas.',
        reponse:
          'C’est possible : le QR ne vérifie pas où se trouve le client. C’est limité à un tampon par jour, et c’est vous qui remettez la récompense au comptoir. Vous gardez donc le dernier mot, et vous choisissez des paliers adaptés.',
        aEviter: '« Ça ne marche que dans le commerce. »',
      },
      {
        question: 'Ça va me coûter cher en récompenses ?',
        piege: 'Il voit le coût avant le bénéfice.',
        reponse:
          'C’est vous qui fixez les paliers et les récompenses, et vous pouvez les modifier ou mettre le programme en pause. Vous pouvez commencer par quelque chose de simple, comme un café au 5ᵉ passage.',
        aEviter: 'Lui imposer un palier ou annoncer un retour chiffré.',
      },
      {
        question: 'Il doit télécharger une application ou donner ses données ?',
        piege: 'Il sait que ses clients n’aiment pas ça.',
        reponse:
          'Pas d’application : tout s’ouvre dans le navigateur. L’email ou le téléphone est facultatif, sert seulement à retrouver la carte, et n’est ni revendu ni utilisé pour de la publicité. Un cookie technique reconnaît la carte d’une visite à l’autre.',
        aEviter: 'Dire « aucune donnée » : le cookie et le nombre de passages en sont.',
      },
      {
        question: 'Et s’il change de téléphone ?',
        piege: 'Il a déjà vu des cartes perdues.',
        reponse:
          'S’il a enregistré son email ou son numéro, il retrouve ses tampons. Sinon, sa carte reste sur l’ancien téléphone. La page lui propose de la sauvegarder au fil des passages.',
        aEviter: '« Il ne perd jamais ses tampons. »',
      },
    ],
  },
  {
    id: 'prix',
    titre: 'Le prix et l’engagement',
    questions: [
      {
        question: 'Je peux faire pareil gratuitement avec mon lien Google, non ?',
        piege: 'C’est vrai en partie. Le nier te fait passer pour un vendeur de vent.',
        reponse:
          'Oui, vous pouvez imprimer votre lien Google gratuitement. ScanAvis ajoute le support prêt à poser, le retour privé des clients déçus, la carte de fidélité et le suivi dans un tableau de bord. Si seul le lien vous suffit, gardez votre argent.',
        aEviter: '« Non, ça ne marche pas pareil », sans expliquer.',
      },
      {
        question: 'Je m’engage pour combien de temps ? Comment on arrête ?',
        piege: 'Il a peur du contrat piège.',
        reponse:
          'Sans engagement : c’est mensuel, vous résiliez depuis vos paramètres, et l’accès reste actif jusqu’à la fin de la période déjà payée.',
        aEviter: 'Le pousser à rester ou minimiser sa question.',
      },
      {
        question: 'Je peux essayer avant de payer ?',
        piege: 'La réponse dépend du parcours. Sois exact.',
        reponse:
          'Si vous vous inscrivez vous-même avec mon QR, vous avez une période offerte, indiquée à l’écran avant de vous engager. Si je vous inscris sur place, vous recevez un email pour payer et activer directement.',
        aEviter: 'Annoncer une durée d’essai sans l’avoir vue à l’écran.',
      },
      {
        question: 'Vous pouvez me faire un prix ?',
        piege: 'Il teste ta marge de manœuvre.',
        reponse:
          'Non, les prix sont les mêmes pour tout le monde : 35 € avec le QR, 40 € avec la plaque NFC. Comparons plutôt ça à ce que vous rapporte un client de plus.',
        aEviter: 'Promettre une remise que tu ne peux pas accorder.',
      },
      {
        question: 'Vous touchez combien là-dessus ?',
        piege: 'Il cherche à savoir si ton conseil est intéressé.',
        reponse:
          'Je suis commissionné, oui. Et l’essentiel de ma rémunération arrive seulement si vous restez plusieurs mois. J’ai donc intérêt à ce que ça marche vraiment pour vous, pas à vous forcer la main.',
        aEviter: 'Nier ou esquiver.',
      },
    ],
  },
  {
    id: 'credibilite',
    titre: 'Ta crédibilité et ScanAvis',
    questions: [
      {
        question: 'Vous avez déjà vendu ça à qui ? Je peux les appeler ?',
        piege: 'Il veut une preuve. Un faux client est la pire réponse possible.',
        reponse:
          'Cite seulement de vrais commerces qui ont donné leur accord. Si tu débutes : « Vous seriez parmi mes premiers, je ne vais pas vous raconter d’histoires. Je peux vous faire la démo tout de suite, et vous jugerez sur pièces. »',
        aEviter: 'Inventer un client ou un résultat.',
      },
      {
        question: 'Vous êtes salarié de ScanAvis ? Vous avez quel âge ?',
        piege: 'Il teste ton aplomb plus que ton statut.',
        reponse:
          'Je suis vendeur partenaire du réseau, formé par ScanAvis. Et je ne vous demande pas de me croire sur parole : tout se voit sur mon téléphone en 30 secondes.',
        aEviter: 'Te présenter comme salarié, ou t’excuser d’être jeune.',
      },
      {
        question: 'Jamais entendu parler de vous. C’est qui, ScanAvis ?',
        piege: 'Il compare avec les grandes marques.',
        reponse:
          'C’est un service récent, et je ne vais pas prétendre le contraire. Tout est sur le site, et vous n’êtes pas engagé : vous arrêtez quand vous voulez si ça ne vous convient pas.',
        aEviter: 'Annoncer un nombre de clients que tu ne connais pas.',
      },
      {
        question: 'Si ça plante ou si vous disparaissez, je fais quoi ?',
        piege: 'Il craint de rester seul après la signature.',
        reponse:
          'Le service et l’abonnement sont gérés par ScanAvis, pas par moi : vous gardez votre tableau de bord et vous pouvez contacter l’équipe. Et j’ai tout intérêt à ce que vous restiez.',
        aEviter: 'Promettre une disponibilité que tu ne tiendras pas.',
      },
      {
        question: 'Mes concurrents l’ont déjà ? Vous avez l’exclusivité sur le quartier ?',
        piege: 'Il cherche un avantage, et une promesse d’exclusivité serait fausse.',
        reponse:
          'Il n’y a pas d’exclusivité : un concurrent peut aussi s’abonner. Je ne vous dirai pas non plus que vous seriez le seul.',
        aEviter: '« Je ne le propose qu’à vous. »',
      },
      {
        question: 'Une question dont tu ne connais pas la réponse',
        piege: 'Ce n’est jamais « ne pas savoir » qui décrédibilise. C’est inventer.',
        reponse:
          '« Bonne question, je ne veux pas vous dire une bêtise. Je vérifie auprès de l’équipe et je reviens vers vous avec la réponse. » Note-la devant lui, et reviens vraiment.',
        aEviter: 'Improviser une réponse pour sauver la face.',
      },
    ],
  },
]

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
      'Il aide les clients satisfaits à publier sur Google, donne aux déçus un canal privé et fait revenir les habitués',
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
      'Il peut écrire au commerçant en privé, et reste libre de publier sur Google',
      'Il reçoit un bon de réduction',
    ],
  },
  {
    id: 'q_liberte_google',
    question: 'Un patron demande : « Un client mécontent peut quand même me mettre un mauvais avis ? » Que réponds-tu ?',
    options: [
      'Non, ScanAvis bloque les avis négatifs',
      'Oui, tout client reste libre de publier sur Google ; il a aussi un moyen de vous écrire en privé',
      'Non, sauf s’il insiste plusieurs fois',
      'Je change de sujet pour ne pas perdre la vente',
    ],
  },
  {
    id: 'q_fidelite',
    question: 'Comment un client obtient-il un tampon sur sa carte de fidélité ?',
    options: [
      'En laissant un avis 5 étoiles',
      'En laissant n’importe quel avis Google',
      'En téléchargeant l’application ScanAvis',
      'En passant au commerce et en scannant, avec ou sans avis, un tampon par jour au maximum',
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
