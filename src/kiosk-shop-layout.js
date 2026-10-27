// One complete world. Orientation changes the camera, never fixture coordinates.
export const SHOP_WORLD=Object.freeze({x:0,y:0,w:2200,h:1800});
const shelves=[];
for(const side of ['L','R'])for(let i=0;i<3;i++){
 const rows=[[345,119],[500,118],[664,96]], [y,h]=rows[i];
 shelves.push({key:'shelf'+side+(i+1),x:side==='L'?705:1377,y,w:129,h});
}
export const SHOP=Object.freeze({
 room:{x:590,y:0,w:1024,h:1536},win:{x:885,y:350,w:437,h:410},
 shelfBodies:[{x:590,y:280,w:270,h:570},{x:1344,y:280,w:270,h:570}],shelves,
 cabinets:[{key:'cabinetL',x:663,y:74,w:169,h:204},{key:'cabinetR',x:1387,y:68,w:210,h:225}],
 counter:{x:590,y:758,w:1024,h:590},mat:{x:968,y:845,w:270,h:140},
 till:{x:1350,y:815,w:175,h:175},book:{x:695,y:865,w:175,h:120},bell:{x:1265,y:880,w:65,h:70},
 drawers:[{key:'drawerL',x:789,y:1102,w:307,h:116},{key:'drawerR',x:1117,y:1102,w:301,h:116}]
});
export function shopLayout(){return SHOP;}
export function focusBounds(key){
 if(key==='front')return {x:590,y:290,w:1024,h:950};
 if(key==='counter')return {x:680,y:780,w:850,h:460};
 if(key==='recycle')return {x:925,y:640,w:140,h:140};
 if(key==='register')return SHOP.till;
 if(key==='book')return SHOP.book;
 if(key==='customer')return {x:855,y:350,w:500,h:460};
 if(key==='left')return {x:600,y:220,w:280,h:760};
 if(key==='right')return {x:1320,y:220,w:280,h:760};
 return [...SHOP.shelves,...SHOP.cabinets,...SHOP.drawers].find(b=>b.key===key)||focusBounds('front');
}
export function cameraTarget(W,H,key='front'){
 const available=H-56;let z,cx=1100,cy;
 if(key==='front'){
  const wide=W/H>=1.2;
  z=wide?Math.min(1.15,available/970):Math.max(W/1024,available/1630);
  cy=wide?760:815;
 }else{
  const b=key==='counter'&&W/H<1.2?{x:850,y:800,w:660,h:430}:focusBounds(key);z=Math.min(1.8,(W-28)/(b.w+60),(available-24)/(b.h+60));cx=b.x+b.w/2;cy=b.y+b.h/2;
 }
 z=Math.max(z,W/SHOP_WORLD.w,available/SHOP_WORLD.h);
 return clampCamera({x:cx,y:cy,z},W,H);
}
export function clampCamera(c,W,H){
 c={...c,z:Math.max(c.z,W/SHOP_WORLD.w,(H-56)/SHOP_WORLD.h)};
 const hx=W/(2*c.z),hy=(H-56)/(2*c.z);
 return {...c,x:Math.max(hx,Math.min(SHOP_WORLD.w-hx,c.x)),y:Math.max(hy,Math.min(SHOP_WORLD.h-hy,c.y))};
}
export function screenPoint(p,c,W,H){return {x:(p.x-c.x)*c.z+W/2,y:(p.y-c.y)*c.z+56+(H-56)/2};}
export function worldPoint(p,c,W,H){return {x:(p.x-W/2)/c.z+c.x,y:(p.y-56-(H-56)/2)/c.z+c.y};}
export function projectedRect(b,c,W,H){const p=screenPoint(b,c,W,H);return {...b,x:p.x,y:p.y,w:b.w*c.z,h:b.h*c.z};}
export function shopTask(s,p){
 if(p?.restock)return '补货：点同类货架或空位放入商品';
 if(p?.hand)return '拿着'+({tea:'热茶',bread:'面包',battery:'电池',cocoa:'可可'}[p.hand]||'商品')+'，回台面放下';
 if(s.counter)return '核对顾客需求，点收银机收款';
 if(!s.windowOpen)return '点窗闩开窗营业；滑动画面环顾店铺';
 return '点单件商品拿货，再放到交接托盘';
}
