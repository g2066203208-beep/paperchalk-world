// Offline-first after the first successful visit; online fetch is network-first.
const CACHE="untitled-kiosk-gpt-visual-v1";
const CORE=["./","./index.html","./style.css","./src/kiosk-core.js","./src/kiosk-view.js","./src/kiosk-skin.js","./src/kiosk-anime-assets.js","./src/kiosk-pixel.js","./src/kiosk-guest.js","./src/kiosk-motion.js","./src/kiosk-item-motion.js","./src/kiosk-app.js","./src/network.js",...["scene-window-open","scene-window-closed","scene-cabinet-left-open","scene-cabinet-left-closed","scene-cabinet-right-open","scene-cabinet-right-closed","scene-drawer-open","scene-drawer-closed","scene-shelf-tower","scene-countertop","scene-mat","scene-snow-street","scene-lamp","scene-upgrade-shelf","scene-upgrade-heater","customers-girl","customers-man","customers-woman","customers-child","goods-bread","goods-tea","goods-battery","goods-cocoa"].map(n=>"./assets/anime/"+n+".webp")];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith("untitled-kiosk-")&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 const req=e.request,url=new URL(req.url);if(req.method!=="GET"||url.origin!==location.origin)return;
 if(req.mode==="navigate"){
  e.respondWith(fetch(req).then(r=>{if(r.ok){let copy=r.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy));}return r;}).catch(()=>caches.match("./index.html")));return;
 }
 e.respondWith(fetch(req).then(r=>{if(r.ok){let copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return r;}).catch(()=>caches.match(req)));
});
