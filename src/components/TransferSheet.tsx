import { useState } from 'react'
import { formatRial, parseRialInput } from '../lib/money'
import { useStore } from '../store/Store'
import { PickerSheet } from './PickerSheet'

export function TransferSheet({
  presetFromId,
  onClose,
}: {
  presetFromId?: string
  onClose: () => void
}) {
  const { activeAccounts, addTransfer } = useStore()
  const [fromId, setFromId] = useState(presetFromId ?? activeAccounts[0]?.id ?? '')
  const [toId, setToId] = useState(
    () => activeAccounts.find((a) => a.id !== (presetFromId ?? activeAccounts[0]?.id))?.id ?? '',
  )
  const [amountRaw, setAmountRaw] = useState('')
  const [picker, setPicker] = useState<'from' | 'to' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const from = activeAccounts.find((a) => a.id === fromId)
  const to = activeAccounts.find((a) => a.id === toId)
  const amount = parseRialInput(amountRaw)
  const over = Boolean(from && amount > from.balance)
  const disabled = saving || !from || !to || amount <= 0 || over || from.id === to.id

  async function submit() {
    setError(null)
    setSaving(true)
    try {
      await addTransfer({
        amount,
        fromAccountId: fromId,
        toAccountId: toId,
        note: '',
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'انتقال نشد')
    } finally {
      setSaving(false)
    }
  }

  if (picker) {
    return (
      <PickerSheet title={picker === 'from' ? 'از حساب' : 'به حساب'} onClose={() => setPicker(null)}>
        {activeAccounts
          .filter((a) => (picker === 'to' ? a.id !== fromId : a.id !== toId))
          .map((a) => (
            <button
              key={a.id}
              type="button"
              className="option-item lg-light"
              onClick={() => {
                if (picker === 'from') setFromId(a.id)
                else setToId(a.id)
                setPicker(null)
              }}
            >
              <span className="oico">💳</span>
              <div>
                <div className="otitle">{a.name}</div>
                <div className="osub">{formatRial(a.balance)} ریال</div>
              </div>
            </button>
          ))}
      </PickerSheet>
    )
  }

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="glass-sheet" role="dialog" aria-label="انتقال">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>انتقال</h1>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="بستن">
            ✕
          </button>
        </div>
        {(error || over) && (
          <div className="banner error">
            <span className="bico">⚠</span>
            <span>{error || 'مبلغ از موجودی قابل انتقال بیشتر است'}</span>
          </div>
        )}
        <div className="field-stack">
          <button className="field-chip" type="button" onClick={() => setPicker('from')}>
            <span className="ficon">💳</span>
            <div>
              <div className="flabel">از حساب</div>
              <div className={from ? 'fvalue' : 'fvalue placeholder-val'}>{from?.name ?? 'انتخاب مبدأ'}</div>
              {from ? (
                <div className="avail-hint">
                  قابل انتقال: <strong>{formatRial(from.balance)}</strong> ریال
                </div>
              ) : null}
            </div>
            <span className="fchev">‹</span>
          </button>
          <button className="field-chip" type="button" onClick={() => setPicker('to')}>
            <span className="ficon">🏠</span>
            <div>
              <div className="flabel">به حساب</div>
              <div className={to ? 'fvalue' : 'fvalue placeholder-val'}>{to?.name ?? 'انتخاب مقصد'}</div>
            </div>
            <span className="fchev">‹</span>
          </button>
          <div className={`field-chip${over ? ' invalid' : ''}`}>
            <span className="ficon">💰</span>
            <div style={{ flex: 1 }}>
              <div className="flabel">مبلغ</div>
              <input
                className="field-input"
                inputMode="numeric"
                placeholder="۰"
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
              />
            </div>
            <span style={{ fontSize: 12, color: 'var(--hy-text-tertiary)' }}>ریال</span>
          </div>
        </div>
        <button
          className={`cta-confirm transfer-cta${disabled ? ' disabled' : ''}`}
          type="button"
          disabled={disabled}
          onClick={() => void submit()}
        >
          {saving ? 'در حال انتقال…' : 'تأیید انتقال'}
        </button>
      </div>
    </>
  )
}
