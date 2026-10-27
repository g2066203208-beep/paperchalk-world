// CSS-pixel geometry shared by drawing, touch input and browser verification.
export function shopLayout(W,H){
 const wide=W/H>=1.35,header=56,gap=8,top=wide?60:144;
 const rail=wide?Math.max(110,Math.min(190,W*.20)):Math.max(88,Math.min(128,W*.235));
 const drawerH=wide?56:84,drawY=H-8-drawerH,cabH=wide?44:64;
 const counterH=wide?84:100,counterY=wide?H-8-counterH:drawY-counterH-6;
 const shelfBottom=wide?drawY-6:counterY-12;
 const left={x:gap,y:top,w:rail,h:shelfBottom-top};
 const right={...left,x:W-gap-rail};
 const win={x:rail+gap*2+6,y:top+12,w:W-2*rail-gap*4-12,h:counterY-top-26};
 const shelfH=(left.h-cabH-6)/3,shelves=[];
 for(const [side,r] of [['L',left],['R',right]])for(let i=0;i<3;i++)shelves.push({x:r.x,y:r.y+cabH+6+i*shelfH,w:r.w,h:shelfH,key:'shelf'+side+(i+1)});
 const counter=wide?{x:rail+16,y:counterY,w:W-2*rail-32,h:counterH}:{x:8,y:counterY,w:W-16,h:counterH};
 const cw=counter.w,cx=counter.x;
 return {W,H,wide,header,top,win,left,right,cabH,shelves,counter,
 cabinets:[{...left,h:cabH,key:'cabinetL'},{...right,h:cabH,key:'cabinetR'}],
 mat:{x:cx+cw*.29,y:counterY+12,w:cw*.40,h:counterH-24},
 till:{x:cx+6,y:counterY+12,w:Math.max(72,cw*.22),h:counterH-24},
 book:{x:cx+cw*.73,y:counterY+12,w:cw*.25-4,h:counterH-24},
 drawers:wide?[{x:left.x,y:drawY,w:rail,h:drawerH,key:'drawerL'},{x:right.x,y:drawY,w:rail,h:drawerH,key:'drawerR'}]:[{x:8,y:drawY,w:W*.49-12,h:drawerH,key:'drawerL'},{x:W*.51+4,y:drawY,w:W*.49-12,h:drawerH,key:'drawerR'}]};
}
export function shopTask(s,p){
 if(s.phase==='summary')return '今天辛苦了！核对账本，准备明天营业。';
 if(p?.restock)return '补货：点同类货架或空位放入商品。';
 if(p?.hand)return '拿起'+({tea:'热茶',bread:'面包',battery:'电池',cocoa:'可可'}[p.hand]||'商品')+' → 点交接台放下。';
 if(s.counter)return '核对商品 → 点左边收银机收款。';
 if(!s.windowOpen)return '点窗台「开窗营业」，迎接顾客。';
 return '听需求 → 货架拿货 → 交接台 → 收银。';
}
