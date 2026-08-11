-- =========================================================================
-- Migration : suivi des paiements de commission de parrainage
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Ajoute la colonne `commission_paid_until` (date, nullable) sur la table
--      `referrers`. C'est la date jusqu'à laquelle la commission du parrain a
--      été réglée manuellement (aucune automatisation Stripe).
--      NULL = aucune commission encore versée.
--
-- Aucune policy à ajouter : `referrers` est déjà verrouillée sous RLS
-- (migration 0002). Seuls le service role et le rôle postgres du dashboard
-- Supabase y accèdent — le suivi reste donc invisible pour les commerçants.
-- =========================================================================

alter table public.referrers
  add column if not exists commission_paid_until date;
