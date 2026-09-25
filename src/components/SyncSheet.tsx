import { useState } from 'react'
import { loadSession, pullSnapshot, pushSnapshot, saveSession, signIn, signUp, type CloudSession } from '../lib/sync'
import { useExtras } from '../store/Extras'
import { useStore } from '../store/Store'

interface Payload {
  updatedAt: number
  accounts: unknown
  transactions: unknown
  plans: unknown
  items: unknown
  customCategories: unknown
  budgets: unknown
  goals: unknown
  reminders: unknown
  cardVault: unknown
}

export function SyncSheet({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const extras = useExtras()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<CloudSession | null>(() => loadSession())
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function payload(): Promise<Payload> {
    const local = await extras.exportLocal()
    return {
      updatedAt: Date.now(),
      accounts: store.accounts,
      transactions: store.transactions,
      plans: store.plans,
      items: store.items,
      customCategories: store.customCategories,
      budgets: local.budgets,
      goals: local.goals,
      reminders: local.reminders,
      cardVault: local.cardVault,
    }
  }

  async function enter(mode: 'in' | 'up') {
    setError(null)
    try {
      const next = mode === 'in' ? await signIn(email, password) : await signUp(email, password)
      saveSession(next)
      setSession(next)
      setInfo(mode === 'up' ? 'حساب ساخته شد' : 'وارد شدید')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای ابر')
    }
  }

  async function push() {
    if (!session) return
    setError(null)
    try {
      const data = await payload()
      await pushSnapshot(session, { updatedAt: data.updatedAt, data })
      setInfo('داده روی Supabase ذخیره شد')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال نشد')
    }
  }

  async function pull() {
    if (!session) return
    setError(null)
    try {
      const remote = await pullSnapshot<Payload>(session)
      if (!remote) {
        setInfo('روی ابر هنوز داده‌ای نیست')
        return
      }
      const { replaceAllData, setKv } = await import('../db/db')
      const data = remote.data
      await replaceAllData(
        (data.accounts as never) ?? [],
        (data.transactions as never) ?? [],
        (data.plans as never) ?? [],
        (data.items as never) ?? [],
      )
      await setKv('customCategories', data.customCategories ?? [])
      await extras.importLocal(data as unknown as Record<string, unknown>)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت نشد')
    }
  }

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="glass-sheet" role="dialog" aria-label="همگام‌سازی ابری">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>اتصال ابری</h1>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="بستن">✕</button>
        </div>
        <p className="sheet-sub">اتصال آماده است. با ایمیل خود حساب بسازید. فقط همان حساب به دادهٔ آنلاین دسترسی دارد و کارت‌ها رمزشده می‌روند.</p>
        {error ? <div className="banner error"><span>{error}</span></div> : null}
        {info ? <p className="sheet-sub">{info}</p> : null}
        <p className="sheet-sub">{session ? `متصل: ${session.email}` : 'با ایمیل وارد شوید. آخرین نوشتن برنده است.'}</p>
            {!session ? (
              <div className="field-stack">
                <input className="field-input" type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="field-input" type="password" placeholder="رمز" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className="cta-confirm" type="button" onClick={() => void enter('in')}>ورود</button>
                <button className="cat-mini" type="button" onClick={() => void enter('up')}>ساخت حساب</button>
              </div>
            ) : (
              <div className="confirm-actions">
                <button className="cta-confirm" type="button" onClick={() => void push()}>ارسال به ابر</button>
                <button className="cta-confirm" type="button" onClick={() => void pull()}>دریافت از ابر</button>
                <button className="cat-mini danger" type="button" onClick={() => { saveSession(null); setSession(null) }}>خروج</button>
              </div>
            )}
      </div>
    </>
  )
}
