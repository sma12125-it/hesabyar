import { useState } from 'react'
import { INSTALLMENT_CATEGORY_ID, getCategory } from '../lib/categories'
import { formatPersianDateFull } from '../lib/dates'
import { DateField } from './DateField'
import { todayIso } from '../lib/iso'
import { formatRial, parseRialInput } from '../lib/money'
import { planHasPayment } from '../lib/installments'
import { useStore } from '../store/Store'
import { PickerSheet } from './PickerSheet'
import type { InstallmentPlan } from '../types'

export function InstallmentPlanSheet({
  plan,
  onClose,
}: {
  plan?: InstallmentPlan
  onClose: () => void
}) {
  const { activeAccounts, items, plans, createInstallmentPlan, updateInstallmentPlan } = useStore()
  const planItems = items.filter((i) => i.planId === plan?.id)
  const locked = Boolean(plan && planHasPayment(planItems))
  const [name, setName] = useState(plan?.name ?? '')
  const [amountRaw, setAmountRaw] = useState(plan ? String(plan.installmentAmount) : '')
  const [countRaw, setCountRaw] = useState(plan ? String(plan.totalCount) : '')
  const [startDate, setStartDate] = useState(plan?.startDate ?? todayIso())
  const [accountId, setAccountId] = useState(plan?.defaultAccountId ?? activeAccounts[0]?.id ?? '')
  const [picker, setPicker] = useState<'account' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const account = activeAccounts.find((a) => a.id === accountId)
  const amount = parseRialInput(amountRaw)
  const count = parseRialInput(countRaw)
  const category = getCategory(INSTALLMENT_CATEGORY_ID)
  const activeCount = plans.filter((p) => p.status === 'active').length

  async function save() {
    setError(null)
    setSaving(true)
    try {
      if (plan) {
        await updateInstallmentPlan(plan.id, {
          name,
          defaultAccountId: accountId,
          ...(locked ? {} : { installmentAmount: amount, totalCount: count, startDate }),
        })
      } else {
        await createInstallmentPlan({
          name,
          installmentAmount: amount,
          totalCount: count,
          startDate,
          defaultAccountId: accountId,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره نشد')
    } finally {
      setSaving(false)
    }
  }

  if (picker === 'account') {
    return (
      <PickerSheet title="حساب پرداخت" onClose={() => setPicker(null)}>
        {activeAccounts.map((a) => (
          <button
            key={a.id}
            type="button"
            className="option-item lg-light"
            onClick={() => {
              setAccountId(a.id)
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
      <div className="peek-home">
        <div className="ph-title">اقساط</div>
        <div className="ph-amt">{activeCount} برنامه فعال</div>
      </div>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="glass-sheet" role="dialog" aria-label={plan ? 'ویرایش برنامه' : 'برنامه جدید'}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>{plan ? 'ویرایش برنامه' : 'برنامه جدید'}</h1>
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
          {locked ? (
            <p className="sheet-sub">پس از اولین پرداخت فقط نام و حساب پرداخت قابل تغییر است.</p>
          ) : null}
          <div className="field-stack">
            <div className="field-chip">
              <span className="ficon">✏️</span>
              <div style={{ flex: 1 }}>
                <div className="flabel">نام برنامه</div>
                <input
                  className="field-input"
                  placeholder="مثلاً قسط لپ‌تاپ"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className={`field-chip${locked ? ' chip-readonly' : ''}`}>
              <span className="ficon">💰</span>
              <div style={{ flex: 1 }}>
                <div className="flabel">مبلغ هر قسط</div>
                {locked ? (
                  <div className="fvalue">
                    {formatRial(amount)}
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--hy-text-tertiary)', marginRight: 4 }}>
                      ریال
                    </span>
                  </div>
                ) : (
                  <input
                    className="field-input"
                    inputMode="numeric"
                    placeholder="۰"
                    value={amountRaw}
                    onChange={(e) => setAmountRaw(e.target.value)}
                    aria-label="مبلغ هر قسط به ریال"
                  />
                )}
              </div>
              {!locked ? (
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--hy-text-tertiary)' }}>ریال</span>
              ) : (
                <span className="readonly-tag">قفل</span>
              )}
            </div>
            <div className={`field-chip${locked ? ' chip-readonly' : ''}`}>
              <span className="ficon">＃</span>
              <div style={{ flex: 1 }}>
                <div className="flabel">تعداد اقساط</div>
                {locked ? (
                  <div className="fvalue">{count} قسط</div>
                ) : (
                  <input
                    className="field-input"
                    inputMode="numeric"
                    placeholder="۱۲"
                    value={countRaw}
                    onChange={(e) => setCountRaw(e.target.value)}
                    aria-label="تعداد اقساط"
                  />
                )}
              </div>
              {locked ? <span className="readonly-tag">قفل</span> : null}
            </div>
            {locked ? (
              <div className="field-chip chip-readonly">
                <span className="ficon">📆</span>
                <div>
                  <div className="flabel">تاریخ شروع</div>
                  <div className="fvalue">{formatPersianDateFull(startDate)}</div>
                </div>
                <span className="readonly-tag">قفل</span>
              </div>
            ) : (
              <DateField label="تاریخ شروع" value={startDate} onChange={setStartDate} />
            )}
            <button className="field-chip" type="button" onClick={() => setPicker('account')}>
              <span className="ficon">💳</span>
              <div>
                <div className="flabel">حساب پرداخت</div>
                <div className={account ? 'fvalue' : 'fvalue placeholder-val'}>
                  {account?.name ?? 'انتخاب حساب…'}
                </div>
              </div>
              <span className="fchev">‹</span>
            </button>
            <div className="field-chip chip-readonly">
              <span className="ficon">{category?.icon ?? '📂'}</span>
              <div>
                <div className="flabel">دسته‌بندی</div>
                <div className="fvalue">{category?.name ?? 'اقساط'}</div>
              </div>
              <span className="readonly-tag">ثابت</span>
            </div>
          </div>
          <button
            className="cta-confirm"
            type="button"
            style={{ marginTop: 14 }}
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? 'در حال ذخیره…' : plan ? 'ذخیره تغییرات' : 'ذخیره برنامه'}
          </button>
        </div>
      </div>
    </>
  )
}
