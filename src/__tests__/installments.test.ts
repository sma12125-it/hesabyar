import { describe, expect, it } from 'vitest'
import {
  generateInstallmentItems,
  homeInstallmentHints,
  isDueSoon,
  itemEffectiveStatus,
  nextPayableItem,
  planBadge,
  planHasPayment,
  validatePlanInput,
  validatePlanUpdate,
} from '../lib/installments'
import { addCalendarMonths } from '../lib/iso'
import type { Account, InstallmentPlan } from '../types'

const today = '2026-09-15'
const account: Account = {
  id: 'acc',
  name: 'ملت',
  type: 'bank',
  archived: false,
  openingBalance: 90_000_000,
  balance: 90_000_000,
  createdAt: 1,
  updatedAt: 1,
}

describe('installment generation', () => {
  it('creates N monthly items from the start date', () => {
    const items = generateInstallmentItems('p1', 3_200_000, 12, '2026-03-18')
    expect(items).toHaveLength(12)
    expect(items[0]?.index).toBe(1)
    expect(items[0]?.dueDate).toBe('2026-03-18')
    expect(items[1]?.dueDate).toBe('2026-04-18')
    expect(items[11]?.dueDate).toBe(addCalendarMonths('2026-03-18', 11))
    expect(items.every((i) => i.amount === 3_200_000 && i.status === 'pending')).toBe(true)
  })

  it('clamps month-end days (31 Jan + 1 month → 28 Feb 2026)', () => {
    const items = generateInstallmentItems('p', 1, 2, '2026-01-31')
    expect(items[1]?.dueDate).toBe('2026-02-28')
  })
})

describe('installment status badges', () => {
  it('marks unpaid past-due items overdue and upcoming within 7 days as due-soon', () => {
    const items = generateInstallmentItems('p', 100, 3, '2026-08-12')
    items[0]!.dueDate = '2026-09-12'
    items[1]!.dueDate = '2026-09-18'
    items[2]!.dueDate = '2026-10-18'
    expect(itemEffectiveStatus(items[0]!, today)).toBe('overdue')
    expect(isDueSoon(items[1]!, today)).toBe(true)
    expect(planBadge(items, today)).toBe('overdue')

    items[0]!.status = 'paid'
    items[0]!.transactionId = 'tx1'
    expect(planBadge(items, today)).toBe('due-soon')
    expect(nextPayableItem(items, today)?.index).toBe(2)
  })

  it('locks amount/count/date edits after the first payment', () => {
    const items = generateInstallmentItems('p', 100, 3, today)
    expect(planHasPayment(items)).toBe(false)
    items[0]!.status = 'paid'
    items[0]!.transactionId = 'tx'
    expect(planHasPayment(items)).toBe(true)
    expect(
      validatePlanUpdate({ installmentAmount: 200 }, items, [account]),
    ).toBe('پس از اولین پرداخت فقط نام و حساب قابل ویرایش است')
    expect(validatePlanUpdate({ name: 'قسط موبایل' }, items, [account])).toBeNull()
  })

  it('builds loan items with a possibly different last payment', () => {
    expect(
      validatePlanInput(
        {
          name: 'وام خودرو',
          installmentAmount: 1,
          totalCount: 12,
          startDate: today,
          defaultAccountId: 'acc',
          kind: 'loan',
          principal: 12_000_000,
          annualRatePercent: 18,
        },
        [account],
      ),
    ).toBeNull()
    const items = generateInstallmentItems('p', [100, 100, 120], 3, today)
    expect(items.map((i) => i.amount)).toEqual([100, 100, 120])
  })

  it('validates create input', () => {
    expect(
      validatePlanInput(
        { name: 'لپ‌تاپ', installmentAmount: 5_500_000, totalCount: 12, startDate: today, defaultAccountId: 'acc' },
        [account],
      ),
    ).toBeNull()
    expect(
      validatePlanInput(
        { name: '', installmentAmount: 1, totalCount: 1, startDate: today, defaultAccountId: 'acc' },
        [account],
      ),
    ).toBe('نام برنامه الزامی است')
    expect(
      validatePlanInput(
        { name: 'x', installmentAmount: 1, totalCount: 1, startDate: today, defaultAccountId: 'missing' },
        [account],
      ),
    ).toBe('حساب پرداخت معتبر نیست')
  })

  it('lists overdue and 7-day upcoming hints for home', () => {
    const plan: InstallmentPlan = {
      id: 'p',
      name: 'وام',
      installmentAmount: 100,
      totalCount: 2,
      startDate: today,
      defaultAccountId: 'acc',
      categoryId: 'installments',
      status: 'active',
      createdAt: 1,
      updatedAt: 1,
    }
    const items = generateInstallmentItems('p', 100, 2, '2026-09-10')
    items[1]!.dueDate = '2026-09-18'
    const hints = homeInstallmentHints([plan], items, today)
    expect(hints.map((h) => h.kind)).toEqual(['overdue', 'upcoming'])
  })
})
