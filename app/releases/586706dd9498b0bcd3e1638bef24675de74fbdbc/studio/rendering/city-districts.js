import {CITY_DISTRICTS} from '../world/CityLayout.mjs';

const SHOP_NAMES=[
  ['学园街','白昼面包房','校门花店','学生公寓','榆树照相馆','晴空咖啡','晨报书亭','学园食堂'],
  ['榆树老城','榆树邮局','老街茶馆','时光修理铺','红砖旅店','巷口裁缝','老城书屋','胡同面馆'],
  ['晨星集市','晨星市场','四季鲜花','山野果蔬','奶油烘焙','月光夜市','海风鱼铺','香料杂货'],
  ['灯影商业街','星光百货','灯影电影院','银匙西餐','晴日服饰','白兔玩具','时针钟表','点心工房'],
  ['中央车站','纸城中央站','旅人书店','车站咖啡','远方旅馆','旅行用品','站前食堂','花束小铺'],
  ['云端商务区','云端中心','青玻事务所','城市设计社','工作日咖啡','时光银行','午间餐厅','新叶科技'],
  ['市民广场','市立图书馆','纸城市政厅','城市博物馆','市民会馆','广场花铺','公园茶室','阅览书屋'],
  ['月河公园','月河公园','河岸茶屋','白鹭游客站','桥头面包','观景书屋','种子花房','河畔小馆'],
  ['南湾港口','南湾码头','灯塔管理所','海风仓库','水手食堂','船舶事务所','港湾杂货','海盐咖啡'],
  ['彩纸艺术街','彩纸大剧院','月亮画廊','黑胶唱片行','手作工坊','纸间美术馆','排练工作室','彩虹小馆'],
  ['白榆医院区','白榆综合医院','平安药房','康复花园','白榆门诊','健康服务站','花间面包','绿叶眼镜'],
  ['星灯住宅区','星灯社区','星灯公寓','风铃洗衣店','晚归食堂','社区书屋','邻里便利店','小满花店'],
];
const PALETTES=[
  [0xdedbb8,0x518e83,0x86ac95],[0xce987d,0x785d72,0xb97b61],[0xefc68d,0x789673,0xdb9467],
  [0xe5bac2,0x686a96,0xc989ac],[0xd2d5c8,0x537e8a,0x8ca8aa],[0xccd4cc,0x547581,0x7d9eae],
  [0xd9cdbe,0x817b9e,0xa8a1b9],[0xe0d7b5,0x699477,0x92ab80],[0xc9d6ce,0x668d9a,0xb7a08a],
  [0xe4b6a8,0x985c76,0xbe8c86],[0xd5e1c9,0x729d89,0x9cb2a9],[0xe0c7a7,0x788f89,0xb9987e],
];

/** A single, shared printed sheet: original Chinese shop signs and drawn windows. */
function createDistrictAtlas(THREE){
  const width=2048,height=1024,regions={},labels=SHOP_NAMES.flat();
  const names=[...labels,...CITY_DISTRICTS.map(d=>d.name+' · '+String(d.index+1).padStart(2,'0')),'window','shop-window','arched-window','lattice'];
  const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  const mask=typeof document!=='undefined'?document.createElement('canvas'):null;
  if(canvas){canvas.width=mask.width=width;canvas.height=mask.height=height;}
  const ctx=canvas?.getContext('2d'),em=mask?.getContext('2d');
  if(ctx&&em){ctx.fillStyle='#fff2d5';ctx.fillRect(0,0,width,height);em.fillStyle='#000';em.fillRect(0,0,width,height);}
  names.forEach((name,index)=>{
    const x=index%8*256,y=Math.floor(index/8)*64;
    regions[index]={u0:(x+3)/width,u1:(x+253)/width,v0:1-(y+61)/height,v1:1-(y+3)/height};
    if(index>=108)regions[name]=regions[index];
    if(!ctx||!em)return;
    ctx.save();ctx.beginPath();ctx.rect(x+2,y+2,252,60);ctx.clip();
    const district=Math.min(11,Math.floor(index/8)),hex='#'+PALETTES[district][1].toString(16).padStart(6,'0');
    ctx.fillStyle=index>=108?'#394f63':hex;ctx.fillRect(x,y,256,64);
    ctx.strokeStyle='#fff0ca';ctx.lineWidth=2;ctx.strokeRect(x+7,y+7,242,50);
    if(index<108){
      ctx.font='600 '+(name.length>8?21:27)+'px "Microsoft YaHei","PingFang SC",sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff1c9';ctx.fillText(name,x+128,y+31,226);
      ctx.fillStyle='#b8c7ad';for(const sx of [13,242]){ctx.beginPath();ctx.arc(x+sx,y+32,2,0,Math.PI*2);ctx.fill();}
    }else{
      ctx.fillStyle='#dfc384';ctx.fillRect(x+15,y+8,226,48);
      const gradient=ctx.createLinearGradient(x,y,x,y+64);gradient.addColorStop(0,'#f9dda2');gradient.addColorStop(1,'#b5c0ad');
      ctx.fillStyle=gradient;ctx.fillRect(x+18,y+10,220,44);
      ctx.fillStyle='#586b72';for(const dx of [0,75,150,220])ctx.fillRect(x+18+dx,y+9,4,46);
      ctx.fillRect(x+18,y+31,224,3);
      if(name==='shop-window'){
        ctx.fillStyle='#aa815b';ctx.fillRect(x+20,y+44,215,4);
        for(let i=0;i<10;i++){ctx.fillStyle=['#da9f7c','#7f9f8c','#bb9398'][i%3];ctx.fillRect(x+26+i*20,y+35-i%3*4,13,9+i%3*4);}
        ctx.fillStyle='#f7e7bf';ctx.beginPath();ctx.moveTo(x+95,y+8);ctx.lineTo(x+110,y+21);ctx.lineTo(x+80,y+21);ctx.fill();
      }
      if(name==='arched-window'){ctx.fillStyle='#f2e4c2';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+128,y);ctx.quadraticCurveTo(x+10,y+2,x+15,y+48);ctx.lineTo(x,y+48);ctx.fill();}
      if(name==='lattice'){ctx.fillStyle='#f1dfbe';for(let i=0;i<5;i++)ctx.fillRect(x+30+i*43,y+8,3,48);}
      em.fillStyle='#a58755';em.fillRect(x+18,y+10,220,44);
    }
    // Small printed registration strokes make the signs read as cut paper.
    ctx.strokeStyle='rgba(255,249,224,.2)';ctx.lineWidth=.8;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x+12,y+12+i*19);ctx.lineTo(x+245,y+11+i*19);ctx.stroke();}
    ctx.restore();
  });
  if(ctx&&em){em.globalCompositeOperation='multiply';em.drawImage(canvas,0,0);em.globalCompositeOperation='source-over';}
  function texture(source,emissive){
    let result;
    if(ctx)result=new THREE.CanvasTexture(source);
    else {const pixels=new Uint8Array(width*height*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=emissive?0:240;pixels[i+1]=emissive?0:223;pixels[i+2]=emissive?0:189;pixels[i+3]=255;}result=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat);result.flipY=true;}
    result.colorSpace=THREE.SRGBColorSpace;result.minFilter=THREE.LinearMipmapLinearFilter;result.magFilter=THREE.LinearFilter;result.generateMipmaps=true;result.needsUpdate=true;
    result.name=emissive?'City district illuminated window ink':'City district Chinese signs and window paper';return result;
  }
  return {color:texture(canvas,false),emissive:texture(mask,true),regions,labels:names,bytes:width*height*8};
}

/** Twelve authored neighbourhoods, culled in whole paper districts as the player walks. */
export function createCityDistricts({THREE,scene,flags={}}){
  const group=new THREE.Group();group.name='Complete paper city neighbourhoods';scene.add(group);
  const atlas=createDistrictAtlas(THREE);
  const stock=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:THREE.FrontSide});
  stock.name='City district folded coloured paper';
  const printed=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,map:atlas.color,emissiveMap:atlas.emissive,emissive:0xffffff,emissiveIntensity:.68,side:THREE.FrontSide});
  printed.name='City district shared printed paper';
  const color=new THREE.Color(),districts=[],buildings=[],landmarks=[],features=[];
  let source,activeDistrict,totalTriangles=0,totalCards=0;
  const paper=0xffedcd,ink=0x42576a;
  const rectangle=(w,h)=>[[-w/2,0],[w/2,0],[w/2,h],[-w/2,h]];
  function tri(batch,a,b,c,hex=0xffffff,uv=[[0,0],[0,0],[0,0]]){
    const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],len=Math.hypot(...n)||1;
    color.setHex(hex);for(const [i,p] of [a,b,c].entries()){batch.p.push(...p);batch.n.push(...n.map(v=>v/len));batch.c.push(color.r,color.g,color.b);batch.uv.push(...uv[i]);}
  }
  function card(name,x,y,z,points,hex=paper,{depth=.085,region=null,angle=0}={}){
    const outline=points.map(p=>new THREE.Vector2(...p));if(THREE.ShapeUtils.isClockWise(outline))outline.reverse();
    const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),w=Math.max(...points.map(p=>p[0]))-minX,h=Math.max(...points.map(p=>p[1]))-minY;
    const transform=(p,d)=>[x+p.x*Math.cos(angle)+d*Math.sin(angle),y+p.y,z-p.x*Math.sin(angle)+d*Math.cos(angle)];
    const uv=p=>region?[region.u0+(p.x-minX)/w*(region.u1-region.u0),region.v0+(p.y-minY)/h*(region.v1-region.v0)]:[0,0];
    for(const face of THREE.ShapeUtils.triangulateShape(outline,[])){
      const [a,b,c]=face.map(i=>outline[i]);tri(source[region?1:0],transform(a,depth/2),transform(b,depth/2),transform(c,depth/2),region?0xffffff:hex,[uv(a),uv(b),uv(c)]);
      tri(source[0],transform(a,-depth/2),transform(c,-depth/2),transform(b,-depth/2),hex);
    }
    for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];tri(source[0],transform(a,depth/2),transform(a,-depth/2),transform(b,-depth/2),paper);tri(source[0],transform(a,depth/2),transform(b,-depth/2),transform(b,depth/2),paper);}
    totalCards++;return {name,x,y,z,width:w,height:h,depth};
  }
  const panel=(name,x,y,z,w,h,hex=paper,options={})=>card(name,x,y,z,rectangle(w,h),hex,options);
  const disk=(name,x,y,z,r,hex)=>card(name,x,y,z,Array.from({length:20},(_,i)=>[Math.cos(i*Math.PI/10)*r,Math.sin(i*Math.PI/10)*r]),hex,{depth:.055});
  function sign(name,x,y,z,w=4,h=.63,index=0){
    panel(name+' ivory backing',x,y-.035,z-.015,w+.14,h+.07);
    panel(name+' coloured sign stock',x,y,z+.035,w,h,PALETTES[activeDistrict.index][1],{depth:.045});
    // Lettering retains the printed sheet's aspect ratio even on a long fascia.
    // Stretching one tile across a station-wide board made Chinese glyphs squat.
    panel(name,x,y,z+.072,Math.min(w,h*250/58),h,paper,{depth:.025,region:atlas.regions[index]});
  }
  function awning(x,y,z,w,roof){
    for(let i=0;i<8;i++){
      const x0=x-w/2+i*w/8,x1=x0+w/8,hex=i%2?roof:paper;
      const a=[x0,y,z],b=[x1,y,z],c=[x1,y-.35,z+.75],d=[x0,y-.35,z+.75];
      tri(source[0],a,c,b,hex);tri(source[0],a,d,c,hex);tri(source[0],a,b,c,hex);tri(source[0],a,c,d,hex);
      card('Scalloped shop awning', (x0+x1)/2,y-.54,z+.75,[[-w/16,.2],[w/16,.2],[w/16,0],[0,-.065],[-w/16,0]],hex,{depth:.04});
    }
  }
  function roof(x,y,z,w,h,hex,kind=0){
    const outline=kind===1?[[-w/2,0],[w/2,0],[w/2,h*.4],[w*.29,h*.4],[w*.29,h],[-w*.29,h],[-w*.29,h*.4],[-w/2,h*.4]]:
      kind===2?[[-w/2,0],[w/2,0],[w*.33,h],[-w*.33,h]]:[[-w/2,0],[w/2,0],[0,h]];
    card('Roof cut silhouette',x,y-.05,z-.03,outline,paper,{depth:.14});card('Folded coloured roof',x,y,z+.05,outline,hex);
    if(kind!==1)card('Roof folded light facet',x,y,z+.10,kind===2?[[-w/2,0],[-w*.26,0],[-w*.33,h]]:[[-w/2,0],[0,h],[-w*.08,0]],PALETTES[activeDistrict.index][2],{depth:.025});
    panel('Deep projecting eave',x,y-.11,z+.11,w+.24,.15,hex,{depth:.19});
  }
  function window(x,y,z,w,h,kind='window'){
    panel('Window cut border',x,y-.05,z,w+.14,h+.12,paper,{depth:.11});
    panel('Printed glass and interior',x,y,z+.08,w,h,0xffffff,{depth:.035,region:atlas.regions[kind]});
    panel('Folded window sill',x,y-.08,z+.16,w+.24,.09,paper,{depth:.23});
  }
  function building(name,x,{w=7,h=4,z=-4.5,variant=0,label=1,roofType=0,roofHeight=.95,bodyColor=null,shop=true,signVisible=true}={}){
    const [body,roofColor]=PALETTES[activeDistrict.index],base=.5,wall=bodyColor??body;
    const record=panel(name,x,base,z,w,h,wall,{depth:.16});buildings.push({...record,districtId:activeDistrict.id,roofType,roofHeight});
    panel('Left folded wall return',x-w/2-.09,base,z-.23,.55,h,PALETTES[activeDistrict.index][2],{angle:.6});
    panel('Right folded wall return',x+w/2+.08,base,z-.26,.58,h,roofColor,{angle:-.55});
    for(const side of [-1,1])panel('Cream corner masonry',x+side*(w/2-.08),base,z+.14,.16,h,paper);
    panel('Layered baseboard',x,base,z+.17,w+.15,.25,PALETTES[activeDistrict.index][2],{depth:.15});
    roof(x,base+h-.02,z+.03,w+.35,roofHeight,roofColor,roofType);
    const cols=Math.max(2,Math.floor(w/2)),upperRows=Math.max(0,Math.floor((h-2.65)/1.55));
    for(let row=0;row<upperRows;row++)for(let col=0;col<cols;col++){
      window(x-w*.38+col*w*.76/(cols-1),base+2.7+row*1.55,z+.19,w/cols*.49,1.04,variant%3===1?'arched-window':'window');
    }
    if(shop){
      for(const side of [-1,1])window(x+side*w*.265,base+.33,z+.19,w*.29,1.5,'shop-window');
      panel('Shop entrance surround',x,base+.03,z+.23,w*.17,1.83,roofColor);
      panel('Glass shop door',x,base+.15,z+.3,w*.125,1.59,0xffffff,{region:atlas.regions.window,depth:.035});
      panel('Brass door pull',x+w*.038,base+.91,z+.36,.045,.26,0xd7bd7c);
      if(signVisible)sign(name,x,base+2.12,z+.26,Math.min(w-.5,6.2),.6,activeDistrict.index*8+label);
      if(variant%3!==2)awning(x,base+2.09,z+.24,w+.2,roofColor);
    }else{
      for(let col=0;col<cols;col++){
        const dx=-w*.38+col*w*.76/(cols-1);
        if(Math.abs(dx)>w*.13)window(x+dx,base+.6,z+.2,w/cols*.5,1.6);
      }
      const doorWidth=Math.min(2.3,w*.24);
      panel('Public entrance cream surround',x,base+.02,z+.23,doorWidth+.22,2.25,paper,{depth:.12});
      panel('Public entrance double glass doors',x,base+.10,z+.33,doorWidth,2.1,0xffffff,{region:atlas.regions.lattice,depth:.04});
      panel('Entrance centre mullion',x,base+.1,z+.4,.055,2.1,roofColor);
      for(const side of [-1,1])panel('Entrance brass handle',x+side*.15,base+.9,z+.43,.04,.33,0xcdb786);
      panel('Entrance folded step',x,base,z+.49,doorWidth+.44,.12,paper,{depth:.56});
      if(signVisible)sign(name,x,base+2.3,z+.28,Math.min(w-.8,6.5),.65,activeDistrict.index*8+label);
    }
    // Visible brick slips on the old town and port walls.
    if(activeDistrict.id==='oldtown'||activeDistrict.id==='harbor')for(let row=0;row<3;row++)for(const side of [-1,1])panel('Printed brick corner',x+side*(w/2-.28),base+.45+row*.48,z+.24,.35,.065,paper,{depth:.018});
    return record;
  }
  function tree(x,z=-3.1,scale=1,kind=0){
    panel('Tree folded trunk',x,.5,z,.24*scale,2*scale,0x988166,{depth:.13});
    for(const side of [-1,1])card('Tree branch',x,.5,z+.04,[[0,1.1*scale],[side*.8*scale,1.75*scale],[side*.74*scale,1.91*scale],[0,1.35*scale]],0x988166);
    const leaf=kind%2?0x91a875:0x729888;
    card('Scalloped paper foliage',x,.5+1.48*scale,z-.04,[[-1.1*scale,0],[-1.35*scale,.6*scale],[-.96*scale,1.3*scale],[-.4*scale,1.63*scale],[.15*scale,1.82*scale],[.85*scale,1.45*scale],[1.2*scale,.75*scale],[1.05*scale,.14*scale],[.2*scale,-.15*scale]],leaf,{depth:.11});
    card('Foliage fold',x,.5+1.48*scale,z+.045,[[.0,-.15*scale],[-.4*scale,1.63*scale],[.15*scale,1.82*scale],[.65*scale,.7*scale]],0xb0bd8c,{depth:.025});
    features.push({kind:'tree',districtId:activeDistrict.id,x,z});
  }
  function bench(x,z=-1.8){
    panel('Bench back',x,.92,z,1.85,.43,0xc4a27a,{depth:.12});panel('Bench folded seat',x,.85,z+.15,1.95,.12,paper,{depth:.48});
    for(const side of [-1,1])panel('Bench leg',x+side*.68,.5,z+.1,.12,.38,ink,{depth:.13});
    features.push({kind:'bench',districtId:activeDistrict.id,x,z});
  }
  function planter(x,z=-1.65){
    card('Paper planter',x,.5,z,[[-.65,0],[.65,0],[.78,.4],[-.78,.4]],0xc4a48b,{depth:.2});
    for(let i=0;i<5;i++){panel('Flower stem',x-.5+i*.25,.85,z,.025,.25,0x76946e);disk('Cut paper flower',x-.5+i*.25,1.1+(i%2)*.12,z+.02,.1,[0xe5b27d,0xc77f8e,0xffdfac][i%3]);}
  }
  function clock(x,y,z,r=.63){disk('Station clock rim',x,y,z,r,0xd5b67b);disk('Ivory clock dial',x,y,z+.06,r*.85,paper);panel('Clock hand upright',x,y,z+.11,.045,r*.63,ink);panel('Clock hand across',x-r*.23,y-.02,z+.11,r*.47,.045,ink);}
  function water(x,w,z=-5,depth=9){
    // Wide horizontal sheets sit entirely behind the pedestrian path.
    const a=[x-w/2,.54,z],b=[x+w/2,.54,z],c=[x+w/2,.54,z-depth],d=[x-w/2,.54,z-depth];
    tri(source[0],a,b,c,0x7ea7aa);tri(source[0],a,c,d,0x7ea7aa);
    for(let i=0;i<12;i++){const dx=x-w*.44+i*w*.075,dz=z-1-(i%3)*2;tri(source[0],[dx,.555,dz],[dx+1.4,.555,dz],[dx+1.4,.555,dz-.045],0xb9cfc5);tri(source[0],[dx,.555,dz],[dx+1.4,.555,dz-.045],[dx,.555,dz-.045],0xb9cfc5);}
    panel('Waterfront cream bank',x,.5,z+.12,w,.28,paper,{depth:.25});features.push({kind:'water',districtId:activeDistrict.id,x,z,width:w});
  }
  function railing(x,w,z=-2.9){
    panel('Riverside handrail',x,1.43,z,w,.075,0x74918b);
    for(let dx=-w/2;dx<=w/2;dx+=1.35)panel('Riverside rail upright',x+dx,.5,z,.07,1,0x91aa9a,{depth:.045});
  }
  function fountain(x){
    card('Fountain broad folded bowl',x,.55,-2.35,[[-2.15,.13],[2.15,.13],[1.72,.68],[-1.72,.68]],0xbfcac4,{depth:.3});
    panel('Fountain blue water',x,1.03,-2.11,3.38,.12,0x92b8c2,{depth:.08});panel('Fountain pedestal',x,1.12,-2.6,.32,1.22,paper);
    card('Cut paper fountain jet',x,1.65,-2.48,[[-1.1,-.32],[-.68,.57],[-.22,.92],[0,1.07],[.22,.92],[.68,.57],[1.1,-.32],[.84,-.29],[.48,.40],[.1,.64],[.1,-.1],[-.1,-.1],[-.1,.64],[-.48,.40],[-.84,-.29]],0xaad2d0,{depth:.035});
    features.push({kind:'fountain',districtId:activeDistrict.id,x,z:-2.35});
  }
  function landmark(d){
    const x=d.x,[body,top]=PALETTES[d.index];let name=SHOP_NAMES[d.index][1],width=18;
    if(d.id==='academy')return;
    if(d.id==='oldtown'){
      building(name,x,{w:12,h:4.8,z:-5.2,label:1,roofType:1,roofHeight:1.5,shop:false});clock(x,6.37,-4.97,.49);
      for(let i=-2;i<=2;i++)panel('Old town arcade pillar',x+i*2.2,.5,-3.7,.23,2.57,paper,{depth:.2});
      panel('Old town arcade cornice',x,3.02,-3.67,11.6,.21,body,{depth:.26});
    }else if(d.id==='market'){
      for(let i=0;i<4;i++){
        const sx=x-10.5+i*7;
        panel('Market open stall back',sx,.65,-4.5,5.4,1.5,body,{depth:.1});
        for(const side of [-1,1])panel('Market stall timber upright',sx+side*2.65,.5,-3.85,.13,2.8,0xa98e6c);
        roof(sx,3.08,-4.55,6,1.15, i%2?0xd3946c:0x849e7d,0);awning(sx,3.14,-4.25,5.8,i%2?0xd3946c:0x849e7d);
        sign(SHOP_NAMES[d.index][i+2],sx,2.07,-3.65,4.3,.57,d.index*8+i+2);
        panel('Folded market counter',sx,.5,-3.45,5.2,.81,0xb89875,{depth:.24});
        panel('Market counter ivory lip',sx,1.24,-3.27,5.3,.09,paper,{depth:.19});
        for(let k=0;k<7;k++)panel('Market counter timber slat',sx-2.2+k*.73,.61,-3.29,.037,.57,0xd8b996,{depth:.025});
        for(let k=0;k<9;k++){
          const fx=sx-1.95+k*.48,fy=1.42+(k%2)*.08;
          if(i===0){
            panel('Flower stall green stem',fx,1.3,-3.3,.025,.36,0x70937b);
            disk('Flower stall paper petals',fx,fy+.23,-3.29,.16,k%2?0xd499a5:0xf1c794);disk('Flower centre',fx,fy+.23,-3.23,.049,paper);
          }else if(i===2){
            card('Bakery little folded loaf',fx,1.33,-3.29,[[-.19,0],[.18,0],[.23,.13],[.1,.24],[-.09,.24],[-.24,.13]],0xd9b181,{depth:.06});
            for(const cut of [-.06,.07])panel('Loaf cream scoring',fx+cut,1.43,-3.22,.029,.08,paper,{depth:.02});
          }else{
            disk('Paper fruit in market crates',fx,fy,-3.31,.17,[0xdc9971,0x92aa70,0xc98686][(k+i)%3]);
            card('Fruit cut paper leaf',fx,fy+.13,-3.23,[[0,0],[.05,.13],[.17,.15],[.1,.02]],0x71947a,{depth:.024});
          }
        }
      }
      width=28;name='晨星露天市场';
    }else if(d.id==='shopping'){
      building('灯影电影院',x,{w:14,h:4.3,z:-5,label:2,roofType:1,roofHeight:1.7,shop:false,signVisible:false});
      sign('灯影电影院',x,4.26,-4.51,10,.83,d.index*8+2);awning(x,3.52,-4.7,13,0x946681);
      for(const side of [-1,1]){panel('Cinema poster gold border',x+side*4.7,1.01,-4.7,1.56,1.95,0xd2b379);panel('Cinema illustrated poster',x+side*4.7,1.11,-4.57,1.36,1.75,side<0?0x769da1:0xbb8d9d);disk('Movie poster moon',x+side*4.7,2.32,-4.46,.32,paper);}
      name='灯影电影院';
    }else if(d.id==='central'){
      building(name,x,{w:19,h:4.1,z:-6.1,label:1,roofType:2,roofHeight:2.25,shop:false,signVisible:false});
      card('Grand station fanlight',x,3.63,-5.77,[[-3.4,0],[3.4,0],[2.6,1.4],[0,2.3],[-2.6,1.4]],0x85a7ac);
      for(let i=-3;i<=3;i++)panel('Station fanlight glazing bar',x+i*.83,3.65,-5.64,.065,1.72-Math.abs(i)*.2,paper);
      clock(x,5.02,-5.46,.73);sign(name,x,2.6,-5.51,11,.74,d.index*8+1);
      for(const side of [-1,1])panel('Station entrance pillar',x+side*5.65,.5,-5.33,.34,3.1,paper,{depth:.26});
      width=21;
    }else if(d.id==='business'){
      building(name,x-4.5,{w:9,h:11,z:-8.5,label:1,roofType:1,roofHeight:.75,shop:false});
      building('青玻事务所',x+6.1,{w:7,h:8.4,z:-6.8,label:2,roofType:2,roofHeight:.9,shop:false});
      for(let i=0;i<5;i++)panel('Office tower vertical folded fins',x-8+i*1.75,.65,-8.18,.12,10.35,paper,{depth:.19});
      panel('Office tower antenna',x-4.5,12.16,-8.4,.075,1.4,top);width=23;
    }else if(d.id==='civic'){
      building(name,x,{w:19,h:4.4,z:-7,label:1,roofType:0,roofHeight:1.6,shop:false,signVisible:false});
      for(let i=-3;i<=3;i++){panel('Library classical column',x+i*2.35,.62,-5.9,.32,3.45,paper,{depth:.22});panel('Column capital',x+i*2.35,3.96,-5.79,.65,.16,paper);}
      panel('Library entablature',x,4.08,-5.82,16.4,.3,body);sign(name,x,4.62,-6.63,9,.69,d.index*8+1);fountain(x+1);width=21;
    }else if(d.id==='riverside'){
      water(x,36,-4,15);railing(x,33);
      card('Folded arched footbridge',x,.62,-6.2,[[-9,0],[-9,.5],[-5,1.12],[0,1.45],[5,1.12],[9,.5],[9,0],[5,.52],[0,.8],[-5,.52]],0xc1b399,{depth:.28});
      for(let i=-8;i<=8;i+=2)panel('Footbridge rail post',x+i,1.23+(1-Math.abs(i)/9)*.8,-6.06,.075,.59,paper);
      for(const dx of [-15,-9,11,16])tree(x+dx,-9,1.35,dx);bench(x-6,-2.1);bench(x+7,-2.1);name='月河步桥与滨水公园';width=36;
    }else if(d.id==='harbor'){
      water(x,31,-4.9,14);railing(x,29,-3.9);
      card('Paper fishing boat hull',x-5,.65,-5.15,[[-5,1.15],[5,1.15],[3.4,0],[-3.8,0]],0xd1a181,{depth:.35});
      panel('Boat ivory gunwale',x-5,1.72,-4.95,10.1,.16,paper,{depth:.16});panel('Boat cabin',x-6,1.83,-5.0,3.6,1.32,body);window(x-6,2.12,-4.85,2.6,.67);panel('Boat mast',x-2.8,1.85,-5.3,.09,3.45,top);
      card('Boat triangular paper sail',x-2.85,2.72,-5.2,[[0,0],[0,2.28],[-2.1,.2]],paper,{depth:.04});
      card('Lighthouse ivory tower',x+10,.5,-6,[[-1,0],[1,0],[.61,6.75],[-.61,6.75]],paper,{depth:.22});
      for(let i=0;i<3;i++)panel('Lighthouse sea-blue band',x+10,1.3+i*1.7,-5.84,1.9-i*.15,.44,top);
      window(x+10,6.41,-5.7,1.58,.89);roof(x+10,7.43,-5.81,2.35,.63,top,0);panel('Lighthouse lantern balcony',x+10,6.31,-5.51,2.54,.12,paper,{depth:.26});name='南湾灯塔与渔船';width=33;
    }else if(d.id==='arts'){
      building(name,x,{w:15,h:4.4,z:-5.7,label:1,roofType:1,roofHeight:.45,shop:false,signVisible:false});
      const fanPoints=Array.from({length:9},(_,i)=>[Math.cos(Math.PI-i*Math.PI/8)*8,Math.sin(Math.PI-i*Math.PI/8)*2.8]);
      card('Theatre fan ivory cut edge',x,4.82,-5.35,[[0,-.07],...fanPoints.map(([px,py])=>[px*1.012,py+.07])],paper,{depth:.13});
      for(let i=0;i<8;i++)card('Theatre folded fan roof',x,4.82,-5.22,[[0,0],fanPoints[i],fanPoints[i+1]],i%2?0xc49c91:top,{depth:.07});
      sign(name,x,3.41,-5.19,11,.79,d.index*8+1);for(const side of [-1,1])panel('Theatre crimson paper curtain',x+side*4.55,.7,-5.12,1.2,2.62,0xa57487);
    }else if(d.id==='medical'){
      building(name,x,{w:18,h:5.5,z:-6.1,label:1,roofType:1,roofHeight:.7,shop:false,signVisible:false});
      panel('Hospital sage cross vertical',x,5.45,-5.75,.3,1.33,top);panel('Hospital sage cross horizontal',x,5.96,-5.7,1.35,.31,top);
      sign(name,x,3.03,-5.72,11,.79,d.index*8+1);awning(x,2.83,-5.7,8,top);planter(x-6,-2.6);planter(x+6,-2.6);name='白榆综合医院与疗养花园';width=20;
    }else if(d.id==='residential'){
      building('星灯公寓',x-6.9,{w:8.2,h:6.4,z:-5.8,label:2,roofType:2,roofHeight:1.5,shop:false});
      building('星灯社区',x+6.2,{w:8.1,h:4.8,z:-6.1,label:1,roofType:0,roofHeight:1.5,shop:false});
      for(const xx of [x-8.7,x-5.1])for(const yy of [3.35,4.9]){panel('Apartment balcony floor',xx,yy,-5.23,2.15,.12,paper,{depth:.55});panel('Apartment balcony rail',xx,yy+.35,-4.97,2.1,.055,top);}
      tree(x,-3.7,.94);bench(x+2.1,-2.2);planter(x-2.1,-2.1);name='星灯公寓庭院';width=25;
    }
    landmarks.push({districtId:d.id,name,x,width});
  }

  for(const district of CITY_DISTRICTS){
    activeDistrict=district;source=[0,1].map(()=>({p:[],n:[],c:[],uv:[]}));
    const node=new THREE.Group();node.name=district.name+' · folded paper district';node.userData.districtId=district.id;
    const startTriangles=totalTriangles;
    if(district.id==='academy'){
      for(const [i,dx] of [-42,-30,-18,33,45,56].entries())building(SHOP_NAMES[0][i+1],dx,{w:7.1,h:3.65+i%2*.65,z:-5.2,variant:i,label:i+1,roofType:i%3});
      for(const dx of [-47,-24,29,40,58])tree(dx,-3.2,.9,dx);
    }else{
      // Dense street continuations prevent empty seams between the city quarters.
      const offsets=[-49,-38,-27,-18,22,33,45,55];
      for(const [i,dx] of offsets.entries()){
        const isNearLandmark=dx===-18||dx===22;
        if(isNearLandmark&&['riverside','harbor'].includes(district.id))continue;
        const baseHeight=district.id==='business'?5.4:district.id==='residential'?4.9:3.45;
        building(SHOP_NAMES[district.index][1+i%7],district.x+dx,{w:7.6+(i%3)*.55,h:baseHeight+(i%3)*.55,z:-4.7-(i%2)*.6,
          variant:i,label:1+i%7,roofType:(i+district.index)%3,roofHeight:.85+(i%2)*.38});
      }
      landmark(district);
      for(const [i,dx] of [-54,-32,-14,16,40,59].entries()){
        if(['market','riverside','harbor','residential'].includes(district.id)&&Math.abs(dx)<19)continue;
        tree(district.x+dx,-2.9-(i%2)*.35,.78+i%3*.12,i);
      }
    }
    // Sidewalk furniture stays behind the actor; transit entrances stay clear.
    bench(district.x-34);planter(district.x+27);
    const roadX=district.x-44;
    panel('Neighbourhood wayfinding post',roadX,.5,-1.25,.07,2.73,ink,{depth:.06});
    sign(district.name+' street sign',roadX,2.72,-1.19,3.45,.58,96+district.index);
    for(const [i,data] of source.entries()){
      if(!data.p.length)continue;
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.n,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(data.c,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,i?printed:stock);mesh.name=district.name+(i?' · printed windows and Chinese signs':' · folded architectural paper');mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=true;
      node.add(mesh);totalTriangles+=data.p.length/9;
    }
    group.add(node);districts.push({...district,node,triangles:totalTriangles-startTriangles});
  }
  group.userData.cityDistricts={buildings,landmarks,features};
  function update(playerX=0){
    if(!Number.isFinite(playerX))return false;
    let changed=false;
    for(const district of districts){const visible=playerX>=district.minX-160&&playerX<=district.maxX+160;if(district.node.visible!==visible){district.node.visible=visible;changed=true;}}
    if(changed){flags.render=true;flags.shadow=true;flags.depth=true;flags.volumeShadow=true;}
    return changed;
  }
  update(0);flags.render=true;flags.depth=true;flags.shadow=true;flags.volumeShadow=true;
  return {group,update,stats:()=>({districts:districts.length,visibleDistricts:districts.filter(d=>d.node.visible).map(d=>d.id),
    batches:group.children.reduce((sum,d)=>sum+d.children.length,0),visibleBatches:districts.filter(d=>d.node.visible).reduce((sum,d)=>sum+d.node.children.length,0),
    triangles:totalTriangles,visibleTriangles:districts.filter(d=>d.node.visible).reduce((sum,d)=>sum+d.triangles,0),materials:2,textures:2,atlasBytes:atlas.bytes,cards:totalCards,
    buildings:buildings.length,landmarks:landmarks.map(l=>({...l})),features:features.length,signText:[...atlas.labels]})};
}
