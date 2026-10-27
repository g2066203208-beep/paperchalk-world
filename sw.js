// Offline shell for the pure black-and-white silhouette edition.
// Precache only modules actually used. No old illustration, cabinet-door images,
// images, generated atlases, screenshot backgrounds or their obsolete caches.
const CACHE='untitled-kiosk-offline-v16-story-framework';
const CORE=[
 './','./index.html','./style.css','./menu.css','./silhouette.css','./story-ui.css',
 './src/kiosk-app.js','./src/kiosk-silhouette.js','./src/kiosk-menu.js','./src/story-framework.js','./src/story-ui.js',
 './src/kiosk-core.js','./src/kiosk-business.js','./src/kiosk-objects.js',
 './src/kiosk-shop-layout.js','./src/kiosk-motion.js','./src/kiosk-item-motion.js',
 './src/kiosk-dialogue.js','./src/network.js'
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
