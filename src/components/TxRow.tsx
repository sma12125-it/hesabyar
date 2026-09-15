import { formatRelativeFa } from '../lib/dates'
import { accountIcon, getCategory } from '../lib/categories'
import { formatRial } from '../lib/money'
import type { Account, Transaction } from '../types'

export function txTitle(tx: Transaction, accounts: Account[]): string {
  if (tx.note) return tx.note
  if (tx.kind === 'transfer') {
    const to = accounts.find((a) => a.id === tx.counterpartyAccountId)
    return to ? `انتقال به ${to.name}` : 'انتقال'
  }
  return getCategory(tx.categoryId)?.name ?? 'تراکنش'
}

export function txIcon(tx: Transaction): string {
  if (tx.kind === 'transfer') return '⇄'
  return getCategory(tx.categoryId)?.icon ?? '💳'
}

export function TxRow({ tx, accounts }: { tx: Transaction; accounts: Account[] }) {
  const account = accounts.find((a) => a.id === tx.accountId)
  const amtClass = tx.kind === 'income' ? 'income' : tx.kind === 'expense' ? 'expense' : ''
  const subBits = [formatRelativeFa(tx.createdAt)]
  if (account) subBits.push(account.name)

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
