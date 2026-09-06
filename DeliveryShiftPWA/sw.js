const CACHE='delivery-shift-v7-row-reread';
const ASSETS=['./','./index.html','./style.css','./app.js?v=7','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('delivery-shift-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(resp=>{if(resp.ok){const copy=resp.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return resp}).catch(async()=>{const hit=await caches.match(e.request);if(hit)return hit;if(e.request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();return Response.error()}))});
