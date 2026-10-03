import {CITY_DISTRICTS} from '../world/CityLayout.mjs';

// Each neighbour belongs to a place, rather than being a random crowd label.
const NEIGHBOURS=[
  ['林小满|学生|今天的天文社还亮着灯，钟楼上面正好能看见月亮。','沈言|代课老师|沿着学园街往东走，过了榆树骑楼就是晨星集市。','周芽|学生|我和朋友约在校门边，听到钟声我们就一起回家。','叶青|图书管理员|学园图书室的窗台摆了新盆栽，值班老师总是忘记浇水。','顾晴|音乐社学生|排练室在学校西侧，路过时也许能听见练琴。','许安|保安|环城公交会经过校门口，站牌在前面暖黄色的路灯下。'],
  ['秦阿婆|老街居民|这排骑楼比我年纪还大，下雨的时候廊下也不会淋湿。','唐木|木作匠人|榆树巷的老招牌都是手写的，木头晒久了就有这个颜色。','苏荷|茶馆店主|茶馆二楼的窗边，正对着巷口那棵榆树。','陆辰|邮递员|老城门牌有点绕，认着屋檐上的小风铃就不会错。','杜雨|归家居民|我小时候就在这条石板街上跳房子。','程文|修表匠|站在这里，能同时听到钟楼和中央车站的报时。'],
  ['何果|果摊摊主|晨星集市的橘子箱都刷成橙色，远远就能认出来。','陈茉|花店店主|晚上卖不完的花，我会摆到店门口陪路灯。','白禾|面包师|烤炉刚刚熄火，围裙上还是一股麦子的香味。','孙圆|采购居民|沿着彩色棚布走到头，就是集市北边的小广场。','赵新|蔬菜摊主|清晨这条街才热闹，现在大家正在慢慢收摊。','李棠|夜市摊主|夜市灯串一亮起来，纸棚下面就像藏了好多小星星。'],
  ['江映|影院检票员|影院门口的海报是手绘的，每周都会换一幅。','温岚|服装设计师|我最喜欢那间薄荷色的橱窗，纸裙子的折痕做得很好。','宋霁|百货职员|百货大楼侧门通向地铁，走廊里的灯整晚都亮着。','姚音|唱片爱好者|散场之后，我喜欢顺着这一排店铺慢慢走。','方宁|咖啡师|商业街的钟比学园钟楼快两分钟，大家都习惯了。','罗莉|下班店员|霓虹灯在雨后的路面上特别漂亮，像一条彩纸带。'],
  ['郝星|车站引导员|中央车站可以换乘公交和地铁，入口都有同一枚圆形标记。','邵远|通勤乘客|我每天从星灯住宅区过来，坐地铁比步行快得多。','钟晓|站务员|广场左边是公交站，楼梯向下就是月河线。','潘舟|旅行者|第一次到这座城市，我打算先去月河看看。','刘念|报刊亭店主|车站的大钟有四面，从哪个方向来都能看到时间。','郑和|夜班乘客|这趟车总有人带着花回家，看着就觉得今天还不错。'],
  ['纪云|建筑师|云端的楼顶做了很多退台，从河对岸看层次最清楚。','许蓝|办公职员|下班以后我常走到月河公园，让眼睛离屏幕远一点。','孟知|工程师|连廊里能望见中央车站，列车像在纸盒之间穿行。','池清|园艺工|写字楼门前的树，每一排都留了能透过月光的间距。','方墨|摄影师|玻璃幕墙会把晚霞折成几种颜色，我正在等那一瞬间。','卫乔|加班职员|最上面的那排灯还亮着，晚归的人总能认出自己的楼。'],
  ['文书|市立馆员|市立图书馆的圆窗里挂着星图，从广场上就能看见。','高庭|广场管理员|喷泉旁的长椅没有固定主人，谁累了都可以坐一会儿。','陶然|退休教师|这里的树影像书页上的插图，我每天都要来绕一圈。','季笙|学生|我喜欢市政厅台阶旁的小雕塑，看起来像折起来的鸟。','邹澄|市政职员|广场的路向东通到河边，沿着树阵走就能找到。','田宁|散步居民|广场上空开阔，月亮从哪座楼后面升起都看得清。'],
  ['柳岸|慢跑者|河边这一段风最舒服，过了步桥就能看到港口灯塔。','余川|观鸟者|安静一点，芦苇后面有时会停着白色的小水鸟。','吴悠|公园园丁|河岸的花分季节种，弯道那里总会有一片颜色。','林夕|散步居民|水面上的月亮被桥影切成了两半，很像剪纸。','周舟|桥梁巡护员|步桥的栏杆是波浪形的，小朋友总说它像一条鱼。','夏荫|写生学生|我在画对岸的楼，倒影反而比楼本身更有意思。'],
  ['海生|码头工人|仓库墙上的颜色是给船只认方向的，蓝色这排靠南。','蓝潮|灯塔看守|灯塔扫过来时，整条堤岸都会亮一下。','岳帆|轮船船员|城市里的钟声到了水面上，听起来会慢半拍。','金岚|海事职员|码头尽头有一面风向旗，今晚是从河口吹来的风。','沈湾|港口居民|我家窗台朝着灯塔，晚上不用开灯也认得出钥匙。','陈浪|货运司机|从南湾向东就是艺术街，仓库和画廊只隔了两个路口。'],
  ['颜纸|插画师|这条街的招牌没有两块相同，大家都自己画自己的。','陆弦|街头乐手|剧院散场的人经过时，脚步声也像在打节拍。','花织|剧场服装师|我们把旧幕布做成了店门口的旗子，风一吹就开演。','墨池|画廊策展人|画廊橱窗里那幅月亮，用了七层不同颜色的纸。','许戏|戏剧学生|屋顶的小面具是剧院标志，从公交上也能看见。','文曲|唱片店主|艺术街拐角那棵树下，经常有人聊到很晚。'],
  ['白榆|护士|医院花园里种的都是浅色花，夜里也能分清小路。','顾宁|医生|值完夜班，我会从河边绕一段路回家。','程暖|陪诊志愿者|入口在白色拱廊下面，旁边还有一座小小的休息庭院。','许晴|康复师|庭院的坡道很平缓，推着轮椅也能走遍花园。','何安|药房职员|药房窗边的小灯会留到很晚，路过的人看着安心。','杨予|探望家属|我带了束浅黄色的花，和这里的灯光很像。'],
  ['安禾|归家居民|沿着公寓楼前的灯串走，尽头就是我们的小庭院。','徐灯|电工|楼道里的灯都是暖色的，远远看过去像一排小窗格。','陈星|大学生|我每天搭月河线去上课，出站再走几步就到家。','叶米|带饭居民|厨房窗子还亮着，家里应该已经在等我吃晚饭。','黄榆|社区管理员|庭院那张长桌经常坐满人，邻居们总有聊不完的话。','卢月|夜归居民|这座城市这么长，最后看见自家窗灯的时候最踏实。'],
];
const VARIANTS=[
  [0,1,2,3,4,5],[6,7,8,9,10,11],[12,13,14,15,16,17],[18,19,20,21,22,23],
  [5,20,3,9,11,21],[19,20,7,16,23,18],[3,5,6,2,20,8],[4,23,16,15,7,2],
  [17,5,9,20,8,7],[23,10,19,13,4,11],[22,3,18,1,14,15],[8,7,2,12,5,21],
];
const OFFSETS=[-33,-18,-2,14,30,46],VISIBLE_DISTANCE=39;
export const CITY_RESIDENTS=Object.freeze(CITY_DISTRICTS.flatMap((district,d)=>NEIGHBOURS[d].map((entry,i)=>{
  const [name,role,line]=entry.split('|'),x=district.x+OFFSETS[i],range=3.7+(i%3)*1.2;
  return Object.freeze({id:`resident-${district.id}-${i+1}`,districtId:district.id,district:district.name,name,role,line,
    homeX:x,minX:Math.max(district.minX+2,x-range),maxX:Math.min(district.maxX-2,x+range),
    z:-.72-(i%3)*.32,height:1.56+(i%4)*.105,speed:.40+(i%4)*.09,pause:2.1+(i%3)*1.1,
    phase:(d*3+i)*2.93,variant:VARIANTS[d][i]});
})));

function walkingState(resident,time){
  const journey=(resident.maxX-resident.minX)/resident.speed,half=journey+resident.pause;
  const t=(time+resident.phase)%(half*2),outbound=t<half,leg=outbound?t:t-half,walking=leg<journey;
  return {x:outbound?resident.minX+Math.min(leg,journey)*resident.speed:resident.maxX-Math.min(leg,journey)*resident.speed,
    facing:outbound?1:-1,walking};
}

/** Original full-body paper dolls: one atlas, shared instanced geometry, no downloads. */
function createResidentAtlas(THREE){
  const width=2048,height=1024,cell=256;
  const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  if(canvas){canvas.width=width;canvas.height=height;}
  const atlas=canvas?.getContext('2d');
  if(atlas){
    const tile=document.createElement('canvas'),edge=document.createElement('canvas');tile.width=tile.height=edge.width=edge.height=cell;
    const c=tile.getContext('2d'),e=edge.getContext('2d');
    const coats=['#517c88','#bd8074','#748c6b','#ecd9b4','#8091ae','#576c82','#ba8870','#8c9d91','#bf907f','#688891','#c79364','#7f7f9c','#d7a267','#718f7c','#f0d5ad','#ad829b','#698f80','#628b9b','#bea68d','#b98377','#5e7085','#97aaa0','#d7e4d8','#9a84a1'];
    const hair=['#473d3a','#685042','#453e45','#a28261','#323d45','#795943'];
    const skin=['#efc4a0','#d9a580','#f4d1b2','#c68d68','#e7b88e','#ad7556'];
    function path(points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
    function poly(points,color,stroke='#635d58',weight=1.7){path(points);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=weight;c.stroke();}}
    function oval(x,y,rx,ry,color,stroke=null){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
    function line(points,color='#635d58',weight=1.5){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=weight;c.stroke();}
    for(let variant=0;variant<24;variant++){
      c.clearRect(0,0,cell,cell);c.lineJoin='round';c.lineCap='round';
      const coat=coats[variant],h=hair[variant%hair.length],s=skin[variant%skin.length],skirt=[2,8,13,19].includes(variant),longCoat=[3,6,18,22].includes(variant);
      const trouser=variant%3===0?'#4b5869':variant%3===1?'#74736e':'#786976';
      // The silhouette has shoulders, elbows, hands, two separate legs and shoes.
      if(variant%4===1||variant%5===3)poly([[103,44],[91,56],[89,105],[98,119],[161,117],[165,82],[156,46]],h);
      poly([[105,156],[127,158],[124,209],[116,236],[101,235],[106,210]],skirt?s:trouser);
      poly([[130,158],[150,156],[152,207],[157,234],[141,237],[133,211]],skirt?s:trouser);
      poly([[99,231],[116,230],[118,241],[92,243],[91,238]],'#4d505a');
      poly([[140,232],[156,230],[169,238],[168,243],[142,243]],'#4d505a');
      line([[94,240],[116,239]],'#d9d6c8',2);line([[144,240],[165,240]],'#d9d6c8',2);
      poly([[103,93],[88,101],[75,138],[81,151],[94,141],[106,118]],coat);
      poly([[148,94],[162,101],[178,132],[178,147],[164,148],[158,130],[146,114]],coat);
      oval(84,153,8,11,s,'#8f7464');oval(173,152,8,11,s,'#8f7464');
      poly([[105,90],[119,87],[139,88],[151,95],[156,139],[151,169],[104,169],[99,140]],coat);
      if(longCoat)poly([[100,133],[154,133],[164,196],[131,200],[127,170],[123,200],[92,195]],coat);
      if(skirt)poly([[105,143],[150,143],[169,189],[91,189]],variant%2?'#6a7485':'#657d7b');
      poly([[119,79],[138,79],[139,96],[128,103],[116,96]],s);
      // Tiny off-white folded collars and seams preserve the hand-cut look.
      poly([[108,93],[117,89],[128,101],[119,111]],'#f4e8d2');
      poly([[140,89],[150,96],[137,111],[128,101]],'#eee3cb');
      if([0,2,4,20].includes(variant))poly([[126,104],[131,104],[135,130],[129,139],[123,130]],variant===4?'#bc8b57':'#997185');
      line([[128,113],[128,longCoat?194:162]],'#6b716d',1.1);
      for(const y of [119,134,150])oval(132,y,1.9,1.9,'#eee0c0');
      line([[103,141],[116,142]],'#eee0c0',1.3);line([[140,142],[152,140]],'#eee0c0',1.3);
      // Slightly asymmetrical face and individual hairstyles, drawn as cut shapes.
      oval(102,66,7,10,s);oval(154,66,7,10,s);
      poly([[104,42],[119,32],[139,35],[153,49],[153,71],[145,85],[128,91],[111,83],[103,67]],s,'#97755e',1.5);
      if(variant%4===0)poly([[100,63],[99,42],[107,28],[120,24],[145,29],[159,43],[155,62],[145,47],[137,41],[131,49],[118,42],[107,49],[107,63]],h);
      if(variant%4===1){poly([[98,75],[96,46],[105,31],[130,24],[150,35],[161,57],[157,93],[147,87],[148,49],[132,41],[118,48],[106,56],[107,82]],h);oval(157,44,12,13,h);}
      if(variant%4===2)poly([[101,60],[99,44],[111,30],[127,27],[147,32],[159,47],[157,62],[143,53],[145,43],[134,52],[122,48],[108,58]],h);
      if(variant%4===3){poly([[98,63],[94,46],[104,32],[120,27],[140,27],[157,42],[161,66],[151,62],[145,47],[133,43],[112,50],[106,70]],h);oval(99,47,11,12,h);oval(150,32,10,9,h);}
      oval(117,65,2.4,3.2,'#49454a');oval(139,65,2.4,3.2,'#49454a');
      line([[127,65],[126,73],[131,73]],'#bc8a6c',1.2);line([[122,79],[128,81],[135,78]],'#946c61',1.5);
      oval(112,75,4.7,2.1,'rgba(195,115,105,.28)');oval(143,75,4.7,2.1,'rgba(195,115,105,.28)');
      if([1,3,6,11,20].includes(variant)){
        for(const x of [117,140]){c.strokeStyle='#655e62';c.lineWidth=2;c.strokeRect(x-8,59,16,12);}line([[125,64],[132,64]],'#655e62',2);
      }
      if([5,9,17].includes(variant)){
        poly([[99,38],[105,22],[147,22],[156,39]],variant===17?'#d3ac69':'#5a7e87');
        poly([[93,39],[159,37],[168,43],[96,47]],variant===17?'#dabf84':'#7e9b9b');
        poly([[119,29],[136,29],[136,35],[119,35]],'#e5d8ae',null);
      }
      if([12,14,16].includes(variant)){
        poly([[112,108],[145,108],[148,170],[107,172]],'#e8d8af');line([[116,109],[111,94]],'#eee2c0',4);line([[142,109],[147,95]],'#eee2c0',4);
        poly([[118,132],[137,132],[137,146],[118,146]],variant===16?'#8ca780':'#bd9380');
      }
      if(variant===22){poly([[109,40],[110,26],[146,26],[148,40]],'#eee9d7');poly([[125,29],[131,29],[131,36],[125,36]],'#88a49a',null);line([[122,33],[134,33]],'#88a49a',3);}
      if([0,2,4].includes(variant)){
        line([[105,95],[91,113],[94,158]],'#505b65',6);poly([[71,118],[95,119],[100,157],[75,158]],'#b89769');line([[78,125],[94,126]],'#edcf95',2);
      }else if([7,18,20,21].includes(variant)){
        line([[173,157],[174,170]],'#706354',3);poly([[159,169],[186,169],[189,194],[157,194]],variant===7?'#a37d58':'#786c63');line([[161,175],[184,175]],'#c6ae8a',2);
      }else if([8,13,15].includes(variant)){
        line([[172,155],[165,172]],'#c3a16d',4);poly([[151,167],[180,172],[175,205],[149,199]],'#d3b18a');
        if(variant===13){line([[162,170],[163,139]],'#738e64',3);oval(160,136,9,8,'#c7939f');oval(170,142,7,7,'#e3b884');}
      }else if([10,23].includes(variant)){
        poly([[76,143],[93,139],[104,175],[85,182]],variant===23?'#dbbd88':'#a78369');line([[81,153],[96,149]],'#e8d2a8',2);
      }
      // Printed highlight strokes stay inside the ink. One shared alpha silhouette
      // is then offset to create the visible warm-white cut edge all around it.
      line([[107,116],[105,133]],'rgba(255,245,213,.46)',2);line([[145,116],[149,132]],'rgba(255,245,213,.34)',2);
      e.clearRect(0,0,cell,cell);e.drawImage(tile,0,0);e.globalCompositeOperation='source-in';e.fillStyle='#fff1d4';e.fillRect(0,0,cell,cell);e.globalCompositeOperation='source-over';
      const x=(variant%8)*cell,y=Math.floor(variant/8)*cell;
      for(const [dx,dy] of [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2]])atlas.drawImage(edge,x+dx,y+dy);
      atlas.drawImage(tile,x,y);
    }
  }
  const texture=canvas?new THREE.CanvasTexture(canvas):new THREE.Texture({width,height});
  texture.name='Twenty-four hand-cut city neighbours';texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
  return texture;
}

export function createCityPopulation({THREE,scene,flags={}}){
  const group=new THREE.Group();group.name='City neighbours';scene.add(group);
  const texture=createResidentAtlas(THREE),capacity=CITY_RESIDENTS.length;
  const geometry=new THREE.PlaneGeometry(1,1,4,12);geometry.translate(0,.5,0);
  const tiles=new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2);
  const gait=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);
  geometry.setAttribute('residentTile',tiles);
  geometry.setAttribute('residentGait',gait);
  const material=new THREE.MeshLambertMaterial({map:texture,alphaTest:.14,side:THREE.DoubleSide,
    forceSinglePass:true,color:0xffffff,emissive:0x74889c,emissiveIntensity:.12,depthWrite:true});
  function atlasShader(shader){
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 residentTile;\nattribute float residentGait;\nvarying vec2 vResidentTile;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vResidentTile=residentTile;
        float legWeight=1.0-smoothstep(.06,.35,position.y);
        transformed.x+=residentGait*legWeight*sign(position.x)*.018;
        transformed.y+=max(0.0,residentGait*sign(position.x))*legWeight*.018;
      `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vResidentTile;')
      .replace('#include <map_fragment>',`#ifdef USE_MAP
        vec2 residentUV=vResidentTile+vec2(vMapUv.x/8.0,vMapUv.y/4.0);
        vec4 sampledDiffuseColor=texture2D(map,residentUV);
        diffuseColor*=sampledDiffuseColor;
      #endif`);
  }
  material.onBeforeCompile=atlasShader;material.customProgramCacheKey=()=> 'city-neighbour-atlas-v1';
  const people=new THREE.InstancedMesh(geometry,material,capacity);people.name='Illustrated paper neighbours';
  people.instanceMatrix.setUsage(THREE.DynamicDrawUsage);people.frustumCulled=false;people.receiveShadow=true;
  // Their own small contact shadows move with their feet. They are excluded
  // from the expensive static city volumetric shadow cache.
  people.castShadow=false;people.userData.volumeShadow=false;group.add(people);
  const shadowGeometry=new THREE.PlaneGeometry(1,1);
  const shadowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv;void main(){float r=length((vUv-.5)*2.0);float a=pow(max(0.0,1.0-r),1.5)*.24;gl_FragColor=vec4(.19,.17,.21,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const shadows=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,capacity);shadows.name='Neighbour sole shadows';
  shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);shadows.frustumCulled=false;shadows.userData.volumeShadow=false;group.add(shadows);
  const transform=new THREE.Object3D();let clock=0,lastPlayerX=NaN,visible=[],previousSignature='';
  function update(dt,playerX=0){
    const elapsed=Number.isFinite(dt)&&dt>0?dt:0;
    if(!Number.isFinite(playerX))playerX=Number.isFinite(lastPlayerX)?lastPlayerX:0;
    if(!elapsed&&playerX===lastPlayerX)return false;
    clock+=elapsed;lastPlayerX=playerX;
    const next=[];
    for(const resident of CITY_RESIDENTS){
      if(Math.abs(resident.homeX-playerX)>VISIBLE_DISTANCE+8)continue;
      const motion=walkingState(resident,clock);
      if(Math.abs(motion.x-playerX)>VISIBLE_DISTANCE)continue;
      next.push({resident,...motion});
    }
    const signature=next.map(n=>`${n.resident.id}:${n.x.toFixed(6)}:${n.walking}`).join('|');
    const changed=signature!==previousSignature;previousSignature=signature;visible=next;
    if(!changed)return false;
    for(const [slot,n] of next.entries()){
      const r=n.resident,step=n.walking?Math.sin((clock+r.phase)*7.3):0;
      const bob=n.walking?Math.abs(step)*.022:0;
      // The drawn sole sits at 244/256. Correct the card's small bottom margin.
      transform.position.set(n.x,.5-r.height*(12/256)+bob,r.z);
      transform.rotation.set(0,n.facing*.12,step*.018);
      transform.scale.set(r.height*.94,r.height,1);transform.updateMatrix();people.setMatrixAt(slot,transform.matrix);
      tiles.setXY(slot,(r.variant%8)/8,(3-Math.floor(r.variant/8))/4);
      gait.setX(slot,step);
      transform.position.set(n.x,.510,r.z+.04);transform.rotation.set(-Math.PI/2,0,0);
      transform.scale.set(r.height*.48,.36,1);transform.updateMatrix();shadows.setMatrixAt(slot,transform.matrix);
    }
    people.count=shadows.count=next.length;people.visible=shadows.visible=next.length>0;
    people.instanceMatrix.needsUpdate=shadows.instanceMatrix.needsUpdate=tiles.needsUpdate=gait.needsUpdate=true;
    flags.render=flags.depth=flags.ao=true;
    return true;
  }
  update(0,0);
  return {group,update,
    nearby(playerX){
      if(!Number.isFinite(playerX))return null;
      let nearest=null,distance=2.5;
      for(const resident of CITY_RESIDENTS){
        if(Math.abs(resident.homeX-playerX)>11)continue;
        const {x}=walkingState(resident,clock),d=Math.abs(x-playerX);
        if(d>distance)continue;
        distance=d;nearest={id:resident.id,name:resident.name,role:resident.role,line:resident.line,x,district:resident.district};
      }
      return nearest;
    },
    stats(){return {residents:capacity,districts:CITY_DISTRICTS.length,visible:visible.length,clock,
      atlasVariants:24,atlasWidth:2048,atlasHeight:1024,batches:2,visibleDistance:VISIBLE_DISTANCE,
      people:CITY_RESIDENTS.map(r=>({id:r.id,name:r.name,role:r.role,districtId:r.districtId,
        minX:r.minX,maxX:r.maxX,z:r.z,height:r.height,...walkingState(r,clock)}))};},
  };
}
