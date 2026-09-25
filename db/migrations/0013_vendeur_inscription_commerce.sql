-- =========================================================================
-- Migration : inscription d'un commerce par le vendeur (sur place)
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. `ventes.statut_commerce` : ajoute la valeur 'en_attente_paiement'.
--      Un commerce inscrit par un vendeur reste dans cet état tant que le
--      patron n'a pas réglé son premier paiement Stripe. Il bascule alors sur
--      'abonne' (via le webhook), ce qui déclenche la commission du vendeur.
--   2. `businesses.subscription_status` : ajoute la valeur 'pending_payment'.
--      Le commerce est créé (service role) SANS accès tant que le patron n'a
--      pas payé — hasAccess() ne rend true que pour 'trial'/'active'. Le patron
--      finalise via le parcours de paiement commerçant EXISTANT (/subscription
--      → checkout → webhook), qui passe alors le commerce en 'active'.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. ventes.statut_commerce : nouvel état d'attente de paiement
-- -------------------------------------------------------------------------
alter table public.ventes drop constraint if exists ventes_statut_commerce_check;
alter table public.ventes add constraint ventes_statut_commerce_check
  check (statut_commerce in ('en_attente_paiement', 'essai', 'abonne', 'resilie'));

-- -------------------------------------------------------------------------
-- 2. businesses.subscription_status : état "en attente de premier paiement"
--    (pas d'accès tant que non payé — voir lib/access.ts).
-- -------------------------------------------------------------------------
alter table public.businesses drop constraint if exists businesses_subscription_status_check;
alter table public.businesses add constraint businesses_subscription_status_check
  check (subscription_status in ('trial', 'active', 'expired', 'suspended', 'pending_payment'));
