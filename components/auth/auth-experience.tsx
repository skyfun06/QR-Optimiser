'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup'

const inputClass =
  'w-full min-h-[46px] bg-[#292929] px-4 py-3 rounded-xl text-sm md:text-base text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200'

/**
 * Expérience d'authentification unifiée login/signup avec transition "lame"
 * diagonale (desktop) et transition douce (mobile), SANS rechargement.
 *
 * ⚠️ La logique métier (Supabase signInWithPassword / signUp, messages d'erreur,
 * redirections) est identique aux anciennes pages /login et /signup — seule
 * l'enveloppe visuelle change. Les états login/signup sont séparés.
 */
export function AuthExperience({ initialMode }: { initialMode: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered') === 'true'

  const [mode, setMode] = useState<Mode>(initialMode)

  // --- État LOGIN (identique à l'ancienne page /login) ---
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // --- État SIGNUP (identique à l'ancienne page /signup) ---
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)

  // --- handleLogin : logique inchangée ---
  async function handleLogin() {
    setLoginLoading(true)
    setLoginError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      setLoginError('Email ou mot de passe incorrect')
      setLoginLoading(false)
      return
    }

    // /businesses est le point d'entrée : il redirige vers /onboarding si aucun
    // commerce, vers le commerce si un seul, ou affiche la liste si plusieurs.
    router.push('/businesses')
  }

  // --- handleSignup : logique inchangée ---
  async function handleSignup() {
    setSignupError(null)

    if (signupPassword !== confirmPassword) {
      setSignupError('Les mots de passe ne correspondent pas')
      return
    }

    setSignupLoading(true)

    const { data, error } = await supabase.auth.signUp({ email: signupEmail, password: signupPassword })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setSignupError('Un compte existe déjà avec cette adresse email.')
      } else if (error.message.includes('Password')) {
        setSignupError('Le mot de passe doit contenir au moins 6 caractères.')
      } else {
        setSignupError('Une erreur est survenue. Vérifie tes informations.')
      }
      setSignupLoading(false)
      return
    }

    // On ne crée PAS de commerce ici : le commerce est créé à l'onboarding.
    if (data.user) {
      // TODO: email de bienvenue quand domaine Resend vérifié.
    }

    router.push('/login?registered=true')
  }

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    // Synchronise l'URL sans navigation (pas de rechargement, pas de coupure).
    try {
      window.history.replaceState(null, '', next === 'login' ? '/login' : '/signup')
    } catch {
      // ignoré : l'état interne suffit
    }
  }

  /* ─── Champs (réutilisés desktop + mobile) ─────────────── */
  function loginFields(showSwitch: boolean) {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="w-full flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Email</label>
          <input type="email" placeholder="vous@commerce.fr" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputClass} />
        </div>
        <div className="w-full flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Mot de passe</label>
          <input type="password" placeholder="Mot de passe" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputClass} />
        </div>
        <button
          type="button"
          onClick={handleLogin}
          disabled={!loginEmail || !loginPassword || loginLoading}
          className="w-full min-h-[46px] flex justify-center items-center gap-2 bg-gold py-3 rounded-xl text-[#12100e] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loginLoading ? 'Connexion...' : 'Se connecter'}
        </button>
        {loginError && <p className="text-sm text-red-500 text-center">{loginError}</p>}
        {showSwitch && (
          <p className="text-sm text-[#8c8c8c] text-center">
            Pas encore de compte ?{' '}
            <button type="button" onClick={() => switchMode('signup')} className="text-gold font-medium hover:underline">Créer un compte</button>
          </p>
        )}
      </div>
    )
  }

  function signupFields(showSwitch: boolean) {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="w-full flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Email</label>
          <input type="email" placeholder="vous@commerce.fr" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className={inputClass} />
        </div>
        <div className="w-full flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Mot de passe</label>
          <input type="password" placeholder="Au moins 6 caractères" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className={inputClass} />
        </div>
        <div className="w-full flex flex-col gap-1.5">
          <label className="text-xs text-[#8c8c8c]">Confirmez le mot de passe</label>
          <input type="password" placeholder="Confirmez le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
        </div>
        <button
          type="button"
          onClick={handleSignup}
          disabled={!signupEmail || !signupPassword || !confirmPassword || signupLoading}
          className="w-full min-h-[46px] flex justify-center items-center gap-2 bg-gold py-3 rounded-xl text-[#12100e] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {signupLoading ? 'Création...' : 'Créer mon compte'}
        </button>
        {signupError && <p className="text-sm text-red-500 text-center">{signupError}</p>}
        {showSwitch && (
          <p className="text-sm text-[#8c8c8c] text-center">
            Déjà un compte ?{' '}
            <button type="button" onClick={() => switchMode('login')} className="text-gold font-medium hover:underline">Se connecter</button>
          </p>
        )}
      </div>
    )
  }

  /* ─── Contenu du panneau "lame" (hero + switch) ────────── */
  const bladeContent =
    mode === 'login' ? (
      <>
        <h2 className="text-2xl md:text-3xl font-bold">Nouveau ici ?</h2>
        <p className="text-sm md:text-base opacity-80 max-w-[240px]">Rejoignez ScanAvis et transformez vos clients en avis Google.</p>
        <button
          type="button"
          onClick={() => switchMode('signup')}
          className="mt-2 min-h-[46px] px-6 rounded-xl border-2 border-[#12100e] text-[#12100e] font-semibold hover:bg-[#12100e] hover:text-gold transition-colors active:scale-[0.98]"
        >
          Créer un compte
        </button>
      </>
    ) : (
      <>
        <h2 className="text-2xl md:text-3xl font-bold">Content de vous revoir</h2>
        <p className="text-sm md:text-base opacity-80 max-w-[240px]">Connectez-vous pour accéder à votre tableau de bord.</p>
        <button
          type="button"
          onClick={() => switchMode('login')}
          className="mt-2 min-h-[46px] px-6 rounded-xl border-2 border-[#12100e] text-[#12100e] font-semibold hover:bg-[#12100e] hover:text-gold transition-colors active:scale-[0.98]"
        >
          Se connecter
        </button>
      </>
    )

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#171717] animate-fade-in">
      {mode === 'login' && registered && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-[440px] px-4 py-3 text-sm text-center text-white rounded-lg" style={{ background: '#166534' }}>
          Compte créé avec succès ! Connectez-vous pour continuer.
        </div>
      )}

      {/* ══════════ DESKTOP : plein écran, deux moitiés + lame coulissante ══════════ */}
      <div className="relative hidden md:block h-screen">
          {/* Zone FORMULAIRE (70%) — glisse gauche ↔ droite */}
          <div
            className="absolute top-0 left-0 h-full w-[60%] z-10 flex flex-col items-center justify-center px-8"
            style={{
              transform: mode === 'login' ? 'translateX(0%)' : 'translateX(66.667%)',
              transition: 'transform 0.7s cubic-bezier(0.76, 0, 0.24, 1)',
            }}
          >
            <div key={mode} className="w-full max-w-[400px] flex flex-col gap-6 animate-fade-in">
              <div className="w-full flex flex-col items-center gap-1 text-center">
                <h1 className="text-2xl md:text-3xl font-bold animate-gradient-text">{mode === 'login' ? 'Bon retour' : 'Commencez'}</h1>
                <p className="text-sm text-[#8c8c8c]">{mode === 'login' ? 'Connectez-vous à votre espace' : 'Créez votre compte gratuit'}</p>
              </div>
              {mode === 'login' ? loginFields(false) : signupFields(false)}
            </div>
          </div>

          {/* Zone LAME dorée (30%) — glisse droite ↔ gauche */}
          <div
            className="absolute top-0 left-0 h-full w-[40%] z-20"
            style={{
              transform: mode === 'login' ? 'translateX(150%)' : 'translateX(0%)',
              transition: 'transform 0.7s cubic-bezier(0.76, 0, 0.24, 1)',
            }}
          >
            {/* Fond doré à bord diagonal (déborde légèrement, coupé par la card) */}
            <div
              aria-hidden
              className="absolute inset-y-0 -left-8 -right-8"
              style={{
                background: 'linear-gradient(135deg, #e2af47 0%, #C9973A 55%, #a3781f 100%)',
                transform: 'skewX(-7deg)',
                boxShadow: '0 0 70px -12px rgba(201,151,58,0.55)',
              }}
            />

            {/* Décor animé pour donner vie au panneau doré */}
            <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Anneaux pointillés en rotation lente */}
              <svg className="absolute -top-20 -right-24 w-72 h-72 animate-spin-slow" viewBox="0 0 100 100" fill="none" stroke="#12100e" strokeWidth="0.8" strokeOpacity="0.16" strokeDasharray="3 7">
                <circle cx="50" cy="50" r="48" />
                <circle cx="50" cy="50" r="33" strokeDasharray="1 6" />
              </svg>
              <svg className="absolute -bottom-24 -left-20 w-80 h-80 animate-spin-slow" style={{ animationDirection: 'reverse' }} viewBox="0 0 100 100" fill="none" stroke="#12100e" strokeWidth="0.8" strokeOpacity="0.12" strokeDasharray="2 8">
                <circle cx="50" cy="50" r="48" />
              </svg>
              {/* Étoiles flottantes (clin d'œil aux avis) */}
              {[
                { top: '15%', left: '20%', size: 26, delay: '0s', o: 0.22 },
                { top: '68%', left: '25%', size: 18, delay: '.9s', o: 0.18 },
                { top: '30%', left: '70%', size: 22, delay: '1.7s', o: 0.2 },
                { top: '80%', left: '62%', size: 15, delay: '2.4s', o: 0.16 },
              ].map((s, i) => (
                <svg key={i} className="absolute animate-float" style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay, opacity: s.o }} viewBox="0 0 24 24" fill="#12100e">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
              {/* Reflet lumineux qui balaie en boucle */}
              <span className="absolute top-0 left-0 h-full w-1/4 animate-sheen" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
            </div>

            <div className="relative h-full flex flex-col items-center justify-center px-10 text-center gap-3 text-[#12100e]">
              {bladeContent}
            </div>
          </div>
        </div>

      {/* ══════════ MOBILE : plein écran, formulaire unique, transition douce ══════════ */}
      <div className="md:hidden min-h-screen flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-[400px] flex flex-col items-center gap-6">
          <div className="w-full flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold animate-gradient-text">{mode === 'login' ? 'Bon retour' : 'Commencez'}</h1>
            <p className="text-sm text-[#8c8c8c]">{mode === 'login' ? 'Connectez-vous à votre espace' : 'Créez votre compte gratuit'}</p>
          </div>
          <div key={mode} className="w-full animate-fade-up">
            {mode === 'login' ? loginFields(true) : signupFields(true)}
          </div>
        </div>
      </div>
    </div>
  )
}
