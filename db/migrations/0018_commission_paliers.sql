-- =========================================================================
-- Migration : commissions vendeur à trois paliers
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- Nouveau barème (cumulé, en multiple de l'abonnement mensuel) :
--   1er mois payé = 0,5 × | 3e mois payé = 1 × | 6e mois payé = 2,5 ×
-- soit, par versement : QR (35 €) 17,50 / 17,50 / 52,50 ;
--                       QR + NFC (40 €) 20 / 20 / 60.
--
-- Ce que fait cette migration :
--   1. Autorise la part 3 sur `commissions`.
--   2. Crée la part 3 (en attente) des ventes dont les commissions ont déjà été
--      déclenchées. Les parts 1 et 2 existantes ont déjà les bons montants.
-- =========================================================================

alter table public.commissions drop constraint if exists commissions_part_check;
alter table public.commissions add constraint commissions_part_check
  check (part in (1, 2, 3));

insert into public.commissions (vente_id, part, montant, statut)
select v.id, 3, case v.formule when 'qr_nfc' then 60 else 52.5 end, 'en_attente'
from public.ventes v
where v.date_premier_paiement is not null
on conflict (vente_id, part) do nothing;
