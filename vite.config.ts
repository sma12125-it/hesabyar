import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/hesabyar/',
  plugins: [
    react(),
    {
      name: 'gh-pages-spa-fallback',
      closeBundle() {
        const dist = resolve(__dirname, 'dist')
        copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
        writeFileSync(resolve(dist, '.nojekyll'), '')
      },
    },
  ],
  test: {
    environment: 'node',
  },
})
