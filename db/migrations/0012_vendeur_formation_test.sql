-- =========================================================================
-- Migration : test de validation de la formation vendeur
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Ajoute à `vendeurs` le suivi du test de fin de formation :
--        • test_tentatives       : nombre de passages du test (fenêtre courante) ;
--        • test_reussi_le        : horodatage de la réussite (null tant que raté) ;
--        • test_dernier_echec_le : horodatage du dernier échec (base du cooldown) ;
--        • test_meilleur_score   : meilleur score obtenu, en % (pour l'affichage).
--   2. Le vendeur LIT ces colonnes (RLS déjà en place : sa seule ligne) pour que
--      son espace affiche le bon état. Il ne les ÉCRIT JAMAIS : la correction du
--      test et l'incrément des tentatives passent par le service role
--      (/api/vendeur/test). On étend donc le garde-fou anti-triche existant
--      (même philosophie que statut / user_id / code) pour refuser toute
--      modification de ces colonnes depuis le client.
--
--   La réussite du test NE change PAS le statut : le vendeur reste en
--   'formation'. L'admin garde la main pour l'activer (transition
--   'formation' -> 'actif' inchangée), en voyant que le test est réussi.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Colonnes de suivi du test
-- -------------------------------------------------------------------------
alter table public.vendeurs add column if not exists test_tentatives       integer not null default 0;
alter table public.vendeurs add column if not exists test_reussi_le         timestamptz;
alter table public.vendeurs add column if not exists test_dernier_echec_le  timestamptz;
alter table public.vendeurs add column if not exists test_meilleur_score    integer;

-- Le vendeur peut lire son propre suivi de test (RLS filtre déjà les LIGNES).
grant select (test_tentatives, test_reussi_le, test_dernier_echec_le, test_meilleur_score)
  on public.vendeurs to authenticated;

-- -------------------------------------------------------------------------
-- 2. Garde-fou anti-triche : on interdit au client de modifier lui-même le
--    suivi du test (comme statut / user_id / code). Seuls les rôles serveur de
--    confiance (service role, admin SQL) écrivent ces colonnes.
--    On recrée la fonction en conservant tous les contrôles précédents.
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
    if NEW.code is distinct from OLD.code then
      raise exception 'Modification du code vendeur interdite depuis le client';
    end if;
    if NEW.test_tentatives      is distinct from OLD.test_tentatives
       or NEW.test_reussi_le        is distinct from OLD.test_reussi_le
       or NEW.test_dernier_echec_le is distinct from OLD.test_dernier_echec_le
       or NEW.test_meilleur_score   is distinct from OLD.test_meilleur_score then
      raise exception 'Modification du suivi de test vendeur interdite depuis le client';
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;
