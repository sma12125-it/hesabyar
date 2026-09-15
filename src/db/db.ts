import type { Account, Transaction } from '../types'

const DB_NAME = 'hesabyar'
const DB_VERSION = 1

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' })
        store.createIndex('by_created', 'createdAt')
        store.createIndex('by_account', 'accountId')
      }
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function getKv<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  const row = await requestToPromise<{ key: string; value: T } | undefined>(
    db.transaction('kv').objectStore('kv').get(key),
  )
  return row?.value
}

export async function setKv<T>(key: string, value: T): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('kv', 'readwrite')
  tx.objectStore('kv').put({ key, value })
  await txDone(tx)
}

export async function listAccounts(): Promise<Account[]> {
  const db = await openDb()
  const rows = await requestToPromise<Account[]>(db.transaction('accounts').objectStore('accounts').getAll())
  return rows.sort((a, b) => a.createdAt - b.createdAt)
}

export async function getAccount(id: string): Promise<Account | undefined> {
  const db = await openDb()
  return requestToPromise<Account | undefined>(db.transaction('accounts').objectStore('accounts').get(id))
}

export async function putAccount(account: Account): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('accounts', 'readwrite')
  tx.objectStore('accounts').put(account)
  await txDone(tx)
}

export async function listTransactions(): Promise<Transaction[]> {
  const db = await openDb()
  const rows = await requestToPromise<Transaction[]>(
    db.transaction('transactions').objectStore('transactions').getAll(),
  )
  return rows.sort((a, b) => b.createdAt - a.createdAt)
}

export async function putTransaction(txRow: Transaction): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('transactions', 'readwrite')
  tx.objectStore('transactions').put(txRow)
  await txDone(tx)
}

export async function replaceAllData(accounts: Account[], transactions: Transaction[]): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['accounts', 'transactions'], 'readwrite')
  tx.objectStore('accounts').clear()
  tx.objectStore('transactions').clear()
  for (const a of accounts) tx.objectStore('accounts').put(a)
  for (const t of transactions) tx.objectStore('transactions').put(t)
  await txDone(tx)
}

export async function clearAllData(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['accounts', 'transactions', 'kv'], 'readwrite')
  tx.objectStore('accounts').clear()
  tx.objectStore('transactions').clear()
  tx.objectStore('kv').clear()
  await txDone(tx)
}
