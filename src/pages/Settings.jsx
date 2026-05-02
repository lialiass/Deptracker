import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import './Settings.css'

export default function Settings({ session, onSignOut }) {
  const navigate          = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const email     = session?.user?.email || '—'
  const createdAt = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const userId    = session?.user?.id

  async function handleSignOut() {
    await onSignOut()
  }

  async function handleDeleteAccount() {
    if (!userId) return
    setDeleting(true)
    try {
      // Suppression dans l'ordre (clés étrangères)
      await supabase.from('future_incomes').delete().eq('user_id', userId)
      await supabase.from('operations').delete().eq('user_id', userId)
      await supabase.from('entities').delete().eq('user_id', userId)
      await supabase.from('profiles').delete().eq('id', userId)
      // Déconnexion — le compte auth reste mais toutes les données sont effacées
      await onSignOut()
    } catch (err) {
      toast(err.message, 'error')
      setDeleting(false)
    }
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <button className="settings-back" onClick={() => navigate(-1)}>‹</button>
        <h1 className="settings-title">Paramètres</h1>
      </div>

      <div className="settings-body">

        {/* Section Compte */}
        <div className="settings-section">
          <div className="settings-section-label">Compte</div>
          <div className="settings-card">
            <div className="settings-row">
              <span className="settings-row-label">Email</span>
              <span className="settings-row-value">{email}</span>
            </div>
            {createdAt && (
              <div className="settings-row settings-row-last">
                <span className="settings-row-label">Membre depuis</span>
                <span className="settings-row-value">{createdAt}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section Actions */}
        <div className="settings-section">
          <div className="settings-section-label">Session</div>
          <div className="settings-card">
            <button className="settings-action-btn" onClick={handleSignOut}>
              <span className="settings-action-icon">↪</span>
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Zone danger */}
        <div className="settings-section">
          <div className="settings-section-label">Zone dangereuse</div>
          <div className="settings-card settings-card-danger">
            <p className="settings-danger-text">
              Supprime définitivement toutes tes données (entités, opérations, revenus). Cette action est irréversible.
            </p>
            <button
              className="settings-action-btn danger"
              onClick={() => setConfirmOpen(true)}
            >
              <span className="settings-action-icon">✕</span>
              Supprimer mon compte
            </button>
          </div>
        </div>

      </div>

      {/* Modal confirmation suppression */}
      {confirmOpen && (
        <div className="confirm-overlay" onClick={() => !deleting && setConfirmOpen(false)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">⚠</div>
            <h2 className="confirm-title">Supprimer le compte ?</h2>
            <p className="confirm-text">
              Toutes tes données seront supprimées définitivement : entités, opérations, revenus.
              <strong> Cette action est irréversible.</strong>
            </p>
            <div className="confirm-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
