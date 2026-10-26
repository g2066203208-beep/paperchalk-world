// Offline-capable single-player shell. The first online visit installs exactly
// the ES modules deployed to GitHub Pages; PeerJS signaling remains online-only.
// Only individually cropped, licensed/original GPTIMG sprite files are cached.
// Never precache a flattened mock screenshot or the obsolete anime asset pack.
const CACHE="untitled-kiosk-offline-v3";
const CORE=[
 "./","./index.html","./style.css",
 "./src/kiosk-core.js","./src/kiosk-view.js","./src/kiosk-skin.js",
 "./src/kiosk-pixel.js","./src/kiosk-gptimg.js","./src/kiosk-guest.js","./src/kiosk-motion.js",
 "./src/kiosk-item-motion.js","./src/kiosk-app.js","./src/network.js",
 "./assets/gptimg/customer-uncle.webp"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))
   .then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys
   .filter(key=>key.startsWith("untitled-kiosk-")&&key!==CACHE)
   .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 const url=new URL(request.url);
 if(request.method!=="GET"||url.origin!==self.location.origin)return;
 if(request.mode==="navigate"){
  event.respondWith(fetch(request).then(response=>{
   if(response.ok){
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put("./index.html",copy)));
   }
   return response;
  }).catch(()=>caches.match("./index.html")));
  return;
 }
 event.respondWith(fetch(request).then(response=>{
  if(response.ok){
   const copy=response.clone();
   event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));
  }
  return response;
 }).catch(()=>caches.match(request)));
});
