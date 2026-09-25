import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
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
            url === '/hesabyar' ||
            url === '/hesabyar/' ||
            url === '/hesabyar/index.html'
          ) {
            req.url = '/hesabyar/index.source.html'
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
        const files: string[] = []
        const walk = (dir: string, prefix: string) => {
          for (const name of readdirSync(dir)) {
            const abs = resolve(dir, name)
            const rel = prefix ? `${prefix}/${name}` : name
            if (statSync(abs).isDirectory()) walk(abs, rel)
            else if (name !== 'sw.js') files.push(`/hesabyar/${rel.replace(/\\/g, '/')}`)
          }
        }
        walk(dist, '')
        const cache = `hy-${Date.now()}`
        writeFileSync(
          resolve(dist, 'sw.js'),
          `const CACHE=${JSON.stringify(cache)};const ASSETS=${JSON.stringify(['/hesabyar/', ...files])};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return res}).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('/hesabyar/index.html'))))});
`,
        )
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
