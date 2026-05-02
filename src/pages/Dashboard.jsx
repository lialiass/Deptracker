import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import { computeBalances, netBalance } from '../logic/balances'
import { buildPlan, simulateAmount } from '../logic/plan'
import { toast } from '../components/Toast'
import './Dashboard.css'

function eur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Dashboard({ entities, operations, incomes, updateEntity, addOperation }) {
  const navigate = useNavigate()
  const [simAmount, setSimAmount] = useState('')
  const [simResult, setSimResult] = useState(null)

  const bal = useMemo(() => computeBalances(operations, entities), [operations, entities])

  const totalIOwe    = useMemo(() => entities.reduce((s, e) => s + (bal[e.id]?.iOwe    || 0), 0), [entities, bal])
  const totalTheyOwe = useMemo(() => entities.reduce((s, e) => s + (bal[e.id]?.theyOwe || 0), 0), [entities, bal])
  const net          = totalTheyOwe - totalIOwe

  const plan  = useMemo(() => buildPlan(operations, entities, bal), [operations, entities, bal])
  const banks  = entities.filter(e => e.category === 'bank')
  const persons = entities.filter(e => e.category === 'person')

  function runSimulate() {
    const amount = parseFloat(simAmount)
    if (!amount || amount <= 0) return
    const result = simulateAmount(amount, operations, entities, bal)
    setSimResult(result)
  }

  async function executeRepayment(creditorId, debtorId, amount, label) {
    try {
      const today = new Date().toISOString().split('T')[0]
      await addOperation({
        date:    today,
        amount,
        from_id: debtorId || '__ME__',
        to_id:   creditorId,
        type:    'repay_out',
        comment: label || 'Remboursement depuis le plan',
      })

      // Ajuster les soldes réels
      const debtor   = entities.find(e => e.id === debtorId)
      const creditor = entities.find(e => e.id === creditorId)
      if (debtor?.real_balance !== null && debtor?.real_balance !== undefined) {
        await updateEntity(debtorId, { real_balance: (debtor.real_balance || 0) - amount })
      }
      if (creditor?.real_balance !== null && creditor?.real_balance !== undefined) {
        await updateEntity(creditorId, { real_balance: (creditor.real_balance || 0) + amount })
      }
      toast('✓ ' + label)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <button className="icon-btn" onClick={() => navigate('/settings')}>⚙</button>
      </div>

      {/* Métriques */}
      <div className="metrics-row">
        <MetricCard label="Je dois" value={eur(totalIOwe)} color="danger" />
        <MetricCard label="On me doit" value={eur(totalTheyOwe)} color="green" />
        <MetricCard label="Solde net" value={eur(Math.abs(net))} color={net >= 0 ? 'green' : 'danger'} sign={net >= 0 ? '+' : '−'} />
      </div>

      {/* Comptes */}
      {banks.length > 0 && (
        <div className="section">
          <div className="section-title">Comptes</div>
          <div className="entity-grid">
            {banks.map(e => <EntityCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} />)}
          </div>
        </div>
      )}

      {/* Proches */}
      {persons.length > 0 && (
        <div className="section">
          <div className="section-title">Proches</div>
          <div className="entity-grid">
            {persons.map(e => <EntityCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} />)}
          </div>
        </div>
      )}

      {/* Plan de remboursement */}
      <div className="section">
        <div className="section-title">Plan de remboursement</div>
        <Card>
          {/* Simulateur */}
          <div className="sim-row">
            <span className="sim-label">Si je reçois</span>
            <input
              type="number"
              className="sim-input"
              placeholder="Ex : 150"
              value={simAmount}
              onChange={e => { setSimAmount(e.target.value); setSimResult(null) }}
              min="0"
              step="1"
            />
            <button className="btn btn-secondary sim-btn" onClick={runSimulate}>→</button>
          </div>
          {simResult && (
            <div className="sim-result">
              {simResult.alloc.map((a, i) => (
                <div key={i} className="sim-alloc-row">
                  <span>{a.debtorName} → {a.creditorName}</span>
                  <span className="c-red fw-600">−{eur(a.pay)}</span>
                </div>
              ))}
              {simResult.remainder > 0 && (
                <div className="sim-alloc-row">
                  <span className="c-muted">Reste</span>
                  <span className="c-green fw-600">{eur(simResult.remainder)}</span>
                </div>
              )}
            </div>
          )}

          {/* Étapes */}
          {plan.length === 0 ? (
            <div className="plan-clear">✓ Aucune dette — situation équilibrée.</div>
          ) : (
            <div className={simResult ? 'plan-steps mt-16' : 'plan-steps'}>
              {plan.map((step, i) => (
                <PlanStep key={i} step={step} onExecute={executeRepayment} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ label, value, color, sign }) {
  const colorClass = color === 'green' ? 'c-green' : color === 'danger' ? 'c-red' : ''
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${colorClass}`}>
        {sign && <span className="metric-sign">{sign}</span>}
        {value}
      </div>
    </div>
  )
}

function EntityCard({ entity, bal }) {
  const net = netBalance ? netBalance(entity, { [entity.id]: bal }) : (bal.theyOwe - bal.iOwe)
  const nc  = net > 0 ? 'c-green' : net < 0 ? 'c-red' : 'c-muted'
  const realBal = entity.real_balance

  return (
    <Card>
      <div className="ent-card-head">
        <div className={`avatar ${entity.category}`}>{initials(entity.name)}</div>
        <div className="ent-card-info">
          <div className="ent-card-name">{entity.name}</div>
          <div className="ent-card-cat">{entity.category === 'bank' ? 'Compte' : entity.category === 'person' ? 'Proche' : 'Autre'}</div>
        </div>
      </div>

      {realBal !== null && realBal !== undefined && (
        <div className="ent-real-row">
          <span>Solde réel</span>
          <span className={entity.category === 'bank' ? 'c-blue' : 'c-purple'} style={{ fontWeight: 600 }}>
            {eur(realBal)}
          </span>
        </div>
      )}

      <div className="ent-rows">
        <div className="ent-row">
          <span>Dette</span>
          <span className={bal.iOwe > 0 ? 'c-red fw-600' : 'c-muted'}>{eur(bal.iOwe)}</span>
        </div>
        <div className="ent-row">
          <span>Créance</span>
          <span className={bal.theyOwe > 0 ? 'c-green fw-600' : 'c-muted'}>{eur(bal.theyOwe)}</span>
        </div>
        <div className="ent-row ent-net">
          <span>Solde net</span>
          <span className={nc + ' fw-600'}>
            {net >= 0 ? '+' : '−'}{eur(Math.abs(net))}
          </span>
        </div>
      </div>
    </Card>
  )
}

function PlanStep({ step, onExecute }) {
  const isPayStep = step.type === 'pay'
  return (
    <div className={`plan-step plan-step-${step.type}`}>
      <div className="plan-step-body">
        <div className="plan-step-label">
          {isPayStep
            ? `${step.debtorName} → ${step.creditorName}`
            : `Encaisser : ${step.debtorName}`
          }
        </div>
        <div className="plan-step-sub">{step.sub}</div>
      </div>
      <div className="plan-step-right">
        <div className={`plan-step-amount ${isPayStep ? 'c-red' : 'c-green'}`}>
          {isPayStep ? '−' : '+'}{eur(step.amount)}
        </div>
        {isPayStep && step.creditorId && step.debtorId && (
          <button
            className="plan-step-btn"
            onClick={() => onExecute(
              step.creditorId, step.debtorId, step.amount,
              `${step.debtorName} → ${step.creditorName}`
            )}
          >
            Régler
          </button>
        )}
      </div>
    </div>
  )
}
