import { useEffect, useRef } from 'react'
import { KITS } from './lib'

export const P = {
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  chat: 'M4 5h16v11H9l-5 4z', heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  arrowLeft: 'M19 12H5M12 19l-7-7 7-7', share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  check: 'M20 6L9 17l-5-5',
  zoomIn: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7',
  chevronLeft: 'M15 19l-7-7 7-7',
  chevronRight: 'M9 5l7 7-7 7',
  close: 'M18 6L6 18M6 6l12 12'
}
export const Icon = ({ d, style }) => <svg className="i" style={style} viewBox="0 0 24 24"><path d={d} /></svg>

export const WhatsAppIcon = ({ size = 20, className = 'i', style }) => (
  <svg
    className={className}
    style={{ width: size, height: size, fill: 'currentColor', flex: '0 0 auto', ...style }}
    viewBox="0 0 24 24"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.743.95 3.708 1.451 5.71 1.452h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.414z"/>
  </svg>
)

export function Modal({ title, onClose, children }) {
  const r = useRef()
  useEffect(() => { r.current.showModal() }, [])
  return (
    <dialog ref={r} onClose={onClose} onClick={(e) => e.target === r.current && onClose()}>
      <div className="dh"><h2>{title}</h2><button className="x" onClick={onClose} aria-label="Close">×</button></div>
      <div className="db">{children}</div>
    </dialog>
  )
}

export const kitBg = (n) => {
  const k = KITS[n] || KITS[5]
  return { background: `repeating-linear-gradient(115deg,${k[1]} 0 26px,${k[2]} 26px 52px)` }
}

export function Pitch({ formation }) {
  let r = String(formation).split('-').map(Number).filter(Boolean)
  if (r.reduce((a, b) => a + b, 0) !== 10) r = [4, 3, 3]
  r = [1, ...r]
  const dots = []
  r.forEach((n, ri) => {
    const y = 70 - ri * (60 / (r.length - 1))
    for (let k = 0; k < n; k++)
      dots.push(<circle key={ri + '-' + k} cx={(6 + ((k + 1) / (n + 1)) * 88).toFixed(1)} cy={y.toFixed(1)} r="3.1" fill={ri ? '#ffd400' : '#fff'} stroke="#070d1f" strokeWidth=".8" />)
  })
  return (
    <svg className="p" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth=".7">
        <rect x="6" y="5" width="88" height="70" rx="1" /><path d="M6 40h88" /><circle cx="50" cy="40" r="9" />
        <rect x="30" y="5" width="40" height="13" /><rect x="30" y="62" width="40" height="13" />
      </g>
      {dots}
    </svg>
  )
}
