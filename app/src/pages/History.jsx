import { useState, useMemo } from 'react'
import Card from '../components/Card'
import { toast } from '../components/Toast'
import './History.css'

function eur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

const OP_LABELS = {
  lend:           { label: 'Prêt à un proche',       color: 'green',  icon: '↗' },
  borrow:         { label: 'Emprunt',                  color: 'danger', icon: '↙' },
  repay_out:      { label: 'Remboursement',            color: 'green',  icon: '✓' },
  repay_in:       { label: 'Remboursement reçu',       color: 'green',  icon: '✓' },
  transfer:       { label: 'Transfert',                color: 'blue',   icon: '⇄' },
  self_borrow:    { label: 'Avance personnelle',       color: 'blue',   icon: '↙' },
  income_received:{ label: 'Revenu encaissé',          color: 'green',  icon: '↓' },
  adjust:         { label: 'Ajustement',               color: 'muted',  icon: '~' },
}

export default function History({ operations, entities, deleteOperation }) {
  const [search,    setSearch]    = useState('')
  const [typeFilter,setTypeFilter]= useState('')
  const [entFilter, setEntFilter] = useState('')

  const entityMap = useMemo(() => {
    const m = {}
    entities.forEach(e => { m[e.id] = e.name })
    return m
  }, [entities])

  function entityName(id) {
    if (!id || id === '__ME__' || id === '__self__' || id === '__lender__') return 'Moi'
    return entityMap[id] || id
  }

  const filtered = useMemo(() => {
    return operations.filter(op => {
      if (typeFilter && op.type !== typeFilter) return false
      if (entFilter  && op.from_id !== entFilter && op.to_id !== entFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const label = (op.comment || '') + entityName(op.from_id) + entityName(op.to_id) + (op.type || '')
        if (!label.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [operations, typeFilter, entFilter, search, entityMap])

  // Grouper par date
  const grouped = useMemo(() => {
    const m = {}
    filtered.forEach(op => {
      const d = op.date || '?'
      if (!m[d]) m[d] = []
      m[d].push(op)
    })
    return Object.entries(m).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  async function handleDelete(id) {
    if (!confirm('Supprimer cette opération ?')) return
    try {
      await deleteOperation(id)
      toast('Opération supprimée')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Historique</h1>
      </div>

      <div className="section">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="hist-search"
        />
        <div className="hist-filters">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Tous les types</option>
            {Object.entries(OP_LABELS).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select value={entFilter} onChange={e => setEntFilter(e.target.value)}>
            <option value="">Toutes les entités</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">≡</div>
          <div className="empty-state-title">Aucune opération</div>
          <p>L'historique de vos transactions apparaîtra ici.</p>
        </div>
      ) : (
        grouped.map(([date, ops]) => (
          <div className="section" key={date}>
            <div className="hist-date-header">{formatDate(date)}</div>
            <div className="entity-grid">
              {ops.map(op => (
                <Card key={op.id}>
                  <div className="hist-item">
                    <div className={`hist-icon color-${(OP_LABELS[op.type] || {}).color || 'muted'}`}>
                      {(OP_LABELS[op.type] || {}).icon || '?'}
                    </div>
                    <div className="hist-item-body">
                      <div className="hist-item-type">
                        {(OP_LABELS[op.type] || {}).label || op.type}
                      </div>
                      <div className="hist-item-parties">
                        {entityName(op.from_id)} → {entityName(op.to_id)}
                      </div>
                      {op.comment && <div className="hist-item-comment">{op.comment}</div>}
                    </div>
                    <div className="hist-item-right">
                      <div className={`hist-amount color-${(OP_LABELS[op.type] || {}).color || 'muted'}`}>
                        {eur(op.amount)}
                      </div>
                      <button className="hist-delete-btn" onClick={() => handleDelete(op.id)}>✕</button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === '?') return 'Date inconnue'
  const d = new Date(dateStr + 'T12:00:00')
  const today    = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const dt = new Date(dateStr + 'T00:00:00')
  if (dt.getTime() === today.getTime())     return "Aujourd'hui"
  if (dt.getTime() === yesterday.getTime()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
