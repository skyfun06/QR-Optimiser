-- =========================================================================
-- Migration : suivi serveur de la fin de formation vendeur
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Ajoute `vendeurs.formation_terminee_le` (timestamptz) : horodatage du
--      moment où le vendeur a terminé le parcours guidé. Sert de garde-fou
--      SERVEUR pour interdire de passer le test sans avoir suivi la formation
--      (le verrou côté client, seul, serait contournable par appel direct à
--      l'API). L'API /api/vendeur/test refuse la correction tant que ce champ
--      est null.
--   2. Le vendeur LIT ce champ (RLS déjà en place) pour afficher le bon état.
--      Il ne l'ÉCRIT JAMAIS lui-même : seul le service role le pose, quand le
--      dernier chapitre est validé (POST { action: 'terminer_formation' }). On
--      étend donc le garde-fou anti-triche (comme statut / code / suivi test).
-- =========================================================================

alter table public.vendeurs add column if not exists formation_terminee_le timestamptz;

grant select (formation_terminee_le) on public.vendeurs to authenticated;

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
    if NEW.formation_terminee_le is distinct from OLD.formation_terminee_le then
      raise exception 'Modification du suivi de formation vendeur interdite depuis le client';
    end if;
    return NEW;
  end if;

  return NEW;
end;
$$;
