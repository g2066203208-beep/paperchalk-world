// Offline-capable single-player shell. The first online visit installs exactly
// the ES modules deployed to GitHub Pages; PeerJS signaling remains online-only.
// Only individually cropped, licensed/original GPTIMG sprite files are cached.
// Never precache a flattened mock screenshot or the obsolete anime asset pack.
const CACHE="untitled-kiosk-offline-v14-unified-workbench";
const CORE=[
"./assets/interior-v4/room-shell.webp","./assets/interior-v4/countertop.webp","./assets/interior-v4/shelf-left-back.webp","./assets/interior-v4/shelf-left-structure.webp","./assets/interior-v4/shelf-left-rail-0.webp","./assets/interior-v4/shelf-left-rail-1.webp","./assets/interior-v4/shelf-left-rail-2.webp","./assets/interior-v4/shelf-right-back.webp","./assets/interior-v4/shelf-right-structure.webp","./assets/interior-v4/shelf-right-rail-0.webp","./assets/interior-v4/shelf-right-rail-1.webp","./assets/interior-v4/shelf-right-rail-2.webp","./assets/interior-v4/cabinet-left-door.webp","./assets/interior-v4/cabinet-right-door.webp","./assets/interior-v4/drawer-left-face.webp","./assets/interior-v4/drawer-right-face.webp","./assets/interior-v4/street.webp",
 "./src/kiosk-interior-v4.js","./assets/interior-v4/extension-left.webp","./assets/interior-v4/extension-right.webp",

 "./assets/interior-v3/architecture/street.webp","./assets/interior-v3/architecture/wall.webp","./assets/interior-v3/architecture/wall-left-complete.webp","./assets/interior-v3/architecture/wall-right-complete.webp","./assets/interior-v3/architecture/floor.webp","./assets/interior-v3/architecture/window-left.webp","./assets/interior-v3/architecture/window-right.webp","./assets/interior-v3/architecture/window-top.webp","./assets/interior-v3/architecture/window-sill.webp","./assets/interior-v3/architecture/ceiling-beam.webp","./assets/interior-v3/shelf/backboard.webp","./assets/interior-v3/shelf/post-left.webp","./assets/interior-v3/shelf/post-right.webp","./assets/interior-v3/shelf/top-cap.webp","./assets/interior-v3/shelf/bottom-rail.webp","./assets/interior-v3/shelf/plank-0-surface.webp","./assets/interior-v3/shelf/plank-0-front-rail.webp","./assets/interior-v3/shelf/plank-1-surface.webp","./assets/interior-v3/shelf/plank-1-front-rail.webp","./assets/interior-v3/shelf/plank-2-surface.webp","./assets/interior-v3/shelf/plank-2-front-rail.webp","./assets/interior-v3/counter-top-rim.webp","./assets/interior-v3/counter-cabinet-body.webp","./assets/interior-v3/counter-drawer-left.webp","./assets/interior-v3/counter-drawer-right.webp","./assets/interior-v3/counter-handle-left.webp","./assets/interior-v3/counter-handle-right.webp","./assets/interior-v3/items/tea.webp","./assets/interior-v3/items/bread.webp","./assets/interior-v3/items/battery.webp","./assets/interior-v3/items/cocoa.webp","./assets/interior-v3/items/tray.webp","./assets/interior-v3/items/register.webp","./assets/interior-v3/items/book.webp","./assets/interior-v3/items/bell.webp","./assets/interior-v3/items/lamp.webp","./assets/interior-v3/items/shutter.webp","./assets/interior-v3/items/player-hand.webp","./assets/interior-v3/characters/elder.webp","./assets/interior-v3/characters/earmuffs.webp","./assets/interior-v3/characters/courier.webp","./assets/interior-v3/characters/silver.webp","./assets/interior-v3/characters/elder-smile.webp","./assets/interior-v3/characters/elder-concern.webp","./assets/interior-v3/characters/elder-talk.webp","./assets/interior-v3/characters/earmuffs-smile.webp","./assets/interior-v3/characters/earmuffs-concern.webp","./assets/interior-v3/characters/earmuffs-talk.webp","./assets/interior-v3/characters/courier-smile.webp","./assets/interior-v3/characters/courier-concern.webp","./assets/interior-v3/characters/courier-talk.webp","./assets/interior-v3/characters/silver-smile.webp","./assets/interior-v3/characters/silver-concern.webp","./assets/interior-v3/characters/silver-talk.webp","./assets/interior-v3/cabinet/case-closed.webp","./assets/interior-v3/cabinet/door.webp",
 "./","./index.html","./style.css","./menu.css","./src/kiosk-menu.js","./assets/menu/transition-shutter.svg","./assets/menu/fonts/menu-black.woff",
 ...["paper.svg","ticket.svg","tape.svg","mug.svg","snow.svg","steam.svg","icon-door.svg","icon-friends.svg","icon-settings.svg","icon-arrow.svg","icon-back.svg"].map(n=>"./assets/menu/"+n),
 ...["backdrop.webp","foreground.webp","clerk-body.webp","clerk-head-open.webp","clerk-head-blink.webp","clerk-cup-arm.webp","customer-master.webp"].map(n=>"./assets/menu-approved/"+n),
 "./src/kiosk-objects.js","./src/kiosk-art-assets.js","./src/kiosk-shop-layout.js",...["courier-master.webp","tone0-master.webp","tone1-master.webp","tone3-master.webp","elder-smile.webp","elder-concern.webp","elder-talk.webp"].map(n=>"./assets/rig/customer/"+n),"./src/kiosk-core.js","./src/kiosk-business.js","./src/kiosk-view.js","./src/kiosk-gpt-scene.js","./src/kiosk-flat.js","./src/kiosk-skin.js",
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
