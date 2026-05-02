import { useState, useMemo } from 'react'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'
import { computeBalances, netBalance } from '../logic/balances'
import './Entities.css'

function eurFull(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Entities({ entities, operations, addEntity, updateEntity, deleteEntity }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState({ name: '', category: 'bank', note: '', real_balance: '' })

  const bal = useMemo(() => computeBalances(operations, entities), [operations, entities])

  function openAdd() {
    setEditing(null)
    setForm({ name: '', category: 'bank', note: '', real_balance: '' })
    setModalOpen(true)
  }

  function openEdit(entity) {
    setEditing(entity)
    setForm({
      name:         entity.name,
      category:     entity.category,
      note:         entity.note || '',
      real_balance: entity.real_balance !== null && entity.real_balance !== undefined ? entity.real_balance : '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast('Nom requis', 'error'); return }
    const payload = {
      name:         form.name.trim(),
      category:     form.category,
      note:         form.note.trim(),
      real_balance: form.real_balance !== '' ? parseFloat(form.real_balance) : null,
    }
    try {
      if (editing) {
        await updateEntity(editing.id, payload)
        toast('Entité mise à jour ✓')
      } else {
        await addEntity(payload)
        toast('Entité ajoutée ✓')
      }
      setModalOpen(false)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette entité ?')) return
    try {
      await deleteEntity(id)
      toast('Entité supprimée')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const banks   = entities.filter(e => e.category === 'bank')
  const persons = entities.filter(e => e.category === 'person')
  const others  = entities.filter(e => e.category !== 'bank' && e.category !== 'person')

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Entités</h1>
      </div>

      {entities.length === 0 ? (
        <div className="onboarding-banner">
          <div className="onboarding-icon">⊞</div>
          <div className="onboarding-title">Bienvenue sur Debt Tracker</div>
          <p className="onboarding-text">
            Commencez par ajouter vos <strong>comptes bancaires</strong> et vos <strong>proches</strong>.<br />
            Cela vous permettra de suivre dettes et créances facilement.
          </p>
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 16 }}>
            + Ajouter ma première entité
          </button>
        </div>
      ) : (
        <>
          {banks.length > 0   && <EntitySection title="Comptes" items={banks}   bal={bal} onEdit={openEdit} onDelete={handleDelete} />}
          {persons.length > 0 && <EntitySection title="Proches" items={persons} bal={bal} onEdit={openEdit} onDelete={handleDelete} />}
          {others.length > 0  && <EntitySection title="Autres"  items={others}  bal={bal} onEdit={openEdit} onDelete={handleDelete} />}
        </>
      )}

      <button className="fab" onClick={openAdd}>+</button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier l'entité" : 'Nouvelle entité'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
            <button className="btn btn-primary"   onClick={handleSave}>
              {editing ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nom</label>
          <input
            type="text"
            placeholder="Ex : Boursorama, Alice..."
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Catégorie</label>
          <div className="cat-chips">
            {[['bank','Compte'],['person','Proche'],['other','Autre']].map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={`cat-chip ${form.category === v ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, category: v }))}
              >{l}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Solde réel (optionnel)</label>
          <input
            type="number"
            placeholder="Ex : 1500"
            value={form.real_balance}
            onChange={e => setForm(f => ({ ...f, real_balance: e.target.value }))}
            step="0.01"
            inputMode="decimal"
          />
          <span className="form-hint">Montant actuel sur ce compte ou avec cette personne.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Note (optionnel)</label>
          <input
            type="text"
            placeholder="Note libre..."
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  )
}

function EntitySection({ title, items, bal, onEdit, onDelete }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      <div className="ent-grid-2">
        {items.map(e => (
          <EntityCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

function EntityCard({ entity, bal, onEdit, onDelete }) {
  const net      = netBalance(entity, { [entity.id]: bal })
  const nc       = net > 0 ? 'c-green' : net < 0 ? 'c-red' : 'c-muted'
  const realBal  = entity.real_balance
  const hasReal  = realBal !== null && realBal !== undefined
  const realColor = entity.category === 'bank' ? 'c-blue' : entity.category === 'person' ? 'c-purple' : ''

  return (
    <div className="ent-card-mgmt">
      {/* Header */}
      <div className="ent-card-header">
        <div className={`avatar avatar-sm ${entity.category}`}>{initials(entity.name)}</div>
        <span className="ent-card-name-txt">{entity.name}</span>
      </div>

      {/* 4 valeurs */}
      <div className="ent-card-vals">
        <div className="ent-val-row">
          <span className="ent-val-lbl">Solde réel</span>
          <span className={hasReal ? realColor + ' fw-600' : 'c-muted'}>
            {hasReal ? eurFull(realBal) : '—'}
          </span>
        </div>
        <div className="ent-val-row">
          <span className="ent-val-lbl">Dette</span>
          <span className={bal.iOwe > 0.005 ? 'c-red fw-600' : 'c-muted'}>{eurFull(bal.iOwe)}</span>
        </div>
        <div className="ent-val-row">
          <span className="ent-val-lbl">Créance</span>
          <span className={bal.theyOwe > 0.005 ? 'c-green fw-600' : 'c-muted'}>{eurFull(bal.theyOwe)}</span>
        </div>
        <div className="ent-val-row ent-val-net">
          <span className="ent-val-lbl">Solde net</span>
          <span className={nc + ' fw-700'}>{net >= 0 ? '+' : '−'}{eurFull(Math.abs(net))}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="ent-card-actions">
        <button className="ent-act-btn" onClick={() => onEdit(entity)}>Modifier</button>
        <button className="ent-act-btn danger" onClick={() => onDelete(entity.id)}>Supprimer</button>
      </div>
    </div>
  )
}
