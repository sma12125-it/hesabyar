import type { Account, Transaction } from '../types'

const day = 24 * 60 * 60 * 1000

export function demoDataset(now = Date.now()): { accounts: Account[]; transactions: Transaction[] } {
  const wallet: Account = {
    id: 'acc_wallet',
    name: 'کیف پول نقدی',
    type: 'cash',
    archived: false,
    balance: 12_500_000,
    createdAt: now - 40 * day,
    updatedAt: now,
  }
  const mellat: Account = {
    id: 'acc_mellat',
    name: 'ملت — جاری',
    type: 'bank',
    archived: false,
    balance: 84_200_000,
    createdAt: now - 80 * day,
    updatedAt: now,
  }
  const home: Account = {
    id: 'acc_home',
    name: 'پس‌انداز مسکن',
    type: 'bank',
    archived: false,
    balance: 320_000_000,
    createdAt: now - 120 * day,
    updatedAt: now,
  }

  const transactions: Transaction[] = [
    {
      id: 'tx_market',
      kind: 'expense',
      amount: 450_000,
      accountId: wallet.id,
      categoryId: 'food',
      note: 'سوپرمارکت دیلی',
      createdAt: now - 2 * 60 * 60 * 1000,
    },
    {
      id: 'tx_salary',
      kind: 'income',
      amount: 185_000_000,
      accountId: mellat.id,
      categoryId: 'salary',
      note: 'حقوق ماهانه',
      createdAt: now - day,
    },
    {
      id: 'tx_gas',
      kind: 'expense',
      amount: 1_200_000,
      accountId: mellat.id,
      categoryId: 'transport',
      note: 'بنزین جایگاه آزادی',
      createdAt: now - 2 * day,
    },
    {
      id: 'tx_transfer',
      kind: 'transfer',
      amount: 5_000_000,
      accountId: mellat.id,
      counterpartyAccountId: home.id,
      categoryId: 'transfer',
      note: 'انتقال به پس‌انداز',
      createdAt: now - 3 * day,
    },
  ]

  return { accounts: [wallet, mellat, home], transactions }
}
