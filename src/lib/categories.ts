import type { Category } from '../types'

export const INSTALLMENT_CATEGORY_ID = 'installments' as const

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'خوراک و سوپرمارکت', icon: '🛒', kind: 'expense' },
  { id: 'transport', name: 'حمل‌ونقل', icon: '⛽', kind: 'expense' },
  { id: 'bills', name: 'قبوض', icon: '🧾', kind: 'expense' },
  { id: 'shopping', name: 'خرید', icon: '🛍️', kind: 'expense' },
  { id: 'health', name: 'سلامت', icon: '💊', kind: 'expense' },
  { id: INSTALLMENT_CATEGORY_ID, name: 'اقساط', icon: '📅', kind: 'expense' },
  { id: 'other-exp', name: 'سایر', icon: '📦', kind: 'expense' },
  { id: 'salary', name: 'حقوق', icon: '💼', kind: 'income' },
  { id: 'gift', name: 'هدیه', icon: '🎁', kind: 'income' },
  { id: 'sale', name: 'فروش', icon: '🏷️', kind: 'income' },
  { id: 'other-inc', name: 'سایر', icon: '💰', kind: 'income' },
  { id: 'transfer', name: 'انتقال', icon: '⇄', kind: 'transfer' },
]

export function categoriesFor(kind: 'expense' | 'income'): Category[] {
  return CATEGORIES.filter((c) => c.kind === kind)
}

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id)
}

export function accountIcon(type: 'cash' | 'bank', name: string): string {
  if (type === 'cash') return '💵'
  if (name.includes('پس‌انداز') || name.includes('مسکن')) return '🏠'
  return '🏦'
}
