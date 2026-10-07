-- =========================================================================
-- Migration : programme de fidélité (tampons)
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- RÈGLE MÉTIER : le tampon récompense la VISITE, jamais l'avis. Cette feature
-- est totalement indépendante des tables reviews / feedback.
--
--   1. loyalty_programs    : 1 programme par commerce (activé / en pause).
--   2. loyalty_rewards      : les paliers (nb de passages → récompense).
--   3. loyalty_cards        : 1 carte par (appareil, commerce).
--   4. loyalty_stamps       : historique des passages. Contrainte UNIQUE
--      (card_id, stamped_on) → impossible d'avoir 2 tampons le même jour,
--      même en cas de double scan simultané. La date est calculée côté
--      serveur en fuseau Europe/Paris.
--   5. loyalty_redemptions  : récompenses obtenues (date d'obtention +
--      date de validation, vide tant que le client n'a pas confirmé).
--
-- SÉCURITÉ :
--   • Le commerçant (authenticated) lit/écrit SON programme et SES paliers
--     via RLS ; il lit (SELECT only) ses cartes / tampons / récompenses.
--   • Côté client final : aucune écriture directe depuis le navigateur. Tout
--     passe par le serveur (service role, qui bypass RLS).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. loyalty_programs — 1 par commerce
-- -------------------------------------------------------------------------
create table if not exists public.loyalty_programs (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id)
);

-- -------------------------------------------------------------------------
-- 2. loyalty_rewards — paliers, triés par nombre de passages (threshold)
-- -------------------------------------------------------------------------
create table if not exists public.loyalty_rewards (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.loyalty_programs(id) on delete cascade,
  threshold   int  not null check (threshold > 0),
  label       text not null,
  created_at  timestamptz not null default now(),
  unique (program_id, threshold)
);

create index if not exists loyalty_rewards_program_idx
  on public.loyalty_rewards (program_id, threshold);

-- -------------------------------------------------------------------------
-- 3. loyalty_cards — 1 carte par (appareil, commerce)
--    device_id = identifiant d'appareil aléatoire (cookie httpOnly posé par
--    le serveur). email / phone optionnels (sauvegarde & récupération V1).
-- -------------------------------------------------------------------------
create table if not exists public.loyalty_cards (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references public.loyalty_programs(id) on delete cascade,
  device_id       text not null,
  email           text,
  phone           text,
  stamp_count     int  not null default 0 check (stamp_count >= 0),
  cycle           int  not null default 1 check (cycle >= 1),
  last_stamp_date date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (program_id, device_id)
);

create index if not exists loyalty_cards_program_idx on public.loyalty_cards (program_id);
-- Lookups de récupération par contact (email OU téléphone) pour un programme.
create index if not exists loyalty_cards_email_idx on public.loyalty_cards (program_id, lower(email));
create index if not exists loyalty_cards_phone_idx on public.loyalty_cards (program_id, phone);

-- -------------------------------------------------------------------------
-- 4. loyalty_stamps — historique des passages (1 par jour max)
--    stamped_on : date du passage en Europe/Paris, posée par le serveur.
--    La contrainte UNIQUE est le garde-fou anti double-scan simultané.
-- -------------------------------------------------------------------------
create table if not exists public.loyalty_stamps (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.loyalty_cards(id) on delete cascade,
  stamped_on date not null,
  created_at timestamptz not null default now(),
  unique (card_id, stamped_on)
);

create index if not exists loyalty_stamps_card_idx on public.loyalty_stamps (card_id, stamped_on);

-- -------------------------------------------------------------------------
-- 5. loyalty_redemptions — récompenses obtenues
--    reward_label / threshold : snapshot au moment de l'obtention, pour que
--    l'historique reste correct si le commerçant modifie ensuite ses paliers.
--    validated_at : NULL tant que le client n'a pas confirmé la réception.
--    UNIQUE (card_id, reward_id, cycle) : garde-fou — pas de récompense en
--    double pour un palier déjà obtenu dans le cycle en cours.
-- -------------------------------------------------------------------------
create table if not exists public.loyalty_redemptions (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references public.loyalty_cards(id) on delete cascade,
  reward_id     uuid references public.loyalty_rewards(id) on delete set null,
  reward_label  text not null,
  threshold     int  not null,
  cycle         int  not null,
  earned_at     timestamptz not null default now(),
  validated_at  timestamptz,
  unique (card_id, reward_id, cycle)
);

create index if not exists loyalty_redemptions_card_idx on public.loyalty_redemptions (card_id, earned_at desc);

-- =========================================================================
-- RLS + GRANTS
-- =========================================================================

-- ---- loyalty_programs : CRUD réservé à l'owner du commerce ----------------
alter table public.loyalty_programs enable row level security;
revoke all on public.loyalty_programs from anon, authenticated;
grant select, insert, update, delete on public.loyalty_programs to authenticated;
grant all on public.loyalty_programs to service_role;

drop policy if exists "loyalty_programs_select_owner" on public.loyalty_programs;
create policy "loyalty_programs_select_owner"
  on public.loyalty_programs for select to authenticated
  using (exists (select 1 from public.businesses b
    where b.id = loyalty_programs.business_id and b.user_id = auth.uid()));

drop policy if exists "loyalty_programs_insert_owner" on public.loyalty_programs;
create policy "loyalty_programs_insert_owner"
  on public.loyalty_programs for insert to authenticated
  with check (exists (select 1 from public.businesses b
    where b.id = loyalty_programs.business_id and b.user_id = auth.uid()));

drop policy if exists "loyalty_programs_update_owner" on public.loyalty_programs;
create policy "loyalty_programs_update_owner"
  on public.loyalty_programs for update to authenticated
  using (exists (select 1 from public.businesses b
    where b.id = loyalty_programs.business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b
    where b.id = loyalty_programs.business_id and b.user_id = auth.uid()));

drop policy if exists "loyalty_programs_delete_owner" on public.loyalty_programs;
create policy "loyalty_programs_delete_owner"
  on public.loyalty_programs for delete to authenticated
  using (exists (select 1 from public.businesses b
    where b.id = loyalty_programs.business_id and b.user_id = auth.uid()));

-- ---- loyalty_rewards : CRUD réservé à l'owner (via le programme) -----------
alter table public.loyalty_rewards enable row level security;
revoke all on public.loyalty_rewards from anon, authenticated;
grant select, insert, update, delete on public.loyalty_rewards to authenticated;
grant all on public.loyalty_rewards to service_role;

-- Un helper EXISTS commun : le reward appartient à un programme d'un commerce
-- dont l'utilisateur courant est propriétaire.
drop policy if exists "loyalty_rewards_select_owner" on public.loyalty_rewards;
create policy "loyalty_rewards_select_owner"
  on public.loyalty_rewards for select to authenticated
  using (exists (select 1 from public.loyalty_programs p
    join public.businesses b on b.id = p.business_id
    where p.id = loyalty_rewards.program_id and b.user_id = auth.uid()));

drop policy if exists "loyalty_rewards_insert_owner" on public.loyalty_rewards;
create policy "loyalty_rewards_insert_owner"
  on public.loyalty_rewards for insert to authenticated
  with check (exists (select 1 from public.loyalty_programs p
    join public.businesses b on b.id = p.business_id
    where p.id = loyalty_rewards.program_id and b.user_id = auth.uid()));

drop policy if exists "loyalty_rewards_update_owner" on public.loyalty_rewards;
create policy "loyalty_rewards_update_owner"
  on public.loyalty_rewards for update to authenticated
  using (exists (select 1 from public.loyalty_programs p
    join public.businesses b on b.id = p.business_id
    where p.id = loyalty_rewards.program_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.loyalty_programs p
    join public.businesses b on b.id = p.business_id
    where p.id = loyalty_rewards.program_id and b.user_id = auth.uid()));

drop policy if exists "loyalty_rewards_delete_owner" on public.loyalty_rewards;
create policy "loyalty_rewards_delete_owner"
  on public.loyalty_rewards for delete to authenticated
  using (exists (select 1 from public.loyalty_programs p
    join public.businesses b on b.id = p.business_id
    where p.id = loyalty_rewards.program_id and b.user_id = auth.uid()));

-- ---- loyalty_cards : lecture owner uniquement, écriture service role -------
alter table public.loyalty_cards enable row level security;
revoke all on public.loyalty_cards from anon, authenticated;
grant select on public.loyalty_cards to authenticated;
grant all on public.loyalty_cards to service_role;

drop policy if exists "loyalty_cards_select_owner" on public.loyalty_cards;
create policy "loyalty_cards_select_owner"
  on public.loyalty_cards for select to authenticated
  using (exists (select 1 from public.loyalty_programs p
    join public.businesses b on b.id = p.business_id
    where p.id = loyalty_cards.program_id and b.user_id = auth.uid()));

-- ---- loyalty_stamps : lecture owner uniquement, écriture service role ------
alter table public.loyalty_stamps enable row level security;
revoke all on public.loyalty_stamps from anon, authenticated;
grant select on public.loyalty_stamps to authenticated;
grant all on public.loyalty_stamps to service_role;

drop policy if exists "loyalty_stamps_select_owner" on public.loyalty_stamps;
create policy "loyalty_stamps_select_owner"
  on public.loyalty_stamps for select to authenticated
  using (exists (select 1 from public.loyalty_cards c
    join public.loyalty_programs p on p.id = c.program_id
    join public.businesses b on b.id = p.business_id
    where c.id = loyalty_stamps.card_id and b.user_id = auth.uid()));

-- ---- loyalty_redemptions : lecture owner uniquement, écriture service role -
alter table public.loyalty_redemptions enable row level security;
revoke all on public.loyalty_redemptions from anon, authenticated;
grant select on public.loyalty_redemptions to authenticated;
grant all on public.loyalty_redemptions to service_role;

drop policy if exists "loyalty_redemptions_select_owner" on public.loyalty_redemptions;
create policy "loyalty_redemptions_select_owner"
  on public.loyalty_redemptions for select to authenticated
  using (exists (select 1 from public.loyalty_cards c
    join public.loyalty_programs p on p.id = c.program_id
    join public.businesses b on b.id = p.business_id
    where c.id = loyalty_redemptions.card_id and b.user_id = auth.uid()));
