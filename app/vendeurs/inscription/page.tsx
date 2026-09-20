'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { VENDEUR_QUESTIONS } from '@/lib/vendeur-questions'

const inputClass =
  'w-full min-h-[46px] bg-[#292929] px-4 py-3 rounded-xl text-sm md:text-base text-[#e5e5e5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200'

/** true si la date de naissance donnée correspond à un âge d'au moins 18 ans. */
function isMajeur(dateNaissance: string): boolean {
  if (!dateNaissance) return false
  const dob = new Date(dateNaissance)
  if (Number.isNaN(dob.getTime())) return false
  const majoriteLe = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate())
  return majoriteLe <= new Date()
}

export default function VendeurInscriptionPage() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [ville, setVille] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [reponses, setReponses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const identiteComplete =
    prenom && nom && email && telephone && ville && codePostal && dateNaissance && password && confirmPassword
  const reponsesCompletes = VENDEUR_QUESTIONS.every((q) => (reponses[q.key] ?? '').trim().length > 0)

  function goToQuestions() {
    setError(null)
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (!isMajeur(dateNaissance)) {
      setError('Tu dois avoir au moins 18 ans pour rejoindre le réseau.')
      return
    }
    setStep(2)
  }

  async function handleSignup() {
    setError(null)
    if (!reponsesCompletes) {
      setError('Merci de répondre à toutes les questions.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/connexion`,
        // Métadonnées consommées par le trigger de création de la ligne
        // `vendeurs` (statut forcé 'en_attente'). `reponses` = questionnaire.
        data: {
          espace: 'vendeur',
          prenom,
          nom,
          email,
          telephone,
          ville,
          code_postal: codePostal,
          date_naissance: dateNaissance,
          reponses: JSON.stringify(reponses),
        },
      },
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setError('Un compte existe déjà avec cette adresse email.')
      } else if (error.message.includes('Password')) {
        setError('Le mot de passe doit contenir au moins 6 caractères.')
      } else {
        setError('Une erreur est survenue. Vérifie tes informations.')
      }
      setLoading(false)
      return
    }

    router.push('/connexion?inscrit=1')
  }

  return (
    <div className="w-full max-w-[440px] flex flex-col gap-6 animate-fade-up">
      <div className="w-full flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl md:text-3xl font-bold animate-gradient-text">Rejoindre le réseau</h1>
        <p className="text-sm text-[#8c8c8c]">
          {step === 1 ? 'Deviens apporteur d’affaires ScanAvis' : 'Parle-nous un peu de toi'}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`h-1.5 w-8 rounded-full ${step === 1 ? 'bg-gold' : 'bg-[#3a3a3a]'}`} />
          <span className={`h-1.5 w-8 rounded-full ${step === 2 ? 'bg-gold' : 'bg-[#3a3a3a]'}`} />
        </div>
      </div>

      {step === 1 ? (
        <div className="w-full flex flex-col gap-4 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8c8c8c]">Prénom</label>
              <input type="text" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8c8c8c]">Nom</label>
              <input type="text" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#8c8c8c]">Email</label>
            <input type="email" placeholder="toi@email.fr" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#8c8c8c]">Téléphone</label>
            <input type="tel" placeholder="06 12 34 56 78" value={telephone} onChange={(e) => setTelephone(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8c8c8c]">Ville</label>
              <input type="text" placeholder="Ville" value={ville} onChange={(e) => setVille(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8c8c8c]">Code postal</label>
              <input type="text" inputMode="numeric" placeholder="75001" value={codePostal} onChange={(e) => setCodePostal(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#8c8c8c]">Date de naissance</label>
            <input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8c8c8c]">Mot de passe</label>
              <input type="password" placeholder="Au moins 6 caractères" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8c8c8c]">Confirmation</label>
              <input type="password" placeholder="Confirme le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
            </div>
          </div>

          <button
            type="button"
            onClick={goToQuestions}
            disabled={!identiteComplete}
            className="w-full min-h-[46px] flex justify-center items-center gap-2 bg-gold py-3 rounded-xl text-[#12100e] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Continuer
          </button>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
      ) : (
        <div className="w-full flex flex-col gap-4 p-6 md:p-8 bg-[#171717] border border-[#292929] rounded-2xl">
          {VENDEUR_QUESTIONS.map((q) => (
            <div key={q.key} className="flex flex-col gap-1.5">
              <label className="text-xs text-[#8c8c8c]">{q.label}</label>
              {q.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={reponses[q.key] ?? ''}
                  onChange={(e) => setReponses((r) => ({ ...r, [q.key]: e.target.value }))}
                  className={`${inputClass} min-h-[80px] resize-none`}
                />
              ) : q.type === 'select' ? (
                <select
                  value={reponses[q.key] ?? ''}
                  onChange={(e) => setReponses((r) => ({ ...r, [q.key]: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Choisir…</option>
                  {q.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={reponses[q.key] ?? ''}
                  onChange={(e) => setReponses((r) => ({ ...r, [q.key]: e.target.value }))}
                  className={inputClass}
                />
              )}
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSignup}
              disabled={!reponsesCompletes || loading}
              className="w-full min-h-[46px] flex justify-center items-center gap-2 bg-gold py-3 rounded-xl text-[#12100e] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? 'Envoi…' : 'Envoyer ma candidature'}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setStep(1)
              }}
              className="w-full min-h-[44px] text-sm text-[#8c8c8c] hover:text-white transition-colors"
            >
              ← Revenir aux informations
            </button>
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
      )}

      <p className="text-sm text-[#8c8c8c] text-center">
        Déjà inscrit ?{' '}
        <Link href="/connexion" className="text-gold font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
