import { NavLink } from 'react-router-dom'
import './BottomNav.css'

const TABS = [
  { to: '/',        icon: '◈', label: 'Tableau' },
  { to: '/entities',icon: '⊞', label: 'Entités' },
  { to: '/add',     icon: '+', label: 'Ajouter',  large: true },
  { to: '/history', icon: '≡', label: 'Historique' },
  { to: '/incomes', icon: '↓', label: 'Revenus' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            'bottom-nav-item' + (isActive ? ' active' : '') + (tab.large ? ' large' : '')
          }
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
