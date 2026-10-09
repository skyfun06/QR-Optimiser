/**
 * DIAGNOSTIC RLS : un utilisateur authentifié peut-il relire SES commerces ?
 * Crée un user + un commerce de test (service role), se connecte réellement avec
 * la clé ANON, rejoue la requête EXACTE de /businesses, puis nettoie. Lecture du
 * monde réel — ne touche à aucune donnée existante.
 */
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin as admin } from '@/lib/supabase-admin'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function main() {
  const email = `zzz_test_rls_${Date.now()}@exemple.com`
  const password = `Test!${Math.random().toString(36).slice(2, 10)}A1`

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (cErr || !created.user) { console.error('createUser:', cErr?.message); process.exit(1) }
  const uid = created.user.id

  // Commerce via service role (bypass du trigger carte/essai).
  const { error: bErr } = await admin.from('businesses').insert({
    user_id: uid, name: 'ZZZ_TEST_RLS', subscription_status: 'trial',
    subscription_plan: 'free', trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  })
  if (bErr) { console.error('insert business:', bErr.message) }

  // Connexion RÉELLE avec la clé anon (comme le navigateur).
  const anon = createClient(URL, ANON)
  const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password })
  console.log('signIn:', sErr ? `ERREUR ${sErr.message}` : `ok (user ${signIn.user?.id})`)
  console.log('uid attendu   :', uid)

  // Requête EXACTE de app/(dashboard)/businesses/page.tsx
  const { data: biz, error: qErr } = await anon
    .from('businesses').select('id,name,created_at').eq('user_id', uid).order('created_at', { ascending: true })
  console.log('\n--- requête /businesses (authentifié) ---')
  console.log('erreur :', qErr ? `${qErr.code ?? ''} ${qErr.message}` : 'aucune')
  console.log('lignes :', biz?.length ?? 0)
  if (biz?.length) console.log('→ RLS OK : l\'utilisateur relit bien SES commerces.')
  else if (!qErr) console.log('→ ⚠️ VIDE SANS ERREUR : /businesses enverrait vers /onboarding. RLS/grant suspect.')
  else console.log('→ ⚠️ ERREUR : la page afficherait une erreur (pas l\'onboarding).')

  // Variante : select('*') pour voir si une colonne manque de grant.
  const { data: star, error: starErr } = await anon.from('businesses').select('*').eq('user_id', uid)
  console.log('\nselect(*) → lignes:', star?.length ?? 0, '· erreur:', starErr ? `${starErr.code ?? ''} ${starErr.message}` : 'aucune')

  // Nettoyage.
  await admin.from('businesses').delete().eq('user_id', uid)
  await admin.auth.admin.deleteUser(uid)
  console.log('\nnettoyé (user + commerce de test supprimés).')
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
