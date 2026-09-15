import { toFaDigits } from '../lib/money'
import { useStore } from '../store/Store'
import { BalanceHero } from '../components/BalanceHero'
import { TxRow } from '../components/TxRow'
import type { Dispatch, SetStateAction } from 'react'

interface HomePageProps {
  onScroll: (compact: boolean) => void
  setToast: Dispatch<SetStateAction<string | null>>
  onQuickEntry: (kind: 'expense' | 'income') => void
  onTransfer: () => void
  onAll: () => void
  onSettings: () => void
}

export function HomePage({ onScroll, setToast, onQuickEntry, onTransfer, onAll, onSettings }: HomePageProps) {
  const { activeAccounts, totalBalance, transactions, accounts } = useStore()
  const recent = transactions.slice(0, 8)

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
        <button className="qa-item" type="button" onClick={() => setToast('اقساط در اسپرینت بعد')}>
          <span className="qa-ico">📅</span>
          <span className="label">اقساط</span>
        </button>
      </div>

      <div className="section-head">
        <h2>تراکنش‌های اخیر</h2>
        <button className="link" type="button" onClick={onAll}>
          همه
        </button>
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
