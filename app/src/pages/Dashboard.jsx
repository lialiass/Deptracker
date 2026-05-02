import { useMemo } from 'react'
import { computeBalances, netBalance } from '../logic/balances'
import './Dashboard.css'

function eur(n) {
  const abs = Math.abs(n || 0)
  if (abs >= 10000) return (n < 0 ? '−' : '') + (abs / 1000).toFixed(1).replace('.0','') + 'k€'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)
}
function eurFull(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Dashboard({ entities, operations }) {
  const bal = useMemo(() => computeBalances(operations, entities), [operations, entities])

  const totalIOwe    = useMemo(() => entities.reduce((s, e) => s + (bal[e.id]?.iOwe    || 0), 0), [entities, bal])
  const totalTheyOwe = useMemo(() => entities.reduce((s, e) => s + (bal[e.id]?.theyOwe || 0), 0), [entities, bal])
  const net          = totalTheyOwe - totalIOwe

  const banks   = entities.filter(e => e.category === 'bank')
  const persons = entities.filter(e => e.category === 'person')
  const others  = entities.filter(e => e.category !== 'bank' && e.category !== 'person')

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
      </div>

      {/* Métriques */}
      <div className="section" style={{ marginBottom: 12 }}>
        <div className="metrics-grid">
          <div className="metric-tile tile-danger">
            <span className="tile-label">Je dois</span>
            <span className="tile-value">{eur(totalIOwe)}</span>
          </div>
          <div className="metric-tile tile-green">
            <span className="tile-label">On me doit</span>
            <span className="tile-value">{eur(totalTheyOwe)}</span>
          </div>
          <div className={`metric-tile tile-net ${net >= 0 ? 'tile-green' : 'tile-danger'}`}>
            <span className="tile-label">Solde net</span>
            <span className="tile-value">{net >= 0 ? '+' : '−'}{eur(Math.abs(net))}</span>
          </div>
        </div>
      </div>

      {entities.length === 0 && (
        <div className="empty-state" style={{ marginTop: 32 }}>
          <div className="empty-state-icon">◌</div>
          <div className="empty-state-title">Aucune entité</div>
          <p>Ajoutez vos comptes et proches pour commencer.</p>
        </div>
      )}

      {banks.length > 0 && (
        <div className="section">
          <div className="section-title">Comptes</div>
          <div className="entity-grid-2">
            {banks.map(e => <EntityCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} />)}
          </div>
        </div>
      )}

      {persons.length > 0 && (
        <div className="section">
          <div className="section-title">Proches</div>
          <div className="entity-grid-2">
            {persons.map(e => <EntityCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} />)}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="section">
          <div className="section-title">Autres</div>
          <div className="entity-grid-2">
            {others.map(e => <EntityCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function EntityCard({ entity, bal }) {
  const net      = netBalance(entity, { [entity.id]: bal })
  const nc       = net > 0 ? 'c-green' : net < 0 ? 'c-red' : 'c-muted'
  const realBal  = entity.real_balance
  const hasReal  = realBal !== null && realBal !== undefined
  const realColor = entity.category === 'bank' ? 'c-blue' : entity.category === 'person' ? 'c-purple' : ''

  return (
    <div className="ent-card">
      <div className="ent-card-header">
        <div className={`avatar avatar-sm ${entity.category}`}>{initials(entity.name)}</div>
        <span className="ent-card-name">{entity.name}</span>
      </div>

      <div className="ent-card-rows">
        <div className="ent-card-row">
          <span className="ent-row-label">Solde réel</span>
          <span className={hasReal ? realColor + ' fw-600' : 'c-muted'}>
            {hasReal ? eurFull(realBal) : '—'}
          </span>
        </div>
        <div className="ent-card-row">
          <span className="ent-row-label">Dette</span>
          <span className={bal.iOwe > 0.005 ? 'c-red fw-600' : 'c-muted'}>
            {eurFull(bal.iOwe)}
          </span>
        </div>
        <div className="ent-card-row">
          <span className="ent-row-label">Créance</span>
          <span className={bal.theyOwe > 0.005 ? 'c-green fw-600' : 'c-muted'}>
            {eurFull(bal.theyOwe)}
          </span>
        </div>
        <div className="ent-card-row ent-card-net">
          <span className="ent-row-label">Solde net</span>
          <span className={nc + ' fw-700'}>
            {net >= 0 ? '+' : '−'}{eurFull(Math.abs(net))}
          </span>
        </div>
      </div>
    </div>
  )
}
