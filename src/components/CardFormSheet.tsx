import { useState } from 'react'
import { validateCard } from '../lib/vault'
import { useExtras } from '../store/Extras'

const COLORS = [
  'linear-gradient(135deg, #0f766e 0%, #115e59 48%, #1e1b4b 100%)',
  'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 50%, #0f172a 100%)',
  'linear-gradient(135deg, #b45309 0%, #9a3412 50%, #7c2d12 100%)',
  'linear-gradient(135deg, #be123c 0%, #9f1239 48%, #4c0519 100%)',
  'linear-gradient(135deg, #6d28d9 0%, #4c1d95 50%, #1e1b4b 100%)',
  'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
]

function groupPan(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const startYear = new Date().getFullYear() % 100
const years = Array.from({ length: 12 }, (_, i) => String(startYear + i).padStart(2, '0'))

export function CardFormSheet({ phrase, onClose }: { phrase: string; onClose: () => void }) {
  const { saveCard } = useExtras()
  const [bankName, setBankName] = useState('')
  const [holder, setHolder] = useState('')
  const [pan, setPan] = useState('')
  const [month, setMonth] = useState(months[0]!)
  const [year, setYear] = useState(years[0]!)
  const [cvv, setCvv] = useState('')
  const [shebaDigits, setShebaDigits] = useState('')
  const [color, setColor] = useState(COLORS[0]!)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const expiry = `${month}/${year}`
    const sheba = shebaDigits ? `IR${shebaDigits}` : ''
    const problem = validateCard({ bankName, holder, pan, expiry, cvv })
    if (problem) {
      setError(problem)
      return
    }
    if (sheba && !/^IR\d{24}$/.test(sheba)) {
      setError('شبا بعد از IR باید ۲۴ رقم باشد')
      return
    }
    try {
      await saveCard({ bankName, holder, pan: pan.replace(/\D/g, ''), expiry, cvv, sheba, note: '', color }, phrase)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'کارت ذخیره نشد')
    }
  }

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="glass-sheet" role="dialog" aria-label="کارت جدید">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>کارت جدید</h1>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="بستن">✕</button>
        </div>
        <div className="sheet-body-scroll">
          {error ? <div className="banner error"><span>{error}</span></div> : null}
          <div className="field-stack">
            <input className="field-input" placeholder="نام بانک" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            <input className="field-input" placeholder="صاحب کارت" value={holder} onChange={(e) => setHolder(e.target.value)} />
            <input
              className="field-input"
              inputMode="numeric"
              placeholder="۱۲۳۴ ۵۶۷۸ ۹۰۱۲ ۳۴۵۶"
              dir="ltr"
              value={pan}
              onChange={(e) => setPan(groupPan(e.target.value))}
            />
            <div className="expiry-row">
              <label>
                ماه
                <select value={month} onChange={(e) => setMonth(e.target.value)}>
                  {months.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                سال
                <select value={year} onChange={(e) => setYear(e.target.value)}>
                  {years.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <input className="field-input" inputMode="numeric" placeholder="CVV" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            <div className="sheba-row">
              <span>IR</span>
              <input
                className="field-input"
                inputMode="numeric"
                placeholder="۲۴ رقم"
                dir="ltr"
                value={shebaDigits}
                onChange={(e) => setShebaDigits(e.target.value.replace(/\D/g, '').slice(0, 24))}
              />
            </div>
            <div className="swatch-row" aria-label="رنگ کارت">
              {COLORS.map((item) => (
                <button key={item} type="button" className={`swatch${color === item ? ' on' : ''}`} style={{ background: item }} onClick={() => setColor(item)} />
              ))}
            </div>
            <button className="cta-confirm" type="button" onClick={() => void save()}>ثبت کارت</button>
          </div>
        </div>
      </div>
    </>
  )
}
