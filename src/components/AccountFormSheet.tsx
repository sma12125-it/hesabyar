import { useState } from 'react'
import { formatRial, validateAccountName } from '../lib/money'
import { useStore } from '../store/Store'
import { AmountField } from './AmountField'
import type { Account, AccountType } from '../types'

export function AccountFormSheet({
  account,
  totalBalance,
  onClose,
}: {
  account?: Account
  totalBalance: number
  onClose: () => void
}) {
  const { createAccount, updateAccount } = useStore()
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'cash')
  const [initialBalance, setInitialBalance] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(account)
  const nameError = validateAccountName(name)
  const canSave = !nameError && !saving

  async function save() {
    setError(null)
    if (nameError) {
      setError(nameError)
      return
    }
    setSaving(true)
    try {
      if (isEdit && account) {
        await updateAccount(account.id, { name, type })
      } else {
        await createAccount({
          name,
          type,
          initialBalance,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره نشد')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="peek-home">
        <div className="ph-title">حساب‌ها</div>
        <div className="ph-amt">{formatRial(totalBalance)} ریال</div>
      </div>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="glass-sheet" role="dialog" aria-label={isEdit ? 'ویرایش حساب' : 'حساب جدید'}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>{isEdit ? 'ویرایش حساب' : 'حساب جدید'}</h1>
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
            <div className={`field-chip${error && nameError ? ' invalid' : ''}`}>
              <span className="ficon">✏️</span>
              <div style={{ flex: 1 }}>
                <div className="flabel">نام حساب</div>
                <input
                  className="field-input"
                  placeholder="نام را وارد کنید…"
                  value={name}
                  autoFocus
                  onChange={(e) => {
                    setName(e.target.value)
                    setError(null)
                  }}
                />
              </div>
            </div>
            {error && nameError ? <div className="field-error">{nameError}</div> : null}

            <div style={{ margin: '4px 0 2px', fontSize: 12, fontWeight: 600, color: 'var(--hy-text-tertiary)', paddingRight: 4 }}>
              نوع
            </div>
            <div className="seg type-seg" role="tablist">
              <div className={`seg-thumb${type === 'bank' ? ' type-bank' : ''}`} aria-hidden="true" />
              <button
                className={`seg-btn cash${type === 'cash' ? ' active' : ''}`}
                type="button"
                onClick={() => setType('cash')}
              >
                نقد
              </button>
              <button
                className={`seg-btn bank${type === 'bank' ? ' active' : ''}`}
                type="button"
                onClick={() => setType('bank')}
              >
                بانک
              </button>
            </div>

            {!isEdit ? (
              <div className="field-chip">
                <span className="ficon">💰</span>
                <div style={{ flex: 1 }}>
                  <div className="flabel">موجودی اولیه</div>
                  <AmountField
                    value={initialBalance}
                    onChange={setInitialBalance}
                    ariaLabel="موجودی اولیه به ریال"
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--hy-text-tertiary)' }}>ریال</span>
              </div>
            ) : null}
          </div>
          <button
            className={`cta-confirm${canSave ? '' : ' disabled'}`}
            type="button"
            disabled={!canSave}
            onClick={() => void save()}
            style={{ marginTop: 'auto' }}
          >
            {saving ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
        </div>
      </div>
    </>
  )
}
