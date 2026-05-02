// Logique pure — revenus futurs

export const FREQ_LABELS = {
  once:       'Ponctuel',
  weekly:     'Hebdomadaire',
  monthly:    'Mensuel',
  bimonthly:  'Tous les 2 mois',
  quarterly:  'Tous les 3 mois',
  annual:     'Annuel',
}

export function incomeStatus(inc) {
  const freq = inc.freq || 'once'
  if (freq !== 'once') return 'recur'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(inc.date + 'T00:00:00')
  const diff = Math.round((d - today) / 86400000)
  if (diff < 0)  return 'overdue'
  if (diff <= 7) return 'soon'
  return 'future'
}

export function incomeStatusLabel(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((d - today) / 86400000)
  if (diff < 0)   return `En retard de ${-diff}j`
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff <= 7)  return `Dans ${diff} jours`
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateLong(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function nextOccurrence(inc) {
  const freq = inc.freq || 'once'
  if (freq === 'once') return inc.date
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let cur = new Date(inc.date + 'T00:00:00')
  let safety = 0
  while (cur < today && safety++ < 500) {
    switch (freq) {
      case 'weekly':    cur.setDate(cur.getDate() + 7);        break
      case 'monthly':   cur.setMonth(cur.getMonth() + 1);      break
      case 'bimonthly': cur.setMonth(cur.getMonth() + 2);      break
      case 'quarterly': cur.setMonth(cur.getMonth() + 3);      break
      case 'annual':    cur.setFullYear(cur.getFullYear() + 1); break
      default: return inc.date
    }
  }
  if (inc.end_date && cur > new Date(inc.end_date + 'T00:00:00')) return null
  return cur.toISOString().split('T')[0]
}

export function advanceRecurrence(inc) {
  const freq = inc.freq || 'once'
  if (freq === 'once') return inc
  const cur = new Date(inc.date + 'T00:00:00')
  switch (freq) {
    case 'weekly':    cur.setDate(cur.getDate() + 7);        break
    case 'monthly':   cur.setMonth(cur.getMonth() + 1);      break
    case 'bimonthly': cur.setMonth(cur.getMonth() + 2);      break
    case 'quarterly': cur.setMonth(cur.getMonth() + 3);      break
    case 'annual':    cur.setFullYear(cur.getFullYear() + 1); break
  }
  return { ...inc, date: cur.toISOString().split('T')[0] }
}
