import './Card.css'

export default function Card({ children, className = '', onClick, padding = true }) {
  return (
    <div
      className={`card ${padding ? 'card-pad' : ''} ${onClick ? 'card-clickable' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
