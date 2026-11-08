/* Fictional Japan-inspired coastal megaregion. ALL names, geometry and
 * travel links are authored lore, not claimed actual Japanese geography.
 * Metro is municipal, regional rail/private rail crosses cities, highway
 * coaches and rural buses handle valleys, ferries reach islands.
 * Photo references: see site/assets/map-photo-sources.md. */
(function(global){
'use strict';
const SIZE=Object.freeze({width:2000,height:1280});
const CITIES=Object.freeze([
 {id:'kirihama',name:'霧浜市',sub:'湾岸主都心',x:1080,y:598,size:'metro',radius:295,pop:860,region:'湾岸都市'},
 {id:'kirihara',name:'桐原市',sub:'西部旧城与学园',x:710,y:470,size:'city',radius:145,pop:138,region:'内陆丘陵'},
 {id:'homori',name:'穗森市',sub:'北部大平田',x:1290,y:274,size:'city',radius:132,pop:94,region:'北部平野'},
 {id:'shiomi',name:'汐凪市',sub:'港湾工业新城',x:1540,y:634,size:'city',radius:125,pop:112,region:'东湾海岸'},
 {id:'minamioka',name:'南丘市',sub:'物流与旧工业',x:1000,y:967,size:'city',radius:120,pop:82,region:'南部丘陵'},
 {id:'misaki',name:'岬崎市',sub:'海岬渔港',x:1652,y:929,size:'town',radius:94,pop:29,region:'半岛'},
 {id:'okuzawa',name:'奥沢町',sub:'山麓温泉与水库',x:451,y:738,size:'town',radius:92,pop:18,region:'山麓'},
 {id:'naruba',name:'鳴羽町',sub:'山峡与林场',x:378,y:341,size:'town',radius:82,pop:12,region:'山地'},
 {id:'mizuho',name:'水穗町',sub:'湖滨农庄',x:690,y:999,size:'town',radius:79,pop:13,region:'湖畔'},
 {id:'urasima',name:'浦岛村',sub:'离岛渡船',x:1854,y:1070,size:'island',radius:52,pop:3,region:'外海群岛'}
]);
const CITY_BY_ID=Object.freeze(Object.fromEntries(CITIES.map(c=>[c.id,c])));
const AREAS=Object.freeze([
 {id:'ridge',name:'赤樫山脉',type:'mountain',x:245,y:178},
 {id:'forest',name:'幽杉深林',type:'forest',x:290,y:566},
 {id:'farm',name:'穗森大平田',type:'plain',x:1390,y:132},
 {id:'lake',name:'月影水库',type:'lake',x:499,y:920},
 {id:'old',name:'桐原旧街道',type:'town',x:588,y:528},
 {id:'river',name:'白波川流域',type:'river',x:832,y:310},
 {id:'bay',name:'霧浜内海',type:'sea',x:1632,y:720},
 {id:'port',name:'汐凪工业港',type:'industrial',x:1552,y:559},
 {id:'coast',name:'岬崎半岛',type:'coast',x:1684,y:835},
 {id:'islands',name:'浦岛群岛',type:'island',x:1803,y:1187},
 {id:'reservoir',name:'旧水没村',type:'ruins',x:555,y:1042},
 {id:'onsen',name:'奥沢温泉谷',type:'onsen',x:365,y:802}
]);
// Real photo search sourced from Unsplash and image results; these are
// thematic TEMPORARY references, not depictions of our fictional addresses.
// Preserve src/source independently so a final Anima render replaces one key.
const PHOTOS=Object.freeze({
 metropolis:{url:'https://images.unsplash.com/photo-1545830017-e4c7878841d0?auto=format&fit=crop&w=480&q=70',source:'https://unsplash.com/photos/cityscape-under-blue-sky-B_6CSQqgvHE'},
 street:{url:'https://images.unsplash.com/photo-1508051860858-e7cdbeddd706?auto=format&fit=crop&w=480&q=70',source:'https://unsplash.com/photos/people-at-the-streets-of-the-city-during-day-Wz8uDGvobqI'},
 residential:{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Residential_area.jpg?width=480',source:'https://commons.wikimedia.org/wiki/File:Residential_area.jpg'},
 school:{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Horikoshi_High_School_(external_appearance).jpg?width=480',source:'https://commons.wikimedia.org/wiki/File:Horikoshi_High_School_(external_appearance).jpg'},
 shop:{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Family-Mart-store_JA-Izumo-Otsu.jpg?width=480',source:'https://commons.wikimedia.org/wiki/File:Family-Mart-store_JA-Izumo-Otsu.jpg'},
 cafe:{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Cafe_Casa%2C_Tokyo_2021.jpg?width=480',source:'https://commons.wikimedia.org/wiki/File:Cafe_Casa,_Tokyo_2021.jpg'},
 mall:{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Shinjuku_Keio-Department-store.jpg?width=480',source:'https://commons.wikimedia.org/wiki/File:Shinjuku_Keio-Department-store.jpg'},
 park:{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Fuchu-city.Tokyo.Japan.Keyaki.namiki.dori.fuchu.jpg?width=480',source:'https://commons.wikimedia.org/wiki/File:Fuchu-city.Tokyo.Japan.Keyaki.namiki.dori.fuchu.jpg'},
 rice:{url:'https://image.ganref.jp/photos/members/hiropon_/4e8a12b44abc1f8eb1fd6724ed5a2111_4.jpg',source:'https://ganref.jp/m/hiropon_/portfolios/photo_detail/2418433'},
 ruraltrain:{url:'https://gineybip.up.seesaa.net/image/DSC_0554.NEF-2_01.JPG',source:'https://gineybip.seesaa.net/category/4682819-1.html'},
 oldvillage:{url:'https://ohnan.saloon.jp/hensen/image/sejiri03.jpg',source:'https://ohnan.saloon.jp/hensen/sejiri.htm'},
 coast:{url:'https://images.unsplash.com/photo-1545830017-e4c7878841d0?auto=format&fit=crop&w=480&q=70',source:'https://unsplash.com/photos/cityscape-under-blue-sky-B_6CSQqgvHE'},
 fishing:{url:'https://www.city.odawara.kanagawa.jp/global-image/Banner/20200324145402.jpg',source:'https://www.city.odawara.kanagawa.jp/ubio/pc/movie/'},
 onsen:{url:'https://cdn-ak.f.st-hatena.com/images/fotolife/i/iyasinotensi/20251221/20251221155125.png',source:'https://www.iyashionsen.com/entry/2026/02/01/170000'},
 tunnel:{url:'https://san-tatsu.jp/assets/uploads/2024/07/23145726/1721714245-a805038777b11a274de7ff97e849fb21.jpg',source:'https://san-tatsu.jp/articles/330354/'},
 darktunnel:{url:'https://www.sukima.com/88_kouchi01/03rail28.jpg',source:'https://www.sukima.com/88_kouchi01/03rail.html'},
 schoolruin:{url:'https://cdn-ak.f.st-hatena.com/images/fotolife/a/abolished-school/20170526/20170526214422.jpg',source:'https://abolished-school.hatenablog.jp/entry/2017/05/26/215123'},
 mountain:{url:'https://cdn.yamap.co.jp/public/image2.yamap.co.jp/production/49ea9d33e8d641e5ba293d5d491512ae?h=480&q=55&t=resize&w=740',source:'https://yamap.com/activities/11322789'},
 waterfall:{url:'https://anniversarys-mag.jp/img/p/pixta_79733970_M.jpg?w=730',source:'https://anniversarys-mag.jp/230641/2'},
 village:{url:'https://mindtrip.ai/cdn-cgi/image/format%3Dwebp%2Cw%3D720/https%3A/images.mindtrip.ai/attractions/53d2/3a72/0a01/5836/21f6/ef48/4970/2bea',source:'https://mindtrip.ai/attraction/ito-shizuoka/usami-beach/at-NuhCr3p7'},
 harbor:{url:'https://www.city.odawara.kanagawa.jp/global-image/Banner/20200324145402.jpg',source:'https://www.city.odawara.kanagawa.jp/ubio/pc/movie/'},
 station:{url:'https://images.unsplash.com/photo-1508051860858-e7cdbeddd706?auto=format&fit=crop&w=480&q=70',source:'https://unsplash.com/photos/people-at-the-streets-of-the-city-during-day-Wz8uDGvobqI'},
 hospital:{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Shinjuku_Keio-Department-store.jpg?width=480',source:'https://commons.wikimedia.org/wiki/File:Shinjuku_Keio-Department-store.jpg'},
 factory:{url:'https://images.unsplash.com/photo-1545830017-e4c7878841d0?auto=format&fit=crop&w=480&q=70',source:'https://unsplash.com/photos/cityscape-under-blue-sky-B_6CSQqgvHE'},
 island:{url:'https://mindtrip.ai/cdn-cgi/image/format%3Dwebp%2Cw%3D720/https%3A/images.mindtrip.ai/attractions/53d2/3a72/0a01/5836/21f6/ef48/4970/2bea',source:'https://mindtrip.ai/attraction/ito-shizuoka/usami-beach/at-NuhCr3p7'},
 shrine:{url:'https://anniversarys-mag.jp/img/p/pixta_79733970_M.jpg?w=730',source:'https://anniversarys-mag.jp/230641/2'},
 bridge:{url:'https://www.city.odawara.kanagawa.jp/global-image/Banner/20200324145402.jpg',source:'https://www.city.odawara.kanagawa.jp/ubio/pc/movie/'},
 lake:{url:'https://maizobunkazai-web.pref.iwate.jp/wp-content/uploads/2022/06/2c7d1edb4b38b3038aaeb762c978a636.jpg',source:'https://maizobunkazai-web.pref.iwate.jp/'},
 forest:{url:'https://www.sukima.com/88_kouchi01/03rail28.jpg',source:'https://www.sukima.com/88_kouchi01/03rail.html'}
});
// Fixed first-day story destinations retain their IDs and original scenes.
const STAGED=Object.freeze([
 ['entrance','家','kirihama',987,573,'residential','home','日常','目前的住所'],
 ['school','桐音高中','kirihama',1038,475,'school','school','日常','今天还要交作业'],
 ['convenience','街角便利店','kirihama',1154,564,'shop','convenience','日常','通宵营业街区'],
 ['cafe','林道咖啡厅','kirihama',921,663,'cafe','cafe','日常','附近的兼职地点'],
 ['mall','湾岸购物城','kirihama',1197,665,'mall','mall','日常','大型商业综合体'],
 ['park','青柳公园','kirihama',1053,697,'park','park','日常','居民散步的公园'],
 ['hospital','市立总医院','kirihama',1127,755,'hospital','hospital','未开放','综合医疗设施'],
 ['station','中央总站','kirihama',1094,581,'station','station','未开放','城市铁路枢纽'],
 ['police','霧浜警察署','kirihama',992,737,'street','police','未开放','辖区警署']
]);
const CATEGORY_HINT=Object.freeze({
 home:'住宅区',school:'校园',convenience:'便利店',cafe:'咖啡馆',mall:'商场',park:'公园',
 hospital:'医院',station:'铁路枢纽',police:'公共设施',rumor:'传闻调查',landmark:'地标',
 rural:'乡村',mountain:'山地',coast:'海岸',port:'港口',town:'城镇',factory:'工业',
 island:'离岛',shrine:'神社',tunnel:'隧道',forest:'林道',lake:'水库'
});
// Each city has authored landmark inventories; coordinates are stable
// deterministic layouts around the real fictional settlement centers.
const LANDMARK_GROUPS=Object.freeze({
 kirihama:[
 ['中央站东口','station','station'],['都心地下街','rumor','street'],['霞桥高架','rumor','bridge'],
 ['市民图书馆','landmark','school'],['中央大学','school','school'],['西区旧医院','rumor','hospital'],
 ['晨雾公寓','rumor','residential'],['湾岸电影院','landmark','mall'],['灯下电话亭','rumor','street'],
 ['梧桐商业街','landmark','street'],['北环铁路桥','rumor','bridge'],['西仓库列车库','rumor','factory'],
 ['花町夜间诊所','hospital','hospital'],['香澄河堤','park','park'],['新区音乐厅','landmark','mall'],
 ['地下调蓄池入口','rumor','tunnel'],['榛木神社','shrine','shrine'],['郊外巴士总站','station','station'],
 ['旧书店二楼','rumor','cafe'],['水门公园','park','park'],['铁路资料馆','landmark','station']
 ],
 kirihara:[
 ['旧街商店街','town','street'],['桐原师范学院','school','school'],['西街旧剧场','rumor','street'],
 ['枫叶住宅坡','home','residential'],['旧市民病院','rumor','hospital'],['赤砖铁桥','rumor','bridge'],
 ['市立美术馆','landmark','mall'],['松阴坂隧道','tunnel','tunnel'],['旧城高中','school','school'],
 ['朝市广场','town','street'],['桐原河堤','park','park'],['未完成地下通道','rumor','darktunnel']
 ],
 homori:[
 ['穗森大平田','rural','rice'],['东稻原村','rural','rice'],['青苗农渠','rumor','rice'],
 ['霞稻神社','shrine','shrine'],['田间无人站台','rumor','ruraltrain'],['平田农机棚','rumor','ruraltrain'],
 ['白穗乡道','rumor','rice'],['北部道之驿','town','village'],['废弃米仓','rumor','oldvillage'],
 ['村祭会场','landmark','village'],['穗森农贸市集','town','rice'],['旧小学讲堂','rumor','schoolruin']
 ],
 shiomi:[
 ['港湾国际码头','port','harbor'],['东海物流城','factory','factory'],['海滨电车总站','station','station'],
 ['汐凪海雾仓库','rumor','factory'],['中央货运站','station','station'],['旧冷藏库','rumor','factory'],
 ['临海医院','hospital','hospital'],['港桥高架','rumor','bridge'],['工业岛栈桥','port','harbor'],
 ['码头夜班食堂','cafe','cafe'],['第二海底隧道','tunnel','tunnel'],['海洋研究中心','landmark','factory']
 ],
 minamioka:[
 ['南丘工业园','factory','factory'],['西物流高速口','landmark','bridge'],['旧铸造厂','rumor','factory'],
 ['青叶住宅城','home','residential'],['环南医院','hospital','hospital'],['南丘夜市','landmark','street'],
 ['废热电厂','rumor','factory'],['河口雨水泵站','rumor','tunnel'],['旧教堂路口','rumor','street'],
 ['南丘巴士中心','station','station']
 ],
 misaki:[
 ['岬崎渔港','port','fishing'],['古海街道','town','village'],['白灯塔','rumor','coast'],
 ['第七海蚀洞','rumor','coast'],['岬崎民宿203室','rumor','village'],
 ['海滨废酒店','rumor','oldvillage'],['悬崖公路','rumor','coast'],
 ['东隧道口','tunnel','tunnel'],['海角神社','shrine','shrine'],['最后巴士站','rumor','station']
 ],
 okuzawa:[
 ['奥沢温泉街','town','onsen'],['月影水库管理所','lake','lake'],['旧水没村','rumor','oldvillage'],
 ['疗养院旧馆','rumor','schoolruin'],['深山温泉旅馆','rumor','onsen'],['山腰神社','shrine','shrine'],
 ['环湖步道','forest','forest'],['水位观测站','rumor','lake'],['崩塌的旧县道','rumor','tunnel'],
 ['奥沢索道废站','rumor','forest']
 ],
 naruba:[
 ['鸣羽山脊','mountain','mountain'],['赤杉林道','forest','forest'],['无名旧隧道','tunnel','darktunnel'],
 ['废村雾谷','rumor','oldvillage'],['铃鸣野营地','forest','forest'],['三十三弯公路','rumor','tunnel'],
 ['山间巴士回转场','station','station'],['旧护林站','rumor','oldvillage'],
 ['森林广播塔','rumor','forest'],['山神社遗址','shrine','shrine']
 ],
 mizuho:[
 ['月影湖畔','lake','lake'],['水穗梯田','rural','rice'],['旧水电站','rumor','factory'],
 ['北湖铁路桥','rumor','bridge'],['水穗小学旧址','rumor','schoolruin'],['湖滨民宿','town','village'],
 ['水库旧环路','rumor','tunnel'],['河谷温泉','town','onsen']
 ],
 urasima:[
 ['浦岛渡船码头','port','harbor'],['无人岛礁滩','rumor','island'],['浦岛小学','school','school'],
 ['离岛神社','shrine','shrine'],['岛西采石场','rumor','oldvillage'],
 ['离岛灯塔','rumor','coast'],['旧海蚀洞','rumor','coast']
 ]
});
const POIS=[];
for(const item of STAGED){
 const [id,name,city,x,y,photo,kind,status,desc]=item;
 POIS.push(Object.freeze({id,name,city,x,y,photo,kind,status,desc,
  staged:status==='日常'||id==='hospital'||id==='station'||id==='police'}));
}
for(const c of CITIES){
 // Kirihama's exact 120-site plan supersedes its old random radial pins.
 // Other cities still use the legacy provisional landmark layout.
 if(c.id==='kirihama'&&global.PaperWorldKirihamaLocationPlan?.sites?.length===120)continue;
 const entries=LANDMARK_GROUPS[c.id]||[];
 for(let i=0;i<entries.length;i++){
  const [name,kind,photo]=entries[i];
  const angle=((i*137.508+12)*Math.PI)/180;
  const r=39+Math.sqrt(i/(entries.length||1))*c.radius*.7;
  const x=Math.round(c.x+Math.cos(angle)*r);
  const y=Math.round(c.y+Math.sin(angle)*r*.64);
  POIS.push(Object.freeze({id:c.id+'-'+String(i+1).padStart(2,'0'),name,city:c.id,
    x,y,photo,kind,status:'规划',desc:CATEGORY_HINT[kind]||'城市地点',
    staged:false}));
 }
}
// District-authored positions; these DO NOT mean 120 playable scene files.
 // The metro's 36x26 dot lattice remains the EDITOR SCHEMATIC, while each
 // location is pinned in a separate metric street-level coordinate plane.
 const KIRIHAMA_CITY_PLAN=global.PaperWorldKirihamaLocationPlan||null;
 if(KIRIHAMA_CITY_PLAN?.sites?.length===120){
  const legacyStage=new Map(POIS.filter(p=>p.city==='kirihama').map(p=>[p.id,p]));
  const districtById=new Map(KIRIHAMA_CITY_PLAN.districts.map(d=>[d.id,d]));
  const photos={central:'street',westold:'street',campus:'school',
   eastcommerce:'mall',residential:'residential',river:'park',
   baynew:'harbor',harbor:'harbor',medical:'hospital',
   industrial:'factory',northhill:'forest',southsuburb:'rice',
   nightlife:'street',culture:'mall',underground:'darktunnel'};
  const kinds={westold:'town',campus:'school',eastcommerce:'landmark',
   residential:'home',river:'park',baynew:'landmark',harbor:'port',
   medical:'hospital',industrial:'factory',northhill:'forest',
   southsuburb:'rural',nightlife:'landmark',culture:'landmark',
   underground:'rumor',central:'landmark'};
  const projected=KIRIHAMA_CITY_PLAN.sites.map(site=>{
   const original=legacyStage.get(site.id);
   const n=site.id.startsWith('kirihama-')?Number(site.id.split('-')[1])-1:-1;
   const oldInfo=Number.isInteger(n)&&n>=0?LANDMARK_GROUPS.kirihama[n]:null;
   const city=CITY_BY_ID.kirihama;
   const gx=site.localPosition.eastM/900,gy=site.localPosition.southM/900;
   const x=Math.round(city.x+(gx-18)*16),y=Math.round(city.y+(gy-13)*16);
   const kind=original?.kind||oldInfo?.[1]||kinds[site.districtId]||'landmark';
   const photo=original?.photo||oldInfo?.[2]||photos[site.districtId]||'street';
   if(!PHOTOS[photo])throw Error('Unknown authored photo category '+site.id);
   if(site.status==='日常'&&!original?.staged)
    throw Error('Do not silently open a planned site '+site.id);
   const district=districtById.get(site.districtId);
   if(!district)throw Error('Missing city district '+site.id);
   return Object.freeze({id:site.id,name:site.name,city:'kirihama',
    x,y,kind,photo,status:site.status,
    staged:site.status==='日常'||site.status==='未开放',
    desc:district.name+' · '+(CATEGORY_HINT[kind]||'地点'),
    districtId:site.districtId,metroStationId:site.metroStationId,
    metroLocal:Object.freeze({...site.localPosition}),
    walkingEstimateM:site.walking.distanceM,
    storyReady:site.status==='日常'});
  });
  if(new Set(projected.map(p=>p.id)).size!==120)
   throw Error('Kirihama plan must have 120 unique stable site IDs');
  POIS.splice(0,POIS.length,...projected,...POIS.filter(p=>p.city!=='kirihama'));
 }
const POI_BY_ID=Object.freeze(Object.fromEntries(POIS.map(p=>[p.id,p])));
const SITES=Object.freeze(POIS.filter(p=>p.kind==='rumor').map((p,i)=>Object.freeze({
 id:'case-'+String(i+1).padStart(3,'0'),name:'《'+p.name+'》',place:p.id,
 theme:p.kind,stage:'传闻收集',trigger:i%3===0?'雨夜':'夜间',status:'规划'})));

// Each link is a distinct physically credible mode and route. No subway
// teleports across mountain ranges. Express rail may cross city limits.
const HUBS=Object.freeze(CITIES.map(c=>Object.freeze({id:'hub-'+c.id,name:c.name+'站',
 city:c.id,x:c.x,y:c.y})));
const LINKS=Object.freeze([
 {id:'jr-bay',name:'湾岸本线',mode:'regional',color:'#e0a77b',stops:['kirihara','kirihama','shiomi','misaki']},
 {id:'jr-north',name:'北野城际线',mode:'regional',color:'#c99cae',stops:['kirihama','homori']},
 {id:'jr-west',name:'山麓地方铁路',mode:'localrail',color:'#a8bb91',stops:['naruba','kirihara','kirihama','minamioka','mizuho']},
 {id:'jr-west-valley',name:'奥沢山谷支线',mode:'localrail',color:'#92b3ab',stops:['kirihara','okuzawa','mizuho']},
 {id:'jr-south',name:'南丘联络线',mode:'regional',color:'#b8a1d2',stops:['kirihama','minamioka','shiomi']},
 {id:'express-north',name:'北环高速巴士',mode:'coach',color:'#849cac',stops:['kirihama','homori','naruba']},
 {id:'express-west',name:'深山高速巴士',mode:'coach',color:'#809ca8',stops:['kirihama','kirihara','okuzawa']},
 {id:'road-forest',name:'林道乡村巴士',mode:'bus',color:'#8a9c80',stops:['naruba','okuzawa','mizuho']},
 {id:'road-coast',name:'半岛海岸巴士',mode:'bus',color:'#9fa786',stops:['shiomi','misaki']},
 {id:'highway-west',name:'西湾高速公路',mode:'highway',color:'#71828b',stops:['kirihara','kirihama','shiomi']},
 {id:'highway-east',name:'北陆高速公路',mode:'highway',color:'#71828b',stops:['naruba','homori','shiomi']},
 {id:'highway-south',name:'南峡高速公路',mode:'highway',color:'#71828b',stops:['okuzawa','mizuho','minamioka','misaki']},
 {id:'ferry-urasima',name:'浦岛定期渡轮',mode:'ferry',color:'#73a9bc',stops:['shiomi','urasima']},
 {id:'ferry-peninsula',name:'海湾客船',mode:'ferry',color:'#87afbc',stops:['misaki','urasima']}
].map(l=>Object.freeze({...l,stops:Object.freeze(l.stops)})));
// Regional stops (the city hubs) are real and reachable; intra-city metro
// is separate from these services and only appears in that city's zoom.
const SERVICE_LABELS=Object.freeze({
 metro:'市内地铁',regional:'城际铁路',localrail:'地方铁路',
 coach:'高速巴士',bus:'地方巴士',highway:'高速公路',ferry:'渡轮'
});
const COST_PER=Object.freeze({regional:2.1,localrail:3.2,coach:3.1,bus:5.5,highway:2.4,ferry:6.5});
function connections(from){
 const result=[];
 for(const l of LINKS){
  for(let i=0;i<l.stops.length-1;i++){
   const a=l.stops[i],b=l.stops[i+1];
   if(a===from)result.push({to:b,line:l,minutes:Math.round(Math.hypot(
     CITY_BY_ID[b].x-CITY_BY_ID[a].x,CITY_BY_ID[b].y-CITY_BY_ID[a].y)*
     COST_PER[l.mode]/12)+4});
   if(b===from)result.push({to:a,line:l,minutes:Math.round(Math.hypot(
     CITY_BY_ID[b].x-CITY_BY_ID[a].x,CITY_BY_ID[b].y-CITY_BY_ID[a].y)*
     COST_PER[l.mode]/12)+4});
  }
 }
 return result;
}
function route(from,to,prefer='rail'){
 if(!CITY_BY_ID[from]||!CITY_BY_ID[to])return null;
 if(from===to)return {from,to,minutes:0,legs:[],transfers:0};
 const q=[{at:from,cost:0,legs:[]}],best=new Map();
 while(q.length){
  q.sort((a,b)=>a.cost-b.cost);
  const x=q.shift();
  if(best.has(x.at)&&best.get(x.at)<=x.cost)continue;
  best.set(x.at,x.cost);
  if(x.at===to)return {from,to,minutes:Math.round(x.cost),legs:x.legs,
   transfers:Math.max(0,x.legs.length-1)};
  for(const edge of connections(x.at)){
   if(edge.line.mode==='highway'&&prefer!=='road')continue;
   const penalty=(x.legs.length&&x.legs.at(-1).line.id!==edge.line.id)?9:0;
   q.push({at:edge.to,cost:x.cost+edge.minutes+penalty,
     legs:[...x.legs,{from:x.at,to:edge.to,line:edge.line,minutes:edge.minutes}]});
  }
 }
 return null;
}
const METROS=Object.freeze([
 {id:'m1',name:'霧浜南北线',city:'kirihama',color:'#e7829a',shape:'vertical',dx:-64},
 {id:'m2',name:'霧浜东西线',city:'kirihama',color:'#8dbce0',shape:'horizontal',dy:-32},
 {id:'m3',name:'湾岸新都心线',city:'kirihama',color:'#b3ad78',shape:'horizontal',dy:58},
 {id:'m4',name:'环都心线',city:'kirihama',color:'#a89bc7',shape:'ring',radius:142},
 {id:'m5',name:'学园线',city:'kirihama',color:'#96bcad',shape:'diagonal',dx:90},
 {id:'m6',name:'旧城横贯线',city:'kirihara',color:'#c89aa0',shape:'horizontal',dy:4},
 {id:'m7',name:'桐原环线',city:'kirihara',color:'#8ca8c8',shape:'ring',radius:67},
 {id:'m8',name:'汐凪港湾线',city:'shiomi',color:'#8fbab8',shape:'horizontal',dy:5},
 {id:'m9',name:'南丘轻轨',city:'minamioka',color:'#bda7b9',shape:'horizontal',dy:2}
]);
function metroCoords(l){
 const c=CITY_BY_ID[l.city],r=l.radius||Math.min(c.radius*.74,170);
 if(l.shape==='ring'){
  const arr=[];
  for(let i=0;i<12;i++){
   const theta=(i/12)*Math.PI*2-Math.PI/2;
   arr.push({x:Math.round(c.x+Math.cos(theta)*r),
     y:Math.round(c.y+Math.sin(theta)*r*.78)});
  }
  return arr;
 }
 const arr=[];
 for(let i=0;i<13;i++){
  const t=i/12*2-1;
  if(l.shape==='vertical')arr.push({x:Math.round(c.x+(l.dx||0)+Math.sin(t*Math.PI)*13),
    y:Math.round(c.y+t*r)});
  if(l.shape==='horizontal')arr.push({x:Math.round(c.x+t*r),
    y:Math.round(c.y+(l.dy||0)+Math.sin(t*Math.PI)*9)});
  if(l.shape==='diagonal')arr.push({x:Math.round(c.x+t*r),
    y:Math.round(c.y-t*r*.65+(l.dx||0)*.1)});
 }
 return arr;
}
const METRO_LINES=Object.freeze(METROS.map(l=>{
 const coords=metroCoords(l);
 return Object.freeze({...l,coords:Object.freeze(coords),
  stopIds:Object.freeze(coords.map((_,i)=>l.id+'-'+String(i+1).padStart(2,'0')))});
}));
const METRO_STOPS=Object.freeze(METRO_LINES.flatMap(l=>l.coords.map((p,i)=>Object.freeze({
 id:l.stopIds[i],name:l.name.replace('线','')+(i+1)+'站',
 city:l.city,line:l.id,x:p.x,y:p.y}))));
// Canonical local transportation: every named stop is a real POI; no
// autogenerated "line 01" ghost stations. Metropolitan districts use metro
// or trams, hill towns and island settlements use grounded buses/footpaths.
const MUNICIPAL_ROUTES=Object.freeze([
 ['kirihara','桐原旧城线','metro','#c89aa0',[0,1,6,9,11]],
 ['kirihara','桐原学园环线','metro','#8ca8c8',[2,8,4,10]],
 ['shiomi','汐凪港湾线','metro','#8fbab8',[0,2,4,9,11]],
 ['shiomi','临海电车','tram','#a8aecb',[3,5,6,8]],
 ['minamioka','南丘轻轨','tram','#bda7b9',[0,3,5,9]],
 ['homori','穗森田园巴士','bus','#92bca0',[0,1,7,10]],
 ['misaki','岬崎海岸巴士','bus','#9fb9a1',[0,1,6,9]],
 ['okuzawa','奥沢山谷巴士','bus','#a8b8a1',[0,1,4,7]],
 ['naruba','鸣羽山林巴士','bus','#a9b8a2',[0,1,4,6]],
 ['mizuho','水穗湖畔巴士','bus','#95b4be',[0,1,5,7]],
 ['urasima','浦岛离岛小巴','bus','#93b7b4',[0,2,3,5]]
]);
const LOCAL_TRANSIT_LINES=Object.freeze(MUNICIPAL_ROUTES.map(([city,name,mode,color,indices],i)=>{
 const stops=indices.map(n=>POIS.find(p=>p.id===city+'-'+String(n+1).padStart(2,'0')))
  .filter(Boolean);
 return Object.freeze({
  id:'city-'+String(i+1).padStart(2,'0'),city,name,mode,color,
  stops:Object.freeze(stops.map(p=>p.id)),
  coords:Object.freeze(stops.map(p=>Object.freeze({x:p.x,y:p.y})))
 });
}));
const LOCAL_TRANSIT_STOPS=Object.freeze(LOCAL_TRANSIT_LINES.flatMap(line=>line.stops
 .map(id=>Object.freeze({id,line:line.id,city:line.city,
  name:POI_BY_ID[id].name,x:POI_BY_ID[id].x,y:POI_BY_ID[id].y,mode:line.mode}))));
global.PaperWorldAtlas=Object.freeze({
 SIZE,CITIES,CITY_BY_ID,AREAS,POIS,POI_BY_ID,PHOTOS,SITES,KIRIHAMA_CITY_PLAN,HUBS,LINKS,
 METRO_LINES,METRO_STOPS,LOCAL_TRANSIT_LINES,LOCAL_TRANSIT_STOPS,SERVICE_LABELS,connections,route
});
})(window);
