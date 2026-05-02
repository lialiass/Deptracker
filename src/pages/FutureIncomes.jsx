import { useState, useMemo } from 'react'
import Card from '../components/Card'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'
import { incomeStatus, incomeStatusLabel, fmtDateLong, nextOccurrence, FREQ_LABELS } from '../logic/incomes'
import { computeBalances } from '../logic/balances'
import { buildDebtList } from '../logic/plan'
import './FutureIncomes.css'

function eur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

const STATUS_LABELS = {
  overdue: 'En retard',
  soon:    'Bientôt',
  future:  'À venir',
  recur:   '↻ Récurrent',
}

export default function FutureIncomes({ incomes, entities, operations, addIncome, updateIncome, deleteIncome, executeCashIn }) {
  const [formOpen,  setFormOpen]  = useState(false)
  const [cashOpen,  setCashOpen]  = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [cashState, setCashState] = useState(null)
  const [form,      setForm]      = useState(defaultForm())

  const bal = useMemo(() => computeBalances(operations, entities), [operations, entities])

  function defaultForm() {
    return {
      amount:   '',
      date:     new Date().toISOString().split('T')[0],
      label:    '',
      dest_id:  '',
      freq:     'once',
      end_date: '',
    }
  }

  function openAdd() {
    setEditId(null); setForm(defaultForm()); setFormOpen(true)
  }

  function openEdit(inc) {
    setEditId(inc.id)
    setForm({
      amount:   inc.amount,
      date:     inc.date,
      label:    inc.label || '',
      dest_id:  inc.dest_id || '',
      freq:     inc.freq || 'once',
      end_date: inc.end_date || '',
    })
    setFormOpen(true)
  }

  async function handleSave() {
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0)    { toast('Montant invalide', 'error'); return }
    if (!form.date)          { toast('Date requise', 'error'); return }
    if (!form.dest_id)       { toast('Compte de réception requis', 'error'); return }

    const payload = {
      amount:   amt,
      date:     form.date,
      label:    form.label.trim(),
      dest_id:  form.dest_id || null,
      freq:     form.freq,
      end_date: form.end_date || null,
    }
    try {
      if (editId) {
        await updateIncome(editId, payload); toast('Revenu mis à jour ✓')
      } else {
        await addIncome(payload); toast('Revenu enregistré ✓')
      }
      setFormOpen(false)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce revenu ?')) return
    try { await deleteIncome(id); toast('Revenu supprimé') }
    catch (err) { toast(err.message, 'error') }
  }

  function openCash(inc) {
    const next = nextOccurrence(inc)
    const dest = inc.dest_id ? entities.find(e => e.id === inc.dest_id) : null
    setCashState({ incId: inc.id, step: 1, amount: inc.amount, destId: inc.dest_id, occDate: next || inc.date, alloc: {}, dest })
    setCashOpen(true)
  }

  const debts = useMemo(() => {
    if (!cashState) return []
    return buildDebtList(operations, entities, bal, cashState.destId)
  }, [cashState, operations, entities, bal])

  const totalAlloc = cashState ? Object.values(cashState.alloc).reduce((s, v) => s + (v || 0), 0) : 0
  const over       = totalAlloc > (cashState?.amount || 0)
  const pct        = cashState?.amount > 0 ? Math.min(100, totalAlloc / cashState.amount * 100) : 0

  async function handleCashConfirm() {
    try {
      await executeCashIn({
        incId:  cashState.incId,
        amount: cashState.amount,
        destId: cashState.destId,
        alloc:  cashState.alloc,
      })
      setCashOpen(false)
      toast(`✓ ${eur(cashState.amount)} encaissé`)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const cashFooter = cashState && (
    <>
      {cashState.step === 1 && <>
        <button className="btn btn-secondary" onClick={() => setCashOpen(false)}>Annuler</button>
        <button className="btn btn-primary"   onClick={() => setCashState(s => ({ ...s, step: 2 }))}>Suivant →</button>
      </>}
      {cashState.step === 2 && <>
        <button className="btn btn-secondary" onClick={() => setCashState(s => ({ ...s, step: 1 }))}>← Retour</button>
        <button className="btn btn-primary"   onClick={() => setCashState(s => ({ ...s, step: 3 }))} disabled={over}>Valider →</button>
      </>}
      {cashState.step === 3 && <>
        <button className="btn btn-secondary" onClick={() => setCashState(s => ({ ...s, step: 2 }))}>← Retour</button>
        <button className="btn btn-primary"   onClick={handleCashConfirm}>✓ Confirmer</button>
      </>}
    </>
  )

  const sorted = [...incomes].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Revenus futurs</h1>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">↓</div>
          <div className="empty-state-title">Aucun revenu planifié</div>
          <p>Ajoutez vos revenus attendus pour les suivre.</p>
        </div>
      ) : (
        <div className="section">
          <div className="entity-grid">
            {sorted.map(inc => {
              const status = incomeStatus(inc)
              const next   = incomeStatus(inc) === 'recur' ? nextOccurrence(inc) : inc.date
              const destName = inc.dest_id ? (entities.find(e => e.id === inc.dest_id)?.name || '—') : '—'
              return (
                <Card key={inc.id}>
                  <div className="inc-card">
                    <div className="inc-card-top">
                      <div className="inc-card-info">
                        <div className="inc-card-label">{inc.label || 'Revenu sans libellé'}</div>
                        <div className="inc-card-dest">→ {destName}</div>
                      </div>
                      <div className="inc-card-amount c-green">{eur(inc.amount)}</div>
                    </div>

                    <div className="inc-card-meta">
                      <span className={`status-badge ${status}`}>{STATUS_LABELS[status]}</span>
                      <span className="inc-card-date">{incomeStatusLabel(next || inc.date)}</span>
                      {inc.freq !== 'once' && <span className="inc-card-freq">{FREQ_LABELS[inc.freq]}</span>}
                    </div>

                    <div className="inc-card-actions">
                      <button className="btn btn-secondary inc-btn" onClick={() => openEdit(inc)}>✎ Modifier</button>
                      <button className="btn btn-primary  inc-btn" onClick={() => openCash(inc)}>↓ Encaisser</button>
                      <button className="ent-action-btn danger" onClick={() => handleDelete(inc.id)}>✕</button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <button className="fab" onClick={openAdd}>+</button>

      {/* Modal ajout/édition */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Modifier le revenu' : 'Ajouter un revenu'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>Annuler</button>
            <button className="btn btn-primary"   onClick={handleSave}>
              {editId ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Montant</label>
          <input type="number" placeholder="Ex : 1200" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            min="0.01" step="0.01" inputMode="decimal" />
        </div>
        <div className="form-group">
          <label className="form-label">Libellé (source)</label>
          <input type="text" placeholder="Ex : Salaire, Loyer reçu..." value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Date attendue</label>
          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Compte de réception</label>
          <select value={form.dest_id} onChange={e => setForm(f => ({ ...f, dest_id: e.target.value }))}>
            <option value="">— Choisir —</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Fréquence</label>
          <select value={form.freq} onChange={e => setForm(f => ({ ...f, freq: e.target.value }))}>
            {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {form.freq !== 'once' && (
          <div className="form-group">
            <label className="form-label">Date de fin (optionnel)</label>
            <input type="date" value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
        )}
      </Modal>

      {/* Modal encaissement */}
      <Modal
        open={cashOpen}
        onClose={() => setCashOpen(false)}
        title="Encaisser un revenu"
        subtitle={cashState && (incomes.find(i => i.id === cashState.incId)?.label || 'Revenu')}
        footer={cashFooter}
      >
        {cashState && (
          <>
            {/* Indicateur d'étapes */}
            <div className="cash-steps">
              {['Confirmation','Répartition','Validation'].map((s, i) => {
                const n = i + 1
                const cls = n < cashState.step ? 'done' : n === cashState.step ? 'active' : ''
                return (
                  <div key={n} className={`cash-step-dot ${cls}`}>
                    <div className="dot">{n < cashState.step ? '✓' : n}</div>
                    <span>{s}</span>
                  </div>
                )
              })}
            </div>

            {cashState.step === 1 && (
              <div className="cash-info">
                {!cashState.dest ? (
                  <div className="cash-error">
                    Aucun compte de réception défini. Fermez et modifiez ce revenu pour ajouter un compte.
                  </div>
                ) : (
                  <>
                    <CashRow label="Montant encaissé" value={<span className="c-green fw-600">{eur(cashState.amount)}</span>} />
                    <CashRow label="Date" value={fmtDateLong(cashState.occDate)} />
                    <CashRow label="Compte de réception" value={<strong>{cashState.dest.name}</strong>} />
                  </>
                )}
              </div>
            )}

            {cashState.step === 2 && (
              <div className="cash-alloc">
                <div className="budget-bar-wrap">
                  <div className="budget-bar-labels">
                    <span>Réparti : <strong>{eur(totalAlloc)}</strong></span>
                    <span>Disponible : <strong className="c-green">{eur(cashState.amount)}</strong></span>
                  </div>
                  <div className="budget-bar-bg">
                    <div className={`budget-bar-fill ${over ? 'over' : ''}`} style={{ width: pct + '%' }} />
                  </div>
                </div>
                {over && <div className="cash-error">Le total dépasse le montant encaissé.</div>}
                {debts.length === 0 ? (
                  <div className="cash-no-debts">Aucune dette ouverte — le montant sera simplement crédité.</div>
                ) : (
                  <div className="alloc-list">
                    {debts.map(d => {
                      const key = d.creditorId + '|' + d.debtorId
                      return (
                        <div key={key} className="alloc-item">
                          <div className="alloc-item-body">
                            <div className="alloc-item-name">{d.label}</div>
                            <div className="alloc-item-owed">Restant dû : {eur(d.amount)}</div>
                          </div>
                          <div className="alloc-item-right">
                            <input
                              type="number"
                              className="alloc-input"
                              placeholder="0"
                              min="0" step="0.01"
                              value={cashState.alloc[key] || ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0
                                setCashState(s => ({ ...s, alloc: { ...s.alloc, [key]: val } }))
                              }}
                            />
                            <button
                              className="alloc-all-btn"
                              onClick={() => {
                                const otherTotal = Object.entries(cashState.alloc)
                                  .filter(([k]) => k !== key)
                                  .reduce((s, [, v]) => s + (v || 0), 0)
                                const avail = Math.max(0, cashState.amount - otherTotal)
                                const val   = Math.min(d.amount, avail)
                                setCashState(s => ({ ...s, alloc: { ...s.alloc, [key]: val } }))
                              }}
                            >Tout</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {cashState.step === 3 && (
              <div className="recap-list">
                <div className="recap-row credit">
                  <span>Revenu encaissé{cashState.dest ? ' — ' + cashState.dest.name : ''}</span>
                  <span>+{eur(cashState.amount)}</span>
                </div>
                {Object.entries(cashState.alloc).filter(([,v]) => v > 0).map(([key, v]) => {
                  const [credId, debId] = key.split('|')
                  const cred = entities.find(e => e.id === credId)
                  const deb  = entities.find(e => e.id === debId)
                  const lbl  = cred && deb ? `${deb.name} → ${cred.name}` : key
                  return (
                    <div key={key} className="recap-row debit">
                      <span>Remboursement {lbl}</span>
                      <span>−{eur(v)}</span>
                    </div>
                  )
                })}
                <div className="recap-row neutral">
                  <span>Reste disponible</span>
                  <span>{eur(Math.max(0, cashState.amount - totalAlloc))}</span>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

function CashRow({ label, value }) {
  return (
    <div className="cash-info-row">
      <span className="cash-info-label">{label}</span>
      <span>{value}</span>
    </div>
  )
}
