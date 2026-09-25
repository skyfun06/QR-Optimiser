-- =========================================================================
-- Migration : réclamations de vente par un vendeur
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Cas couvert : un vendeur a démarché un commerce mais le patron s'est inscrit
-- plus tard SANS son code — la vente n'est rattachée à personne. Le vendeur
-- réclame la vente ; l'admin tranche (accepte → création de la vente et de ses
-- commissions ; refuse).
--
--   1. Table `reclamations` : une demande = un vendeur + les infos saisies
--      (nom du commerce, ville, date de visite, explication) + un statut.
--   2. RLS : un vendeur ne LIT QUE ses propres réclamations. Aucune écriture
--      client (création par API service role, décision par l'admin service role).
-- =========================================================================

create table if not exists public.reclamations (
  id            uuid primary key default gen_random_uuid(),
  vendeur_id    uuid not null references public.vendeurs(id) on delete cascade,
  business_nom  text not null,
  ville         text,
  date_visite   date,
  explication   text,
  statut        text not null default 'en_cours',
  -- Renseignés à la décision de l'admin (acceptation).
  business_id   uuid references public.businesses(id) on delete set null,
  vente_id      uuid references public.ventes(id) on delete set null,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);

alter table public.reclamations drop constraint if exists reclamations_statut_check;
alter table public.reclamations add constraint reclamations_statut_check
  check (statut in ('en_cours', 'acceptee', 'refusee'));

create index if not exists reclamations_vendeur_id_idx on public.reclamations (vendeur_id);
create index if not exists reclamations_statut_idx on public.reclamations (statut);

-- -------------------------------------------------------------------------
-- RLS : lecture réservée au vendeur propriétaire. Aucune écriture client
--       (les écritures se font en service role, qui bypass RLS).
-- -------------------------------------------------------------------------
alter table public.reclamations enable row level security;

revoke all on public.reclamations from anon, authenticated;
grant select on public.reclamations to authenticated;
grant all on public.reclamations to service_role;

drop policy if exists "reclamations_select_own" on public.reclamations;
create policy "reclamations_select_own"
  on public.reclamations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vendeurs v
      where v.id = reclamations.vendeur_id
        and v.user_id = auth.uid()
    )
  );
