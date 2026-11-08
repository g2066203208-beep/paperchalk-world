'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const load=(name,scope)=>vm.runInNewContext(
 fs.readFileSync(path.join(root,'site/game',name+'.js'),'utf8'),
 scope,{filename:name+'.js'});
const saved=JSON.parse(fs.readFileSync(path.join(root,
 'site/data/kirihama-location-masterplan.v1.json'),'utf8'));
const scope={window:{},console};
for(const f of ['kirihama-location-plan','world-atlas','metro-graph','destination-network'])
 load(f,scope);
const {PaperWorldKirihamaLocationPlan:layout,PaperWorldAtlas:atlas,
 PaperWorldMetro:metro,PaperWorldDestinationNetwork:network}=scope.window;
test('exactly 120 authored local places in 15 distinct districts, not 120 metro stations',()=>{
 assert.equal(saved.status,'masterplan-only-not-scene-ready');
 assert.equal(saved.sites.length,120);
 assert.equal(saved.districts.length,15);
 assert.equal(new Set(saved.sites.map(s=>s.id)).size,120);
 assert.equal(new Set(saved.sites.map(s=>s.name)).size,120);
 assert.equal(saved.districts.reduce((n,d)=>n+d.siteCount,0),120);
 assert.equal(atlas.POIS.filter(p=>p.city==='kirihama').length,120);
 assert.equal(atlas.POIS.length,211);
 assert.equal(Object.keys(metro.STATIONS).length,70);
 assert.equal(atlas.KIRIHAMA_CITY_PLAN.sites.length,120);
 assert.equal(layout.sites.length,120);
 for(const district of saved.districts)
  assert.equal(saved.sites.filter(p=>p.districtId===district.id).length,
   district.siteCount,district.name);
});
test('30 original city location names and save-game IDs are intact; only six scene-ready',()=>{
 const keys=['entrance','school','convenience','cafe','mall','park','hospital','station','police',
  ...Array.from({length:21},(_,i)=>'kirihama-'+String(i+1).padStart(2,'0'))];
 assert.equal(keys.length,30);
 for(const id of keys) {
  const site=saved.sites.find(p=>p.id===id);
  assert.ok(site,'retired existing city ID '+id);
  assert.equal(atlas.POI_BY_ID[id].name,site.name);
  assert.equal(atlas.POI_BY_ID[id].status,site.status);
 }
 assert.equal(saved.sites.filter(s=>s.status==='日常').length,6);
 assert.equal(saved.sites.filter(s=>s.status==='未开放').length,3);
 assert.equal(saved.sites.filter(s=>s.status==='规划').length,111);
 assert.equal(atlas.POIS.filter(p=>p.city==='kirihama'&&p.storyReady).length,6);
});
test('every site is attached to its REAL geometrically nearest station, in metre space',()=>{
 for(const s of saved.sites){
  const st=metro.STATIONS[s.metroStationId];
  assert.ok(st,'missing station '+s.id);
  const x=st.gx*900+s.offsetFromStation.eastM;
  const y=st.gy*900+s.offsetFromStation.southM;
  assert.equal(s.localPosition.eastM,x,s.id);
  assert.equal(s.localPosition.southM,y,s.id);
  assert.ok(x>=0&&x<=32400&&y>=0&&y<=23400,s.id);
  const dist=Math.round((Math.abs(s.offsetFromStation.eastM)+
   Math.abs(s.offsetFromStation.southM))*1.28+55);
  assert.equal(dist,s.walking.distanceM,s.id);
  assert.ok(dist<=1000&&dist>=55,s.id);
  const assignedStraight=Math.hypot(s.offsetFromStation.eastM,s.offsetFromStation.southM);
  for(const [id,other] of Object.entries(metro.STATIONS)){
   const competitor=Math.hypot(x-other.gx*900,y-other.gy*900);
   assert.ok(assignedStraight<=competitor+1e-6,
    s.id+' assigned '+s.metroStationId+' but '+id+' is closer');
  }
  const runtime=atlas.POI_BY_ID[s.id];
  assert.equal(runtime.metroStationId,s.metroStationId);
  assert.equal(runtime.walkingEstimateM,dist);
  assert.equal(runtime.metroLocal.eastM,x);
  assert.equal(runtime.metroLocal.southM,y);
 }
});
test('two different site entrances never overlap within 80 metres on the same floor',()=>{
 for(let i=0;i<saved.sites.length;i++)for(let j=i+1;j<saved.sites.length;j++){
  const a=saved.sites[i],b=saved.sites[j];
  if(a.floor!==b.floor)continue;
  assert.ok(Math.hypot(a.localPosition.eastM-b.localPosition.eastM,
   a.localPosition.southM-b.localPosition.southM)>=80,
   a.name+' collides with '+b.name);
 }
});
test('city uses actual station-based last-mile links, not four fake random spokes',()=>{
 assert.equal(network.ACCESS_ROUTES.filter(l=>l.id.startsWith('access-kirihama')).length,115);
 assert.equal(network.audit().accessLines,151);
 assert.deepEqual(Array.from(network.audit().unreachable),[]);
 assert.deepEqual(Array.from(network.audit().oneWay),[]);
 for(const site of saved.sites){
  assert.ok(network.journey('entrance',site.id),'no outbound route '+site.name);
  assert.ok(network.journey(site.id,'entrance'),'no return route '+site.name);
  if(site.id===site.metroStationId)continue; // legacy save IDs are co-located
  const access=network.ACCESS_ROUTES.find(l=>l.id==='access-kirihama-'+site.id);
  assert.ok(access,'missing physical first mile to '+site.name);
  assert.deepEqual(Array.from(access.stops),[site.metroStationId,site.id]);
  assert.equal(access.plannedWalkM,site.walking.distanceM);
 }
});
test('site layout is loaded before atlas in the actual browser',()=>{
 const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
 const plan=html.indexOf('src="./game/kirihama-location-plan.js?');
 const atlasStart=html.indexOf('src="./game/world-atlas.js?');
 const metroStart=html.indexOf('src="./game/metro-graph.js?');
 const networkStart=html.indexOf('src="./game/destination-network.js?');
 assert.ok(plan>0&&atlasStart>plan&&metroStart>atlasStart&&networkStart>metroStart);
});


const inPolygon=([x,y],poly)=>{
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
};
const bezier=(a,b,c,d,t)=>{
 const q=1-t;
 return [0,1].map(k=>q*q*q*a[k]+3*q*q*t*b[k]+3*q*t*t*c[k]+t*t*t*d[k]);
};
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const segmentsIntersect=(a,b,c,d)=>
 cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
test('planned buildings and metro stations stay on LAND, not in Kirihama Bay',()=>{
 const water=saved.geography.bayWaterPolygonGrid;
 assert.ok(water.length>=6);
 for(const s of saved.sites)
  assert.equal(inPolygon([s.localPosition.eastM/900,s.localPosition.southM/900],water),
   false,'planned land entrance fell into the bay: '+s.name);
 for(const [id,st] of Object.entries(metro.STATIONS))
  assert.equal(inPolygon([st.gx,st.gy],water),false,'metro station in bay: '+id);
});
test('no planned first-mile walking link silently crosses the river without a bridge',()=>{
 const river=saved.geography.riverCubicSectionsGrid.flatMap(
  ([a,b,c,d])=>Array.from({length:81},(_,i)=>bezier(a,b,c,d,i/80)));
 for(const s of saved.sites){
  const st=metro.STATIONS[s.metroStationId],a=[st.gx,st.gy];
  const b=[s.localPosition.eastM/900,s.localPosition.southM/900];
  for(let k=1;k<river.length;k++)
   assert.equal(segmentsIntersect(a,b,river[k-1],river[k]),
    false,s.name+' requires a real documented river crossing');
 }
});
test('underground, elevated and second-floor locations keep their real level',()=>{
 const levelOf=name=>saved.sites.find(s=>s.name===name).localPosition.level;
 for(const name of ['都心地下街','中央地下食堂街','中央地下换乘通道'])
  assert.equal(levelOf(name),-1,name);
 for(const name of ['旧书店二楼','霞桥高架','北环铁路桥','商场步行天桥'])
  assert.equal(levelOf(name),1,name);
 assert.equal(levelOf('废弃侧式站台'),-2);
 assert.equal(levelOf('家'),0);
});
