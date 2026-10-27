// One complete world. Orientation changes the camera, never fixture coordinates.
export const SHOP_WORLD=Object.freeze({x:0,y:0,w:2200,h:1800});
const shelves=[];
const sourceStocks=[[158,220,680,280],[158,611,680,265],[158,990,680,264]];
for(const side of ['L','R'])for(let i=0;i<3;i++){
 const [x,y,w,h]=sourceStocks[i],bx=side==='L'?610:1340;
 shelves.push({key:'shelf'+side+(i+1),x:bx+x/996*250,y:230+y/1578*740,w:w/996*250,h:h/1578*740});
}
export const SHOP=Object.freeze({
 room:{x:600,y:0,w:1000,h:1700},win:{x:850,y:240,w:500,h:730},
 shelfBodies:[{x:610,y:230,w:250,h:740},{x:1340,y:230,w:250,h:740}],shelves,
 cabinets:[{key:'cabinetL',x:620,y:65,w:230,h:155},{key:'cabinetR',x:1350,y:65,w:230,h:155}],
 counter:{x:590,y:950,w:1020,h:660},mat:{x:935,y:1060,w:330,h:150},
 till:{x:1330,y:1000,w:230,h:250},book:{x:710,y:1070,w:190,h:150},bell:{x:1270,y:1090,w:65,h:75},
 drawers:[{key:'drawerL',x:641,y:1262,w:451,h:266},{key:'drawerR',x:1108,y:1262,w:451,h:266}]
});
export function shopLayout(){return SHOP;}
export function focusBounds(key){
 if(key==='front')return {x:700,y:420,w:800,h:880};
 if(key==='counter')return {x:680,y:970,w:840,h:600};
 if(key==='recycle')return {x:900,y:770,w:170,h:180};
 if(key==='register')return SHOP.till;
 if(key==='book')return SHOP.book;
 if(key==='customer')return {x:850,y:400,w:500,h:600};
 if(key==='left')return {x:600,y:220,w:280,h:760};
 if(key==='right')return {x:1320,y:220,w:280,h:760};
 return [...SHOP.shelves,...SHOP.cabinets,...SHOP.drawers].find(b=>b.key===key)||focusBounds('front');
}
export function cameraTarget(W,H,key='front'){
 const available=H-56;let z,cx=1100,cy;
 if(key==='front'){
  const wide=W/H>=1.2;
  z=wide?Math.min(1.15,available/900):Math.max(W/1000,available/1750);
  cy=wide?820:850;
 }else{
  const b=key==='counter'&&W/H<1.2?{x:880,y:1030,w:440,h:370}:focusBounds(key);z=Math.min(1.8,(W-28)/(b.w+60),(available-24)/(b.h+60));cx=b.x+b.w/2;cy=b.y+b.h/2;
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
