import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { formatClock } from '../lib/dates'

export function PhoneShell({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState(() => formatClock())

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="page-stage">
      <div className="device">
        <div className="device-screen">
          <div className="wallpaper" aria-hidden="true" />
          <div className="status-bar">
            <span className="time">{clock}</span>
            <span className="icons">■■■ ▂▄▆ 🔋</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
