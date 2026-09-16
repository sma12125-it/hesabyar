import { useState } from 'react'
import { DateField } from './DateField'
import { formatRial, parseRialInput } from '../lib/money'
import { useStore } from '../store/Store'
import type { InstallmentItem } from '../types'

export function InstallmentItemSheet({
  item,
  onClose,
}: {
  item: InstallmentItem
  onClose: () => void
}) {
  const { updateInstallmentItem } = useStore()
  const [amountRaw, setAmountRaw] = useState(String(item.amount))
  const [dueDate, setDueDate] = useState(item.dueDate)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const amount = parseRialInput(amountRaw)

  async function save() {
    setError(null)
    setSaving(true)
    try {
      await updateInstallmentItem(item.id, { amount, dueDate })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره نشد')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="glass-sheet" role="dialog" aria-label="ویرایش قسط">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>ویرایش قسط {item.index}</h1>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="بستن">
            ✕
          </button>
        </div>
        <div className="sheet-body-scroll">
          {error ? (
            <div className="banner error">
              <span className="bico">⚠</span>
              <span>{error}</span>
            </div>
          ) : null}
          <div className="field-stack">
            <div className="field-chip">
              <span className="ficon">💰</span>
              <div style={{ flex: 1 }}>
                <div className="flabel">مبلغ قسط</div>
                <input
                  className="field-input"
                  inputMode="numeric"
                  value={amountRaw}
                  autoFocus
                  onChange={(e) => setAmountRaw(e.target.value)}
                  aria-label="مبلغ قسط به ریال"
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--hy-text-tertiary)' }}>ریال</span>
            </div>
            <DateField label="سررسید" value={dueDate} onChange={setDueDate} />
          </div>
          <p className="avail-hint" style={{ marginTop: 10 }}>
            مانده نمایشی: <strong>{formatRial(amount)} ریال</strong>
          </p>
          <button className="cta-confirm" type="button" style={{ marginTop: 'auto' }} disabled={saving} onClick={() => void save()}>
            {saving ? 'در حال ذخیره…' : 'ذخیره قسط'}
          </button>
        </div>
      </div>
    </>
  )
}
