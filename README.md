# حساب‌یار

Personal accounting for the browser. **Rial only**, RTL Persian, Liquid Glass, IndexedDB.

**Live:** https://sma12125-it.github.io/hesabyar/

**Repo:** https://github.com/sma12125-it/hesabyar

If that URL 404s, enable Pages once (repo admin): [Settings → Pages](https://github.com/sma12125-it/hesabyar/settings/pages) → **Deploy from a branch** → `gh-pages` / `/` (root) → Save. The production build is already on `gh-pages`.

## Sprint 2

- Transfer sheet: from / to (active accounts), amount, optional note, date. Hard-rejects amount above source balance (error banner + disabled CTA). Writes `transferOut` + `transferIn` atomically. Transfers are excluded from income/expense totals.
- Balance formula: `openingBalance + income − expense − transferOut + transferIn`
- Installments (اقساط): monthly plans and items, list badges (معوق / به‌زودی / به‌روز), create, detail table, pay as expense in category «اقساط», insufficient-balance error, edit (amount/count/dates locked after first payment), archive
- Home: 7-day upcoming and overdue installment hints
- Entry: Home quick action + account detail for transfer; اقساط tab + Home shortcut

## Sprint 1

- Home: total balance of active accounts, recent transactions, quick actions
- Quick entry sheet: expense / income, category, account, optional note
- Accounts: empty state, create (name required), cash/bank, opening balance, detail, archive/restore
- First visit loads a local demo dataset (right-click the bell on Home to reset or wipe)
- Reports and voice input remain placeholders

## Local development

```bash
npm install
npm test
npm run dev
```

Production build uses Vite `base: '/hesabyar/'` for GitHub Pages:

```bash
npm run build
npm run preview
```

The deploy workflow publishes `dist` to `gh-pages` and also copies the built `index.html` + `assets/` onto `main` so **Settings → Pages → Deploy from `main` / (root)** works.

## Architecture

- Vite + React + TypeScript
- Persistence: IndexedDB (`hesabyar` database) — no server
- Visual system: `src/styles/tokens.css` + `src/styles/glass-v2.css` (locked Liquid Glass v2)
- GitHub Pages deploy: `.github/workflows/deploy.yml` publishes `dist` from `main`
