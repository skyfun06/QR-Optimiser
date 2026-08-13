-- =========================================================================
-- Migration : durcissement du webhook Stripe
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Table `stripe_webhook_events` : journal des event.id déjà traités, pour
--      rendre le webhook idempotent (Stripe peut livrer le même event 2×).
--      Service role uniquement (même verrou que user_billing / referrers).
--   2. Deux colonnes informatives sur `businesses` :
--        • stripe_subscription_status : statut Stripe BRUT (trialing/active/
--          past_due/canceled/unpaid…). PUREMENT informatif — ne contrôle
--          JAMAIS l'accès (l'accès reste piloté par `subscription_status`).
--        • last_payment_failed_at : date du dernier échec de paiement Stripe.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Journal d'idempotence des événements webhook
-- -------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  event_id     text primary key,
  type         text,
  received_at  timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;
grant all on public.stripe_webhook_events to service_role;

-- -------------------------------------------------------------------------
-- 2. Colonnes informatives sur businesses (jamais liées au contrôle d'accès)
-- -------------------------------------------------------------------------
alter table public.businesses
  add column if not exists stripe_subscription_status text;

alter table public.businesses
  add column if not exists last_payment_failed_at timestamptz;
