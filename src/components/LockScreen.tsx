import { useEffect, useState } from 'react'
import { checkPattern, checkPin, loadLock, markSessionOpen, verifyBiometric } from '../lib/applock'
import { PatternLock } from './PatternLock'

export function LockScreen() {
  const lock = loadLock()
  const [pin, setPin] = useState('')
  const [pattern, setPattern] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lock.credentialId) return
    void verifyBiometric().then((ok) => {
      if (!ok) {
        setError('قفل گوشی تأیید نشد')
        return
      }
      markSessionOpen()
      window.location.reload()
    })
  }, [lock.credentialId])

  async function tryPin() {
    if (await checkPin(pin)) {
      markSessionOpen()
      window.location.reload()
      return
    }
    setError('رمز نادرست است')
  }

  async function finishPattern(next: number[]) {
    if (next.length < 4) return
    if (await checkPattern(next.join('-'))) {
      markSessionOpen()
      window.location.reload()
      return
    }
    setError('الگو نادرست است')
    setPattern([])
  }

  return (
    <div className="lock-screen">
      <h1>ورود به حساب‌یار</h1>
      {error ? <p className="sheet-sub">{error}</p> : null}
      {lock.credentialId ? <p className="sheet-sub">اثر انگشت یا چهرهٔ گوشی را تأیید کنید.</p> : null}
      {lock.pinHash ? (
        <div className="field-stack">
          <input className="field-input" type="password" inputMode="numeric" placeholder="رمز" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="cta-confirm" type="button" onClick={() => void tryPin()}>ورود با رمز</button>
        </div>
      ) : null}
      {lock.patternHash ? <PatternLock value={pattern} onChange={setPattern} onRelease={(next) => void finishPattern(next)} /> : null}
    </div>
  )
}
