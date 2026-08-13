-- =========================================================================
-- Migration : carte bancaire obligatoire (sans facturation) avant 1er commerce
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Crée `user_billing` : 1 ligne par utilisateur ayant enregistré une carte
--      valide (capture Stripe SetupIntent, AUCUN prélèvement). Verrouillée en
--      service role uniquement (même pattern que `referrers`).
--   2. Backfill : chaque utilisateur possédant déjà ≥1 commerce est considéré
--      comme "carte vérifiée" (card_verified_at = now()), pour ne jamais bloquer
--      rétroactivement un commerçant existant qui ajoute un établissement.
--   3. Étend `enforce_business_billing_guard` : à l'INSERT client d'un commerce,
--      rejette si aucune ligne user_billing n'existe pour NEW.user_id.
--
-- Le flow d'abonnement payant (checkout/activate/webhook) n'est PAS concerné :
-- il reste totalement séparé. Ici on ne fait QUE capturer un moyen de paiement.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Table user_billing (statut "carte vérifiée" par utilisateur)
-- -------------------------------------------------------------------------
create table if not exists public.user_billing (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id      text,
  stripe_setup_intent_id  text,
  card_verified_at        timestamptz not null default now()
);

-- Verrou RLS : aucun accès anon/authenticated ; service role uniquement.
alter table public.user_billing enable row level security;
revoke all on public.user_billing from anon, authenticated;
grant all on public.user_billing to service_role;

-- -------------------------------------------------------------------------
-- 2. Backfill : les comptes ayant déjà un commerce sont réputés vérifiés.
--    ON CONFLICT DO NOTHING → rejouable sans doublon.
-- -------------------------------------------------------------------------
insert into public.user_billing (user_id)
select distinct b.user_id
from public.businesses b
where b.user_id is not null
on conflict (user_id) do nothing;

-- -------------------------------------------------------------------------
-- 3. Helper d'existence en SECURITY DEFINER.
--    Pourquoi : le trigger enforce_business_billing_guard est SECURITY INVOKER
--    (il lit current_user pour exempter le service role). S'il lisait
--    directement user_billing, la RLS (service_role only) renverrait 0 ligne
--    côté 'authenticated' → tout insert client serait rejeté, même avec carte.
--    Ce helper DEFINER (propriétaire postgres, BYPASSRLS) lit l'état sans
--    exposer la table, et ne renvoie qu'un booléen.
-- -------------------------------------------------------------------------
create or replace function public.user_has_verified_card(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.user_billing ub where ub.user_id = p_user_id);
$$;

revoke all on function public.user_has_verified_card(uuid) from public;
grant execute on function public.user_has_verified_card(uuid) to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 4. Extension du garde-fou anti-triche (CREATE OR REPLACE, comme en 0004).
--    On conserve strictement le comportement existant (trial/30j + referrer
--    forcés à l'insert, updates verrouillés) et on AJOUTE, dans la branche
--    INSERT, l'exigence d'une carte vérifiée. Le service role reste exempté par
--    le early-return en tête de fonction.
-- -------------------------------------------------------------------------
create or replace function public.enforce_business_billing_guard()
returns trigger
language plpgsql
as $$
begin
  -- Rôles serveur de confiance (clé service role via PostgREST, admin SQL).
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    -- Le commerçant ne choisit jamais son statut : essai de 30 jours imposé.
    NEW.subscription_status := 'trial';
    NEW.trial_ends_at := now() + interval '30 days';
    -- Ni son parrain : résolu côté serveur après création.
    NEW.referrer_id := null;
    -- Carte bancaire obligatoire avant tout 1er commerce (capturée via Stripe
    -- SetupIntent, sans prélèvement). Une fois vérifiée, l'utilisateur peut
    -- créer autant de commerces qu'il veut (la ligne user_billing persiste).
    if not public.user_has_verified_card(NEW.user_id) then
      raise exception 'Une carte bancaire valide doit être enregistrée avant de créer un commerce.';
    end if;
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.subscription_status is distinct from OLD.subscription_status then
      raise exception 'Modification de subscription_status interdite depuis le client';
    end if;
    if NEW.trial_ends_at is distinct from OLD.trial_ends_at then
      raise exception 'Modification de trial_ends_at interdite depuis le client';
    end if;
    if NEW.referrer_id is distinct from OLD.referrer_id then
      raise exception 'Modification de referrer_id interdite depuis le client';
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;

-- Le trigger pointe déjà sur cette fonction par son nom : le CREATE OR REPLACE
-- ci-dessus suffit. On le (re)crée idempotemment pour que la migration reste
-- autoportante.
drop trigger if exists trg_business_billing_guard on public.businesses;
create trigger trg_business_billing_guard
  before insert or update on public.businesses
  for each row execute function public.enforce_business_billing_guard();
