import { useCallback, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { PhoneShell } from './components/PhoneShell'
import { TabBar } from './components/TabBar'
import { Toast } from './components/Toast'
import { QuickEntrySheet } from './components/QuickEntrySheet'
import { AccountFormSheet } from './components/AccountFormSheet'
import { TransferSheet } from './components/TransferSheet'
import { InstallmentPlanSheet } from './components/InstallmentPlanSheet'
import { InstallmentPaySheet } from './components/InstallmentPaySheet'
import { HomePage } from './pages/HomePage'
import { AccountsPage } from './pages/AccountsPage'
import { AccountDetailPage } from './pages/AccountDetailPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { AllTransactionsPage } from './pages/AllTransactionsPage'
import { InstallmentsPage } from './pages/InstallmentsPage'
import { InstallmentDetailPage } from './pages/InstallmentDetailPage'
import { remainingAmount } from './lib/installments'
import { todayIso } from './lib/iso'
import { StoreProvider, useStore } from './store/Store'

export type Sheet =
  | { type: 'quick'; kind: 'expense' | 'income'; accountId?: string }
  | { type: 'account'; accountId?: string }
  | { type: 'transfer'; fromId?: string }
  | { type: 'installment-plan'; planId?: string }
  | { type: 'installment-pay'; itemId: string }
  | { type: 'all-tx' }
  | { type: 'settings' }

function Shell() {
  const location = useLocation()
  const { ready, error, totalBalance, accounts, plans, items, resetDemo, wipeAll } = useStore()
  const [compact, setCompact] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sheet, setSheet] = useState<Sheet | null>(null)

  const onScroll = useCallback((next: boolean) => setCompact(next), [])

  const isHome = location.pathname === '/'
  const isAccountsList = location.pathname === '/accounts'
  const isInstallmentsList = location.pathname === '/installments'
  const sheetOpen = sheet !== null
  const hasVisibleAccounts = accounts.some((a) => !a.archived)
  const hasPlans = plans.length > 0
  const editingAccount =
    sheet?.type === 'account' && sheet.accountId
      ? accounts.find((a) => a.id === sheet.accountId)
      : undefined
  const editingPlan =
    sheet?.type === 'installment-plan' && sheet.planId
      ? plans.find((p) => p.id === sheet.planId)
      : undefined
  const payingItem =
    sheet?.type === 'installment-pay' ? items.find((i) => i.id === sheet.itemId) : undefined
  const payingPlan = payingItem ? plans.find((p) => p.id === payingItem.planId) : undefined

  if (error) {
    return (
      <PhoneShell>
        <div className="loading-center">{error}</div>
      </PhoneShell>
    )
  }

  if (!ready) {
    return (
      <PhoneShell>
        <div className="loading-center">در حال بارگذاری…</div>
      </PhoneShell>
    )
  }

  return (
    <PhoneShell>
      <div className="app">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onScroll={onScroll}
                setToast={setToast}
                onQuickEntry={(kind) => setSheet({ type: 'quick', kind })}
                onTransfer={() => setSheet({ type: 'transfer' })}
                onAll={() => setSheet({ type: 'all-tx' })}
                onSettings={() => setSheet({ type: 'settings' })}
              />
            }
          />
          <Route
            path="/accounts"
            element={<AccountsPage onScroll={onScroll} onCreate={() => setSheet({ type: 'account' })} />}
          />
          <Route path="/accounts/:id" element={<AccountDetailRoute onScroll={onScroll} setSheet={setSheet} />} />
          <Route
            path="/installments"
            element={
              <InstallmentsPage onScroll={onScroll} onCreate={() => setSheet({ type: 'installment-plan' })} />
            }
          />
          <Route
            path="/installments/:id"
            element={
              <InstallmentDetailRoute
                onScroll={onScroll}
                onEdit={(planId) => setSheet({ type: 'installment-plan', planId })}
                onPay={(itemId) => setSheet({ type: 'installment-pay', itemId })}
              />
            }
          />
          <Route
            path="/reports"
            element={
              <PlaceholderPage
                title="گزارش"
                icon="📈"
                message="گزارش درآمد و هزینه در اسپرینت بعد می‌آید."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {!sheetOpen && isHome ? (
          <button
            className="mic-fab"
            type="button"
            title="ورودی صوتی"
            onClick={() => setToast('ورودی صوتی در اسپرینت بعد')}
          >
            🎤
          </button>
        ) : null}

        {!sheetOpen && isAccountsList && hasVisibleAccounts ? (
          <button className="fab-pill" type="button" onClick={() => setSheet({ type: 'account' })}>
            <span>＋</span> حساب جدید
          </button>
        ) : null}

        {!sheetOpen && isInstallmentsList && hasPlans ? (
          <button className="fab-pill" type="button" onClick={() => setSheet({ type: 'installment-plan' })}>
            <span>＋</span> برنامه جدید
          </button>
        ) : null}

        {!sheetOpen ? (
          <TabBar compact={compact} onQuickEntry={() => setSheet({ type: 'quick', kind: 'expense' })} />
        ) : null}
      </div>

      {sheet?.type === 'quick' ? (
        <QuickEntrySheet
          initialKind={sheet.kind}
          presetAccountId={sheet.accountId}
          totalBalance={totalBalance}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.type === 'account' ? (
        <AccountFormSheet account={editingAccount} totalBalance={totalBalance} onClose={() => setSheet(null)} />
      ) : null}

      {sheet?.type === 'transfer' ? (
        <TransferSheet presetFromId={sheet.fromId} totalBalance={totalBalance} onClose={() => setSheet(null)} />
      ) : null}

      {sheet?.type === 'installment-plan' ? (
        <InstallmentPlanSheet plan={editingPlan} onClose={() => setSheet(null)} />
      ) : null}

      {sheet?.type === 'installment-pay' && payingItem && payingPlan ? (
        <InstallmentPaySheet
          plan={payingPlan}
          item={payingItem}
          remaining={remainingAmount(
            items.filter((i) => i.planId === payingPlan.id),
            todayIso(),
          )}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.type === 'all-tx' ? <AllTransactionsPage onBack={() => setSheet(null)} /> : null}

      {sheet?.type === 'settings' ? (
        <>
          <div className="sheet-scrim" onClick={() => setSheet(null)} />
          <div className="glass-sheet" role="dialog" aria-label="داده محلی">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h1>داده محلی</h1>
              <button className="sheet-close" type="button" onClick={() => setSheet(null)} aria-label="بستن">
                ✕
              </button>
            </div>
            <p className="sheet-sub">همه چیز روی همین مرورگر در IndexedDB ذخیره می‌شود. واحد پول فقط ریال است.</p>
            <div className="confirm-actions">
              <button
                className="cta-confirm"
                type="button"
                onClick={() => {
                  void resetDemo()
                  setSheet(null)
                  setToast('داده نمونه بارگذاری شد')
                }}
              >
                بازنشانی داده نمونه
              </button>
              <button
                className="btn-ghost-danger"
                type="button"
                onClick={() => {
                  void wipeAll()
                  setSheet(null)
                  setToast('همه داده‌ها پاک شد')
                }}
              >
                شروع از صفر
              </button>
            </div>
          </div>
        </>
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </PhoneShell>
  )
}

function AccountDetailRoute({
  onScroll,
  setSheet,
}: {
  onScroll: (compact: boolean) => void
  setSheet: (sheet: Sheet) => void
}) {
  const { id } = useParams()
  return (
    <AccountDetailPage
      onScroll={onScroll}
      onQuickEntry={() => setSheet({ type: 'quick', kind: 'expense', accountId: id })}
      onTransfer={() => setSheet({ type: 'transfer', fromId: id })}
      onEdit={() => setSheet({ type: 'account', accountId: id })}
    />
  )
}

function InstallmentDetailRoute({
  onScroll,
  onEdit,
  onPay,
}: {
  onScroll: (compact: boolean) => void
  onEdit: (planId: string) => void
  onPay: (itemId: string) => void
}) {
  const { id } = useParams()
  return (
    <InstallmentDetailPage
      onScroll={onScroll}
      onEdit={() => id && onEdit(id)}
      onPay={onPay}
    />
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
