import { toFaDigits } from './money'

const RELATIVE_DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function formatClock(date = new Date()): string {
  const h = date.getHours()
  const m = date.getMinutes()
  return toFaDigits(`${h}:${String(m).padStart(2, '0')}`)
}

export function formatRelativeFa(ts: number, now = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / RELATIVE_DAY_MS)
  if (diffDays <= 0) return 'امروز'
  if (diffDays === 1) return 'دیروز'
  if (diffDays === 2) return '۲ روز پیش'
  if (diffDays < 7) return `${toFaDigits(diffDays)} روز پیش`
  if (diffDays < 30) return `${toFaDigits(Math.floor(diffDays / 7))} هفته پیش`
  if (diffDays < 365) return `${toFaDigits(Math.floor(diffDays / 30))} ماه پیش`
  return `${toFaDigits(Math.floor(diffDays / 365))} سال پیش`
}
