import type { TxKind } from '../types'

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d)
}

export function parseRialInput(raw: string): number {
  const western = raw
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[^\d]/g, '')
  if (!western) return 0
  const n = Number(western)
  return Number.isFinite(n) ? n : 0
}

/** Grouped Persian digits, no sign. Amounts are Rial-only. */
export function formatRial(amount: number): string {
  const abs = Math.abs(Math.trunc(amount))
  return abs.toLocaleString('fa-IR')
}

export function applySignedBalance(
  balance: number,
  kind: TxKind | 'transfer',
  amount: number,
  direction: 'out' | 'in' = 'out',
): number {
  if (kind === 'income' || kind === 'transferIn' || (kind === 'transfer' && direction === 'in')) {
    return balance + amount
  }
  return balance - amount
}

export function validateAccountName(name: string): string | null {
  if (!name.trim()) return 'نام حساب الزامی است'
  if (name.trim().length > 48) return 'نام حساب خیلی طولانی است'
  return null
}

export function validateAmount(amount: number): string | null {
  if (!Number.isInteger(amount) || amount <= 0) return 'مبلغ باید بیشتر از صفر باشد'
  return null
}
