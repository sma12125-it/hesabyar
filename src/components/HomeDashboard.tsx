import { useNavigate } from 'react-router-dom'
import { JALALI_MONTHS } from '../lib/jalaali'
import { monthKey, monthTotals, monthlySeries, expenseByCategory } from '../lib/reports'
import { todayIso } from '../lib/iso'
import { formatRial } from '../lib/money'
import { useStore } from '../store/Store'

export function HomeDashboard() {
  const { transactions, activeAccounts, customCategories } = useStore()
  const navigate = useNavigate()
  const today = todayIso()
  const month = monthKey(today) ?? ''
  const totals = monthTotals(transactions, month)
  const series = monthlySeries(transactions, today).map((point) => ({
    ...point,
    label: JALALI_MONTHS[Number(point.label) - 1] ?? point.label,
  }))
  const bars = expenseByCategory(transactions, month, customCategories).slice(0, 5)
  const max = Math.max(1, ...series.flatMap((point) => [point.income, point.expense]))
  const catMax = Math.max(1, ...bars.map((bar) => bar.amount))

  return (
    <section className="home-dash">
      <div className="section-head">
        <h2>داشبورد این ماه</h2>
      </div>
      <div className="dash-stats">
        <div className="dash-stat lg income">
          <div className="k">درآمد</div>
          <div className="v">{formatRial(totals.income)}</div>
        </div>
        <div className="dash-stat lg expense">
          <div className="k">هزینه</div>
          <div className="v">{formatRial(totals.expense)}</div>
        </div>
        <div className="dash-stat lg">
          <div className="k">خالص</div>
          <div className={`v${totals.net < 0 ? ' expense' : ''}`}>{formatRial(totals.net)}</div>
        </div>
      </div>

      <section className="lg report-card">
        <h2>شش ماه اخیر</h2>
        <svg className="chart" viewBox="0 0 320 148" role="img" aria-label="نمودار درآمد و هزینه شش ماه">
          {series.map((point, index) => {
            const x = 16 + index * 50
            const incomeH = (point.income / max) * 88
            const expenseH = (point.expense / max) * 88
            return (
              <g key={`${point.label}-${index}`}>
                <rect x={x} y={108 - incomeH} width="14" height={Math.max(incomeH, 0)} rx="4" fill="#16A34A" />
                <rect x={x + 16} y={108 - expenseH} width="14" height={Math.max(expenseH, 0)} rx="4" fill="#DC2626" />
                <text x={x + 15} y="128" textAnchor="middle" fontSize="9" fill="currentColor">
                  {point.label}
                </text>
              </g>
            )
          })}
        </svg>
        <p className="sheet-sub">سبز درآمد · قرمز هزینه</p>
      </section>

      {bars.length > 0 ? (
        <section className="lg report-card">
          <h2>هزینه به تفکیک دسته</h2>
          {bars.map((bar) => (
            <div key={bar.id} className="cat-bar-row">
              <span className="name">{bar.name}</span>
              <span className="track"><span style={{ width: `${(bar.amount / catMax) * 100}%` }} /></span>
              <span className="amt">{formatRial(bar.amount)}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="lg report-card">
        <h2>حساب‌ها</h2>
        {activeAccounts.length === 0 ? (
          <p className="sheet-sub">هنوز حسابی ساخته نشده.</p>
        ) : (
          <div className="dash-accounts">
            {activeAccounts.map((account) => (
              <button key={account.id} className="dash-account" type="button" onClick={() => navigate(`/accounts/${account.id}`)}>
                <span>
                  {account.name}
                  {account.shareId ? <span className="badge bank">مشترک</span> : null}
                </span>
                <strong>{formatRial(account.balance)}</strong>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
