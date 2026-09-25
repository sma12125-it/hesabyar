import { useEffect, useState } from 'react'
import { PatternLock } from '../components/PatternLock'
import { SyncSheet } from '../components/SyncSheet'
import { loadLock, registerBiometric, setPattern, setPin, type AppLockRecord } from '../lib/applock'

type Popup = 'cloud' | 'security' | null

export function SettingsPage({ onScroll }: { onScroll: (compact: boolean) => void }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  const [popup, setPopup] = useState<Popup>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('hy-theme', theme)
  }, [theme])

  return (
    <div className="app-scroll settings-page" onScroll={(e) => onScroll(e.currentTarget.scrollTop > 28)}>
      <div className="top-row">
        <h1>تنظیمات</h1>
        <span style={{ width: 40 }} />
      </div>
      <section className="lg settings-block">
        <h2>ظاهر</h2>
        <p className="sheet-sub">روشن یا تاریک، با همان زبان شیشه‌ای.</p>
        <div className="seg" role="tablist">
          <button className={`seg-btn${theme === 'light' ? ' active' : ''}`} type="button" onClick={() => setTheme('light')}>روشن</button>
          <button className={`seg-btn${theme === 'dark' ? ' active' : ''}`} type="button" onClick={() => setTheme('dark')}>تاریک</button>
        </div>
      </section>
      <button className="settings-row lg" type="button" onClick={() => setPopup('cloud')}>
        <span>
          <strong>اتصال ابری</strong>
          <small>کلید پروژه، ورود با ایمیل، و فرستادن یا گرفتن داده‌ها.</small>
        </span>
        <span className="fchev">‹</span>
      </button>
      <button className="settings-row lg" type="button" onClick={() => setPopup('security')}>
        <span>
          <strong>امنیت ورود</strong>
          <small>رمز، الگوی کشیدنی، یا قفل اثر انگشت و چهرهٔ خود گوشی.</small>
        </span>
        <span className="fchev">‹</span>
      </button>
      {popup === 'cloud' ? <SyncSheet onClose={() => setPopup(null)} /> : null}
      {popup === 'security' ? <SecurityPopup onClose={() => setPopup(null)} /> : null}
    </div>
  )
}

function SecurityPopup({ onClose }: { onClose: () => void }) {
  const [pin, setPinValue] = useState('')
  const [pattern, setPatternValue] = useState<number[]>([])
  const [lock, setLock] = useState<AppLockRecord>(() => loadLock())
  const [info, setInfo] = useState<string | null>(null)

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="glass-sheet" role="dialog" aria-label="امنیت ورود">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>امنیت ورود</h1>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="بستن">✕</button>
        </div>
        <div className="sheet-body-scroll">
          <p className="sheet-sub">اثر انگشت و چهره از قفل خود گوشی خوانده می‌شود و داخل برنامه ذخیره نمی‌شود.</p>
          <input className="field-input" inputMode="numeric" placeholder="رمز حداقل ۴ رقم" value={pin} onChange={(e) => setPinValue(e.target.value)} />
          <button className="cat-mini" type="button" onClick={() => { if (pin.length < 4) return; void setPin(pin).then(() => { setLock(loadLock()); setInfo('رمز ذخیره شد') }) }}>ثبت رمز</button>
          <p className="sheet-sub">الگو را با کشیدن انگشت روی نقطه‌ها بکشید، نه با کلیک جدا روی هر نقطه.</p>
          <PatternLock value={pattern} onChange={setPatternValue} />
          <button className="cat-mini" type="button" onClick={() => { if (pattern.length < 4) { setInfo('حداقل ۴ نقطه را به هم وصل کنید'); return }; void setPattern(pattern.join('-')).then(() => { setLock(loadLock()); setPatternValue([]); setInfo('الگو ذخیره شد') }) }}>ثبت الگو</button>
          <button
            className="cta-confirm"
            type="button"
            onClick={() => void registerBiometric()
              .then(() => { setLock(loadLock()); setInfo('قفل گوشی وصل شد') })
              .catch((err) => setInfo(err instanceof Error ? err.message : 'قفل گوشی در دسترس نیست'))}
          >
            اتصال به اثر انگشت یا چهرهٔ گوشی
          </button>
          <p className="sheet-sub">
            {lock.pinHash ? 'رمز روشن است. ' : ''}
            {lock.patternHash ? 'الگو روشن است. ' : ''}
            {lock.credentialId ? 'قفل گوشی روشن است.' : ''}
          </p>
          {info ? <p className="sheet-sub">{info}</p> : null}
        </div>
      </div>
    </>
  )
}
