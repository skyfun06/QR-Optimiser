-- =========================================================================
-- Migration : onglet « Prospection » de l'espace vendeur
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Pré-requis d'exploitation (hors SQL) : la clé Google doit être fournie
-- côté serveur via la variable d'environnement GOOGLE_PLACES_API_KEY, avec
-- les APIs « Places API (New) » ET « Geocoding API » activées sur le projet
-- Google Cloud. Tant qu'elle est absente, l'onglet affiche un message clair
-- et n'appelle jamais Google (le reste de l'espace vendeur n'est pas affecté).
--
-- Ce que fait cette migration :
--   1. Table `vendeur_prospection` : 1 ligne par vendeur, mémorise l'adresse,
--      les coordonnées, le rayon et surtout la DATE du dernier appel Google.
--      C'est cette date qui verrouille le coût : au maximum un appel / 24h
--      par vendeur (plafond dur, appliqué côté serveur).
--   2. Table `vendeur_prospects` : les commerces à démarcher récupérés auprès
--      de Google, rattachés au vendeur. Le vendeur peut faire évoluer leur
--      `statut` (à faire / à revoir / refusé / signé), rien d'autre.
--   3. RLS : chaque vendeur ne LIT que ses propres lignes. Il ne peut jamais
--      insérer/supprimer un prospect (c'est le serveur / service role qui
--      remplit la liste lors d'un « refresh »), ni modifier un champ autre
--      que `statut`. Même philosophie que enforce_vendeur_guard.
--
-- Rien d'autre n'est touché (aucun lien avec businesses / ventes / Stripe).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. État de prospection du vendeur (adresse + rayon + anti-coût 24h)
-- -------------------------------------------------------------------------
create table if not exists public.vendeur_prospection (
  vendeur_id             uuid primary key references public.vendeurs(id) on delete cascade,
  adresse                text,
  lat                    double precision,
  lng                    double precision,
  rayon_km               integer not null default 3,
  derniere_recherche_at  timestamptz,
  updated_at             timestamptz not null default now()
);

alter table public.vendeur_prospection
  drop constraint if exists vendeur_prospection_rayon_check;
alter table public.vendeur_prospection
  add constraint vendeur_prospection_rayon_check
  check (rayon_km between 2 and 10);

-- -------------------------------------------------------------------------
-- 2. Les commerces à démarcher
-- -------------------------------------------------------------------------
create table if not exists public.vendeur_prospects (
  id           uuid primary key default gen_random_uuid(),
  vendeur_id   uuid not null references public.vendeurs(id) on delete cascade,
  place_id     text not null,                      -- id Google (stable, pour reconduire le statut)
  nom          text not null,
  adresse      text,
  note         double precision,                   -- note Google (peut être null si aucun avis)
  nb_avis      integer not null default 0,
  telephone    text,
  lat          double precision not null,
  lng          double precision not null,
  distance_m   integer not null default 0,         -- distance au centre de recherche (mètres)
  statut       text not null default 'a_faire',
  created_at   timestamptz not null default now(),
  -- Un même commerce n'apparaît qu'une fois dans la liste d'un vendeur :
  -- c'est la clé qui permet de reconduire le statut lors d'un refresh.
  unique (vendeur_id, place_id)
);

create index if not exists idx_vendeur_prospects_vendeur on public.vendeur_prospects (vendeur_id);

alter table public.vendeur_prospects
  drop constraint if exists vendeur_prospects_statut_check;
alter table public.vendeur_prospects
  add constraint vendeur_prospects_statut_check
  check (statut in ('a_faire', 'a_revoir', 'refuse', 'signe'));

-- -------------------------------------------------------------------------
-- 3. RLS
-- -------------------------------------------------------------------------
-- Lien prospect/état → vendeur → utilisateur : on autorise la ligne quand
-- elle appartient à un vendeur dont user_id = auth.uid().
-- -------------------------------------------------------------------------
alter table public.vendeur_prospection enable row level security;
alter table public.vendeur_prospects   enable row level security;

revoke all on public.vendeur_prospection from anon, authenticated;
revoke all on public.vendeur_prospects   from anon, authenticated;

-- L'état de prospection est en LECTURE SEULE côté client : l'adresse, le rayon
-- et surtout la date du dernier appel ne sont écrits QUE par le serveur
-- (service role), pour que le vendeur ne puisse pas contourner le plafond 24h.
grant select on public.vendeur_prospection to authenticated;

-- Les prospects : lecture + mise à jour (du seul statut, cf. garde-fou) côté
-- client. L'insertion/suppression reste l'affaire du serveur (refresh).
grant select, update on public.vendeur_prospects to authenticated;

grant all on public.vendeur_prospection to service_role;
grant all on public.vendeur_prospects   to service_role;

drop policy if exists "vendeur_prospection_select_own" on public.vendeur_prospection;
create policy "vendeur_prospection_select_own"
  on public.vendeur_prospection
  for select
  to authenticated
  using (vendeur_id in (select id from public.vendeurs where user_id = auth.uid()));

drop policy if exists "vendeur_prospects_select_own" on public.vendeur_prospects;
create policy "vendeur_prospects_select_own"
  on public.vendeur_prospects
  for select
  to authenticated
  using (vendeur_id in (select id from public.vendeurs where user_id = auth.uid()));

drop policy if exists "vendeur_prospects_update_own" on public.vendeur_prospects;
create policy "vendeur_prospects_update_own"
  on public.vendeur_prospects
  for update
  to authenticated
  using (vendeur_id in (select id from public.vendeurs where user_id = auth.uid()))
  with check (vendeur_id in (select id from public.vendeurs where user_id = auth.uid()));

-- -------------------------------------------------------------------------
-- 4. Garde-fou : le vendeur ne peut changer QUE le statut d'un prospect.
--    SECURITY INVOKER => current_user reflète le rôle réel appelant.
--    Les rôles serveur de confiance sont exemptés (ils remplissent la liste).
-- -------------------------------------------------------------------------
create or replace function public.enforce_vendeur_prospect_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    -- Toute modification autre que le statut est refusée côté client.
    if NEW.vendeur_id is distinct from OLD.vendeur_id
       or NEW.place_id   is distinct from OLD.place_id
       or NEW.nom        is distinct from OLD.nom
       or NEW.adresse    is distinct from OLD.adresse
       or NEW.note       is distinct from OLD.note
       or NEW.nb_avis    is distinct from OLD.nb_avis
       or NEW.telephone  is distinct from OLD.telephone
       or NEW.lat        is distinct from OLD.lat
       or NEW.lng        is distinct from OLD.lng
       or NEW.distance_m is distinct from OLD.distance_m
       or NEW.created_at is distinct from OLD.created_at then
      raise exception 'Seul le statut d''un prospect peut être modifié depuis le client';
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_vendeur_prospect_guard on public.vendeur_prospects;
create trigger trg_vendeur_prospect_guard
  before update on public.vendeur_prospects
  for each row execute function public.enforce_vendeur_prospect_guard();
