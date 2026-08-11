-- =========================================================================
-- Migration : chaque commerce devient son propre parrain (self-referral)
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Lie une ligne `referrers` à un commerce via `business_id` (UNIQUE) :
--      un commerce n'a qu'une seule ligne referrers, et une ligne referrers
--      pointe au plus vers un commerce. ON DELETE CASCADE : si le commerce
--      disparaît, sa ligne de parrainage auto disparaît avec lui.
--   2. Génère un code court unique (6 caractères, alphabet sans ambiguïté)
--      via une fonction SQL réutilisable, avec retry en cas de collision.
--   3. Backfill : crée la ligne referrers manquante pour chaque commerce
--      existant.
--   4. RLS : un commerçant peut LIRE (SELECT) uniquement SA propre ligne
--      referrers (celle de son commerce). Les écritures restent service role
--      only (policies inchangées de la migration 0002).
--
-- Le système de capture ?ref=CODE (cookie -> /api/referral/attach) n'est pas
-- touché : ces nouveaux codes s'y branchent tels quels (même colonne `code`).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Colonne referrers.business_id + contrainte d'unicité
--    Les parrains "manuels" existants gardent business_id = NULL (autorisé :
--    un index UNIQUE Postgres tolère plusieurs NULL).
-- -------------------------------------------------------------------------
alter table public.referrers
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

create unique index if not exists referrers_business_id_key
  on public.referrers (business_id);

-- -------------------------------------------------------------------------
-- 2. Génération d'un code court unique
--    Alphabet volontairement sans caractères ambigus : pas de 0/O, 1/I/L.
--    -> ABCDEFGHJKMNPQRSTUVWXYZ (23 lettres) + 23456789 (8 chiffres) = 31.
--    6 caractères => 31^6 ≈ 887 millions de combinaisons.
-- -------------------------------------------------------------------------
create or replace function public.generate_referrer_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code   text;
  i        int;
  attempts int := 0;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    -- Unicité : on ressort dès qu'aucun parrain n'utilise déjà ce code.
    exit when not exists (select 1 from public.referrers r where r.code = v_code);

    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'Impossible de générer un code de parrainage unique (50 tentatives)';
    end if;
  end loop;

  return v_code;
end;
$$;

-- -------------------------------------------------------------------------
-- 3. Création idempotente de la ligne referrers d'un commerce
--    Réutilisée par le backfill ci-dessous ET par la route serveur
--    /api/referral/self (service role) à l'onboarding.
--    Idempotent : si la ligne existe déjà, renvoie simplement son id.
-- -------------------------------------------------------------------------
create or replace function public.create_business_referrer(p_business_id uuid)
returns uuid
language plpgsql
volatile
as $$
declare
  v_id   uuid;
  v_name text;
begin
  -- Déjà parrain ? on renvoie l'existant (aucune écriture).
  select id into v_id from public.referrers where business_id = p_business_id;
  if v_id is not null then
    return v_id;
  end if;

  select name into v_name from public.businesses where id = p_business_id;
  if not found then
    return null; -- commerce inexistant : rien à faire
  end if;

  insert into public.referrers (name, code, business_id)
  values (
    coalesce(nullif(btrim(v_name), ''), 'Commerce'),
    public.generate_referrer_code(),
    p_business_id
  )
  on conflict (business_id) do nothing
  returning id into v_id;

  -- Course concurrente : une insertion parallèle a pu gagner -> on relit.
  if v_id is null then
    select id into v_id from public.referrers where business_id = p_business_id;
  end if;

  return v_id;
end;
$$;

-- La génération et la création ne doivent PAS être appelables par le client :
-- réservées au service role (la route serveur) et au rôle postgres du dashboard.
revoke all on function public.generate_referrer_code() from public;
revoke all on function public.create_business_referrer(uuid) from public;
grant execute on function public.create_business_referrer(uuid) to service_role;

-- -------------------------------------------------------------------------
-- 4. Backfill : chaque commerce existant sans ligne referrers en obtient une.
--    On boucle (une insertion par commerce) pour que chaque code généré voie
--    les codes déjà insérés dans cette même transaction — pas de collision.
-- -------------------------------------------------------------------------
do $$
declare
  b record;
begin
  for b in
    select bs.id
    from public.businesses bs
    where not exists (
      select 1 from public.referrers r where r.business_id = bs.id
    )
  loop
    perform public.create_business_referrer(b.id);
  end loop;
end $$;

-- -------------------------------------------------------------------------
-- 5. RLS : lecture de SA propre ligne referrers par le commerçant
--    RLS filtre les LIGNES ; le grant colonne limite les COLONNES visibles.
--    Le commerçant ne voit que (id, name, code, business_id) de SON commerce :
--    ni contact, ni commission_paid_until (données internes admin).
--    Les écritures (INSERT/UPDATE/DELETE) restent refusées : aucune policy
--    d'écriture pour authenticated => seul le service role écrit.
-- -------------------------------------------------------------------------
grant select (id, name, code, business_id) on public.referrers to authenticated;

drop policy if exists referrers_select_own on public.referrers;
create policy referrers_select_own on public.referrers
  for select
  to authenticated
  using (
    business_id is not null
    and exists (
      select 1
      from public.businesses b
      where b.id = referrers.business_id
        and b.user_id = auth.uid()
    )
  );
