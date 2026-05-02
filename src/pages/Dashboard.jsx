import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeBalances, netBalance } from '../logic/balances'
import './Dashboard.css'

function eur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Dashboard({ entities, operations }) {
  const navigate = useNavigate()

  const bal = useMemo(() => computeBalances(operations, entities), [operations, entities])

  const totalIOwe    = useMemo(() => entities.reduce((s, e) => s + (bal[e.id]?.iOwe    || 0), 0), [entities, bal])
  const totalTheyOwe = useMemo(() => entities.reduce((s, e) => s + (bal[e.id]?.theyOwe || 0), 0), [entities, bal])
  const net          = totalTheyOwe - totalIOwe

  const banks   = entities.filter(e => e.category === 'bank')
  const persons = entities.filter(e => e.category === 'person')

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <button className="icon-btn" onClick={() => navigate('/settings')}>⚙</button>
      </div>

      {/* Métriques */}
      <div className="metrics-row">
        <MetricCard label="Je dois"   value={eur(totalIOwe)}      color="danger" />
        <MetricCard label="On me doit" value={eur(totalTheyOwe)}  color="green"  />
        <MetricCard
          label="Solde net"
          value={eur(Math.abs(net))}
          color={net >= 0 ? 'green' : 'danger'}
          sign={net >= 0 ? '+' : '−'}
        />
      </div>

      {banks.length > 0 && (
        <div className="section">
          <div className="section-title">Comptes</div>
          <div className="entity-grid">
            {banks.map(e => (
              <EntityCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} />
            ))}
          </div>
        </div>
      )}

      {persons.length > 0 && (
        <div className="section">
          <div className="section-title">Proches</div>
          <div className="entity-grid">
            {persons.map(e => (
              <EntityCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, color, sign }) {
  const cls = color === 'green' ? 'c-green' : color === 'danger' ? 'c-red' : ''
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${cls}`}>
        {sign && <span className="metric-sign">{sign}</span>}
        {value}
      </div>
    </div>
  )
}

function EntityCard({ entity, bal }) {
  const net       = netBalance(entity, { [entity.id]: bal })
  const nc        = net > 0 ? 'c-green' : net < 0 ? 'c-red' : 'c-muted'
  const realBal   = entity.real_balance
  const hasReal   = realBal !== null && realBal !== undefined
  const realColor = entity.category === 'bank' ? 'c-blue' : entity.category === 'person' ? 'c-purple' : ''

  return (
    <div className="ent-card">
      <div className="ent-card-head">
        <div className={`avatar avatar-xs ${entity.category}`}>{initials(entity.name)}</div>
        <span className="ent-card-name">{entity.name}</span>
      </div>
      <div className="ent-card-vals">
        <div className="ent-val-row">
          <span className="ent-val-lbl">Solde réel</span>
          <span className={hasReal ? realColor + ' fw-600' : 'c-muted'}>
            {hasReal ? eur(realBal) : '—'}
          </span>
        </div>
        <div className="ent-val-row">
          <span className="ent-val-lbl">Dette</span>
          <span className={bal.iOwe > 0.005 ? 'c-red fw-600' : 'c-muted'}>{eur(bal.iOwe)}</span>
        </div>
        <div className="ent-val-row">
          <span className="ent-val-lbl">Créance</span>
          <span className={bal.theyOwe > 0.005 ? 'c-green fw-600' : 'c-muted'}>{eur(bal.theyOwe)}</span>
        </div>
        <div className="ent-val-row ent-val-net">
          <span className="ent-val-lbl">Solde net</span>
          <span className={nc + ' fw-700'}>{net >= 0 ? '+' : '−'}{eur(Math.abs(net))}</span>
        </div>
      </div>
    </div>
  )
}
