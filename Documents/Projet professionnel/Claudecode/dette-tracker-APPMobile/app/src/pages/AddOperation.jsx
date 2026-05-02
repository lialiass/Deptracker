import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../components/Toast'
import './AddOperation.css'

const OP_TYPES = [
  { value: 'lend',        label: 'Prêt à un proche',       desc: 'J\'avance de l\'argent à quelqu\'un', color: 'green',  from: 'bank',   to: 'person' },
  { value: 'borrow',      label: 'Emprunt d\'un proche',   desc: 'Quelqu\'un m\'avance de l\'argent',   color: 'danger', from: 'person', to: 'me'     },
  { value: 'repay_out',   label: 'Je rembourse',           desc: 'Je règle une dette',                  color: 'green',  from: 'me',     to: 'any'    },
  { value: 'repay_in',    label: 'Remboursement reçu',     desc: 'Quelqu\'un me rembourse',             color: 'green',  from: 'person', to: 'bank'   },
  { value: 'transfer',    label: 'Transfert de comptes',   desc: 'Virement entre mes comptes',          color: 'blue',   from: 'bank',   to: 'bank'   },
  { value: 'self_borrow', label: 'Avance personnelle',     desc: 'J\'avance de l\'argent à moi-même',   color: 'blue',   from: 'bank',   to: 'bank'   },
  { value: 'adjust',      label: 'Ajustement manuel',      desc: 'Correction ou ajustement libre',      color: 'muted',  from: 'any',    to: 'any'    },
]

const OP_HINTS = {
  lend:        { from: 'Compte source',     to: 'Proche bénéficiaire'  },
  borrow:      { from: 'Proche prêteur',    to: 'Compte receveur'      },
  repay_out:   { from: 'Compte débité',     to: 'Créancier remboursé'  },
  repay_in:    { from: 'Proche rembourseur',to: 'Compte receveur'      },
  transfer:    { from: 'Compte source',     to: 'Compte destination'   },
  self_borrow: { from: 'Compte source',     to: 'Compte destination'   },
  adjust:      { from: 'Référence',         to: 'Entité ajustée'       },
}

const COLOR_CLASS = {
  green:  'type-green',
  danger: 'type-danger',
  blue:   'type-blue',
  muted:  'type-muted',
}

export default function AddOperation({ entities, addOperation }) {
  const navigate = useNavigate()
  const today    = new Date().toISOString().split('T')[0]

  const [type,       setType]       = useState('lend')
  const [amount,     setAmount]     = useState('')
  const [date,       setDate]       = useState(today)
  const [fromId,     setFromId]     = useState('')
  const [toId,       setToId]       = useState('')
  const [comment,    setComment]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const selectedType = OP_TYPES.find(o => o.value === type)
  const hints        = OP_HINTS[type] || { from: 'Source', to: 'Destination' }

  const banks   = entities.filter(e => e.category === 'bank')
  const persons = entities.filter(e => e.category === 'person')

  function entitiesFor(side) {
    const cat = side === 'from' ? selectedType?.from : selectedType?.to
    if (cat === 'bank')   return banks
    if (cat === 'person') return persons
    if (cat === 'me')     return []
    return entities
  }

  function selectType(v) {
    setType(v)
    setFromId('')
    setToId('')
    setPickerOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast('Montant invalide', 'error'); return }
    if (!date)            { toast('Date requise', 'error'); return }

    setLoading(true)
    try {
      await addOperation({
        date,
        amount: amt,
        from_id: fromId || '__ME__',
        to_id:   toId   || '__ME__',
        type,
        comment: comment.trim(),
      })
      toast('Opération enregistrée ✓')
      setAmount(''); setFromId(''); setToId(''); setComment('')
      navigate('/')
    } catch (err) {
      toast(err.message, 'error')
    }
    setLoading(false)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Ajouter</h1>
      </div>

      <form className="add-op-form" onSubmit={handleSubmit}>
        <div className="section">

          {/* 1. Montant */}
          <div className="form-group">
            <label className="form-label">Montant</label>
            <div className="amount-field">
              <span className="amount-currency">€</span>
              <input
                type="number"
                className="amount-input"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
              />
            </div>
          </div>

          {/* 2. Type d'opération */}
          <div className="form-group">
            <label className="form-label">Type d'opération</label>
            <button
              type="button"
              className={`type-picker-btn ${COLOR_CLASS[selectedType?.color] || ''}`}
              onClick={() => setPickerOpen(true)}
            >
              <span className="type-picker-label">{selectedType?.label || '— Choisir —'}</span>
              <span className="type-picker-desc">{selectedType?.desc}</span>
              <span className="type-picker-chevron">›</span>
            </button>
          </div>

          {/* 3. Source */}
          {entitiesFor('from').length > 0 && (
            <div className="form-group">
              <label className="form-label">{hints.from}</label>
              <select value={fromId} onChange={e => setFromId(e.target.value)}>
                <option value="">— Choisir —</option>
                {entitiesFor('from').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 4. Destination */}
          {entitiesFor('to').length > 0 && (
            <div className="form-group">
              <label className="form-label">{hints.to}</label>
              <select value={toId} onChange={e => setToId(e.target.value)}>
                <option value="">— Choisir —</option>
                {entitiesFor('to').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Date */}
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          {/* 6. Commentaire */}
          <div className="form-group">
            <label className="form-label">Commentaire <span className="form-label-opt">(optionnel)</span></label>
            <input
              type="text"
              placeholder="Note libre..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Picker type d'opération — sheet */}
      {pickerOpen && (
        <div className="picker-overlay" onClick={() => setPickerOpen(false)}>
          <div className="picker-sheet" onClick={e => e.stopPropagation()}>
            <div className="picker-handle" />
            <div className="picker-title">Type d'opération</div>
            <div className="picker-list">
              {OP_TYPES.map(op => (
                <button
                  key={op.value}
                  type="button"
                  className={`picker-item ${type === op.value ? 'active' : ''}`}
                  onClick={() => selectType(op.value)}
                >
                  <div className="picker-item-body">
                    <span className="picker-item-label">{op.label}</span>
                    <span className="picker-item-desc">{op.desc}</span>
                  </div>
                  {type === op.value && <span className="picker-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
