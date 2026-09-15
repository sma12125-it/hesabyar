import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as db from '../db/db'
import { demoDataset } from '../db/seed'
import { INSTALLMENT_CATEGORY_ID } from '../lib/categories'
import { createId } from '../lib/ids'
import {
  defaultPayNote,
  generateInstallmentItems,
  itemEffectiveStatus,
  paidCount,
  planHasPayment,
  validatePlanInput,
  validatePlanUpdate,
} from '../lib/installments'
import { todayIso } from '../lib/iso'
import { validateAccountName, validateAmount } from '../lib/money'
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
  UpdateInstallmentPlanInput,
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
  addQuickEntry: (input: QuickEntryInput) => Promise<void>
  addTransfer: (input: TransferInput) => Promise<void>
  createInstallmentPlan: (input: CreateInstallmentPlanInput) => Promise<InstallmentPlan>
  updateInstallmentPlan: (id: string, patch: UpdateInstallmentPlanInput) => Promise<void>
  archiveInstallmentPlan: (id: string) => Promise<void>
  restoreInstallmentPlan: (id: string) => Promise<void>
  payInstallment: (itemId: string, accountId: string, note?: string) => Promise<void>
  resetDemo: () => Promise<void>
  wipeAll: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [items, setItems] = useState<InstallmentItem[]>([])

  const refresh = useCallback(async () => {
    const [accs, txs, nextPlans, nextItems] = await Promise.all([
      db.listAccounts(),
      db.listTransactions(),
      db.listInstallmentPlans(),
      db.listInstallmentItems(),
    ])
    setAccounts(accs)
    setTransactions(txs)
    setPlans(nextPlans)
    setItems(nextItems)
  }, [])

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
    const tx: Transaction = {
      id: createId('tx'),
      kind: input.kind,
      amount: input.amount,
      accountId: account.id,
      categoryId: input.categoryId,
      note: input.note.trim(),
      date: input.date ?? todayIso(),
      createdAt: now,
    }
    await db.putTransaction(tx)
    await refresh()
  }, [accounts, refresh])

  const addTransfer = useCallback(async (input: TransferInput) => {
    const errorMessage = validateTransfer(input, accounts)
    if (errorMessage) throw new Error(errorMessage)
    const from = accounts.find((a) => a.id === input.fromAccountId)!
    const to = accounts.find((a) => a.id === input.toAccountId)!
    const now = Date.now()
    const transferId = createId('tr')
    const note = input.note.trim() || `انتقال به ${to.name}`
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
    await db.writeTransferLegs(outTx, inTx)
    await refresh()
  }, [accounts, refresh])

  const createInstallmentPlan = useCallback(async (input: CreateInstallmentPlanInput) => {
    const errorMessage = validatePlanInput(input, accounts)
    if (errorMessage) throw new Error(errorMessage)
    const now = Date.now()
    const plan: InstallmentPlan = {
      id: createId('plan'),
      name: input.name.trim(),
      installmentAmount: input.installmentAmount,
      totalCount: input.totalCount,
      startDate: input.startDate,
      defaultAccountId: input.defaultAccountId,
      categoryId: INSTALLMENT_CATEGORY_ID,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    const generated = generateInstallmentItems(
      plan.id,
      plan.installmentAmount,
      plan.totalCount,
      plan.startDate,
    )
    await db.createInstallmentPlanAtomic(plan, generated)
    await refresh()
    return plan
  }, [accounts, refresh])

  const updateInstallmentPlan = useCallback(async (id: string, patch: UpdateInstallmentPlanInput) => {
    const plan = plans.find((p) => p.id === id)
    if (!plan) throw new Error('برنامه پیدا نشد')
    const planItems = items.filter((i) => i.planId === id)
    const errorMessage = validatePlanUpdate(patch, planItems, accounts)
    if (errorMessage) throw new Error(errorMessage)
    const locked = planHasPayment(planItems)
    const next: InstallmentPlan = {
      ...plan,
      name: patch.name?.trim() ?? plan.name,
      defaultAccountId: patch.defaultAccountId ?? plan.defaultAccountId,
      installmentAmount: locked ? plan.installmentAmount : (patch.installmentAmount ?? plan.installmentAmount),
      totalCount: locked ? plan.totalCount : (patch.totalCount ?? plan.totalCount),
      startDate: locked ? plan.startDate : (patch.startDate ?? plan.startDate),
      updatedAt: Date.now(),
    }
    if (!locked && (patch.installmentAmount != null || patch.totalCount != null || patch.startDate != null)) {
      const generated = generateInstallmentItems(
        next.id,
        next.installmentAmount,
        next.totalCount,
        next.startDate,
      )
      await db.replaceInstallmentItemsAtomic(
        next,
        generated,
        planItems.map((i) => i.id),
      )
    } else {
      await db.putInstallmentPlan(next)
    }
    await refresh()
  }, [accounts, items, plans, refresh])

  const archiveInstallmentPlan = useCallback(async (id: string) => {
    const plan = plans.find((p) => p.id === id)
    if (!plan) throw new Error('برنامه پیدا نشد')
    await db.putInstallmentPlan({ ...plan, status: 'archived', updatedAt: Date.now() })
    await refresh()
  }, [plans, refresh])

  const restoreInstallmentPlan = useCallback(async (id: string) => {
    const plan = plans.find((p) => p.id === id)
    if (!plan) throw new Error('برنامه پیدا نشد')
    const planItems = items.filter((i) => i.planId === id)
    const today = todayIso()
    const allPaid = planItems.length > 0 && paidCount(planItems, today) === planItems.length
    await db.putInstallmentPlan({
      ...plan,
      status: allPaid ? 'completed' : 'active',
      updatedAt: Date.now(),
    })
    await refresh()
  }, [items, plans, refresh])

  const payInstallment = useCallback(async (itemId: string, accountId: string, note?: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) throw new Error('قسط پیدا نشد')
    const plan = plans.find((p) => p.id === item.planId)
    if (!plan) throw new Error('برنامه پیدا نشد')
    if (plan.status !== 'active') throw new Error('این برنامه قابل پرداخت نیست')
    const today = todayIso()
    if (itemEffectiveStatus(item, today) === 'paid') throw new Error('این قسط قبلاً پرداخت شده')
    const account = accounts.find((a) => a.id === accountId)
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
    const allItems = items.filter((i) => i.planId === plan.id).map((i) => (i.id === paidItem.id ? paidItem : i))
    const complete = allItems.every((i) => itemEffectiveStatus(i, today) === 'paid')
    const nextPlan: InstallmentPlan = {
      ...plan,
      status: complete ? 'completed' : plan.status,
      updatedAt: now,
    }
    await db.payInstallmentAtomic(expense, paidItem, nextPlan)
    await refresh()
  }, [accounts, items, plans, refresh])

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
      addQuickEntry,
      addTransfer,
      createInstallmentPlan,
      updateInstallmentPlan,
      archiveInstallmentPlan,
      restoreInstallmentPlan,
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
      addQuickEntry,
      addTransfer,
      createInstallmentPlan,
      updateInstallmentPlan,
      archiveInstallmentPlan,
      restoreInstallmentPlan,
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
