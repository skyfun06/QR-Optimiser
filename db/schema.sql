-- =========================================================================
-- Schéma + politiques RLS ScanAvis
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (dashboard) ou via la CLI.
-- Idempotent : on peut le rejouer sans casser la base existante.
--
-- Toutes les écritures depuis le navigateur passent par la clé anon ;
-- la sécurité est donc 100% côté RLS. Les routes serveur qui ont besoin
-- de bypass utilisent SUPABASE_SERVICE_ROLE_KEY.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Table businesses : un seul business par user (user_id = owner)
-- -------------------------------------------------------------------------
alter table public.businesses enable row level security;

drop policy if exists "businesses_select_own" on public.businesses;
drop policy if exists "businesses_insert_own" on public.businesses;
drop policy if exists "businesses_update_own" on public.businesses;
drop policy if exists "businesses_delete_own" on public.businesses;

create policy "businesses_select_own"
  on public.businesses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "businesses_insert_own"
  on public.businesses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "businesses_update_own"
  on public.businesses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "businesses_delete_own"
  on public.businesses
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- View public_businesses : exposée à anon pour la page /review/[id].
-- N'expose QUE id, name, google_review_url. Ne jamais ajouter
-- stripe_customer_id, stripe_subscription_id, user_id ici.
-- -------------------------------------------------------------------------
create or replace view public.public_businesses
  with (security_invoker = true)
  as
  select
    id,
    name,
    google_review_url
  from public.businesses;

grant select on public.public_businesses to anon, authenticated;

-- Pour que la view security_invoker fonctionne avec anon, on autorise
-- la lecture des colonnes nécessaires sur la table de base via une policy
-- dédiée à anon (la view filtre les colonnes exposées).
drop policy if exists "businesses_public_review_read" on public.businesses;
create policy "businesses_public_review_read"
  on public.businesses
  for select
  to anon
  using (true);

-- ⚠️ Remarque importante :
-- La policy ci-dessus permet à anon de SELECT sur businesses, MAIS
-- l'API navigateur (PostgREST) ne renvoie que les colonnes lisibles
-- selon les GRANT sur les colonnes. On les restreint :
revoke all on public.businesses from anon;
grant select (id, name, google_review_url) on public.businesses to anon;

-- -------------------------------------------------------------------------
-- Table reviews : ratings 1-5 stockés à chaque clic d'étoile, public en INSERT.
-- Lecture réservée au commerçant propriétaire.
-- -------------------------------------------------------------------------
alter table public.reviews enable row level security;

drop policy if exists "reviews_insert_public" on public.reviews;
drop policy if exists "reviews_select_owner" on public.reviews;

create policy "reviews_insert_public"
  on public.reviews
  for insert
  to anon, authenticated
  with check (
    business_id is not null
    and rating between 1 and 5
  );

create policy "reviews_select_owner"
  on public.reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = reviews.business_id
        and b.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- Table feedback : message + rating envoyés par les clients insatisfaits.
-- Public en INSERT. Lecture réservée au commerçant propriétaire.
-- -------------------------------------------------------------------------
alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_public" on public.feedback;
drop policy if exists "feedback_select_owner" on public.feedback;

create policy "feedback_insert_public"
  on public.feedback
  for insert
  to anon, authenticated
  with check (
    business_id is not null
    and rating between 1 and 5
    and char_length(coalesce(message, '')) <= 5000
  );

create policy "feedback_select_owner"
  on public.feedback
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = feedback.business_id
        and b.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- Table scans : analytics QR. Public en INSERT (compteur), lecture owner.
-- -------------------------------------------------------------------------
alter table public.scans enable row level security;

drop policy if exists "scans_insert_public" on public.scans;
drop policy if exists "scans_select_owner" on public.scans;

create policy "scans_insert_public"
  on public.scans
  for insert
  to anon, authenticated
  with check (business_id is not null);

create policy "scans_select_owner"
  on public.scans
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = scans.business_id
        and b.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- Storage : buckets `logos` et `menus`
-- Les uploads sont déjà restreints au folder `${business.id}/...`
-- depuis le code client. On ajoute une policy pour vérifier que l'utilisateur
-- est bien propriétaire du business référencé par le 1er segment du path.
-- -------------------------------------------------------------------------
-- Policies storage :
--  • SELECT public sur logos / menus (les URLs publiques sont utilisées dans
--    les affiches QR / emails donc doivent rester accessibles)
--  • INSERT/UPDATE/DELETE réservés à l'owner du business
-- -------------------------------------------------------------------------

drop policy if exists "logos_public_read" on storage.objects;
drop policy if exists "logos_owner_write" on storage.objects;
drop policy if exists "menus_public_read" on storage.objects;
drop policy if exists "menus_owner_write" on storage.objects;

create policy "logos_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'logos');

create policy "logos_owner_write"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'logos'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'logos'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.user_id = auth.uid()
    )
  );

create policy "menus_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'menus');

create policy "menus_owner_write"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'menus'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'menus'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.user_id = auth.uid()
    )
  );
