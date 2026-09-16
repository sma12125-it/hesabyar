import { describe, expect, it } from 'vitest'
import {
  availableAfterReplacing,
  formatRial,
  parseDecimalInput,
  parseRialInput,
  toFaDigits,
  validateAccountName,
  validateAmount,
  validateExpenseBalance,
} from '../lib/money'

describe('rial formatting', () => {
  it('formats grouped Persian digits without a sign', () => {
    expect(formatRial(416_700_000)).toBe((416_700_000).toLocaleString('fa-IR'))
    expect(formatRial(-450_000)).toBe((450_000).toLocaleString('fa-IR'))
  })

  it('parses Persian and Western digit input', () => {
    expect(parseRialInput('۴۵۰٬۰۰۰')).toBe(450_000)
    expect(parseRialInput('185000000')).toBe(185_000_000)
    expect(parseRialInput('')).toBe(0)
  })

  it('validates account name and amount', () => {
    expect(validateAccountName('  ')).toBe('نام حساب الزامی است')
    expect(validateAccountName('کیف پول')).toBeNull()
    expect(validateAmount(0)).toBe('مبلغ باید بیشتر از صفر باشد')
    expect(validateAmount(450_000)).toBeNull()
  })

  it('parses decimal rates and credits back a replaced expense', () => {
    expect(parseDecimalInput('۱۸٫۵')).toBe(18.5)
    expect(validateExpenseBalance(200, 100)).toBe('موجودی حساب کافی نیست')
    expect(availableAfterReplacing(60_000, { kind: 'expense', amount: 40_000, accountId: 'a' }, 'a')).toBe(100_000)
  })

  it('converts western digits to Persian', () => {
    expect(toFaDigits('941')).toBe('۹۴۱')
  })
})
