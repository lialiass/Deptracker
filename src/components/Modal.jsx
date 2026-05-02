import { useEffect } from 'react'
import './Modal.css'

export default function Modal({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        {(title || subtitle) && (
          <div className="modal-header">
            <div>
              {title    && <div className="modal-title">{title}</div>}
              {subtitle && <div className="modal-subtitle">{subtitle}</div>}
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
