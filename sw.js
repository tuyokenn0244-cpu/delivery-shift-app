const CACHE='delivery-shift-v3-name-row';
const ASSETS=['./','./index.html','./style.css','./app.js?v=3','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return resp}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
