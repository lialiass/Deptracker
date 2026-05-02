import { useMemo } from 'react'
import Card from '../components/Card'
import { computeBalances, netBalance } from '../logic/balances'
import './Dashboard.css'

function eur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
function eurCompact(n) {
  const abs = Math.abs(n || 0)
  if (abs >= 1000) return (n < 0 ? '−' : '') + (abs / 1000).toFixed(1).replace('.0', '') + 'k€'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)
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

  // Top débiteurs / créditeurs pour la section résumé
  const debtors   = persons.filter(e => (bal[e.id]?.theyOwe || 0) > 0.01)
    .sort((a, b) => (bal[b.id]?.theyOwe || 0) - (bal[a.id]?.theyOwe || 0))
  const creditors = persons.filter(e => (bal[e.id]?.iOwe || 0) > 0.01)
    .sort((a, b) => (bal[b.id]?.iOwe || 0) - (bal[a.id]?.iOwe || 0))

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
      </div>

      {/* Métriques + graphique côte à côte */}
      <div className="dash-top">
        <div className="metrics-col">
          <MetricCard label="Je dois"   value={eurCompact(totalIOwe)}    color="danger" />
          <MetricCard label="On me doit" value={eurCompact(totalTheyOwe)} color="green"  />
          <MetricCard
            label="Solde net"
            value={eurCompact(Math.abs(net))}
            color={net >= 0 ? 'green' : 'danger'}
            sign={net >= 0 ? '+' : '−'}
          />
        </div>
        <DonutChart iOwe={totalIOwe} theyOwe={totalTheyOwe} />
      </div>

      {/* Qui me doit / À qui je dois */}
      {(debtors.length > 0 || creditors.length > 0) && (
        <div className="section">
          <div className="dash-balance-row">
            {debtors.length > 0 && (
              <div className="balance-col">
                <div className="balance-col-title c-green">On me doit</div>
                {debtors.map(e => (
                  <div key={e.id} className="balance-person-row">
                    <span className="balance-person-name">{e.name}</span>
                    <span className="c-green fw-600">{eurCompact(bal[e.id]?.theyOwe)}</span>
                  </div>
                ))}
              </div>
            )}
            {creditors.length > 0 && (
              <div className="balance-col">
                <div className="balance-col-title c-red">Je dois</div>
                {creditors.map(e => (
                  <div key={e.id} className="balance-person-row">
                    <span className="balance-person-name">{e.name}</span>
                    <span className="c-red fw-600">{eurCompact(bal[e.id]?.iOwe)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comptes */}
      {banks.length > 0 && (
        <div className="section">
          <div className="section-title">Comptes</div>
          <div className="entity-grid-2">
            {banks.map(e => (
              <CompactCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} />
            ))}
          </div>
        </div>
      )}

      {/* Proches */}
      {persons.length > 0 && (
        <div className="section">
          <div className="section-title">Proches</div>
          <div className="entity-grid-2">
            {persons.map(e => (
              <CompactCard key={e.id} entity={e} bal={bal[e.id] || { iOwe: 0, theyOwe: 0 }} />
            ))}
          </div>
        </div>
      )}

      {entities.length === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon">◌</div>
          <div className="empty-state-title">Aucune entité</div>
          <p>Ajoutez vos comptes et proches pour commencer.</p>
        </div>
      )}
    </div>
  )
}

/* ── Carte métrique ────────────────────────────────────────── */
function MetricCard({ label, value, color, sign }) {
  const colorClass = color === 'green' ? 'c-green' : 'c-red'
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${colorClass}`}>
        {sign && <span className="metric-sign">{sign}</span>}{value}
      </div>
    </div>
  )
}

/* ── Carte compacte entité ─────────────────────────────────── */
function CompactCard({ entity, bal }) {
  const net   = netBalance(entity, { [entity.id]: bal })
  const nc    = net > 0 ? 'c-green' : net < 0 ? 'c-red' : 'c-muted'
  const realB = entity.real_balance

  return (
    <div className="compact-card">
      <div className="compact-card-top">
        <div className={`avatar avatar-sm ${entity.category}`}>{initials(entity.name)}</div>
        <div className="compact-card-name">{entity.name}</div>
      </div>
      {realB !== null && realB !== undefined && (
        <div className={`compact-real ${entity.category === 'bank' ? 'c-blue' : 'c-purple'}`}>
          {eurCompact(realB)}
        </div>
      )}
      <div className={`compact-net ${nc}`}>
        {net >= 0 ? '+' : '−'}{eurCompact(Math.abs(net))}
      </div>
      {(bal.iOwe > 0.01 || bal.theyOwe > 0.01) && (
        <div className="compact-pills">
          {bal.iOwe    > 0.01 && <span className="compact-pill red">−{eurCompact(bal.iOwe)}</span>}
          {bal.theyOwe > 0.01 && <span className="compact-pill green">+{eurCompact(bal.theyOwe)}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Graphique donut SVG ───────────────────────────────────── */
function DonutChart({ iOwe, theyOwe }) {
  const total = iOwe + theyOwe
  if (total < 0.01) {
    return (
      <div className="donut-wrap">
        <svg viewBox="0 0 80 80" className="donut-svg">
          <circle cx="40" cy="40" r="28" fill="none" stroke="var(--bg3)" strokeWidth="10" />
        </svg>
        <div className="donut-label">
          <span className="donut-main c-accent">✓</span>
          <span className="donut-sub">Équilibré</span>
        </div>
      </div>
    )
  }

  const R   = 28
  const C   = 2 * Math.PI * R          // circumference ≈ 175.9
  const redArc   = (iOwe    / total) * C
  const greenArc = (theyOwe / total) * C
  // offset : commencer l'arc rouge en haut (−C/4 = −90°)
  const redOffset   = -C / 4
  const greenOffset = -C / 4 + redArc

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 80 80" className="donut-svg">
        {/* Fond */}
        <circle cx="40" cy="40" r={R} fill="none" stroke="var(--bg3)" strokeWidth="10" />
        {/* Arc rouge (je dois) */}
        {iOwe > 0.01 && (
          <circle cx="40" cy="40" r={R} fill="none"
            stroke="var(--danger)" strokeWidth="10"
            strokeDasharray={`${redArc} ${C - redArc}`}
            strokeDashoffset={redOffset}
            strokeLinecap="round"
          />
        )}
        {/* Arc vert (on me doit) */}
        {theyOwe > 0.01 && (
          <circle cx="40" cy="40" r={R} fill="none"
            stroke="var(--accent)" strokeWidth="10"
            strokeDasharray={`${greenArc} ${C - greenArc}`}
            strokeDashoffset={-greenOffset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="donut-label">
        <span className="donut-main" style={{ color: iOwe > theyOwe ? 'var(--danger)' : 'var(--accent)' }}>
          {Math.round(Math.max(iOwe, theyOwe) / total * 100)}%
        </span>
        <span className="donut-sub">{iOwe > theyOwe ? 'dettes' : 'créances'}</span>
      </div>
    </div>
  )
}
