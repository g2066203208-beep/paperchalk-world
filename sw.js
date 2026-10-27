// Offline-capable single-player shell. The first online visit installs exactly
// the ES modules deployed to GitHub Pages; PeerJS signaling remains online-only.
// Only individually cropped, licensed/original GPTIMG sprite files are cached.
// Never precache a flattened mock screenshot or the obsolete anime asset pack.
const CACHE="untitled-kiosk-offline-v10-approved-scene";
const CORE=[
 "./","./index.html","./style.css","./menu.css","./src/kiosk-menu.js","./assets/menu/fonts/menu-black.woff",
 ...["paper.svg","ticket.svg","tape.svg","mug.svg","snow.svg","steam.svg","icon-door.svg","icon-friends.svg","icon-settings.svg","icon-arrow.svg","icon-back.svg"].map(n=>"./assets/menu/"+n),
 ...["backdrop.webp","foreground.webp","clerk-body.webp","clerk-head-open.webp","clerk-head-blink.webp","clerk-cup-arm.webp","customer-master.webp"].map(n=>"./assets/menu-approved/"+n),
 "./src/kiosk-core.js","./src/kiosk-business.js","./src/kiosk-view.js","./src/kiosk-gpt-scene.js","./src/kiosk-flat.js","./src/kiosk-skin.js",
 "./src/kiosk-pixel.js","./src/kiosk-gptimg.js","./src/kiosk-guest.js","./src/kiosk-motion.js",
 "./src/kiosk-item-motion.js","./src/kiosk-dialogue.js","./src/kiosk-app.js","./src/network.js",
 "./assets/gptimg/customer-uncle.webp","./assets/gptimg/winter-kiosk-source.png",
 ...["customer-idle","wall-left","wall-right","cabinetL-closed","cabinetR-closed","cabinet-open-interior","shelfL1","shelfL2","shelfL3","shelfR1","shelfR2","shelfR3","window-landscape","building-left","building-right","frame-left","frame-right","frame-top","frame-sill","shutter-closed","countertop","under-counter","drawerL-closed","drawerR-closed","good-tea","good-bread","good-battery","good-cocoa"].map(n=>"./assets/gptimg/parts/"+n+".png"),
 "./assets/gptimg/parts/manifest.json"
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
