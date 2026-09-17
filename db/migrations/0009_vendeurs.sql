-- =========================================================================
-- Migration : espace vendeur (réseau d'apporteurs d'affaires)
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Crée la table `vendeurs` : 1 ligne par utilisateur Supabase candidat/vendeur.
--      Statut de cycle de vie : en_attente | formation | actif | suspendu.
--   2. RLS : un vendeur ne LIT et ne MODIFIE QUE sa propre ligne. Aucun accès
--      aux autres vendeurs ni aux commerces (aucune policy croisée).
--   3. Garde-fou anti-triche : le vendeur ne peut jamais changer lui-même son
--      `statut` ni son `user_id` depuis le navigateur (même philosophie que
--      enforce_business_billing_guard). Seul le service role / l'admin le fait.
--   4. Création de la ligne à l'inscription via un trigger sur auth.users :
--      quand un compte est créé avec raw_user_meta_data->>'espace' = 'vendeur',
--      on insère la ligne `vendeurs` (statut forcé 'en_attente') à partir des
--      métadonnées du formulaire. L'âge est vérifié : moins de 18 ans refusé.
--
-- Rien d'autre n'est touché (aucun lien avec businesses / referrers / Stripe).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Table vendeurs
-- -------------------------------------------------------------------------
create table if not exists public.vendeurs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users(id) on delete cascade,
  nom              text,
  prenom           text,
  email            text,
  telephone        text,
  ville            text,
  code_postal      text,
  date_naissance   date not null,
  statut           text not null default 'en_attente',
  date_inscription timestamptz not null default now()
);

alter table public.vendeurs
  drop constraint if exists vendeurs_statut_check;
alter table public.vendeurs
  add constraint vendeurs_statut_check
  check (statut in ('en_attente', 'formation', 'actif', 'suspendu'));

-- -------------------------------------------------------------------------
-- 2. RLS : lecture + écriture de SA SEULE ligne (par user_id = auth.uid()).
--    Aucune policy d'insert/delete côté client : la ligne naît via le trigger
--    d'inscription (service role / definer). Aucun accès aux autres vendeurs.
-- -------------------------------------------------------------------------
alter table public.vendeurs enable row level security;

revoke all on public.vendeurs from anon, authenticated;
grant select, update on public.vendeurs to authenticated;
grant all on public.vendeurs to service_role;

drop policy if exists "vendeurs_select_own" on public.vendeurs;
create policy "vendeurs_select_own"
  on public.vendeurs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "vendeurs_update_own" on public.vendeurs;
create policy "vendeurs_update_own"
  on public.vendeurs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 3. Garde-fou anti-triche : le vendeur ne choisit jamais son statut.
--    SECURITY INVOKER => current_user reflète le rôle réel appelant.
--      • à l'INSERT client : FORCE 'en_attente' ;
--      • à l'UPDATE client : REFUSE toute modif de statut et de user_id.
--    Les rôles serveur de confiance (service role, admin SQL) sont exemptés.
-- -------------------------------------------------------------------------
create or replace function public.enforce_vendeur_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    NEW.statut := 'en_attente';
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.statut is distinct from OLD.statut then
      raise exception 'Modification du statut vendeur interdite depuis le client';
    end if;
    if NEW.user_id is distinct from OLD.user_id then
      raise exception 'Modification du user_id vendeur interdite depuis le client';
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_vendeur_guard on public.vendeurs;
create trigger trg_vendeur_guard
  before insert or update on public.vendeurs
  for each row execute function public.enforce_vendeur_guard();

-- -------------------------------------------------------------------------
-- 4. Création de la ligne vendeur à l'inscription (trigger sur auth.users).
--    SECURITY DEFINER (propriétaire postgres, BYPASSRLS) : peut écrire dans
--    public.vendeurs sans policy d'insert côté client.
--
--    Ne se déclenche QUE pour les comptes marqués vendeur
--    (raw_user_meta_data->>'espace' = 'vendeur') : les inscriptions commerçant
--    ne sont pas concernées. Refuse les moins de 18 ans (date de naissance
--    issue du formulaire). Idempotent : ON CONFLICT (user_id) DO NOTHING.
-- -------------------------------------------------------------------------
create or replace function public.handle_new_vendeur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dob date;
begin
  if coalesce(NEW.raw_user_meta_data->>'espace', '') <> 'vendeur' then
    return NEW;
  end if;

  v_dob := (NEW.raw_user_meta_data->>'date_naissance')::date;
  if v_dob is null or v_dob > (current_date - interval '18 years')::date then
    raise exception 'Inscription vendeur refusée : vous devez avoir au moins 18 ans.';
  end if;

  insert into public.vendeurs (
    user_id, nom, prenom, email, telephone, ville, code_postal, date_naissance, statut
  )
  values (
    NEW.id,
    NEW.raw_user_meta_data->>'nom',
    NEW.raw_user_meta_data->>'prenom',
    coalesce(NEW.raw_user_meta_data->>'email', NEW.email),
    NEW.raw_user_meta_data->>'telephone',
    NEW.raw_user_meta_data->>'ville',
    NEW.raw_user_meta_data->>'code_postal',
    v_dob,
    'en_attente'
  )
  on conflict (user_id) do nothing;

  return NEW;
end;
$$;

drop trigger if exists trg_handle_new_vendeur on auth.users;
create trigger trg_handle_new_vendeur
  after insert on auth.users
  for each row execute function public.handle_new_vendeur();
