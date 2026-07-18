-- =========================================================================
-- Migration : essai gratuit 30 jours + contrôle d'accès par commerce
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Ajoute la colonne `trial_ends_at`.
--   2. Fait de `subscription_status` le vrai "état d'accès" du commerce, avec
--      un vocabulaire unique : 'trial' | 'active' | 'expired' | 'suspended'.
--   3. Migre les comptes existants (grandfathering) : ils passent 'active' à
--      vie, sans date de fin. L'essai de 30 jours ne concerne QUE les nouvelles
--      inscriptions.
--   4. Verrouille la faille RLS : un commerçant ne peut PLUS modifier son
--      statut ni sa date de fin d'essai. Ces colonnes ne sont écrites que par
--      le serveur (service role) ou l'admin SQL.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Colonne trial_ends_at
-- -------------------------------------------------------------------------
alter table public.businesses
  add column if not exists trial_ends_at timestamptz;

-- -------------------------------------------------------------------------
-- 2. Normalisation des statuts existants (AVANT d'ajouter la contrainte)
--    Ancien vocabulaire Stripe -> nouveau vocabulaire "accès".
--    Décision produit : comptes existants = actifs à vie (pas d'essai).
-- -------------------------------------------------------------------------
update public.businesses
  set subscription_status = 'active'
  where subscription_status is null
     or subscription_status in ('free', 'active', 'canceling', 'paid', 'pro');

update public.businesses
  set subscription_status = 'expired'
  where subscription_status = 'canceled';

-- Filet de sécurité : toute valeur inconnue restante -> 'active' (on ne coupe
-- jamais l'accès d'un client existant par accident lors de la migration).
update public.businesses
  set subscription_status = 'active'
  where subscription_status not in ('trial', 'active', 'expired', 'suspended');

-- -------------------------------------------------------------------------
-- 3. Valeur par défaut + contrainte de domaine sur les 4 statuts autorisés
-- -------------------------------------------------------------------------
alter table public.businesses
  alter column subscription_status set default 'trial';

alter table public.businesses
  drop constraint if exists businesses_subscription_status_check;

alter table public.businesses
  add constraint businesses_subscription_status_check
  check (subscription_status in ('trial', 'active', 'expired', 'suspended'));

-- -------------------------------------------------------------------------
-- 4. Garde-fou anti-triche (le cœur de la sécurité)
--
--    La policy RLS `businesses_update_own` laisse le commerçant modifier SA
--    ligne — indispensable pour éditer le nom / le lien Google — mais elle ne
--    filtre pas par colonne. Sans ce trigger, il pourrait donc se passer lui
--    même en 'active' ou repousser sa date de fin d'essai depuis le navigateur.
--
--    Ce trigger (SECURITY INVOKER = il voit le vrai rôle appelant) :
--      • laisse tout passer pour les rôles serveur de confiance ;
--      • à l'INSERT depuis le client : FORCE 'trial' + 30 jours (le client ne
--        choisit jamais son statut ni sa date) ;
--      • à l'UPDATE depuis le client : REFUSE toute modif de subscription_status
--        et de trial_ends_at.
-- -------------------------------------------------------------------------
create or replace function public.enforce_business_billing_guard()
returns trigger
language plpgsql
as $$
begin
  -- Rôles serveur de confiance (clé service role via PostgREST, admin SQL).
  -- SECURITY INVOKER => current_user reflète bien le rôle réel de l'appel.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    -- Le commerçant ne choisit jamais son statut : essai de 30 jours imposé.
    NEW.subscription_status := 'trial';
    NEW.trial_ends_at := now() + interval '30 days';
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.subscription_status is distinct from OLD.subscription_status then
      raise exception 'Modification de subscription_status interdite depuis le client';
    end if;
    if NEW.trial_ends_at is distinct from OLD.trial_ends_at then
      raise exception 'Modification de trial_ends_at interdite depuis le client';
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_business_billing_guard on public.businesses;
create trigger trg_business_billing_guard
  before insert or update on public.businesses
  for each row execute function public.enforce_business_billing_guard();

-- -------------------------------------------------------------------------
-- 5. IMPORTANT — ne PAS exposer trial_ends_at / subscription_status à anon.
--    La page publique scannée lit le commerce côté serveur (service role),
--    jamais via la clé anon. Le grant colonne anon reste limité à
--    (id, name, google_review_url) — on le réaffirme ici par sécurité.
-- -------------------------------------------------------------------------
revoke all on public.businesses from anon;
grant select (id, name, google_review_url) on public.businesses to anon;
