-- =========================================================================
-- Migration : questions de motivation à la candidature vendeur
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Ce que fait cette migration :
--   1. Ajoute `vendeurs.reponses` (jsonb) : les réponses au questionnaire de
--      motivation rempli à l'inscription. Structure libre { clé: réponse }, pour
--      pouvoir faire évoluer les questions sans migration.
--   2. Étend `handle_new_vendeur` pour stocker ces réponses (transmises dans les
--      métadonnées d'inscription, comme le reste du formulaire). Le reste du
--      comportement (statut en_attente forcé, refus des moins de 18 ans) est
--      inchangé.
--
-- Les réponses sont lues par l'admin (service role, via /api/admin/vendeurs)
-- pour juger la motivation avant de valider la candidature. Le vendeur lit sa
-- propre ligne via la RLS déjà en place (vendeurs_select_own).
-- =========================================================================

alter table public.vendeurs add column if not exists reponses jsonb;

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
    user_id, nom, prenom, email, telephone, ville, code_postal, date_naissance, statut, reponses
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
    'en_attente',
    case
      when NEW.raw_user_meta_data ? 'reponses'
        then (NEW.raw_user_meta_data->>'reponses')::jsonb
      else null
    end
  )
  on conflict (user_id) do nothing;

  return NEW;
end;
$$;
