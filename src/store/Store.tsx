import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as db from '../db/db'
import { demoDataset } from '../db/seed'
import { createId } from '../lib/ids'
import { validateAccountName, validateAmount } from '../lib/money'
import type { Account, CreateAccountInput, QuickEntryInput, Transaction, TransferInput } from '../types'

interface StoreValue {
  ready: boolean
  error: string | null
  accounts: Account[]
  transactions: Transaction[]
  activeAccounts: Account[]
  totalBalance: number
  refresh: () => Promise<void>
  createAccount: (input: CreateAccountInput) => Promise<Account>
  updateAccount: (id: string, patch: { name?: string; type?: Account['type'] }) => Promise<void>
  archiveAccount: (id: string) => Promise<void>
  restoreAccount: (id: string) => Promise<void>
  addQuickEntry: (input: QuickEntryInput) => Promise<void>
  addTransfer: (input: TransferInput) => Promise<void>
  resetDemo: () => Promise<void>
  wipeAll: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const refresh = useCallback(async () => {
    const [accs, txs] = await Promise.all([db.listAccounts(), db.listTransactions()])
    setAccounts(accs)
    setTransactions(txs)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const seeded = await db.getKv<boolean>('seeded')
        if (!seeded) {
          const demo = demoDataset()
          await db.replaceAllData(demo.accounts, demo.transactions)
          await db.setKv('seeded', true)
        }
        if (!cancelled) {
          await refresh()
          setReady(true)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'خطای ذخیره‌سازی')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts])
  const totalBalance = useMemo(
    () => activeAccounts.reduce((sum, a) => sum + a.balance, 0),
    [activeAccounts],
  )

  const createAccount = useCallback(async (input: CreateAccountInput) => {
    const nameError = validateAccountName(input.name)
    if (nameError) throw new Error(nameError)
    if (input.initialBalance < 0 || !Number.isInteger(input.initialBalance)) {
      throw new Error('موجودی اولیه نامعتبر است')
    }
    const now = Date.now()
    const account: Account = {
      id: createId('acc'),
      name: input.name.trim(),
      type: input.type,
      archived: false,
      balance: input.initialBalance,
      createdAt: now,
      updatedAt: now,
    }
    await db.putAccount(account)
    await refresh()
    return account
  }, [refresh])

  const updateAccount = useCallback(async (id: string, patch: { name?: string; type?: Account['type'] }) => {
    const account = accounts.find((a) => a.id === id)
    if (!account) throw new Error('حساب پیدا نشد')
    const nextName = patch.name ?? account.name
    const nameError = validateAccountName(nextName)
    if (nameError) throw new Error(nameError)
    await db.putAccount({
      ...account,
      name: nextName.trim(),
      type: patch.type ?? account.type,
      updatedAt: Date.now(),
    })
    await refresh()
  }, [accounts, refresh])

  const archiveAccount = useCallback(async (id: string) => {
    const account = accounts.find((a) => a.id === id)
    if (!account) throw new Error('حساب پیدا نشد')
    await db.putAccount({ ...account, archived: true, updatedAt: Date.now() })
    await refresh()
  }, [accounts, refresh])

  const restoreAccount = useCallback(async (id: string) => {
    const account = accounts.find((a) => a.id === id)
    if (!account) throw new Error('حساب پیدا نشد')
    await db.putAccount({ ...account, archived: false, updatedAt: Date.now() })
    await refresh()
  }, [accounts, refresh])

  const addQuickEntry = useCallback(async (input: QuickEntryInput) => {
    const amountError = validateAmount(input.amount)
    if (amountError) throw new Error(amountError)
    const account = accounts.find((a) => a.id === input.accountId)
    if (!account || account.archived) throw new Error('حساب معتبری انتخاب نشده')
    const now = Date.now()
    const nextBalance = input.kind === 'income' ? account.balance + input.amount : account.balance - input.amount
    await db.putAccount({ ...account, balance: nextBalance, updatedAt: now })
    const tx: Transaction = {
      id: createId('tx'),
      kind: input.kind,
      amount: input.amount,
      accountId: account.id,
      categoryId: input.categoryId,
      note: input.note.trim(),
      createdAt: now,
    }
    await db.putTransaction(tx)
    await refresh()
  }, [accounts, refresh])

  const addTransfer = useCallback(async (input: TransferInput) => {
    const amountError = validateAmount(input.amount)
    if (amountError) throw new Error(amountError)
    if (input.fromAccountId === input.toAccountId) throw new Error('مبدأ و مقصد باید متفاوت باشند')
    const from = accounts.find((a) => a.id === input.fromAccountId)
    const to = accounts.find((a) => a.id === input.toAccountId)
    if (!from || from.archived) throw new Error('حساب مبدأ معتبر نیست')
    if (!to || to.archived) throw new Error('حساب مقصد معتبر نیست')
    if (input.amount > from.balance) throw new Error('مبلغ از موجودی قابل انتقال بیشتر است')
    const now = Date.now()
    await db.putAccount({ ...from, balance: from.balance - input.amount, updatedAt: now })
    await db.putAccount({ ...to, balance: to.balance + input.amount, updatedAt: now })
    await db.putTransaction({
      id: createId('tx'),
      kind: 'transfer',
      amount: input.amount,
      accountId: from.id,
      counterpartyAccountId: to.id,
      categoryId: 'transfer',
      note: input.note.trim() || `انتقال به ${to.name}`,
      createdAt: now,
    })
    await refresh()
  }, [accounts, refresh])

  const resetDemo = useCallback(async () => {
    const demo = demoDataset()
    await db.replaceAllData(demo.accounts, demo.transactions)
    await db.setKv('seeded', true)
    await refresh()
  }, [refresh])

  const wipeAll = useCallback(async () => {
    await db.replaceAllData([], [])
    await db.setKv('seeded', true)
    await refresh()
  }, [refresh])

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      error,
      accounts,
      transactions,
      activeAccounts,
      totalBalance,
      refresh,
      createAccount,
      updateAccount,
      archiveAccount,
      restoreAccount,
      addQuickEntry,
      addTransfer,
      resetDemo,
      wipeAll,
    }),
    [
      ready,
      error,
      accounts,
      transactions,
      activeAccounts,
      totalBalance,
      refresh,
      createAccount,
      updateAccount,
      archiveAccount,
      restoreAccount,
      addQuickEntry,
      addTransfer,
      resetDemo,
      wipeAll,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
