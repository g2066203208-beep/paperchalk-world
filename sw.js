// Untitled game offline cache. Always prefer a newer server build when online; use cached
// code and art when reopening the game without internet. PeerJS multiplayer still
// requires a connection.
const CACHE="lampkeep-shell-20261026b";
const CORE=[
 "./","./index.html","./style.css","./src/logic.js","./src/client.js",
 "./src/network.js","./assets/shop.svg",
 "./assets/guest-01.svg","./assets/guest-02.svg","./assets/guest-03.svg",
 "./assets/guest-04.svg","./assets/guest-05.svg","./assets/guest-06.svg",
 "./assets/guest-07.svg","./assets/guest-08.svg"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("lampkeep-shell-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 if(req.mode==="navigate"){
   event.respondWith(fetch(req).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy));}return r;})
     .catch(()=>caches.match("./index.html")));
   return;
 }
 if(!url.pathname.includes("/paperchalk-world/"))return;
 event.respondWith(fetch(req).then(r=>{
   if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
   return r;
 }).catch(()=>caches.match(req)));
});
