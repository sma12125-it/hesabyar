import { useStore } from '../store/Store'
import { TxRow } from '../components/TxRow'

export function AllTransactionsPage({ onBack }: { onBack: () => void }) {
  const { transactions, accounts } = useStore()

  return (
    <>
      <div className="sheet-scrim" onClick={onBack} />
      <div className="glass-sheet" role="dialog" aria-label="همه تراکنش‌ها">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>همه تراکنش‌ها</h1>
          <button className="sheet-close" type="button" onClick={onBack} aria-label="بستن">
            ✕
          </button>
        </div>
        <div className="tx-list" style={{ overflowY: 'auto', flex: 1 }}>
          {transactions.length === 0 ? (
            <p className="sheet-sub">تراکنشی ثبت نشده</p>
          ) : (
            transactions.map((tx) => <TxRow key={tx.id} tx={tx} accounts={accounts} />)
          )}
        </div>
      </div>
    </>
  )
}
