-- =========================================================================
-- Migration : système de parrainage (referrers) minimal
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Crée la table `referrers` (les parrains, ajoutés à la main pour l'instant
--      depuis le dashboard Supabase).
--   2. Ajoute la colonne `referrer_id` sur `businesses` (qui a parrainé ce
--      commerce), nullable.
--   3. Verrouille l'accès : `referrers` n'est lisible/modifiable que par le
--      service role (le dashboard Supabase = rôle postgres, non bloqué).
--   4. Étend le trigger anti-triche existant pour que le commerçant ne puisse
--      JAMAIS s'attribuer ou changer son parrain depuis le navigateur.
--      Le referrer_id est résolu côté serveur (service role) après création,
--      exactement comme trial_ends_at.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Table referrers
-- -------------------------------------------------------------------------
create table if not exists public.referrers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  contact     text,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 2. Colonne businesses.referrer_id
--    ON DELETE SET NULL : supprimer un parrain ne doit jamais toucher les
--    commerces (surtout pas les supprimer) — on détache simplement le lien.
-- -------------------------------------------------------------------------
alter table public.businesses
  add column if not exists referrer_id uuid references public.referrers(id) on delete set null;

-- -------------------------------------------------------------------------
-- 3. Verrouillage RLS de referrers
--    Aucune policy => tout est refusé pour anon / authenticated (deny par
--    défaut sous RLS). Le service role (BYPASSRLS) et le rôle postgres du
--    dashboard Supabase gardent l'accès complet : l'ajout manuel de parrains
--    depuis le dashboard reste donc possible.
-- -------------------------------------------------------------------------
alter table public.referrers enable row level security;

revoke all on public.referrers from anon, authenticated;
grant all on public.referrers to service_role;

-- Rappel de sécurité : referrer_id ne doit pas être exposé à anon sur
-- businesses. Le grant colonne anon reste limité à (id, name,
-- google_review_url) — on le réaffirme ici.
revoke all on public.businesses from anon;
grant select (id, name, google_review_url) on public.businesses to anon;

-- -------------------------------------------------------------------------
-- 4. Garde-fou anti-triche : on étend la fonction existante (cf. migration
--    0001) pour couvrir referrer_id, en gardant strictement le comportement
--    déjà en place sur subscription_status / trial_ends_at.
--
--      • à l'INSERT depuis le client : FORCE referrer_id à NULL (le commerçant
--        ne s'attribue jamais un parrain lui-même ; c'est la route serveur en
--        service role qui l'écrira après création) ;
--      • à l'UPDATE depuis le client : REFUSE toute modification de referrer_id.
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

-- Le trigger existe déjà (migration 0001) et pointe sur cette fonction par son
-- nom : le CREATE OR REPLACE ci-dessus suffit. On le (re)crée malgré tout de
-- façon idempotente pour que cette migration reste autoportante.
drop trigger if exists trg_business_billing_guard on public.businesses;
create trigger trg_business_billing_guard
  before insert or update on public.businesses
  for each row execute function public.enforce_business_billing_guard();
