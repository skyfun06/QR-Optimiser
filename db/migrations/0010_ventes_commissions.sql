-- =========================================================================
-- Migration : ventes vendeur + commissions (couche LECTURE du dashboard)
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Ajoute `vendeurs.code` : code personnel unique du vendeur (réutilise le
--      générateur du parrainage, étendu pour rester unique aussi vis-à-vis des
--      codes referrers existants). Rempli pour tous les vendeurs, auto sur les
--      nouveaux (default).
--   2. Crée `ventes` : une vente = un commerce attribué à un vendeur (formule,
--      dates, statut du commerce). `business_nom` est un instantané du nom du
--      commerce au moment de la signature — nécessaire pour que le vendeur
--      affiche le nom SANS avoir le droit de lire la table `businesses`
--      (isolation RLS). Un commerce = au plus une vente (unique business_id).
--   3. Crée `commissions` : deux parts par vente (1 = premier versement,
--      2 = second versement), montant figé, statut du versement.
--   4. RLS stricte : un vendeur ne LIT QUE ses propres ventes et les
--      commissions de ses propres ventes. Aucune écriture client (le côté
--      écriture — webhook Stripe, création de vente à l'inscription — se fera
--      exclusivement en service role dans un commit ultérieur). Aucune fuite
--      possible vers les données d'un autre vendeur ni vers les commerces.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Générateur de code vendeur (réutilise la logique du parrainage).
--    Unicité vérifiée à la fois contre `vendeurs` ET `referrers`, pour qu'un
--    code vendeur ne puisse jamais entrer en collision avec un code existant.
-- -------------------------------------------------------------------------
create or replace function public.generate_vendeur_code()
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

    exit when not exists (select 1 from public.vendeurs v where v.code = v_code)
         and  not exists (select 1 from public.referrers r where r.code = v_code);

    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'Impossible de générer un code vendeur unique (50 tentatives)';
    end if;
  end loop;

  return v_code;
end;
$$;

revoke all on function public.generate_vendeur_code() from public;
grant execute on function public.generate_vendeur_code() to service_role;

-- -------------------------------------------------------------------------
-- 2. Colonne vendeurs.code
--    On ajoute d'abord la colonne nullable, puis on remplit en boucle (chaque
--    code assigné devient visible pour la vérification d'unicité du suivant),
--    enfin on pose l'unicité + le default + NOT NULL.
-- -------------------------------------------------------------------------
alter table public.vendeurs add column if not exists code text;

do $$
declare
  v record;
begin
  for v in select id from public.vendeurs where code is null loop
    update public.vendeurs set code = public.generate_vendeur_code() where id = v.id;
  end loop;
end $$;

create unique index if not exists vendeurs_code_key on public.vendeurs (code);

alter table public.vendeurs alter column code set default public.generate_vendeur_code();
alter table public.vendeurs alter column code set not null;

-- Le vendeur peut lire sa propre colonne code (RLS filtre déjà les LIGNES via
-- vendeurs_select_own).
grant select (code) on public.vendeurs to authenticated;

-- Le `code` est attribué par le système : on interdit sa modification depuis le
-- client (le grant UPDATE de 0009 porte sur toutes les colonnes). On étend le
-- garde-fou existant — même philosophie que statut/user_id — pour éviter tout
-- squat de code ou attribution cassée.
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
    if NEW.code is distinct from OLD.code then
      raise exception 'Modification du code vendeur interdite depuis le client';
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;

-- -------------------------------------------------------------------------
-- 3. Table ventes
-- -------------------------------------------------------------------------
create table if not exists public.ventes (
  id                    uuid primary key default gen_random_uuid(),
  vendeur_id            uuid not null references public.vendeurs(id) on delete cascade,
  business_id           uuid not null references public.businesses(id) on delete cascade,
  business_nom          text,                       -- instantané du nom à la signature
  formule               text not null,
  date_signature        timestamptz not null default now(),
  date_premier_paiement timestamptz,                -- null tant que pas de 1er paiement réel
  statut_commerce       text not null default 'essai',
  created_at            timestamptz not null default now(),
  unique (business_id)
);

alter table public.ventes drop constraint if exists ventes_formule_check;
alter table public.ventes add constraint ventes_formule_check
  check (formule in ('qr', 'qr_nfc'));

alter table public.ventes drop constraint if exists ventes_statut_commerce_check;
alter table public.ventes add constraint ventes_statut_commerce_check
  check (statut_commerce in ('essai', 'abonne', 'resilie'));

create index if not exists ventes_vendeur_id_idx on public.ventes (vendeur_id);

-- -------------------------------------------------------------------------
-- 4. Table commissions (deux parts par vente)
-- -------------------------------------------------------------------------
create table if not exists public.commissions (
  id                   uuid primary key default gen_random_uuid(),
  vente_id             uuid not null references public.ventes(id) on delete cascade,
  montant              numeric(10,2) not null,
  part                 smallint not null,
  statut               text not null default 'en_attente',
  date_passage_a_payer timestamptz,
  date_paiement        timestamptz,
  created_at           timestamptz not null default now(),
  unique (vente_id, part)
);

alter table public.commissions drop constraint if exists commissions_part_check;
alter table public.commissions add constraint commissions_part_check
  check (part in (1, 2));

alter table public.commissions drop constraint if exists commissions_statut_check;
alter table public.commissions add constraint commissions_statut_check
  check (statut in ('en_attente', 'a_payer', 'payee'));

create index if not exists commissions_vente_id_idx on public.commissions (vente_id);

-- -------------------------------------------------------------------------
-- 5. RLS : lecture réservée au vendeur propriétaire. Aucune écriture client.
--    (Les écritures se font en service role, qui bypass RLS.)
-- -------------------------------------------------------------------------
alter table public.ventes enable row level security;
alter table public.commissions enable row level security;

revoke all on public.ventes from anon, authenticated;
revoke all on public.commissions from anon, authenticated;
grant select on public.ventes to authenticated;
grant select on public.commissions to authenticated;
grant all on public.ventes to service_role;
grant all on public.commissions to service_role;

-- Une vente n'est visible que par le vendeur qui l'a signée. Le sous-select
-- ne peut cibler que SA propre ligne vendeurs (v.user_id = auth.uid()), donc
-- aucune ligne d'un autre vendeur ne peut être atteinte.
drop policy if exists "ventes_select_own" on public.ventes;
create policy "ventes_select_own"
  on public.ventes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vendeurs v
      where v.id = ventes.vendeur_id
        and v.user_id = auth.uid()
    )
  );

-- Une commission n'est visible que via une vente appartenant au vendeur.
drop policy if exists "commissions_select_own" on public.commissions;
create policy "commissions_select_own"
  on public.commissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.ventes vt
      join public.vendeurs v on v.id = vt.vendeur_id
      where vt.id = commissions.vente_id
        and v.user_id = auth.uid()
    )
  );
