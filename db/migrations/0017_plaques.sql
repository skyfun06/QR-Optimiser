-- =========================================================================
-- Migration : plaques physiques pré-imprimées (QR + puce NFC)
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : rejouable sans casser l'existant.
--
-- PRINCIPE : chaque plaque porte un lien PERMANENT
--   https://www.qrscanavis.fr/p/<code>
-- imprimé dans le QR et écrit dans la puce NFC. La plaque ne change jamais :
-- c'est cette table qui décide où le lien redirige.
--   • business_id NULL  → plaque pas encore activée (page neutre / activation)
--   • business_id rempli → redirection vers /review/<business_id>
--
-- Un commerce peut avoir plusieurs plaques (comptoir, table, vitrine…).
-- Si le commerce est supprimé, la plaque redevient libre (ON DELETE SET NULL).
--
-- SÉCURITÉ : RLS activée SANS aucune policy → aucune lecture/écriture depuis le
-- navigateur. Tout passe par le serveur (service role) : redirection, activation
-- et back-office admin.
-- =========================================================================

create table if not exists public.plaques (
  id           uuid primary key default gen_random_uuid(),
  -- Numéro lisible du lot (1, 2, 3…) : celui qu'on retrouve sur le tableau
  -- fournisseur et, idéalement, gravé au dos de la plaque.
  numero       int  not null unique check (numero > 0),
  -- Code aléatoire non devinable (6 caractères, sans 0/O/1/I/L).
  code         text not null unique check (code ~ '^[2-9A-HJKMNP-Z]{6}$'),
  business_id  uuid references public.businesses(id) on delete set null,
  activated_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists plaques_business_idx on public.plaques (business_id);

alter table public.plaques enable row level security;
