import { useState, useEffect, useCallback } from 'react'
import './Toast.css'

let _showToast = null

export function useToast() {
  const [toasts, setToasts] = useState([])

  const show = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  useEffect(() => { _showToast = show }, [show])

  return { toasts, show }
}

export function toast(msg, type = 'success') {
  _showToast?.(msg, type)
}

export function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  )
}
