import { useState } from 'react'
import './Auth.css'

export default function Auth({ signIn, signUp }) {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fn  = mode === 'login' ? signIn : signUp
    const err = await fn(email, password)
    setLoading(false)
    if (err) setError(err.message)
  }

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="auth-logo">⟁</div>
        <h1 className="auth-app-name">Debt Tracker</h1>
        <p className="auth-tagline">Gérez vos dettes et créances</p>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={'auth-tab' + (mode === 'login' ? ' active' : '')}
            onClick={() => { setMode('login'); setError('') }}
          >Connexion</button>
          <button
            className={'auth-tab' + (mode === 'signup' ? ' active' : '')}
            onClick={() => { setMode('signup'); setError('') }}
          >Inscription</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
