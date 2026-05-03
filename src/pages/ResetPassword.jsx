import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ResetPassword.css'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)

      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/auth')
      }, 1000)
    }
  }

  return (
    <div className="reset-screen">
      <div className="reset-brand">
        <div className="reset-logo">⟁</div>
        <h1 className="reset-app-name">Debt Tracker</h1>
      </div>

      <div className="reset-card">
        <div className="reset-panel">
          <div className="reset-title">Nouveau mot de passe</div>

          {done ? (
            <div className="reset-success">
              Mot de passe modifié avec succès. Vous allez être redirigé vers la connexion…
            </div>
          ) : (
            <form className="reset-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              {error && <div className="form-error">{error}</div>}

              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? '...' : 'Modifier mon mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}