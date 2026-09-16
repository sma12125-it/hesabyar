import { useMemo, useRef, useState } from 'react'
import { categoriesFor, getCategory } from '../lib/categories'
import { todayIso } from '../lib/iso'
import { formatRial, parseRialInput } from '../lib/money'
import { useStore } from '../store/Store'
import { DateField } from './DateField'
import { PickerSheet } from './PickerSheet'
import type { Account, Transaction } from '../types'

export function QuickEntrySheet({
  initialKind = 'expense',
  presetAccountId,
  totalBalance,
  transaction,
  onClose,
}: {
  initialKind?: 'expense' | 'income'
  presetAccountId?: string
  totalBalance: number
  transaction?: Transaction
  onClose: () => void
}) {
  const { activeAccounts, addQuickEntry, updateTransaction } = useStore()
  const isEdit = Boolean(transaction)
  const [kind, setKind] = useState<'expense' | 'income'>(
    transaction?.kind === 'income' ? 'income' : transaction?.kind === 'expense' ? 'expense' : initialKind,
  )
  const [amountRaw, setAmountRaw] = useState(transaction ? String(transaction.amount) : '')
  const [accountId, setAccountId] = useState(transaction?.accountId ?? presetAccountId ?? activeAccounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(
    () => transaction?.categoryId ?? categoriesFor(initialKind)[0]?.id ?? 'food',
  )
  const [note, setNote] = useState(transaction?.note ?? '')
  const [date, setDate] = useState(transaction?.date ?? todayIso())
  const [picker, setPicker] = useState<'category' | 'account' | 'note' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const linked = Boolean(transaction?.installmentItemId)

  const cats = useMemo(() => categoriesFor(kind), [kind])
  const category = getCategory(categoryId) ?? cats[0]
  const account = activeAccounts.find((a) => a.id === accountId)
  const amount = parseRialInput(amountRaw)
  const available =
    account && kind === 'expense'
      ? account.balance + (transaction?.kind === 'expense' && transaction.accountId === account.id ? transaction.amount : 0)
      : Infinity
  const over = kind === 'expense' && amount > 0 && amount > available
  const disabled = saving || amount <= 0 || over || !account

  function switchKind(next: 'expense' | 'income') {
    if (linked) return
    setKind(next)
    const nextCats = categoriesFor(next)
    if (!nextCats.some((c) => c.id === categoryId)) {
      setCategoryId(nextCats[0]?.id ?? '')
    }
  }

  async function submit() {
    setError(null)
    if (!account) {
      setError('ابتدا یک حساب بساز')
      return
    }
    setSaving(true)
    try {
      if (transaction) {
        await updateTransaction(transaction.id, {
          kind,
          amount,
          accountId: account.id,
          categoryId: category?.id ?? cats[0].id,
          note,
          date,
        })
      } else {
        await addQuickEntry({
          kind,
          amount,
          accountId: account.id,
          categoryId: category?.id ?? cats[0].id,
          note,
          date,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت نشد')
    } finally {
      setSaving(false)
    }
  }

  if (picker === 'category') {
    return (
      <PickerSheet title="دسته‌بندی" onClose={() => setPicker(null)}>
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            className="option-item lg-light"
            onClick={() => {
              setCategoryId(c.id)
              setPicker(null)
            }}
          >
            <span className="oico">{c.icon}</span>
            <div>
              <div className="otitle">{c.name}</div>
            </div>
          </button>
        ))}
      </PickerSheet>
    )
  }

  if (picker === 'account') {
    return (
      <PickerSheet title="از حساب" onClose={() => setPicker(null)}>
        {activeAccounts.length === 0 ? (
          <p className="sheet-sub">حساب فعالی ندارید</p>
        ) : (
          activeAccounts.map((a) => (
            <AccountPickRow
              key={a.id}
              account={a}
              onPick={() => {
                setAccountId(a.id)
                setPicker(null)
              }}
            />
          ))
        )}
      </PickerSheet>
    )
  }

  return (
    <>
      <div className="peek-home">
        <div className="ph-title">خانه</div>
        <div className="ph-amt">{formatRial(totalBalance)} ریال</div>
      </div>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="glass-sheet" role="dialog" aria-label="ثبت سریع">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>{isEdit ? 'ویرایش تراکنش' : 'ثبت سریع'}</h1>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="بستن">
            ✕
          </button>
        </div>

        <div className="seg" role="tablist" aria-label="نوع تراکنش">
          <div className={`seg-thumb${kind === 'income' ? ' income' : ''}`} aria-hidden="true" />
          <button
            className={`seg-btn${kind === 'expense' ? ' active' : ''}`}
            type="button"
            role="tab"
            aria-selected={kind === 'expense'}
            onClick={() => switchKind('expense')}
          >
            هزینه
          </button>
          <button
            className={`seg-btn${kind === 'income' ? ' active income' : ''}`}
            type="button"
            role="tab"
            aria-selected={kind === 'income'}
            onClick={() => switchKind('income')}
          >
            درآمد
          </button>
        </div>

        <div className="amount-block" onClick={() => amountRef.current?.focus()}>
          <div className="hint">مبلغ</div>
          <div className="big">
            <span className={`amount-caret${kind === 'income' ? ' income' : ''}`} />
            {amount > 0 ? formatRial(amount) : '۰'}
            <span className="cur">ریال</span>
          </div>
          <input
            ref={amountRef}
            className="amount-input"
            inputMode="numeric"
            autoFocus
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            aria-label="مبلغ به ریال"
          />
        </div>

        {error || over ? (
          <div className="banner error">
            <span className="bico">⚠</span>
            <span>{error || 'موجودی حساب کافی نیست'}</span>
          </div>
        ) : null}

        <div className="field-stack">
          <button className="field-chip" type="button" onClick={() => !linked && setPicker('category')} disabled={linked}>
            <span className="ficon">{category?.icon ?? '📂'}</span>
            <div>
              <div className="flabel">دسته‌بندی</div>
              <div className="fvalue">{category?.name ?? 'انتخاب کنید'}</div>
            </div>
            {linked ? <span className="readonly-tag">قفل</span> : <span className="fchev">‹</span>}
          </button>
          <button className="field-chip" type="button" onClick={() => setPicker('account')}>
            <span className="ficon">💳</span>
            <div>
              <div className="flabel">{kind === 'income' ? 'به حساب' : 'از حساب'}</div>
              <div className={account ? 'fvalue' : 'fvalue placeholder-val'}>
                {account?.name ?? 'حسابی انتخاب نشده'}
              </div>
            </div>
            <span className="fchev">‹</span>
          </button>
          <DateField label="تاریخ" value={date} onChange={setDate} />
          <button className="field-chip" type="button" onClick={() => setPicker(picker === 'note' ? null : 'note')}>
            <span className="ficon">📝</span>
            <div style={{ flex: 1 }}>
              <div className="flabel">یادداشت</div>
              {picker === 'note' ? (
                <input
                  className="field-input"
                  placeholder="اختیاری…"
                  value={note}
                  autoFocus
                  onChange={(e) => setNote(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className={note ? 'fvalue' : 'fvalue placeholder-val'}>{note || 'اختیاری…'}</div>
              )}
            </div>
            <span className="fchev">‹</span>
          </button>
        </div>

        <button className={`cta-confirm${disabled ? ' disabled' : ''}`} type="button" onClick={() => void submit()} disabled={disabled}>
          {saving ? 'در حال ثبت…' : isEdit ? 'ذخیره تغییرات' : 'تأیید و ثبت'}
        </button>
      </div>
    </>
  )
}

function AccountPickRow({ account, onPick }: { account: Account; onPick: () => void }) {
  return (
    <button type="button" className="option-item lg-light" onClick={onPick}>
      <span className="oico">💳</span>
      <div>
        <div className="otitle">{account.name}</div>
        <div className="osub">{formatRial(account.balance)} ریال</div>
      </div>
    </button>
  )
}
