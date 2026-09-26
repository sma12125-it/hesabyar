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
        const shell = '/hesabyar/index.html'
        writeFileSync(
          resolve(dist, 'sw.js'),
          `const CACHE=${JSON.stringify(cache)};const ASSETS=${JSON.stringify(files)};const SHELL=${JSON.stringify(shell)};
async function fresh(url){const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error('bad');return res}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(async c=>{await Promise.allSettled(ASSETS.map(async url=>{try{const res=await fresh(url);await c.put(url,res)}catch{}}));return self.skipWaiting()}))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin)return;
  const shellRequest=e.request.mode==='navigate'||url.pathname==='/hesabyar/'||url.pathname==='/hesabyar/index.html';
  if(shellRequest){
    e.respondWith(fresh(e.request).then(async res=>{const cache=await caches.open(CACHE);await cache.put(SHELL,res.clone());return res}).catch(()=>caches.match(SHELL)));
    return;
  }
  e.respondWith(fresh(e.request).then(async res=>{const cache=await caches.open(CACHE);await cache.put(e.request,res.clone());return res}).catch(()=>caches.match(e.request).then(hit=>hit||caches.match(SHELL))));
});
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
