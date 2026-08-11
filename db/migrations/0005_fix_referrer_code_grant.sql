-- =========================================================================
-- Migration : correctif droit d'exécution manquant sur generate_referrer_code
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant (grant execute est idempotent).
--
-- Contexte du bug :
--   La migration 0004 a fait `revoke all on function generate_referrer_code()
--   from public` (pour empêcher le client de l'appeler), mais a oublié de la
--   ré-accorder à `service_role`. Or `create_business_referrer` est SECURITY
--   INVOKER : quand la route serveur (/api/referral/self) l'appelle, elle
--   s'exécute EN TANT QUE service_role, puis appelle generate_referrer_code()
--   en interne -> "permission denied for function generate_referrer_code"
--   (SQLSTATE 42501). L'erreur était silencieusement avalée => aucune ligne
--   referrers créée à l'onboarding, alors que l'appel manuel (rôle postgres,
--   superuser) fonctionnait.
--
-- Correctif : accorder l'EXECUTE à service_role.
--
-- Vérification des autres fonctions du système de parrainage :
--   - create_business_referrer(uuid) : déjà `grant execute ... to service_role`
--     en 0004 -> OK, on le ré-affirme ici par sécurité (idempotent).
--   - generate_referrer_code()       : grant manquant -> corrigé ci-dessous.
--   - enforce_business_billing_guard() : fonction de TRIGGER, jamais appelée
--     via RPC/PostgREST -> aucun grant d'exécution requis.
-- =========================================================================

grant execute on function public.generate_referrer_code() to service_role;
grant execute on function public.create_business_referrer(uuid) to service_role;
