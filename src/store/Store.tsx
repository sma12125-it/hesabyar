import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as db from '../db/db'
import { sortTransactions } from '../db/db'
import { demoDataset } from '../db/seed'
import { hydrateAccounts } from '../lib/balance'
import {
  deleteAccountCascade,
  deleteInstallmentItemCascade,
  deletePlanCascade,
  deleteTransactionCascade,
  nextPlanStatus,
  patchToWrites,
  type AppData,
} from '../lib/cascade'
import { INSTALLMENT_CATEGORY_ID } from '../lib/categories'
import { createId } from '../lib/ids'
import {
  defaultPayNote,
  generateInstallmentItems,
  itemEffectiveStatus,
  paidCount,
  planHasPayment,
  scheduleForPlanInput,
  validatePlanInput,
  validatePlanUpdate,
} from '../lib/installments'
import { isValidIsoDate, todayIso } from '../lib/iso'
import { availableAfterReplacing, validateAccountName, validateAmount, validateExpenseBalance } from '../lib/money'
import { validateTransfer } from '../lib/transfer'
import type {
  Account,
  CreateAccountInput,
  CreateInstallmentPlanInput,
  InstallmentItem,
  InstallmentPlan,
  QuickEntryInput,
  Transaction,
  TransferInput,
  UpdateInstallmentItemInput,
  UpdateInstallmentPlanInput,
  UpdateTransactionInput,
} from '../types'

interface StoreValue {
  ready: boolean
  error: string | null
  accounts: Account[]
  transactions: Transaction[]
  plans: InstallmentPlan[]
  items: InstallmentItem[]
  activeAccounts: Account[]
  totalBalance: number
  refresh: () => Promise<void>
  createAccount: (input: CreateAccountInput) => Promise<Account>
  updateAccount: (id: string, patch: { name?: string; type?: Account['type'] }) => Promise<void>
  archiveAccount: (id: string) => Promise<void>
  restoreAccount: (id: string) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  addQuickEntry: (input: QuickEntryInput) => Promise<void>
  addTransfer: (input: TransferInput) => Promise<void>
  updateTransaction: (id: string, patch: UpdateTransactionInput) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  createInstallmentPlan: (input: CreateInstallmentPlanInput) => Promise<InstallmentPlan>
  updateInstallmentPlan: (id: string, patch: UpdateInstallmentPlanInput) => Promise<void>
  updateInstallmentItem: (id: string, patch: UpdateInstallmentItemInput) => Promise<void>
  archiveInstallmentPlan: (id: string) => Promise<void>
  restoreInstallmentPlan: (id: string) => Promise<void>
  deleteInstallmentPlan: (id: string) => Promise<void>
  deleteInstallmentItem: (id: string) => Promise<void>
  payInstallment: (itemId: string, accountId: string, note?: string) => Promise<void>
  resetDemo: () => Promise<void>
  wipeAll: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

function hydrateSnapshot(data: AppData): AppData {
  return {
    accounts: hydrateAccounts(data.accounts, data.transactions).sort((a, b) => a.createdAt - b.createdAt),
    transactions: sortTransactions(data.transactions),
    plans: data.plans.slice().sort((a, b) => a.createdAt - b.createdAt),
    items: data.items.slice().sort((a, b) => a.index - b.index),
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [items, setItems] = useState<InstallmentItem[]>([])
  const dataRef = useRef<AppData>({ accounts, transactions, plans, items })
  dataRef.current = { accounts, transactions, plans, items }

  const applySnapshot = useCallback((data: AppData) => {
    const next = hydrateSnapshot(data)
    dataRef.current = next
    setAccounts(next.accounts)
    setTransactions(next.transactions)
    setPlans(next.plans)
    setItems(next.items)
  }, [])

  const persistSnapshot = useCallback(
    async (prev: AppData, next: AppData) => {
      const hydrated = hydrateSnapshot(next)
      applySnapshot(hydrated)
      try {
        await db.applyDataPatch(patchToWrites(prev, hydrated))
      } catch (err) {
        applySnapshot(prev)
        throw err
      }
    },
    [applySnapshot],
  )

  const refresh = useCallback(async () => {
    const [raw, txs, nextPlans, nextItems] = await Promise.all([
      db.listRawAccounts(),
      db.listTransactions(),
      db.listInstallmentPlans(),
      db.listInstallmentItems(),
    ])
    applySnapshot({ accounts: hydrateAccounts(raw, txs), transactions: txs, plans: nextPlans, items: nextItems })
  }, [applySnapshot])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const seeded = await db.getKv<boolean>('seeded')
        if (!seeded) {
          const demo = demoDataset()
          await db.replaceAllData(demo.accounts, demo.transactions, demo.plans, demo.items)
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
      openingBalance: input.initialBalance,
      balance: input.initialBalance,
      createdAt: now,
      updatedAt: now,
    }
    const prev = dataRef.current
    await persistSnapshot(prev, { ...prev, accounts: [...prev.accounts, account] })
    return account
  }, [persistSnapshot])

  const updateAccount = useCallback(async (id: string, patch: { name?: string; type?: Account['type'] }) => {
    const prev = dataRef.current
    const account = prev.accounts.find((a) => a.id === id)
    if (!account) throw new Error('حساب پیدا نشد')
    const nextName = patch.name ?? account.name
    const nameError = validateAccountName(nextName)
    if (nameError) throw new Error(nameError)
    const next: Account = {
      ...account,
      name: nextName.trim(),
      type: patch.type ?? account.type,
      updatedAt: Date.now(),
    }
    await persistSnapshot(prev, {
      ...prev,
      accounts: prev.accounts.map((row) => (row.id === id ? next : row)),
    })
  }, [persistSnapshot])

  const archiveAccount = useCallback(async (id: string) => {
    const prev = dataRef.current
    const account = prev.accounts.find((a) => a.id === id)
    if (!account) throw new Error('حساب پیدا نشد')
    await persistSnapshot(prev, {
      ...prev,
      accounts: prev.accounts.map((row) => (row.id === id ? { ...row, archived: true, updatedAt: Date.now() } : row)),
    })
  }, [persistSnapshot])

  const restoreAccount = useCallback(async (id: string) => {
    const prev = dataRef.current
    const account = prev.accounts.find((a) => a.id === id)
    if (!account) throw new Error('حساب پیدا نشد')
    await persistSnapshot(prev, {
      ...prev,
      accounts: prev.accounts.map((row) => (row.id === id ? { ...row, archived: false, updatedAt: Date.now() } : row)),
    })
  }, [persistSnapshot])

  const deleteAccount = useCallback(async (id: string) => {
    const prev = dataRef.current
    await persistSnapshot(prev, deleteAccountCascade(id, prev))
  }, [persistSnapshot])

  const addQuickEntry = useCallback(async (input: QuickEntryInput) => {
    const prev = dataRef.current
    const amountError = validateAmount(input.amount)
    if (amountError) throw new Error(amountError)
    const account = prev.accounts.find((a) => a.id === input.accountId)
    if (!account || account.archived) throw new Error('حساب معتبری انتخاب نشده')
    if (input.kind === 'expense') {
      const balError = validateExpenseBalance(input.amount, account.balance)
      if (balError) throw new Error(balError)
    }
    const date = input.date ?? todayIso()
    if (!isValidIsoDate(date)) throw new Error('تاریخ نامعتبر است')
    const now = Date.now()
    const tx: Transaction = {
      id: createId('tx'),
      kind: input.kind,
      amount: input.amount,
      accountId: account.id,
      categoryId: input.categoryId,
      note: input.note.trim(),
      date,
      createdAt: now,
    }
    await persistSnapshot(prev, { ...prev, transactions: [tx, ...prev.transactions] })
  }, [persistSnapshot])

  const addTransfer = useCallback(async (input: TransferInput) => {
    const prev = dataRef.current
    const errorMessage = validateTransfer(input, prev.accounts)
    if (errorMessage) throw new Error(errorMessage)
    const from = prev.accounts.find((a) => a.id === input.fromAccountId)!
    const to = prev.accounts.find((a) => a.id === input.toAccountId)!
    const now = Date.now()
    const transferId = createId('tr')
    const note = input.note.trim()
    const outTx: Transaction = {
      id: createId('tx'),
      kind: 'transferOut',
      amount: input.amount,
      accountId: from.id,
      counterpartyAccountId: to.id,
      transferId,
      categoryId: 'transfer',
      note,
      date: input.date,
      createdAt: now,
    }
    const inTx: Transaction = {
      id: createId('tx'),
      kind: 'transferIn',
      amount: input.amount,
      accountId: to.id,
      counterpartyAccountId: from.id,
      transferId,
      categoryId: 'transfer',
      note,
      date: input.date,
      createdAt: now + 1,
    }
    await persistSnapshot(prev, { ...prev, transactions: [outTx, inTx, ...prev.transactions] })
  }, [persistSnapshot])

  const updateTransaction = useCallback(async (id: string, patch: UpdateTransactionInput) => {
    const prev = dataRef.current
    const tx = prev.transactions.find((row) => row.id === id)
    if (!tx) throw new Error('تراکنش پیدا نشد')

    if (tx.kind === 'transferOut' || tx.kind === 'transferIn') {
      const outTx = prev.transactions.find((row) => row.transferId === tx.transferId && row.kind === 'transferOut')
      const inTx = prev.transactions.find((row) => row.transferId === tx.transferId && row.kind === 'transferIn')
      if (!outTx || !inTx) throw new Error('پایه‌های انتقال ناقص است')
      const fromId = patch.fromAccountId ?? outTx.accountId
      const toId = patch.toAccountId ?? inTx.accountId
      const amount = patch.amount ?? outTx.amount
      const note = patch.note != null ? patch.note.trim() : outTx.note
      const date = patch.date ?? outTx.date
      const from = prev.accounts.find((a) => a.id === fromId)
      if (!from) throw new Error('حساب مبدأ معتبر نیست')
      const credited = prev.accounts.map((a) =>
        a.id === fromId ? { ...a, balance: availableAfterReplacing(a.balance, outTx, fromId) } : a,
      )
      const errorMessage = validateTransfer(
        { amount, fromAccountId: fromId, toAccountId: toId, note, date },
        credited,
      )
      if (errorMessage) throw new Error(errorMessage)
      const nextOut: Transaction = {
        ...outTx,
        amount,
        accountId: fromId,
        counterpartyAccountId: toId,
        note,
        date,
      }
      const nextIn: Transaction = {
        ...inTx,
        amount,
        accountId: toId,
        counterpartyAccountId: fromId,
        note,
        date,
      }
      await persistSnapshot(prev, {
        ...prev,
        transactions: prev.transactions.map((row) => {
          if (row.id === nextOut.id) return nextOut
          if (row.id === nextIn.id) return nextIn
          return row
        }),
      })
      return
    }

    if (tx.installmentItemId && patch.kind === 'income') {
      throw new Error('تراکنش قسط را نمی‌توان به درآمد تبدیل کرد')
    }
    const kind = patch.kind ?? tx.kind
    if (kind !== 'expense' && kind !== 'income') throw new Error('نوع تراکنش نامعتبر است')
    const amount = patch.amount ?? tx.amount
    const amountError = validateAmount(amount)
    if (amountError) throw new Error(amountError)
    const accountId = patch.accountId ?? tx.accountId
    const account = prev.accounts.find((a) => a.id === accountId)
    if (!account || account.archived) throw new Error('حساب معتبری انتخاب نشده')
    if (kind === 'expense') {
      const available = availableAfterReplacing(account.balance, tx, accountId)
      const balError = validateExpenseBalance(amount, available)
      if (balError) throw new Error(balError)
    }
    const date = patch.date ?? tx.date
    if (!isValidIsoDate(date)) throw new Error('تاریخ نامعتبر است')
    const nextTx: Transaction = {
      ...tx,
      kind,
      amount,
      accountId,
      categoryId: tx.installmentItemId ? INSTALLMENT_CATEGORY_ID : (patch.categoryId ?? tx.categoryId),
      note: patch.note != null ? patch.note.trim() : tx.note,
      date,
    }
    const nextItems = tx.installmentItemId
      ? prev.items.map((item) => (item.id === tx.installmentItemId ? { ...item, amount } : item))
      : prev.items
    await persistSnapshot(prev, {
      ...prev,
      transactions: prev.transactions.map((row) => (row.id === id ? nextTx : row)),
      items: nextItems,
    })
  }, [persistSnapshot])

  const deleteTransaction = useCallback(async (id: string) => {
    const prev = dataRef.current
    await persistSnapshot(prev, deleteTransactionCascade(id, prev))
  }, [persistSnapshot])

  const createInstallmentPlan = useCallback(async (input: CreateInstallmentPlanInput) => {
    const prev = dataRef.current
    const errorMessage = validatePlanInput(input, prev.accounts)
    if (errorMessage) throw new Error(errorMessage)
    const built = scheduleForPlanInput(input)
    const now = Date.now()
    const plan: InstallmentPlan = {
      id: createId('plan'),
      name: input.name.trim(),
      installmentAmount: built.installmentAmount,
      totalCount: input.totalCount,
      startDate: input.startDate,
      defaultAccountId: input.defaultAccountId,
      categoryId: INSTALLMENT_CATEGORY_ID,
      status: 'active',
      kind: built.kind,
      principal: built.principal,
      annualRatePercent: built.annualRatePercent,
      createdAt: now,
      updatedAt: now,
    }
    const generated = generateInstallmentItems(plan.id, built.amounts, plan.totalCount, plan.startDate)
    await persistSnapshot(prev, {
      ...prev,
      plans: [...prev.plans, plan],
      items: [...prev.items, ...generated],
    })
    return plan
  }, [persistSnapshot])

  const updateInstallmentPlan = useCallback(async (id: string, patch: UpdateInstallmentPlanInput) => {
    const prev = dataRef.current
    const plan = prev.plans.find((p) => p.id === id)
    if (!plan) throw new Error('برنامه پیدا نشد')
    const planItems = prev.items.filter((i) => i.planId === id)
    const errorMessage = validatePlanUpdate(patch, planItems, prev.accounts)
    if (errorMessage) throw new Error(errorMessage)
    const locked = planHasPayment(planItems)
    const next: InstallmentPlan = {
      ...plan,
      name: patch.name?.trim() ?? plan.name,
      defaultAccountId: patch.defaultAccountId ?? plan.defaultAccountId,
      updatedAt: Date.now(),
    }
    const scheduleChanged =
      !locked &&
      (patch.installmentAmount != null ||
        patch.totalCount != null ||
        patch.startDate != null ||
        patch.kind != null ||
        patch.principal != null ||
        patch.annualRatePercent != null)
    if (scheduleChanged) {
      const kind = patch.kind ?? plan.kind ?? 'fixed'
      const built = scheduleForPlanInput({
        kind,
        installmentAmount: patch.installmentAmount ?? plan.installmentAmount,
        totalCount: patch.totalCount ?? plan.totalCount,
        principal: patch.principal ?? plan.principal,
        annualRatePercent: patch.annualRatePercent ?? plan.annualRatePercent,
      })
      next.kind = built.kind
      next.principal = built.kind === 'loan' ? built.principal : undefined
      next.annualRatePercent = built.kind === 'loan' ? built.annualRatePercent : undefined
      next.installmentAmount = built.installmentAmount
      next.totalCount = patch.totalCount ?? plan.totalCount
      next.startDate = patch.startDate ?? plan.startDate
      const sameSchedule =
        next.kind === (plan.kind ?? 'fixed') &&
        next.installmentAmount === plan.installmentAmount &&
        next.totalCount === plan.totalCount &&
        next.startDate === plan.startDate &&
        next.principal === plan.principal &&
        next.annualRatePercent === plan.annualRatePercent
      if (!sameSchedule) {
        const generated = generateInstallmentItems(next.id, built.amounts, next.totalCount, next.startDate)
        await persistSnapshot(prev, {
          ...prev,
          plans: prev.plans.map((row) => (row.id === id ? next : row)),
          items: [...prev.items.filter((item) => item.planId !== id), ...generated],
        })
        return
      }
    }
    await persistSnapshot(prev, {
      ...prev,
      plans: prev.plans.map((row) => (row.id === id ? next : row)),
    })
  }, [persistSnapshot])

  const updateInstallmentItem = useCallback(async (id: string, patch: UpdateInstallmentItemInput) => {
    const prev = dataRef.current
    const item = prev.items.find((row) => row.id === id)
    if (!item) throw new Error('قسط پیدا نشد')
    if (itemEffectiveStatus(item, todayIso()) === 'paid') {
      throw new Error('قسط پرداخت‌شده را از تراکنش ویرایش کنید')
    }
    const amount = patch.amount ?? item.amount
    const amountError = validateAmount(amount)
    if (amountError) throw new Error(amountError)
    const dueDate = patch.dueDate ?? item.dueDate
    if (!isValidIsoDate(dueDate)) throw new Error('تاریخ نامعتبر است')
    const nextItem: InstallmentItem = { ...item, amount, dueDate }
    await persistSnapshot(prev, {
      ...prev,
      items: prev.items.map((row) => (row.id === id ? nextItem : row)),
    })
  }, [persistSnapshot])

  const archiveInstallmentPlan = useCallback(async (id: string) => {
    const prev = dataRef.current
    const plan = prev.plans.find((p) => p.id === id)
    if (!plan) throw new Error('برنامه پیدا نشد')
    await persistSnapshot(prev, {
      ...prev,
      plans: prev.plans.map((row) => (row.id === id ? { ...row, status: 'archived', updatedAt: Date.now() } : row)),
    })
  }, [persistSnapshot])

  const restoreInstallmentPlan = useCallback(async (id: string) => {
    const prev = dataRef.current
    const plan = prev.plans.find((p) => p.id === id)
    if (!plan) throw new Error('برنامه پیدا نشد')
    const planItems = prev.items.filter((i) => i.planId === id)
    const today = todayIso()
    const status = paidCount(planItems, today) === planItems.length && planItems.length > 0 ? 'completed' : 'active'
    await persistSnapshot(prev, {
      ...prev,
      plans: prev.plans.map((row) => (row.id === id ? { ...row, status, updatedAt: Date.now() } : row)),
    })
  }, [persistSnapshot])

  const deleteInstallmentPlan = useCallback(async (id: string) => {
    const prev = dataRef.current
    await persistSnapshot(prev, deletePlanCascade(id, prev))
  }, [persistSnapshot])

  const deleteInstallmentItem = useCallback(async (id: string) => {
    const prev = dataRef.current
    await persistSnapshot(prev, deleteInstallmentItemCascade(id, prev))
  }, [persistSnapshot])

  const payInstallment = useCallback(async (itemId: string, accountId: string, note?: string) => {
    const prev = dataRef.current
    const item = prev.items.find((i) => i.id === itemId)
    if (!item) throw new Error('قسط پیدا نشد')
    const plan = prev.plans.find((p) => p.id === item.planId)
    if (!plan) throw new Error('برنامه پیدا نشد')
    if (plan.status !== 'active') throw new Error('این برنامه قابل پرداخت نیست')
    const today = todayIso()
    if (itemEffectiveStatus(item, today) === 'paid') throw new Error('این قسط قبلاً پرداخت شده')
    const account = prev.accounts.find((a) => a.id === accountId)
    if (!account || account.archived) throw new Error('حساب پرداخت معتبر نیست')
    if (item.amount > account.balance) throw new Error('موجودی حساب برای پرداخت این قسط کافی نیست')
    const now = Date.now()
    const expense: Transaction = {
      id: createId('tx'),
      kind: 'expense',
      amount: item.amount,
      accountId: account.id,
      categoryId: INSTALLMENT_CATEGORY_ID,
      installmentItemId: item.id,
      note: (note ?? defaultPayNote(plan.name, item.index, plan.totalCount)).trim(),
      date: today,
      createdAt: now,
    }
    const paidItem: InstallmentItem = {
      ...item,
      status: 'paid',
      paidAt: today,
      transactionId: expense.id,
    }
    const allItems = prev.items.map((row) => (row.id === paidItem.id ? paidItem : row))
    const planItems = allItems.filter((row) => row.planId === plan.id)
    const nextPlan: InstallmentPlan = {
      ...plan,
      status: nextPlanStatus({ ...plan, status: 'active' }, planItems, today),
      updatedAt: now,
    }
    await persistSnapshot(prev, {
      ...prev,
      transactions: [expense, ...prev.transactions],
      items: allItems,
      plans: prev.plans.map((row) => (row.id === plan.id ? nextPlan : row)),
    })
  }, [persistSnapshot])

  const resetDemo = useCallback(async () => {
    const demo = demoDataset()
    await db.replaceAllData(demo.accounts, demo.transactions, demo.plans, demo.items)
    await db.setKv('seeded', true)
    await refresh()
  }, [refresh])

  const wipeAll = useCallback(async () => {
    await db.replaceAllData([], [], [], [])
    await db.setKv('seeded', true)
    await refresh()
  }, [refresh])

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      error,
      accounts,
      transactions,
      plans,
      items,
      activeAccounts,
      totalBalance,
      refresh,
      createAccount,
      updateAccount,
      archiveAccount,
      restoreAccount,
      deleteAccount,
      addQuickEntry,
      addTransfer,
      updateTransaction,
      deleteTransaction,
      createInstallmentPlan,
      updateInstallmentPlan,
      updateInstallmentItem,
      archiveInstallmentPlan,
      restoreInstallmentPlan,
      deleteInstallmentPlan,
      deleteInstallmentItem,
      payInstallment,
      resetDemo,
      wipeAll,
    }),
    [
      ready,
      error,
      accounts,
      transactions,
      plans,
      items,
      activeAccounts,
      totalBalance,
      refresh,
      createAccount,
      updateAccount,
      archiveAccount,
      restoreAccount,
      deleteAccount,
      addQuickEntry,
      addTransfer,
      updateTransaction,
      deleteTransaction,
      createInstallmentPlan,
      updateInstallmentPlan,
      updateInstallmentItem,
      archiveInstallmentPlan,
      restoreInstallmentPlan,
      deleteInstallmentPlan,
      deleteInstallmentItem,
      payInstallment,
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
