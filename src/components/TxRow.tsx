import { formatRelativeFa } from '../lib/dates'
import { accountIcon, getCategory } from '../lib/categories'
import { formatRial } from '../lib/money'
import type { Account, Transaction } from '../types'

export function txTitle(tx: Transaction, accounts: Account[]): string {
  if (tx.kind === 'transferOut' || tx.kind === 'transferIn') {
    if (tx.kind === 'transferIn') {
      const from = accounts.find((a) => a.id === tx.counterpartyAccountId)
      return tx.note || (from ? `انتقال از ${from.name}` : 'انتقال')
    }
    const to = accounts.find((a) => a.id === tx.counterpartyAccountId)
    return tx.note || (to ? `انتقال به ${to.name}` : 'انتقال')
  }
  if (tx.note) return tx.note
  return getCategory(tx.categoryId)?.name ?? 'تراکنش'
}

export function txIcon(tx: Transaction): string {
  if (tx.kind === 'transferOut' || tx.kind === 'transferIn') return '⇄'
  return getCategory(tx.categoryId)?.icon ?? '💳'
}

export function isTransferKind(kind: Transaction['kind']): boolean {
  return kind === 'transferOut' || kind === 'transferIn'
}

/** Home / all-tx hide the inbound leg so a transfer appears once. */
export function visibleLedger(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => tx.kind !== 'transferIn')
}

export function TxRow({
  tx,
  accounts,
  forAccountId,
}: {
  tx: Transaction
  accounts: Account[]
  forAccountId?: string
}) {
  const account = accounts.find((a) => a.id === tx.accountId)
  const amtClass = tx.kind === 'income' ? 'income' : tx.kind === 'expense' ? 'expense' : ''
  const subBits = [formatRelativeFa(tx.createdAt)]
  if (!forAccountId && account) subBits.push(account.name)
  if (forAccountId && isTransferKind(tx.kind)) {
    const otherId = tx.counterpartyAccountId
    const other = accounts.find((a) => a.id === otherId)
    if (other) subBits.push(other.name)
  }

  return (
    <div className="tx-row lg-light">
      <div className="tx-ico">{txIcon(tx)}</div>
      <div className="tx-meta">
        <div className="tx-title">{txTitle(tx, accounts)}</div>
        <div className="tx-sub">{subBits.join(' · ')}</div>
      </div>
      <div className={`tx-amt ${amtClass}`.trim()}>
        {formatRial(tx.amount)}
        <span className="unit">ریال</span>
      </div>
    </div>
  )
}

export function AccountRow({
  account,
  onClick,
}: {
  account: Account
  onClick: () => void
}) {
  return (
    <button className="acct-row lg-light" type="button" onClick={onClick}>
      <div className="acct-ico">{accountIcon(account.type, account.name)}</div>
      <div className="acct-meta">
        <div className="acct-name">{account.name}</div>
        <span className={`badge ${account.type}`}>{account.type === 'cash' ? 'نقد' : 'بانک'}</span>
      </div>
      <div className="acct-bal">
        {formatRial(account.balance)}
        <span className="unit">ریال</span>
      </div>
    </button>
  )
}
