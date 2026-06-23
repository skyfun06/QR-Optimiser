// Génération des exports du rapport mensuel (PDF imprimable + CSV Excel).
// Utilisé côté client depuis le dashboard. jsPDF est importé dynamiquement
// pour ne pas alourdir le bundle initial.

export type ReportMetrics = {
  avisCollectes: number
  noteMoyenne: number | null
  satisfaction: number | null
  scans: number
  googleGenerated: number
  intercepted: number
}

type ReviewLike = { rating: number | null; created_at?: string | null }
type FeedbackLike = {
  rating: number | null
  message: string | null
  created_at?: string | null
  status?: string | null
}

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'commerce'
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// -----------------------------------------------------------------------------
// PDF — vectoriel, fond CLAIR (imprimable), accents or
// -----------------------------------------------------------------------------

export async function generateReportPdf(opts: {
  businessName: string
  periodLabel: string
  rangeText: string
  metrics: ReportMetrics
  bilan?: string | null
}) {
  const { businessName, periodLabel, rangeText, metrics, bilan } = opts
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const M = 18
  const GOLD = { r: 201, g: 151, b: 58 }
  const DARK = { r: 26, g: 26, b: 26 }
  const MUTED = { r: 120, g: 120, b: 120 }
  const name = (businessName || 'Votre commerce').trim()

  // Bandeau d'en-tête crème + filet or
  doc.setFillColor(250, 248, 243)
  doc.rect(0, 0, W, 34, 'F')
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b)
  doc.rect(0, 0, W, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(GOLD.r, GOLD.g, GOLD.b)
  doc.setFontSize(20)
  doc.text('ScanAvis', M, 16)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.setFontSize(10)
  doc.text('Rapport de réputation', M, 23)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(DARK.r, DARK.g, DARK.b)
  doc.setFontSize(13)
  doc.text(name, W - M, 15, { align: 'right', maxWidth: 90 })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.setFontSize(9)
  doc.text(periodLabel, W - M, 22, { align: 'right' })

  // Titre de section + plage de dates
  let y = 48
  doc.setTextColor(DARK.r, DARK.g, DARK.b)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Synthèse', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.setFontSize(9)
  doc.text(rangeText, W - M, y, { align: 'right' })

  y += 4
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b)
  doc.setLineWidth(0.5)
  doc.line(M, y, W - M, y)

  // Grille de métriques
  y += 14
  const metricsArr = [
    { label: 'Avis collectés', value: String(metrics.avisCollectes) },
    { label: 'Note moyenne', value: metrics.noteMoyenne != null ? `${metrics.noteMoyenne.toFixed(1)} / 5` : '—' },
    { label: 'Satisfaction', value: metrics.satisfaction != null ? `${Math.round(metrics.satisfaction)} %` : '—' },
    { label: 'Scans QR', value: String(metrics.scans) },
    { label: 'Avis Google générés', value: String(metrics.googleGenerated) },
    { label: 'Négatifs interceptés', value: String(metrics.intercepted) },
  ]
  const cols = 3
  const colW = (W - 2 * M) / cols
  const rowH = 26
  metricsArr.forEach((m, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = M + col * colW
    const yy = y + row * rowH
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(DARK.r, DARK.g, DARK.b)
    doc.setFontSize(22)
    doc.text(m.value, x, yy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    doc.setFontSize(9)
    doc.text(m.label, x, yy + 6)
  })

  y += Math.ceil(metricsArr.length / cols) * rowH + 4

  // Bilan du mois (optionnel — alimenté par la Tâche 3 si dispo)
  if (bilan && bilan.trim()) {
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.2)
    doc.line(M, y, W - M, y)
    y += 12
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(GOLD.r, GOLD.g, GOLD.b)
    doc.setFontSize(13)
    doc.text('Bilan du mois', M, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(11)
    const lines = doc.splitTextToSize(bilan.trim(), W - 2 * M)
    doc.text(lines, M, y)
    y += lines.length * 5.5
  }

  // Pied de page
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.setFontSize(8)
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Généré le ${today} · Propulsé par ScanAvis`, M, 287)

  doc.save(`rapport-${slugify(name)}.pdf`)
}

// -----------------------------------------------------------------------------
// CSV — UTF-8 + BOM, séparateur ';' (ouverture propre dans Excel FR)
// -----------------------------------------------------------------------------

export function generateReportCsv(opts: {
  businessName: string
  reviews: ReviewLike[]
  feedbacks: FeedbackLike[]
}) {
  const { businessName, reviews, feedbacks } = opts
  const SEP = ';'
  const header = ['Date', 'Type', 'Note', 'Canal', 'Message', 'Statut']

  const parse = (iso?: string | null) => {
    if (!iso) return NaN
    return new Date(iso).getTime()
  }
  const fmtDate = (iso?: string | null) => {
    const t = parse(iso)
    return Number.isNaN(t) ? '' : new Date(t).toLocaleString('fr-FR')
  }

  type Line = { t: number; cells: string[] }
  const lines: Line[] = []

  for (const r of reviews) {
    const canal = (r.rating ?? 0) >= 4 ? 'Google' : 'Privé'
    lines.push({
      t: parse(r.created_at),
      cells: [fmtDate(r.created_at), 'Avis', r.rating != null ? String(r.rating) : '', canal, '', ''],
    })
  }
  for (const f of feedbacks) {
    lines.push({
      t: parse(f.created_at),
      cells: [
        fmtDate(f.created_at),
        'Commentaire',
        f.rating != null ? String(f.rating) : '',
        'Privé',
        f.message?.trim() ?? '',
        f.status === 'traite' ? 'Traité' : 'Nouveau',
      ],
    })
  }

  lines.sort((a, b) => {
    const ta = Number.isNaN(a.t) ? -Infinity : a.t
    const tb = Number.isNaN(b.t) ? -Infinity : b.t
    return tb - ta
  })

  const esc = (v: string) => {
    const s = v ?? ''
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const csv = [header, ...lines.map((l) => l.cells)]
    .map((row) => row.map(esc).join(SEP))
    .join('\r\n')

  const BOM = String.fromCharCode(0xfeff)
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `donnees-${slugify(businessName)}.csv`)
}
