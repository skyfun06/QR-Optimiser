'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { parseCoordonnees, statutColor, statutLabel } from '@/lib/vendeur-prospection'

type ProspectAdmin = {
  id: string
  nom: string
  adresse: string | null
  note: number | null
  nb_avis: number
  telephone: string | null
  lat: number
  lng: number
  statut: string
  created_at: string
  manuel: boolean
}
type VendeurInfo = { id: string; nomComplet: string; statut: string }

const FORM_VIDE = { nom: '', adresse: '', note: '', nb_avis: '', telephone: '', coordonnees: '' }

function AdminTabs() {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={[
        'text-sm px-3 py-2 rounded-lg transition-colors duration-200',
        on ? 'bg-[#292929] text-white' : 'text-[#8c8c8c] hover:text-white hover:bg-white/5',
      ].join(' ')}
    >
      {label}
    </Link>
  )
  return (
    <div className="inline-flex items-center gap-1 bg-[#171717] border border-[#292929] rounded-xl p-1 self-start">
      {tab('/admin/clients', 'Clients', false)}
      {tab('/admin/stats', 'Statistiques', false)}
      {tab('/admin/referrals', 'Parrainages', false)}
      {tab('/admin/vendeurs', 'Vendeurs', true)}
      {tab('/admin/plaques', 'Plaques', false)}
    </div>
  )
}

function formatDateFr(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const INPUT =
  'min-h-[44px] w-full px-3 rounded-xl bg-[#0f0f0f] border border-[#292929] text-sm text-white placeholder:text-[#5a5a5a] focus:outline-none focus:border-gold'
const LABEL = 'flex flex-col gap-1.5 text-xs font-medium text-[#8c8c8c]'
const TH = 'text-left p-4 text-xs uppercase tracking-widest text-[#8c8c8c]'

export default function AdminVendeurProspectsPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)
  const [vendeur, setVendeur] = useState<VendeurInfo | null>(null)
  const [prospects, setProspects] = useState<ProspectAdmin[]>([])
  const [form, setForm] = useState(FORM_VIDE)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/vendeurs/${id}/prospects`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Chargement impossible.')
      setVendeur(payload.vendeur)
      setProspects(payload.prospects ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const coordsSaisies = form.coordonnees.trim()
  const coords = coordsSaisies ? parseCoordonnees(coordsSaisies) : null

  async function ajouter(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setError(null)
    setSucces(null)
    if (!form.nom.trim()) return setError('Le nom est obligatoire.')
    if (!coords) return setError('Coordonnées invalides. Colle-les telles que copiées dans Google Maps, par exemple « 43.58123, 7.12456 ».')
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/vendeurs/${id}/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Ajout impossible.')
      setSucces(`« ${form.nom.trim()} » ajouté.`)
      setForm(FORM_VIDE)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function supprimer(p: ProspectAdmin) {
    if (busyId || !window.confirm(`Retirer « ${p.nom} » de la carte de ce vendeur ?`)) return
    setBusyId(p.id)
    setError(null)
    setSucces(null)
    try {
      const res = await fetch(`/api/admin/vendeurs/${id}/prospects?prospectId=${encodeURIComponent(p.id)}`, { method: 'DELETE' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Suppression impossible.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setBusyId(null)
    }
  }

  const champ = (key: keyof typeof FORM_VIDE) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <DashboardHeader subtitle="Backoffice administrateur" onSignOutError={(m) => setError(m)} />

      <div className="p-4 flex flex-col gap-6">
        <AdminTabs />

        <div className="flex flex-col gap-1">
          <Link href="/admin/vendeurs" className="self-start text-sm text-[#8c8c8c] hover:text-white transition-colors">
            ← Vendeurs
          </Link>
          <h1 className="text-xl font-bold text-white">
            Prospects{vendeur ? ` de ${vendeur.nomComplet}` : ''}
          </h1>
          <p className="text-sm text-[#8c8c8c]">
            Les commerces ajoutés ici apparaissent sur la carte de prospection du vendeur.
            {vendeur && vendeur.statut !== 'actif' && (
              <span className="text-amber-300"> Ce vendeur n&apos;est pas encore actif : il les verra une fois activé.</span>
            )}
          </p>
        </div>

        {error && (
          <div className="rounded-2xl bg-[#181010] border border-[#2e1515] p-4">
            <p className="text-sm text-[#ef4343]">{error}</p>
          </div>
        )}
        {succes && (
          <div className="rounded-2xl bg-[#13231a] border border-[#285038] p-4">
            <p className="text-sm text-[#9fe0b4]">{succes}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[#171717] border border-[#292929] p-6">
            <p className="text-sm text-[#8c8c8c]">Chargement…</p>
          </div>
        ) : !vendeur ? null : (
          <>
            {/* a) Ajout d'un commerce */}
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-white">Ajouter un commerce</h2>
              <form onSubmit={ajouter} className="bg-[#171717] border border-[#292929] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={LABEL}>
                  Nom *
                  <input {...champ('nom')} required maxLength={200} placeholder="Boulangerie du Port" className={INPUT} />
                </label>
                <label className={LABEL}>
                  Adresse
                  <input {...champ('adresse')} maxLength={300} placeholder="12 rue de la République, Antibes" className={INPUT} />
                </label>
                <label className={LABEL}>
                  Note Google
                  <input {...champ('note')} inputMode="decimal" placeholder="3,8" className={INPUT} />
                </label>
                <label className={LABEL}>
                  Nombre d&apos;avis
                  <input {...champ('nb_avis')} inputMode="numeric" placeholder="0" className={INPUT} />
                </label>
                <label className={LABEL}>
                  Téléphone
                  <input {...champ('telephone')} type="tel" maxLength={40} placeholder="04 93 00 00 00" className={INPUT} />
                </label>
                <label className={LABEL}>
                  Coordonnées *
                  <input {...champ('coordonnees')} required placeholder="43.58123, 7.12456" className={INPUT} />
                  <span className={coordsSaisies && !coords ? 'text-[#ef4343]' : 'text-[#6a6a6a] font-normal'}>
                    {coordsSaisies && !coords
                      ? 'Format non reconnu. Exemple attendu : 43.58123, 7.12456'
                      : coords
                        ? `Position : ${coords.lat}, ${coords.lng}`
                        : 'Dans Google Maps : clic droit sur le lieu, puis clic sur les coordonnées pour les copier.'}
                  </span>
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-[44px] px-5 rounded-xl bg-gold text-[#12100e] text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? 'Ajout…' : 'Ajouter le commerce'}
                  </button>
                </div>
              </form>
            </section>

            {/* b) Commerces de ce vendeur */}
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-white">Commerces sur sa carte ({prospects.length})</h2>
              <div className="bg-[#171717] border border-[#292929] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px]">
                    <thead>
                      <tr className="border-b border-[#292929]">
                        <th className={TH}>Commerce</th>
                        <th className={TH}>Note</th>
                        <th className={TH}>Téléphone</th>
                        <th className={TH}>Statut</th>
                        <th className={TH}>Ajouté le</th>
                        <th className={`${TH} text-right`}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prospects.map((p) => (
                        <tr key={p.id} className="border-b border-[#292929] last:border-b-0">
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-white">{p.nom}</span>
                              <span className="text-xs text-[#8c8c8c]">
                                {p.adresse ?? `${p.lat}, ${p.lng}`}
                                {!p.manuel && ' · trouvé par Google'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-[#c7c7c7]">
                            {p.note != null ? `★ ${p.note.toFixed(1).replace('.', ',')}` : '—'} · {p.nb_avis} avis
                          </td>
                          <td className="p-4 text-sm text-[#c7c7c7]">{p.telephone ?? '—'}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: statutColor(p.statut) }}>
                              <span className="w-2 h-2 rounded-full" style={{ background: statutColor(p.statut) }} />
                              {statutLabel(p.statut)}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-[#c7c7c7]">{formatDateFr(p.created_at)}</td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => supprimer(p)}
                              disabled={!!busyId}
                              className="px-3 py-1.5 text-xs rounded-lg font-medium bg-[#292929] border border-[#3a3a3a] text-[#e5e5e5] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {busyId === p.id ? '…' : 'Supprimer'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {prospects.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-sm text-[#8c8c8c]">
                            Aucun commerce sur la carte de ce vendeur.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
