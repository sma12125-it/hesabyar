import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as db from '../db/db'
import { openCards, sealCards, validateCard } from '../lib/vault'
import { createId } from '../lib/ids'
import type { BankCard, Budget, ReminderSettings, SavingsGoal } from '../types'

interface VaultBlob {
  salt: string
  payload: string
}

interface ExtrasValue {
  unlocked: boolean
  cards: BankCard[]
  budgets: Budget[]
  goals: SavingsGoal[]
  reminders: ReminderSettings
  vaultConfigured: boolean
  unlockVault: (passphrase: string) => Promise<void>
  lockVault: () => void
  setVaultPassword: (passphrase: string) => Promise<void>
  changeVaultPassword: (current: string, next: string) => Promise<void>
  saveCard: (input: Omit<BankCard, 'id' | 'createdAt'> & { id?: string }, passphrase?: string) => Promise<BankCard>
  linkCard: (id: string, accountId: string) => Promise<void>
  deleteCard: (id: string, passphrase: string) => Promise<void>
  saveBudget: (budget: Budget) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  saveGoal: (goal: Omit<SavingsGoal, 'id'> & { id?: string }) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  setReminders: (next: ReminderSettings) => Promise<void>
  exportLocal: () => Promise<Record<string, unknown>>
  importLocal: (data: Record<string, unknown>) => Promise<void>
}

const ExtrasContext = createContext<ExtrasValue | null>(null)
const emptyReminder: ReminderSettings = { enabled: false, leadDays: 2 }

export function ExtrasProvider({ children }: { children: ReactNode }) {
  const [blob, setBlob] = useState<VaultBlob | null>(null)
  const [passphrase, setPassphrase] = useState<string | null>(null)
  const [cards, setCards] = useState<BankCard[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [reminders, setReminderState] = useState<ReminderSettings>(emptyReminder)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [vault, nextBudgets, nextGoals, nextReminders] = await Promise.all([
        db.getKv<VaultBlob>('cardVault'),
        db.getKv<Budget[]>('budgets'),
        db.getKv<SavingsGoal[]>('goals'),
        db.getKv<ReminderSettings>('reminders'),
      ])
      if (cancelled) return
      setBlob(vault ?? null)
      setBudgets(nextBudgets ?? [])
      setGoals(nextGoals ?? [])
      setReminderState(nextReminders ?? emptyReminder)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persistCards = useCallback(async (next: BankCard[], phrase: string) => {
    const sealed = await sealCards(phrase, next, blob ? undefined : undefined)
    const saltBytes = blob?.salt
    const packed = saltBytes
      ? await sealCards(phrase, next, Uint8Array.from(atob(blob.salt), (c) => c.charCodeAt(0)))
      : sealed
    const stored = { salt: packed.salt, payload: packed.payload }
    await db.setKv('cardVault', stored)
    setBlob(stored)
    setCards(next)
    setPassphrase(phrase)
    const { notifyLocalChange } = await import('../lib/sync')
    notifyLocalChange()
  }, [blob])

  const unlockVault = useCallback(async (phrase: string) => {
    if (!blob) {
      setPassphrase(phrase)
      setCards([])
      return
    }
    const next = await openCards(phrase, blob.salt, blob.payload)
    setCards(next)
    setPassphrase(phrase)
  }, [blob])

  const value = useMemo<ExtrasValue>(() => ({
    unlocked: passphrase != null,
    vaultConfigured: blob != null,
    cards,
    budgets,
    goals,
    reminders,
    unlockVault,
    lockVault: () => {
      setPassphrase(null)
      setCards([])
    },
    setVaultPassword: async (phrase) => {
      if (blob) throw new Error('رمز گاوصندوق قبلاً تعیین شده است')
      const trimmed = phrase.trim()
      if (trimmed.length < 4) throw new Error('رمز گاوصندوق حداقل ۴ حرف است')
      await persistCards([], trimmed)
    },
    changeVaultPassword: async (current, next) => {
      if (!blob) throw new Error('اول رمز گاوصندوق را تعیین کنید')
      const trimmed = next.trim()
      if (trimmed.length < 4) throw new Error('رمز تازه حداقل ۴ حرف است')
      const opened = await openCards(current, blob.salt, blob.payload)
      await persistCards(opened, trimmed)
    },
    saveCard: async (input, phrase) => {
      const error = validateCard(input)
      if (error) throw new Error(error)
      const active = passphrase ?? phrase
      if (!active) throw new Error('گاوصندوق قفل است')
      const current = blob && passphrase == null ? await openCards(active, blob.salt, blob.payload) : cards
      const existing = input.id ? current.find((card) => card.id === input.id) : undefined
      const card: BankCard = {
        ...input,
        id: existing?.id ?? createId('card'),
        createdAt: existing?.createdAt ?? Date.now(),
        pan: input.pan.replace(/\D/g, ''),
        accountId: existing?.accountId,
      }
      const next = existing ? current.map((row) => (row.id === card.id ? card : row)) : [...current, card]
      await persistCards(next, active)
      return card
    },
    linkCard: async (id, accountId) => {
      if (!passphrase || !blob) return
      const next = cards.map((card) => (card.id === id ? { ...card, accountId } : card))
      await persistCards(next, passphrase)
    },
    deleteCard: async (id, phrase) => {
      const active = passphrase ?? phrase
      const current = passphrase == null && blob ? await openCards(phrase, blob.salt, blob.payload) : cards
      await persistCards(current.filter((card) => card.id !== id), active)
    },
    saveBudget: async (budget) => {
      const next = budgets.some((row) => row.id === budget.id)
        ? budgets.map((row) => (row.id === budget.id ? budget : row))
        : [...budgets, budget]
      setBudgets(next)
      await db.setKv('budgets', next)
      const { notifyLocalChange } = await import('../lib/sync')
      notifyLocalChange()
    },
    deleteBudget: async (id) => {
      const next = budgets.filter((row) => row.id !== id)
      setBudgets(next)
      await db.setKv('budgets', next)
      const { notifyLocalChange } = await import('../lib/sync')
      notifyLocalChange()
    },
    saveGoal: async (goal) => {
      const row: SavingsGoal = { ...goal, id: goal.id ?? createId('goal') }
      const next = goals.some((item) => item.id === row.id)
        ? goals.map((item) => (item.id === row.id ? row : item))
        : [...goals, row]
      setGoals(next)
      await db.setKv('goals', next)
      const { notifyLocalChange } = await import('../lib/sync')
      notifyLocalChange()
    },
    deleteGoal: async (id) => {
      const next = goals.filter((item) => item.id !== id)
      setGoals(next)
      await db.setKv('goals', next)
      const { notifyLocalChange } = await import('../lib/sync')
      notifyLocalChange()
    },
    setReminders: async (next) => {
      setReminderState(next)
      await db.setKv('reminders', next)
      const { notifyLocalChange } = await import('../lib/sync')
      notifyLocalChange()
    },
    exportLocal: async () => ({
      budgets,
      goals,
      reminders,
      cardVault: blob,
    }),
    importLocal: async (data) => {
      if (Array.isArray(data.budgets)) {
        setBudgets(data.budgets as Budget[])
        await db.setKv('budgets', data.budgets)
      }
      if (Array.isArray(data.goals)) {
        setGoals(data.goals as SavingsGoal[])
        await db.setKv('goals', data.goals)
      }
      if (data.reminders && typeof data.reminders === 'object') {
        setReminderState(data.reminders as ReminderSettings)
        await db.setKv('reminders', data.reminders)
      }
      if (data.cardVault && typeof data.cardVault === 'object') {
        setBlob(data.cardVault as VaultBlob)
        await db.setKv('cardVault', data.cardVault)
        setPassphrase(null)
        setCards([])
      }
    },
  }), [blob, budgets, cards, goals, passphrase, persistCards, reminders, unlockVault])

  return <ExtrasContext.Provider value={value}>{children}</ExtrasContext.Provider>
}

export function useExtras(): ExtrasValue {
  const ctx = useContext(ExtrasContext)
  if (!ctx) throw new Error('useExtras must be used within ExtrasProvider')
  return ctx
}
