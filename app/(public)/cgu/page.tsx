import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection, MailLink } from "@/components/legal-page";
import { FORMULES } from "@/lib/vendeur-commerce";

export const metadata: Metadata = { title: "Conditions générales d'utilisation" };

// Taux de parrainage : lib/referral.ts (REFERRAL_RATE). Non importé ici car ce
// module charge le client Supabase service role.
const REFERRAL_PCT = 20;

export default function CguPage() {
  return (
    <LegalPage title="Conditions Générales d'Utilisation" updated="novembre 2026">
      <LegalSection title="1. Objet">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;utilisation du
          service <strong>ScanAvis</strong>, accessible à l&apos;adresse <strong>qrscanavis.fr</strong>, édité par
          l&apos;éditeur désigné à l&apos;article 15.
        </p>
        <p>
          ScanAvis est un service en ligne (SaaS) destiné aux commerçants et professionnels. Il les aide à collecter
          des avis Google, à recueillir en privé les retours de clients moins satisfaits et à fidéliser leur clientèle
          grâce à une carte de fidélité dématérialisée, le tout à partir d&apos;un QR code ou d&apos;une plaque NFC.
        </p>
        <p>
          La création d&apos;un compte vaut acceptation sans réserve des présentes CGU. Si vous ne les acceptez pas,
          vous ne devez pas utiliser le service.
        </p>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <p>Selon la formule souscrite, ScanAvis comprend :</p>
        <LegalList>
          <li>un QR code personnalisé lié à la fiche Google du commerce, avec une affiche prête à imprimer ;</li>
          <li>
            une page de notation : les clients qui attribuent 4 ou 5 étoiles sont invités à publier leur avis sur
            Google ; ceux qui attribuent 1 à 3 étoiles se voient proposer un formulaire de retour privé.{" "}
            <strong>Le client reste toujours libre de publier son avis sur Google, quelle que soit sa note</strong>{" "}
            (un lien vers Google lui est proposé dans tous les cas) ;
          </li>
          <li>un programme de fidélité à tampons, sans application ni carte papier (formule Premium et période d&apos;essai, voir article 5) ;</li>
          <li>un widget d&apos;avis à intégrer sur le site du commerce ;</li>
          <li>un tableau de bord (avis, retours privés, scans, fidélité), un export PDF et un bilan mensuel ;</li>
          <li>un programme de parrainage entre commerçants (article 9) ;</li>
          <li>pour la formule Premium, une plaque sans contact à poser sur le comptoir.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Compte et inscription">
        <p>
          Le service est réservé aux professionnels majeurs, agissant pour les besoins de leur activité. Vous vous
          engagez à fournir des informations exactes et à préserver la confidentialité de vos identifiants : toute
          action réalisée depuis votre compte est réputée faite par vous.
        </p>
        <p>
          Avant la création de votre premier commerce, l&apos;enregistrement d&apos;une carte bancaire valide est
          demandé. Cette vérification est opérée par <strong>Stripe</strong> et{" "}
          <strong>n&apos;entraîne aucun prélèvement</strong>. Un même compte peut gérer plusieurs commerces.
        </p>
      </LegalSection>

      <LegalSection title="4. Période d&apos;essai">
        <p>
          Chaque nouveau commerce bénéficie d&apos;une <strong>période d&apos;essai de 30 jours</strong> à compter de sa
          création, donnant accès à l&apos;ensemble des fonctionnalités, programme de fidélité compris. Il ne s&apos;agit
          pas d&apos;une formule gratuite : à son terme, le commerçant choisit l&apos;une des formules payantes ci-dessous. Aucun montant n&apos;est prélevé pendant
          l&apos;essai.
        </p>
        <p>
          À la fin de l&apos;essai, l&apos;accès au tableau de bord est suspendu jusqu&apos;à l&apos;activation
          d&apos;un abonnement payant. <strong>L&apos;abonnement ne démarre jamais automatiquement</strong> : il doit
          être activé par le commerçant.
        </p>
        <p>
          Un commerce inscrit sur place par un vendeur ScanAvis ne bénéficie pas de cet essai : son accès est ouvert
          dès le paiement du premier mois, via le lien reçu par email.
        </p>
      </LegalSection>

      <LegalSection title="5. Formules, prix et paiement">
        <LegalList>
          <li>
            Formule <strong>{FORMULES.qr.label}</strong> : <strong>{FORMULES.qr.prixMensuel} € par mois</strong> ;
          </li>
          <li>
            Formule <strong>{FORMULES.qr_nfc.label}</strong> : <strong>{FORMULES.qr_nfc.prixMensuel} € par mois</strong>.
          </li>
        </LegalList>
        <p>
          La formule <strong>{FORMULES.qr.label}</strong> comprend l&apos;ensemble des fonctionnalités décrites à
          l&apos;article 2, à l&apos;exception du programme de fidélité et de la plaque sans contact, réservés à la formule
          <strong> {FORMULES.qr_nfc.label}</strong>. En cas de passage à la formule {FORMULES.qr.label}, le programme de
          fidélité est mis en pause : il n&apos;est plus proposé aux clients, mais les cartes, tampons et paliers sont
          conservés et redeviennent disponibles en cas de retour à la formule {FORMULES.qr_nfc.label}.
        </p>
        <p>
          Les prix sont indiqués en euros. L&apos;éditeur relevant du régime de la micro-entreprise, la TVA n&apos;est
          pas applicable (article 293 B du Code général des impôts).
        </p>
        <p>
          L&apos;abonnement est payable mensuellement et d&apos;avance, par prélèvement sur la carte enregistrée. Le
          paiement est traité de manière sécurisée par <strong>Stripe</strong> ; ScanAvis ne stocke aucune donnée
          bancaire. Un changement de formule en cours de mois est facturé au prorata.
        </p>
        <p>
          En cas d&apos;échec de paiement, ScanAvis vous en informe et peut suspendre l&apos;accès au service tant que
          la situation n&apos;est pas régularisée. Les QR codes et la plaque restent associés à votre commerce.
        </p>
      </LegalSection>

      <LegalSection title="6. Durée et résiliation">
        <p>
          L&apos;abonnement est <strong>sans engagement</strong> et se renouvelle chaque mois. Vous pouvez le résilier
          à tout moment depuis les paramètres de votre commerce ou en écrivant à <MailLink />. La résiliation prend
          effet à la fin de la période mensuelle en cours, déjà payée ; aucun remboursement au prorata n&apos;est
          effectué.
        </p>
        <p>
          Vous pouvez également supprimer votre compte depuis votre espace : vos commerces et leurs données sont alors
          supprimés, sous réserve des durées de conservation légales (voir la{" "}
          <Link href="/confidentialite" className="text-gold hover:underline">politique de confidentialité</Link>).
        </p>
        <p>
          ScanAvis peut suspendre ou résilier un compte en cas de manquement grave aux présentes CGU (fraude, faux
          avis, usage illicite), après mise en demeure restée sans effet, sauf urgence.
        </p>
      </LegalSection>

      <LegalSection title="7. Avis Google : règles à respecter">
        <p>Le commerçant s&apos;engage à respecter les règles de Google relatives aux avis, et notamment à :</p>
        <LegalList>
          <li>ne jamais offrir de contrepartie (réduction, cadeau, tampon…) en échange d&apos;un avis ;</li>
          <li>ne pas publier ni solliciter de faux avis, ni empêcher un client de publier un avis négatif ;</li>
          <li>ne pas détourner le service pour influencer artificiellement sa note.</li>
        </LegalList>
        <p>
          Conformément à ces règles, dans ScanAvis{" "}
          <strong>le tampon de fidélité récompense la visite, jamais l&apos;avis</strong> : il est attribué au
          passage, qu&apos;un avis soit laissé ou non.
        </p>
      </LegalSection>

      <LegalSection title="8. Programme de fidélité">
        <p>
          Le commerçant définit librement ses paliers et récompenses. Il est seul responsable de leur contenu et
          s&apos;engage à honorer les récompenses obtenues par ses clients. Un tampon au maximum est attribué par
          client et par jour.
        </p>
        <p>
          Le programme est disponible pendant la période d&apos;essai puis avec la formule {FORMULES.qr_nfc.label}.
          Lorsqu&apos;il est mis en pause (passage à la formule {FORMULES.qr.label} ou fin d&apos;abonnement), le
          commerçant reste tenu d&apos;honorer les récompenses déjà obtenues par ses clients.
        </p>
        <p>
          Pour les données de ses clients (carte de fidélité, contact facultatif), le commerçant est responsable du
          traitement et ScanAvis agit en qualité de sous-traitant, uniquement pour faire fonctionner le programme.
          Il appartient au commerçant d&apos;informer ses clients, par exemple en renvoyant vers la politique de
          confidentialité de ScanAvis.
        </p>
      </LegalSection>

      <LegalSection title="9. Parrainage entre commerçants">
        <p>
          Chaque commerçant dispose d&apos;un lien de parrainage personnel. Lorsqu&apos;un nouveau commerce
          s&apos;inscrit grâce à ce lien puis s&apos;abonne, <strong>{REFERRAL_PCT} % du montant de chaque facture
          payée par ce filleul</strong> sont crédités sur le compte de facturation du parrain, tant que le filleul
          reste abonné.
        </p>
        <p>
          Ce crédit est déduit automatiquement des factures suivantes du parrain ; un éventuel surplus reste en
          crédit pour les mois suivants. Il n&apos;est ni remboursable ni convertible en argent. Le rattachement à un
          parrain doit intervenir à l&apos;inscription du filleul ; l&apos;auto-parrainage et toute manœuvre abusive
          entraînent l&apos;annulation des crédits concernés.
        </p>
      </LegalSection>

      <LegalSection title="10. Programme vendeurs (apporteurs d'affaires)">
        <p>
          ScanAvis peut faire appel à des vendeurs indépendants qui présentent le service aux commerçants. La
          candidature se fait depuis la page{" "}
          <Link href="/rejoindre" className="text-gold hover:underline">Devenir vendeur</Link> ; elle est réservée aux
          personnes majeures et soumise à validation par ScanAvis, puis à une formation et un test.
        </p>
        <p>
          Le vendeur perçoit des commissions sur les commerces qui lui sont attribués (via son code personnel),
          versées par paliers selon le nombre de mois effectivement payés par le commerce (1er, 3ᵉ et 6ᵉ mois),
          suivant le barème affiché dans son espace. Un palier n&apos;est dû que si le commerce l&apos;a atteint.
        </p>
        <p>
          Le vendeur agit en toute indépendance, sans lien de subordination avec l&apos;éditeur. Il est seul
          responsable de la déclaration de ses revenus et de ses obligations fiscales et sociales. Il s&apos;engage à
          présenter le service de façon loyale, sans promesse de résultat. ScanAvis peut suspendre l&apos;accès
          d&apos;un vendeur en cas de manquement ; les commissions déjà acquises restent dues.
        </p>
      </LegalSection>

      <LegalSection title="11. Obligations de l'utilisateur">
        <p>En utilisant ScanAvis, vous vous engagez à :</p>
        <LegalList>
          <li>fournir des informations exactes et les tenir à jour ;</li>
          <li>ne pas utiliser le service à des fins frauduleuses ou illicites ;</li>
          <li>ne pas tenter de compromettre la sécurité ou le fonctionnement du service ;</li>
          <li>respecter les conditions d&apos;utilisation de Google ;</li>
          <li>informer vos clients de la collecte de leurs données, conformément au RGPD.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="12. Disponibilité et responsabilité">
        <p>
          ScanAvis s&apos;efforce d&apos;assurer un service disponible 24h/24 et 7j/7, sans pouvoir garantir une
          disponibilité continue. Des interruptions pour maintenance peuvent intervenir ; en cas d&apos;interruption
          prolongée non programmée, les utilisateurs en sont informés dans les meilleurs délais.
        </p>
        <p>
          ScanAvis est soumis à une obligation de moyens. Le nombre d&apos;avis obtenus et l&apos;évolution de la
          note Google dépendent des clients du commerce : aucun résultat n&apos;est garanti. ScanAvis n&apos;est pas
          responsable des décisions de Google (modération ou suppression d&apos;avis, modification de ses règles).
          Sa responsabilité est en tout état de cause limitée aux sommes versées par le commerçant au cours des
          douze derniers mois.
        </p>
      </LegalSection>

      <LegalSection title="13. Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{" "}
          <Link href="/confidentialite" className="text-gold hover:underline">politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection title="14. Propriété intellectuelle et modification des CGU">
        <p>
          La marque ScanAvis, le logiciel, les contenus et le design du service restent la propriété de
          l&apos;éditeur. Le commerçant conserve tous les droits sur ses propres contenus (nom, logo, textes) et
          autorise ScanAvis à les afficher pour les besoins du service.
        </p>
        <p>
          Les présentes CGU peuvent évoluer. En cas de modification substantielle, vous en êtes informé par email au
          moins 30 jours à l&apos;avance ; à défaut de résiliation avant cette date, les nouvelles conditions
          s&apos;appliquent.
        </p>
      </LegalSection>

      <LegalSection title="15. Éditeur">
        <LegalList>
          <li><strong>Nom :</strong> Louis Borrelli, micro-entrepreneur</li>
          <li><strong>SIRET :</strong> en cours d&apos;immatriculation</li>
          <li><strong>Email :</strong> <MailLink /></li>
        </LegalList>
        <p>
          Les coordonnées complètes figurent dans les{" "}
          <Link href="/mentions-legales" className="text-gold hover:underline">mentions légales</Link>.
        </p>
      </LegalSection>

      <LegalSection title="16. Droit applicable et litiges">
        <p>
          Les présentes CGU sont soumises au droit français. En cas de différend, les parties recherchent d&apos;abord
          une solution amiable en écrivant à <MailLink />. À défaut, le litige est porté devant les tribunaux
          compétents du ressort du domicile de l&apos;éditeur.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
