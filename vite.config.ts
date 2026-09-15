import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sourceHtml = resolve(__dirname, 'index.source.html')

export default defineConfig({
  base: '/hesabyar/',
  plugins: [
    react(),
    {
      name: 'dev-source-html',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url?.split('?')[0] ?? ''
          if (
            url === '/' ||
            url === '/index.html' ||
            url === '/hesabyar/' ||
            url === '/hesabyar/index.html'
          ) {
            req.url = '/index.source.html'
          }
          next()
        })
      },
    },
    {
      name: 'gh-pages-spa-fallback',
      closeBundle() {
        const dist = resolve(__dirname, 'dist')
        const generated = resolve(dist, 'index.source.html')
        const index = resolve(dist, 'index.html')
        if (existsSync(generated)) copyFileSync(generated, index)
        copyFileSync(index, resolve(dist, '404.html'))
        writeFileSync(resolve(dist, '.nojekyll'), '')
      },
    },
  ],
  build: {
    rollupOptions: {
      input: sourceHtml,
    },
  },
  test: {
    environment: 'node',
  },
})
