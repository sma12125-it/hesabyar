export type AccountType = 'cash' | 'bank'
export type TxKind = 'expense' | 'income' | 'transfer'

export interface Account {
  id: string
  name: string
  type: AccountType
  archived: boolean
  /** Current balance in Rial (integer). */
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
  categoryId: string
  note: string
  createdAt: number
}

export interface Category {
  id: string
  name: string
  icon: string
  kind: 'expense' | 'income' | 'transfer'
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
}

export interface TransferInput {
  amount: number
  fromAccountId: string
  toAccountId: string
  note: string
}
