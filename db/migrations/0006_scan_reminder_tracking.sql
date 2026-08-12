-- =========================================================================
-- Migration : suivi des rappels "aucun scan récent"
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Ajoute `last_scan_reminder_sent_at` (timestamptz, nullable) sur
--      `businesses` : date du dernier email de rappel d'inactivité envoyé au
--      propriétaire du commerce. NULL = aucun rappel encore envoyé.
--
-- Écriture réservée au service role : seule la route cron
-- /api/cron/scan-reminders (clé service role, BYPASSRLS) met ce champ à jour.
-- Aucune policy RLS d'écriture côté client n'est nécessaire — même pattern que
-- `commission_paid_until` (migration 0003). Le champ n'est ni lu ni écrit
-- depuis le navigateur.
-- =========================================================================

alter table public.businesses
  add column if not exists last_scan_reminder_sent_at timestamptz;
