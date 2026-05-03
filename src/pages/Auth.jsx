import { useState } from 'react'
import './Auth.css'

export default function Auth({ signIn, signUp, resetPassword }) {
  const [mode,        setMode]       = useState('login')  // 'login' | 'signup' | 'forgot'
  const [email,       setEmail]      = useState('')
  const [password,    setPassword]   = useState('')
  const [error,       setError]      = useState('')
  const [loading,     setLoading]    = useState(false)
  const [sent,        setSent]       = useState(false)
  const [signupSent,  setSignupSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const err = await signIn(email, password)
      setLoading(false)
      if (err) setError(err.message)
    } else {
      const err = await signUp(email, password)
      setLoading(false)
      if (err) {
        setError(err.message)
      } else {
        setSignupSent(true)
      }
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await resetPassword(email)
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  function goBack() {
    setMode('login')
    setSent(false)
    setError('')
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setSignupSent(false)
  }

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="auth-logo">⟁</div>
        <h1 className="auth-app-name">Debt Tracker</h1>
        <p className="auth-tagline">Gérez vos dettes et créances</p>
      </div>

      <div className="auth-card">

        {mode === 'forgot' ? (

          <div className="auth-forgot-panel">
            <div className="auth-forgot-title">Mot de passe oublié</div>

            {sent ? (
              <div className="auth-success">
                Un email de réinitialisation a été envoyé si ce compte existe.
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleForgot}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {error && <div className="form-error">{error}</div>}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? '...' : 'Envoyer le lien'}
                </button>
              </form>
            )}

            <button type="button" className="auth-back-link" onClick={goBack}>
              ← Retour à la connexion
            </button>
          </div>

        ) : (

          <>
            <div className="auth-tabs">
              <button
                className={'auth-tab' + (mode === 'login' ? ' active' : '')}
                onClick={() => switchMode('login')}
              >Connexion</button>
              <button
                className={'auth-tab' + (mode === 'signup' ? ' active' : '')}
                onClick={() => switchMode('signup')}
              >Inscription</button>
            </div>

            {signupSent ? (
              <div className="auth-signup-confirm">
                <div className="auth-success">
                  Un email de confirmation vient d'être envoyé. Vérifiez votre boîte mail.
                </div>
                <button type="button" className="auth-back-link" onClick={() => switchMode('login')}>
                  ← Retour à la connexion
                </button>
              </div>
            ) : (
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
                  <div className="form-label-row">
                    <label className="form-label">Mot de passe</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        className="auth-forgot-link"
                        onClick={() => { setMode('forgot'); setError('') }}
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
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
            )}
          </>

        )}

      </div>
    </div>
  )
}
