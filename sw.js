// Offline-first after the first successful visit; online fetch is network-first.
const CACHE="untitled-kiosk-20261026-v5";
const CORE=["./","./index.html","./style.css","./src/kiosk-core.js","./src/kiosk-view.js","./src/kiosk-guest.js","./src/kiosk-motion.js","./src/kiosk-app.js","./src/network.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith("untitled-kiosk-")&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 const req=e.request,url=new URL(req.url);if(req.method!=="GET"||url.origin!==location.origin)return;
 if(req.mode==="navigate"){
  e.respondWith(fetch(req).then(r=>{if(r.ok){let copy=r.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy));}return r;}).catch(()=>caches.match("./index.html")));return;
 }
 e.respondWith(fetch(req).then(r=>{if(r.ok){let copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return r;}).catch(()=>caches.match(req)));
});
