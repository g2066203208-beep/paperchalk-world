/** Canvas-native country atlas: static geography + moving traffic, distinct enterable interiors.
 * 32x32 lazy chunks, max 36 hot chunks. Screens do not instantiate distant NPCs/buildings.
 */
import {COUNTRY,REGIONS,STATIONS,NETWORK,MODE,terrainAt,roadGridAt,buildingsInBlock,resolveBuilding,
 interiorFor,nearbyRegion,streetName,allEdges,routeBetween,positionOnRoute,between,hash} from './world-model.js';
const $=(root,sel)=>root.querySelector(sel);
const colors={sea:'#426f81',water:'#658c91',urban:'#b49c80',port:'#847e77',industry:'#887569',
 forest:'#63816f',mine:'#8b867a',farm:'#b4ae75',wetland:'#7d988c',mountain:'#8c9090',
 grassland:'#899d80',outside:'#1d3945'};
const rect=(ctx,x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
const line=(ctx,a,b,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createNationalAtlas(root,{readWorld,command}){
 let visible=false,scale=28,center={x:938,y:2050},mode='map',selected='capital',transport='road';
 let snapshot=readWorld(),view={w:1000,h:640},dpr=1,raf=0,elapsed=0,animation=null,player={x:480,y:510},walkTarget=null;
 const chunks=new Map(),CACHE_LIMIT=36;
 const html='<section class="nation-shell" role="dialog" aria-label="夜港联邦可探索国家地图">'+
 '<header class="nation-top"><div class="nation-brand"><small>THE FEDERATION · 1998</small><strong>夜港联邦 · 国土探索</strong></div>'+
 '<div class="nation-top-controls"><button data-nation-zoom="all">全国</button><button data-nation-zoom="local">街区</button>'+
 '<button data-nation-center="me">回到自己位置</button><button data-nation-close>返回游戏 ×</button></div></header>'+
 '<div class="nation-main"><div class="nation-viewport" tabindex="0" aria-label="地图可拖拽、滚轮缩放；点击建筑进入，键盘WASD移动">'+
 '<canvas class="nation-land" aria-label="国家地形、道路、铁路和可进入建筑"></canvas>'+
 '<canvas class="nation-traffic" aria-hidden="true"></canvas><div class="nation-hud"><span class="nation-loc">旧港城区</span><span class="nation-scale"></span>'+
 '<span class="nation-tips">拖动画面 · 滚轮缩放 · 点建筑进入 · WASD移动</span></div></div>'+
 '<aside class="nation-side"><div class="nation-section"><small>LIVE NATIONAL ATLAS</small><h2>一个真实连续的国土</h2><p>地图总寻址面积 1024 × 1024 公里。只有视野附近街区会生成精细内容，远方以区域级信息呈现。</p>'+
 '<div class="nation-measures"><span>地块寻址<strong>4096²</strong></span><span>可探地区<strong>12</strong></span><span>交通网络<strong>3 类</strong></span></div></div>'+
 '<div class="nation-section"><h3>地区与建筑</h3><div class="nation-building-info" aria-live="polite">在大地图选地区，放大后点击一栋建筑。</div></div>'+
 '<div class="nation-section"><h3>实际线路 · 公路 / 铁路 / 航运</h3><div class="nation-mode-buttons">'+
 Object.entries(MODE).map(([key,x])=>'<button type="button" data-nation-mode="'+key+'" class="'+(key===transport?'selected':'')+'">'+x.name+'</button>').join('')+'</div>'+
 '<label for="nation-destination">目的站</label><select id="nation-destination" aria-label="选择实际线路目的地">'+
 STATIONS.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join('')+'</select><div class="nation-route" aria-live="polite"></div>'+
 '<button class="nation-depart" data-nation-depart>查看并乘坐选定班次</button></div>'+
 '<div class="nation-section nation-log"><h3>探索发现</h3><div class="nation-journey-log"></div></div></aside></div>'+
 '<footer class="nation-foot"><div class="nation-legend"><span><i style="background:#e8c292"></i>公路</span><span><i style="background:#404653"></i>铁路</span>'+
 '<span><i style="background:#76cada"></i>航运</span><span><i style="background:#f4e5cf"></i>房屋</span></div>'+
 '<div class="nation-pad" aria-label="触屏移动"><button data-nation-step="0,-1">↑</button><button data-nation-step="-1,0">←</button><button data-nation-step="0,1">↓</button><button data-nation-step="1,0">→</button></div>'+
 '<span>建筑内部是可以实际移动的场景，不是经营按钮。</span></footer></section>';
 root.innerHTML=html;root.hidden=true;
 const viewEl=$(root,'.nation-viewport'),land=$(root,'.nation-land'),traffic=$(root,'.nation-traffic');
 const c=land.getContext('2d',{alpha:false}),a=traffic.getContext('2d');
 const destination=$(root,'#nation-destination'),info=$(root,'.nation-building-info'),hint=$(root,'.nation-loc');
 let fixedFrame=null,pointStart=null,dragging=false,lastDrag=null;
 function notify(text){info.textContent=text;}
 function updateState(){snapshot=readWorld();}
 function exec(action){
  const r=command({module:'nation',...action});
  if(!r.ok)notify(r.message);else{updateState();paint();updateSidebar();}
  return r;
 }
 const hot=(x,y,buildings=false)=>{
  const cx=Math.floor(x/COUNTRY.chunk),cy=Math.floor(y/COUNTRY.chunk),id=cx+':'+cy;
  let chunk=chunks.get(id);
  if(!chunk){chunk={tiles:new Map(),buildings:new Map()};chunks.set(id,chunk);
   if(chunks.size>CACHE_LIMIT)chunks.delete(chunks.keys().next().value);}
  else{chunks.delete(id);chunks.set(id,chunk);}
  const key=x+':'+y;
  if(!chunk.tiles.has(key))chunk.tiles.set(key,terrainAt(x,y));
  if(buildings&&!chunk.buildings.has(key))chunk.buildings.set(key,buildingsInBlock(x,y,snapshot.slices.estates));
  return {terrain:chunk.tiles.get(key),buildings:buildings?chunk.buildings.get(key):null};
 };
 function resize(){
  const bounds=viewEl.getBoundingClientRect();view.w=Math.max(320,bounds.width);view.h=Math.max(250,bounds.height);
  dpr=Math.min(2,window.devicePixelRatio||1);
  for(const element of [land,traffic]){element.width=Math.round(view.w*dpr);element.height=Math.round(view.h*dpr);
   element.style.width=view.w+'px';element.style.height=view.h+'px';}
  c.setTransform(dpr,0,0,dpr,0,0);a.setTransform(dpr,0,0,dpr,0,0);paint();
 }
 function screen(x,y){return {x:(x-center.x)*scale+view.w/2,y:(y-center.y)*scale+view.h/2};}
 function worldPos(x,y){return {x:(x-view.w/2)/scale+center.x,y:(y-view.h/2)/scale+center.y};}
 function atWorld(lx,ly){return {x:lx*view.w/960,y:ly*view.h/600};}
 function text(ctx,string,x,y,font='11px sans-serif',color='#f7ecd8'){
  ctx.font=font;ctx.fillStyle=color;ctx.fillText(string,x,y);
 }
 function drawMap(){
  rect(c,0,0,view.w,view.h,colors.sea);
  const step=scale<8?Math.ceil(9/scale):1;
  const x0=Math.max(0,Math.floor(center.x-view.w/(scale*2))-step),
   y0=Math.max(0,Math.floor(center.y-view.h/(scale*2))-step),
   x1=Math.min(COUNTRY.size,Math.ceil(center.x+view.w/(scale*2))+step),
   y1=Math.min(COUNTRY.size,Math.ceil(center.y+view.h/(scale*2))+step);
  for(let y=y0;y<y1;y+=step)for(let x=x0;x<x1;x+=step){
   const t=scale<8?terrainAt(x,y):hot(x,y,true).terrain;
   const p=screen(x,y),w=step*scale+.5;
   rect(c,p.x,p.y,w,w,colors[t.kind]||colors.grassland);
   if(scale>=10&&t.kind!=='sea'&&t.kind!=='water'){
    if(roadGridAt(x,y)){
     rect(c,p.x,p.y,scale,scale,'#605d5a');
     rect(c,p.x+scale*.47,p.y,Math.max(1,scale*.05),scale,'#d2c29a');
    }else{
     const buildings=hot(x,y,true).buildings;
     for(const b of buildings){
      const f=b.footprint,px=screen(f.x,f.y),bw=f.w*scale,bh=f.h*scale;
      if(bw<1)continue;
      rect(c,px.x+1,px.y+3,bw,bh,'#333c42');
      rect(c,px.x,px.y,bw,bh,['#e7d7b8','#b5bdba','#cfb8a4','#e1bb97','#bac8b3','#d2c4b9','#c3ac97'][b.color]);
      rect(c,px.x+bw*.13,px.y+bh*.15,bw*.75,Math.max(1,bh*.09),'#596979');
      if(scale>=28){
       rect(c,px.x+bw*.15,px.y+bh*.68,bw*.25,Math.max(2,bh*.14),'#4b6d7b');
       rect(c,px.x+bw*.63,px.y+bh*.68,bw*.18,Math.max(2,bh*.14),'#654b3d');
      }
     }
     if(scale>=28&&['forest','farm','mountain'].includes(t.kind)){
      for(let j=0;j<2;j++){const h=hash(x,y,j),xx=p.x+(h%9+2)*scale/14,yy=p.y+(Math.floor(h/13)%8+2)*scale/13;
       c.fillStyle=t.kind==='farm'?'#ccb77d':'#476d60';c.beginPath();c.arc(xx,yy,Math.max(2,scale*.045),0,Math.PI*2);c.fill();}
     }
    }
   }
  }
  // Lines are geometrical paths in nation coordinates, not menu links.
  for(const m of ['road','rail','sea']){
   for(const e of allEdges(m)){
    const v=screen(e.from.x,e.from.y),w=screen(e.to.x,e.to.y);
    if(Math.min(v.x,w.x)>view.w+50||Math.max(v.x,w.x)<-50||
       Math.min(v.y,w.y)>view.h+50||Math.max(v.y,w.y)<-50)continue;
    const route=e.geometry.map(p=>screen(p.x,p.y));
    for(let i=1;i<route.length;i++){
     const v=route[i-1],w=route[i];
     if(m==='road'){line(c,v,w,'#544d49',Math.max(1,Math.min(14,scale*.22)));
       line(c,v,w,'#d3b78b',Math.max(.8,Math.min(4,scale*.07)));}
     if(m==='rail'){line(c,v,w,'#303b4b',Math.max(2,Math.min(9,scale*.13)));
       c.setLineDash([Math.max(3,scale*.17),Math.max(2,scale*.12)]);line(c,v,w,'#efede4',Math.max(1,Math.min(2,scale*.03)));c.setLineDash([]);}
     if(m==='sea'){line(c,v,w,'#87d6df',Math.max(2,Math.min(5,scale*.06)));}
    }
   }
  }
  if(scale<14){
   for(const region of REGIONS){
    const p=screen(region.x,region.y);
    if(p.x<0||p.x>view.w||p.y<0||p.y>view.h)continue;
    const size=scale<1?11:13;
    c.textAlign='center';text(c,region.name,p.x,p.y,'bold '+size+'px sans-serif','#fff4de');c.textAlign='left';
   }
  }
  for(const stop of STATIONS){
   const p=screen(stop.x,stop.y);
   if(p.x<-10||p.x>view.w+10||p.y<-10||p.y>view.h+10)continue;
   c.fillStyle=stop.kind==='port'?'#a7d9d8':'#f2d1a4';
   c.beginPath();c.arc(p.x,p.y,Math.max(3,Math.min(7,scale*.14)),0,7);c.fill();
   if(scale>1&&scale<25)text(c,stop.name,p.x+8,p.y-8,'bold 11px sans-serif','#fff7e5');
  }
  $(root,'.nation-loc').textContent=nearbyRegion(center.x,center.y).name+' · '+Math.round(center.x)+' / '+Math.round(center.y);
  $(root,'.nation-scale').textContent='地图比例 1块=250米 · '+(Math.round(1000/scale)/10)+' 米/10px';
 }
 function drawInterior(){
  const b=resolveBuilding(snapshot.slices.nation.inside,snapshot.slices.estates),floor=interiorFor(b);
  if(!floor)return;
  const sx=view.w/960,sy=view.h/600;
  c.save();c.scale(sx,sy);
  const floors=['#b1a59a','#c5b5a0','#aab4ae','#b8b5ad','#c6b0a5'];
  rect(c,0,0,960,600,'#273440');rect(c,32,38,896,535,floors[floor.floor]);
  for(let y=52;y<560;y+=34){line(c,{x:34,y},{x:924,y},'#9b998f',1);}
  if(floor.rooms>=2){
   rect(c,floor.wallX,40,16,230,'#34414a');rect(c,floor.wallX,370,16,200,'#34414a');
  }
  if(floor.rooms===3){rect(c,35,310,300,12,'#34414a');rect(c,580,310,342,12,'#34414a');}
  rect(c,25,27,920,18,'#35404a');rect(c,25,557,395,24,'#35404a');rect(c,540,557,405,24,'#35404a');
  rect(c,25,27,19,545,'#35404a');rect(c,926,27,19,545,'#35404a');
  rect(c,419,567,122,16,'#9a764f');
  for(let j=0;j<6;j++){rect(c,78+j*145,27,86,10,'#93b8bd');rect(c,78+j*145,44,86,10,'#d7c7a6');}
  for(const f of floor.fixtures){
   rect(c,f.x-4,f.y-4,f.w+8,f.h+8,'#33424c');
   rect(c,f.x,f.y,f.w,f.h,['#b4977e','#5e7c83','#b0a87a','#8b6a63'][hash(f.id)%4]);
   rect(c,f.x+8,f.y+7,f.w-16,6,'#eee1bc');
   text(c,f.label,f.x-5,f.y-9,'bold 15px sans-serif','#23313d');
  }
  text(c,b.street+' / '+b.title,64,88,'bold 21px sans-serif','#293b46');
  for(const npc of floor.characters){
   const dy=5*Math.sin(elapsed/850+hash(npc.id)%12);
   c.fillStyle='#364958';c.beginPath();c.ellipse(npc.x,npc.y+dy,12,8,0,0,7);c.fill();
   c.fillStyle='#dfb79b';c.beginPath();c.arc(npc.x,npc.y-12+dy,11,0,7);c.fill();
   text(c,npc.name,npc.x-19,npc.y+27+dy,'12px sans-serif','#26343f');
  }
  c.restore();
  hint.textContent=b.street+' · '+b.title+' · 室内调查';
 }
 function paint(){
  if(!visible)return;
  c.clearRect(0,0,view.w,view.h);
  if(snapshot.slices.nation.inside)drawInterior();else drawMap();
 }
 function drawTraffic(now){
  if(!visible)return;
  elapsed=now;a.clearRect(0,0,view.w,view.h);
  const nation=snapshot.slices.nation;
  if(nation.inside){
   if(walkTarget){
    const dx=walkTarget.x-player.x,dy=walkTarget.y-player.y,d=Math.hypot(dx,dy);
    if(d<3){player={x:walkTarget.x,y:walkTarget.y};const object=walkTarget.object;walkTarget=null;
     if(object)exec({type:'inspect',object});}
    else{const step=Math.min(d,4.5);const nx=player.x+dx/d*step,ny=player.y+dy/d*step;
     const floor=interiorFor(resolveBuilding(nation.inside,snapshot.slices.estates));
     if(!floor.fixtures.some(f=>nx>f.x-14&&nx<f.x+f.w+14&&ny>f.y-14&&ny<f.y+f.h+14)){
      player={x:nx,y:ny};}else walkTarget=null;
    }
   }
   a.save();a.scale(view.w/960,view.h/600);
   a.fillStyle='#23333e';a.beginPath();a.ellipse(player.x,player.y+9,16,8,0,0,7);a.fill();
   a.fillStyle='#ddbd9c';a.beginPath();a.arc(player.x,player.y-9,12,0,7);a.fill();
   rect(a,player.x-4,player.y-26,8,10,'#5f667c');
   a.restore();
  }else{
   for(const m of ['road','rail','sea']){
    for(const e of allEdges(m)){
     const t=((now/(m==='road'?24000:m==='rail'?18000:36000)+hash(e.id)%100/100)%1);
     const p=positionOnRoute({points:e.geometry},t);
     const xy=screen(p.x,p.y);
     if(xy.x<-15||xy.x>view.w+15||xy.y<-15||xy.y>view.h+15)continue;
     a.fillStyle=m==='road'?'#f6c783':m==='rail'?'#eff0e6':'#bfe7eb';
     const r=m==='sea'?5:m==='rail'?4:3;a.fillRect(xy.x-r,xy.y-r,2*r,2*r);
    }
   }
   if(animation){
    const t=between((now-animation.started)/animation.duration,0,1),pos=positionOnRoute(animation.path,t);
    center={x:pos.x,y:pos.y};
    if(!fixedFrame||now-fixedFrame>85){fixedFrame=now;paint();}
    if(t>=1){
      animation=null;exec({type:'arrive'});
      center={...snapshot.slices.nation.position};paint();
      notify('沿着实际线路到站。现在可以进入目的地的街道与建筑。');
    }
   }
   const position=animation?positionOnRoute(animation.path,between((now-animation.started)/animation.duration,0,1)):nation.position;
   const xy=screen(position.x,position.y);
   a.fillStyle='#ffefbf';a.beginPath();a.arc(xy.x,xy.y,7,0,7);a.fill();
   a.strokeStyle='#8f3f45';a.lineWidth=2;a.stroke();
  }
  raf=requestAnimationFrame(drawTraffic);
 }
 function updateSidebar(){
  if(!visible)return;
  const nation=snapshot.slices.nation;
  destination.value=selected;
  const route=routeBetween(nation.station,selected,transport);
  const from=STATIONS.find(x=>x.id===nation.station);
  $(root,'.nation-route').innerHTML=route?
   '<strong>'+esc(from.name)+' → '+esc(STATIONS.find(x=>x.id===selected).name)+'</strong>'+
   '<p>'+route.km+' km · 预计 '+route.durationHours+' 小时 · 票价 ＄'+route.fare+'</p>'+
   '<small>'+route.points.filter(x=>x.id).map(x=>esc(STATIONS.find(s=>s.id===x.id)?.name||x.id)).join(' → ')+'</small>':
   '<p>当前方式没有连通线路，试试另一种交通方式。</p>';
  $(root,'[data-nation-depart]').disabled=!route||!!nation.journey||!!nation.inside;
  $(root,'.nation-journey-log').innerHTML='<p>已进入建筑：'+nation.visited.length+' · 发现物品：'+nation.discoveries.length+
    ' · 累计乘车：'+nation.arrivals+'次</p>'+
    nation.journal.slice(0,3).map(x=>'<p>DAY '+x.day+' · '+esc(x.item||x.at||x.type)+'</p>').join('');
  root.querySelectorAll('[data-nation-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.nationMode===transport));
 }
 function fit(zoom){scale=between(zoom,.32,76);paint();updateSidebar();}
 function show(){
  if(visible)return;visible=true;root.hidden=false;updateState();
  if(snapshot.slices.nation.inside){mode='interior';player={x:480,y:510};}
  else center={...snapshot.slices.nation.position};
  resize();updateSidebar();
  if(!raf)raf=requestAnimationFrame(drawTraffic);
  viewEl.focus();
 }
 function close(){visible=false;root.hidden=true;if(raf)cancelAnimationFrame(raf);raf=0;animation=null;}
 function move(dx,dy){
  if(snapshot.slices.nation.inside){
   const interior=interiorFor(resolveBuilding(snapshot.slices.nation.inside,snapshot.slices.estates));
   const x=between(player.x+dx*23,60,900),y=between(player.y+dy*23,78,540);
   const solid=interior.fixtures.some(f=>x>f.x-15&&x<f.x+f.w+15&&y>f.y-15&&y<f.y+f.h+15);
   if(!solid){player={x,y};walkTarget=null;}return;
  }
  if(snapshot.slices.nation.journey)return;
  const pos=snapshot.slices.nation.position,next={x:Math.round(pos.x+dx),y:Math.round(pos.y+dy)};
  const t=terrainAt(next.x,next.y);
  if(t.kind==='sea'||t.kind==='water'||t.kind==='outside'){notify('前方没有通行的陆路，请寻找车站、码头或桥梁。');return;}
  if(exec({type:'walk',...next}).ok){center={...next};paint();}
 }
 function openBuilding(b){
  if(!b)return;
  const r=exec({type:'enter',building:b.id});
  if(r.ok){mode='interior';player={x:480,y:510};walkTarget=null;
   notify('进入 '+b.title+'：行走到物件旁并点击调查，室内有各自不同的陈设和访客。');paint();
  }
 }
 function hitOnMap(x,y){
  const p=worldPos(x,y),bx=Math.floor(p.x),by=Math.floor(p.y);
  if(scale<12){center={x:between(p.x,0,COUNTRY.size),y:between(p.y,0,COUNTRY.size)};fit(22);
   notify(nearbyRegion(p.x,p.y).name+' · 已放大到街道，请选择建筑。');return;}
  for(const b of buildingsInBlock(bx,by,snapshot.slices.estates)){
   const fp=b.footprint;
   if(p.x>=fp.x-.04&&p.x<=fp.x+fp.w+.04&&p.y>=fp.y-.04&&p.y<=fp.y+fp.h+.04){
    openBuilding(b);return;}
  }
  notify(streetName(bx,by)+' · '+nearbyRegion(bx,by).name+'。选择街道上的房屋或按 WASD 前往附近建筑。');
 }
 function hitInside(x,y){
  const p={x:x/view.w*960,y:y/view.h*600};
  const floor=interiorFor(resolveBuilding(snapshot.slices.nation.inside,snapshot.slices.estates));
  if(p.y>535&&p.x>412&&p.x<545){if(exec({type:'exit'}).ok){mode='map';center={...snapshot.slices.nation.position};paint();}return;}
  const fixture=floor.fixtures.find(f=>p.x>f.x-15&&p.x<f.x+f.w+15&&p.y>f.y-20&&p.y<f.y+f.h+20);
  if(fixture){
   const dx=fixture.x-player.x,dy=fixture.y-player.y;
   if(Math.hypot(dx,dy)<155){exec({type:'inspect',object:fixture.id});notify('检查 '+fixture.label+'：'+fixture.detail);}
   else{walkTarget={x:between(fixture.x+fixture.w/2,60,900),y:between(fixture.y+fixture.h+48,78,540),object:fixture.id};
    notify('正在走向 '+fixture.label+'，到达后进行检查。');}return;
  }
  walkTarget={x:between(p.x,60,900),y:between(p.y,78,535)};
 }
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-nation-close')){close();return;}
  if(b.dataset.nationZoom){if(b.dataset.nationZoom==='all'){center={x:2000,y:1900};fit(.68);}else{center={...snapshot.slices.nation.position};fit(30);}return;}
  if(b.dataset.nationCenter){center={...snapshot.slices.nation.position};fit(30);return;}
  if(b.dataset.nationMode){transport=b.dataset.nationMode;updateSidebar();return;}
  if(b.dataset.nationDepart){
   const route=routeBetween(snapshot.slices.nation.station,selected,transport);
   const r=exec({type:'depart',to:selected,mode:transport});
   if(r.ok){animation={started:performance.now(),duration:between(route.km*15,2400,11000),path:route};
    notify(MODE[transport].name+'已发车：沿地图上的线连续驶向'+STATIONS.find(s=>s.id===selected).name+'。');}
   return;
  }
  if(b.dataset.nationStep){const [dx,dy]=b.dataset.nationStep.split(',').map(Number);move(dx,dy);}
 });
 destination.addEventListener('change',()=>{selected=destination.value;updateSidebar();});
 let activePointer=null;
 viewEl.addEventListener('pointerdown',e=>{if(e.target!==traffic&&e.target!==land)return;
  pointStart={x:e.clientX,y:e.clientY};lastDrag=pointStart;dragging=false;activePointer=e.pointerId;viewEl.setPointerCapture(e.pointerId);});
 viewEl.addEventListener('pointermove',e=>{if(activePointer!==e.pointerId||!lastDrag||snapshot.slices.nation.inside)return;
  const dx=e.clientX-lastDrag.x,dy=e.clientY-lastDrag.y;
  if(Math.hypot(e.clientX-pointStart.x,e.clientY-pointStart.y)>5)dragging=true;
  if(dragging&&!animation){center.x=between(center.x-dx/scale,0,COUNTRY.size);center.y=between(center.y-dy/scale,0,COUNTRY.size);paint();}
  lastDrag={x:e.clientX,y:e.clientY};});
 viewEl.addEventListener('pointerup',e=>{if(activePointer!==e.pointerId)return;
  activePointer=null;lastDrag=null;if(dragging)return;
  const box=viewEl.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;
  if(snapshot.slices.nation.inside)hitInside(x,y);else hitOnMap(x,y);
 });
 viewEl.addEventListener('wheel',e=>{e.preventDefault();if(snapshot.slices.nation.inside)return;
  const box=viewEl.getBoundingClientRect(),px=e.clientX-box.left,py=e.clientY-box.top;
  const before=worldPos(px,py),ratio=e.deltaY>0?.78:1.28;
  scale=between(scale*ratio,.32,76);
  center={x:before.x-(px-view.w/2)/scale,y:before.y-(py-view.h/2)/scale};
  paint();},{passive:false});
 viewEl.addEventListener('keydown',e=>{
  const delta={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],
   ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]}[e.code];
  if(delta){e.preventDefault();move(...delta);}
  if(e.code==='Escape'&&snapshot.slices.nation.inside){e.preventDefault();exec({type:'exit'});mode='map';paint();}
 });
 const observer=new ResizeObserver(()=>{if(visible)resize();});observer.observe(viewEl);
 return Object.freeze({show,close,isVisible:()=>visible,refresh:()=>{if(!visible)return;updateState();chunks.clear();paint();updateSidebar();},
  snapshot:()=>({scale,center:{...center},mode:snapshot.slices.nation.inside?'interior':'map',
   chunks:chunks.size,journey:snapshot.slices.nation.journey?.mode||null,inside:snapshot.slices.nation.inside})});
}
