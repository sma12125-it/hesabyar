import { formatRial, toFaDigits } from '../lib/money'
import { useStore } from '../store/Store'
import { BalanceHero } from '../components/BalanceHero'
import { TxRow, visibleLedger } from '../components/TxRow'
import { formatPersianDate } from '../lib/dates'
import { homeInstallmentHints } from '../lib/installments'
import { todayIso } from '../lib/iso'
import type { Dispatch, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'

interface HomePageProps {
  onScroll: (compact: boolean) => void
  setToast: Dispatch<SetStateAction<string | null>>
  onQuickEntry: (kind: 'expense' | 'income') => void
  onTransfer: () => void
  onAll: () => void
  onSettings: () => void
}

export function HomePage({ onScroll, setToast, onQuickEntry, onTransfer, onAll, onSettings }: HomePageProps) {
  const { activeAccounts, totalBalance, transactions, accounts, plans, items } = useStore()
  const navigate = useNavigate()
  const ledger = visibleLedger(transactions)
  const recent = ledger.slice(0, 2)
  const today = todayIso()
  const hints = homeInstallmentHints(plans, items, today).slice(0, 4)

  return (
    <div
      className="app-scroll"
      onScroll={(e) => onScroll(e.currentTarget.scrollTop > 28)}
    >
      <div className="top-row">
        <h1
          onContextMenu={(e) => {
            e.preventDefault()
            onSettings()
          }}
        >
          خانه
        </h1>
        <button
          className="icon-btn"
          type="button"
          title="اعلان‌ها"
          onClick={() => setToast('اعلانی نیست — نگه‌دار برای داده محلی')}
          onContextMenu={(e) => {
            e.preventDefault()
            onSettings()
          }}
        >
          🔔
        </button>
      </div>

      <BalanceHero
        label="موجودی کل"
        amount={totalBalance}
        sub={`${toFaDigits(activeAccounts.length)} حساب فعال · به‌روز الآن`}
      />

      <div className="qa-group lg">
        <button className="qa-item" type="button" onClick={() => onQuickEntry('expense')}>
          <span className="qa-ico">🛒</span>
          <span className="label">هزینه</span>
        </button>
        <button className="qa-item" type="button" onClick={() => onQuickEntry('income')}>
          <span className="qa-ico">💰</span>
          <span className="label">درآمد</span>
        </button>
        <button className="qa-item" type="button" onClick={onTransfer}>
          <span className="qa-ico">⇄</span>
          <span className="label">انتقال</span>
        </button>
        <button className="qa-item" type="button" onClick={() => navigate('/installments')}>
          <span className="qa-ico">📅</span>
          <span className="label">اقساط</span>
        </button>
      </div>

      {hints.length > 0 ? (
        <>
          <div className="section-head">
            <h2>سررسید اقساط</h2>
            <button className="link" type="button" onClick={() => navigate('/installments')}>
              همه
            </button>
          </div>
          <div className="plan-list">
            {hints.map(({ plan, item, kind }) => (
              <button
                key={item.id}
                className="plan-card lg-row"
                type="button"
                onClick={() => navigate(`/installments/${plan.id}`)}
              >
                <div className="plan-top">
                  <div>
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-meta">
                      {kind === 'overdue'
                        ? `معوق · سررسید ${formatPersianDate(item.dueDate)}`
                        : `سررسید ${formatPersianDate(item.dueDate)}`}
                    </div>
                  </div>
                  <div className="plan-right">
                    <span className={`badge ${kind === 'overdue' ? 'overdue' : 'due-soon'}`}>
                      {kind === 'overdue' ? 'معوق' : 'به‌زودی'}
                    </span>
                    <div className="plan-amount">
                      {formatRial(item.amount)}
                      <span className="unit">ریال</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="section-head">
        <h2>تراکنش‌های اخیر</h2>
        {ledger.length > 0 ? (
          <button className="link show-all" type="button" onClick={onAll}>
            نمایش همه
          </button>
        ) : null}
      </div>

      <div className="tx-list">
        {recent.length === 0 ? (
          <div className="empty-state lg" style={{ marginTop: 8 }}>
            <div className="empty-ico">🧾</div>
            <h2>تراکنشی نیست</h2>
            <p>با دکمه ثبت، اولین هزینه یا درآمدت را وارد کن.</p>
          </div>
        ) : (
          recent.map((tx) => <TxRow key={tx.id} tx={tx} accounts={accounts} />)
        )}
      </div>
    </div>
  )
}
