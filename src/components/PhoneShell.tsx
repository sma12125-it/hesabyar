import type { ReactNode } from 'react'
import { useEffect } from 'react'

function useFullBleedClass() {
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean }
    const query = window.matchMedia('(max-width: 520px), (display-mode: standalone), (display-mode: fullscreen)')
    const apply = () => {
      const full = query.matches || nav.standalone === true
      document.documentElement.classList.toggle('hy-fullbleed', full)
    }
    apply()
    query.addEventListener('change', apply)
    return () => {
      query.removeEventListener('change', apply)
      document.documentElement.classList.remove('hy-fullbleed')
    }
  }, [])
}

export function PhoneShell({ children }: { children: ReactNode }) {
  useFullBleedClass()
  return (
    <div className="page-stage">
      <div className="device">
        <div className="device-screen">
          <div className="wallpaper" aria-hidden="true" />
          {children}
        </div>
      </div>
    </div>
  )
}
