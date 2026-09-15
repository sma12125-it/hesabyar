import { useNavigate } from 'react-router-dom'
import { toFaDigits } from '../lib/money'
import { useStore } from '../store/Store'
import { AccountRow } from '../components/TxRow'
import { BalanceHero } from '../components/BalanceHero'

export function AccountsPage({
  onScroll,
  onCreate,
}: {
  onScroll: (compact: boolean) => void
  onCreate: () => void
}) {
  const { accounts, activeAccounts, totalBalance } = useStore()
  const navigate = useNavigate()
  const visible = accounts.filter((a) => !a.archived)
  const archived = accounts.filter((a) => a.archived)

  return (
    <div className="app-scroll" onScroll={(e) => onScroll(e.currentTarget.scrollTop > 28)}>
      <div className="top-row">
        <h1>حساب‌ها</h1>
        <span style={{ width: 40 }} />
      </div>

      {visible.length === 0 && archived.length === 0 ? (
        <div className="empty-state lg">
          <div className="empty-ico">💳</div>
          <h2>هنوز حسابی نداری</h2>
          <p>اولین حساب نقد یا بانکی‌ات را بساز تا موجودی و تراکنش‌ها اینجا جمع شوند.</p>
          <button className="cta-confirm" type="button" onClick={onCreate}>
            ＋ ساخت حساب جدید
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <BalanceHero
              label="مجموع موجودی"
              amount={totalBalance}
              sub={`${toFaDigits(activeAccounts.length)} حساب فعال`}
            />
          </div>
          <div className="section-head">
            <h2>حساب‌های من</h2>
          </div>
          <div className="acct-list">
            {visible.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onClick={() => navigate(`/accounts/${account.id}`)}
              />
            ))}
          </div>
          {archived.length > 0 ? (
            <>
              <div className="section-head">
                <h2>آرشیو</h2>
              </div>
              <div className="acct-list">
                {archived.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onClick={() => navigate(`/accounts/${account.id}`)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
