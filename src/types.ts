export type AccountType = 'cash' | 'bank'
export type TxKind = 'expense' | 'income' | 'transferOut' | 'transferIn'
/** @deprecated Sprint 1 single-leg transfer; migrated to transferOut + transferIn */
export type LegacyTxKind = TxKind | 'transfer'

export type InstallmentPlanStatus = 'active' | 'completed' | 'archived'
export type InstallmentItemStatus = 'pending' | 'paid' | 'overdue'
export type PlanBadge = 'overdue' | 'due-soon' | 'ok'

export interface Account {
  id: string
  name: string
  type: AccountType
  archived: boolean
  /** Immutable after create. Balance is computed from this + transactions. */
  openingBalance: number
  /** Computed: openingBalance + income − expense − transferOut + transferIn */
  balance: number
  createdAt: number
  updatedAt: number
}

export interface Transaction {
  id: string
  kind: TxKind
  amount: number
  accountId: string
  counterpartyAccountId?: string
  transferId?: string
  installmentItemId?: string
  categoryId: string
  note: string
  /** ISO Gregorian calendar date (YYYY-MM-DD). */
  date: string
  createdAt: number
}

export interface Category {
  id: string
  name: string
  icon: string
  kind: 'expense' | 'income' | 'transfer'
}

export interface InstallmentPlan {
  id: string
  name: string
  installmentAmount: number
  totalCount: number
  startDate: string
  defaultAccountId: string
  categoryId: 'installments'
  status: InstallmentPlanStatus
  createdAt: number
  updatedAt: number
}

export interface InstallmentItem {
  id: string
  planId: string
  index: number
  dueDate: string
  amount: number
  status: InstallmentItemStatus
  paidAt?: string
  transactionId?: string
}

export interface CreateAccountInput {
  name: string
  type: AccountType
  initialBalance: number
}

export interface QuickEntryInput {
  kind: 'expense' | 'income'
  amount: number
  accountId: string
  categoryId: string
  note: string
  date?: string
}

export interface TransferInput {
  amount: number
  fromAccountId: string
  toAccountId: string
  note: string
  date: string
}

export interface CreateInstallmentPlanInput {
  name: string
  installmentAmount: number
  totalCount: number
  startDate: string
  defaultAccountId: string
}

export interface UpdateInstallmentPlanInput {
  name?: string
  defaultAccountId?: string
  installmentAmount?: number
  totalCount?: number
  startDate?: string
}
