import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useData } from './hooks/useData'
import { useToast, ToastContainer } from './components/Toast'
import BottomNav from './components/BottomNav'
import Auth          from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Dashboard     from './pages/Dashboard'
import AddOperation  from './pages/AddOperation'
import Entities      from './pages/Entities'
import History       from './pages/History'
import FutureIncomes from './pages/FutureIncomes'
import Settings      from './pages/Settings'
import './styles/globals.css'

export default function App() {
  const { session, signIn, signUp, signOut, resetPassword } = useAuth()
  const { toasts } = useToast()

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text2)', fontSize: '.875rem' }}>Chargement...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <InnerApp
        session={session}
        signIn={signIn}
        signUp={signUp}
        signOut={signOut}
        resetPassword={resetPassword}
        toasts={toasts}
      />
    </BrowserRouter>
  )
}

function InnerApp({ session, signIn, signUp, signOut, resetPassword, toasts }) {
  const { pathname } = useLocation()

  if (pathname === '/reset-password') {
    return (
      <>
        <ToastContainer toasts={toasts} />
        <ResetPassword onSignOut={signOut} />
      </>
    )
  }

  if (!session) {
    return (
      <>
        <Auth signIn={signIn} signUp={signUp} resetPassword={resetPassword} />
        <ToastContainer toasts={toasts} />
      </>
    )
  }

  return <AppShell session={session} onSignOut={signOut} toasts={toasts} />
}

function AppShell({ session, onSignOut, toasts }) {
  const data     = useData(session.user.id)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!data.loading && data.entities.length === 0 && location.pathname === '/') {
      navigate('/entities', { replace: true })
    }
  }, [data.loading, data.entities.length, location.pathname])

  if (data.loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text2)', fontSize: '.875rem' }}>Chargement des données...</div>
      </div>
    )
  }

  const sharedProps = {
    entities:        data.entities,
    operations:      data.operations,
    incomes:         data.incomes,
    addEntity:       data.addEntity,
    updateEntity:    data.updateEntity,
    deleteEntity:    data.deleteEntity,
    addOperation:    data.addOperation,
    deleteOperation: data.deleteOperation,
    addIncome:       data.addIncome,
    updateIncome:    data.updateIncome,
    deleteIncome:    data.deleteIncome,
    executeCashIn:   data.executeCashIn,
  }

  return (
    <div className="app-layout">
      <ToastContainer toasts={toasts} />

      <Routes>
        <Route path="/"         element={<Dashboard    {...sharedProps} />} />
        <Route path="/add"      element={<AddOperation {...sharedProps} />} />
        <Route path="/entities" element={<Entities     {...sharedProps} />} />
        <Route path="/history"  element={<History      {...sharedProps} />} />
        <Route path="/incomes"  element={<FutureIncomes {...sharedProps} />} />
        <Route path="/settings" element={<Settings session={session} onSignOut={onSignOut} />} />
      </Routes>

      <BottomNav />
    </div>
  )
}
