import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const builtIndex = resolve(dist, 'index.html')
if (!existsSync(builtIndex)) {
  throw new Error('dist/index.html missing — run vite build first')
}

copyFileSync(builtIndex, resolve(root, 'index.html'))
copyFileSync(resolve(dist, '404.html'), resolve(root, '404.html'))
writeFileSync(resolve(root, '.nojekyll'), '')

const assetsSrc = resolve(dist, 'assets')
const assetsDest = resolve(root, 'assets')
if (existsSync(assetsDest)) rmSync(assetsDest, { recursive: true, force: true })
mkdirSync(assetsDest, { recursive: true })
cpSync(assetsSrc, assetsDest, { recursive: true })
