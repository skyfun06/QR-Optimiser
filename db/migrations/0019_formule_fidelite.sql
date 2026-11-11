-- =========================================================================
-- Migration : formule payée sur le commerce + fidélité réservée au Premium
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Règle métier (décision 2026-11-11) :
--   • Essai de 30 jours = accès COMPLET, carte de fidélité incluse.
--   • Abonnement actif « Essentiel » (qr, 35 €) → fidélité en pause.
--   • Abonnement actif « Premium » (qr_nfc, 40 €) → fidélité active.
--   La pause ne supprime rien : programme, paliers, cartes et tampons sont
--   conservés et reviennent au passage en Premium.
--
-- Ce que fait cette migration :
--   1. Ajoute `businesses.formule` ('qr' | 'qr_nfc', null tant que rien n'est
--      payé). Écrite UNIQUEMENT par le serveur (webhook Stripe / activate).
--   2. Backfill : les commerces actifs reprennent la formule de leur vente
--      (commerces inscrits par un vendeur). Les autres restent à null → traités
--      comme Essentiel ; l'admin peut corriger à la main si besoin.
--   3. Garde-fou : le client ne peut ni choisir ni modifier sa formule.
-- =========================================================================

-- 1. Colonne
alter table public.businesses
  add column if not exists formule text;

alter table public.businesses drop constraint if exists businesses_formule_check;
alter table public.businesses add constraint businesses_formule_check
  check (formule is null or formule in ('qr', 'qr_nfc'));

-- 2. Backfill depuis les ventes (seulement si pas déjà renseigné)
update public.businesses b
set formule = v.formule
from public.ventes v
where v.business_id = b.id
  and b.formule is null
  and b.subscription_status = 'active'
  and v.formule in ('qr', 'qr_nfc');

-- 3. Garde-fou dédié (séparé de enforce_business_billing_guard pour ne pas
--    réécrire ce dernier). Service role / admin SQL exemptés.
create or replace function public.enforce_business_formule_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    NEW.formule := null;
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and NEW.formule is distinct from OLD.formule then
    raise exception 'Modification de formule interdite depuis le client';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_business_formule_guard on public.businesses;
create trigger trg_business_formule_guard
  before insert or update on public.businesses
  for each row execute function public.enforce_business_formule_guard();
