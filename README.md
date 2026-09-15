# حساب‌یار

Personal accounting for the browser. Sprint 1: home, accounts, and quick expense/income — **Rial only**, RTL Persian, Liquid Glass, IndexedDB.

**Live:** https://sma12125-it.github.io/hesabyar/

**Repo:** https://github.com/sma12125-it/hesabyar

If that URL 404s, enable Pages once (repo admin): [Settings → Pages](https://github.com/sma12125-it/hesabyar/settings/pages) → **Deploy from a branch** → `gh-pages` / `/` (root) → Save. The production build is already on `gh-pages`.

## Sprint 1

- Home: total balance of active accounts, recent transactions, quick actions
- Quick entry sheet: expense / income, category, account, optional note
- Accounts: empty state, create (name required), cash/bank, opening balance, detail, archive/restore
- Transfer between active accounts (blocked when amount exceeds source balance)
- Installments, reports, and voice input are placeholders for later sprints
- First visit loads a local demo dataset (right-click the bell on Home to reset or wipe)

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

## Architecture

- Vite + React + TypeScript
- Persistence: IndexedDB (`hesabyar` database) — no server
- Visual system: `src/styles/tokens.css` + `src/styles/glass-v2.css` (locked Liquid Glass v2)
- GitHub Pages deploy: `.github/workflows/deploy.yml` publishes `dist` from `main`
