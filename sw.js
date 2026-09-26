const CACHE="hy-1790417709692";const ASSETS=["/hesabyar/.nojekyll","/hesabyar/404.html","/hesabyar/assets/index-DZR3LcTV.css","/hesabyar/assets/index.source-CxUv1yHb.js","/hesabyar/icons/icon-192.png","/hesabyar/icons/icon-512.png","/hesabyar/index.html","/hesabyar/index.source.html","/hesabyar/manifest.webmanifest"];const SHELL="/hesabyar/index.html";
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
