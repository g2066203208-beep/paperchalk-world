// WORLD Blockbench Studio — format adapter and three starter locations.
export const PALETTE={snow:"#e5e6df",plaster:"#c7c3b8",steel:"#77888b",slate:"#43505a",wood:"#887360",warm:"#e6c894",glass:"#a6bdc3",olive:"#778271",rust:"#a27869",ink:"#343d43",road:"#7a8081",paper:"#d8cfbe"};
export const PRESETS=[["kiosk","01 · 冬夜售货亭"],["street","02 · 雪城归家路"],["home","03 · 工人住宅"]];
const hex=v=>/^#[0-9a-f]{6}$/i.test(v||"")?v.toLowerCase():PALETTE.steel;
export const uuid=()=>crypto.randomUUID();
export function cube(name,from,size,color="steel",group="主体"){
 return {id:uuid(),name,group,from:[...from],to:from.map((v,i)=>v+size[i]),rotation:[0,0,0],color:PALETTE[color]||hex(color),visible:true};
}
export function createScene(which="kiosk"){
 const parts=[],add=(n,p,s,c,g)=>parts.push(cube(n,p,s,c,g));
 if(which==="kiosk"){
  add("积雪地面",[-30,-.7,-25],[60,.25,50],"snow","外景");
  add("水泥台基",[-9,-.45,-7],[18,.55,14],"steel","建筑");
  add("后墙",[-8,.1,-6],[16,10.5,.65],"plaster","建筑");
  add("左墙",[-8,.1,-6],[.65,10.5,12],"plaster","建筑");
  add("右墙",[7.35,.1,-6],[.65,10.5,12],"plaster","建筑");
  add("前下墙",[-8,.1,5.35],[16,3,.65],"olive","建筑");
  add("前左墙",[-8,3.1,5.35],[3,7.5,.65],"plaster","建筑");
  add("前右墙",[5,3.1,5.35],[3,7.5,.65],"plaster","建筑");
  add("前上墙",[-5,8,5.35],[10,2.6,.65],"plaster","建筑");
  add("窗左框",[-5,3.1,5.85],[.3,4.9,.4],"ink","营业窗");
  add("窗右框",[4.7,3.1,5.85],[.3,4.9,.4],"ink","营业窗");
  add("窗顶框",[-5,7.7,5.85],[10,.3,.4],"ink","营业窗");
  add("递货台面",[-5.6,3.1,5.5],[11.2,.42,2.35],"wood","营业窗");
  add("柜台边沿",[-5.8,3.45,7.6],[11.6,.18,.32],"paper","营业窗");
  add("店招",[ -3.7,8.8,6.02],[7.4,1.25,.14],"paper","招牌");
  add("平屋顶",[-9,10.6,-7],[18,.85,14],"slate","屋顶");
  add("屋顶薄雪",[-9.2,11.45,-7.2],[18.4,.3,14.4],"snow","屋顶");
  add("暖灯罩",[-.85,8.05,6.05],[1.7,.65,.5],"ink","灯光");
  add("暖灯面",[-.67,8.15,6.53],[1.34,.25,.07],"warm","灯光");
  add("左货架背板",[-7.15,.8,-4.9],[3.75,7,.45],"wood","陈列");
  for(let i=0;i<4;i++)add("货架 "+(i+1),[-7.2,1.5+i*1.7,-4.75],[3.85,.2,1.65],"wood","陈列");
  for(let i=0;i<4;i++)add("茶盒 "+(i+1),[-6.8+i*.82,1.75,-4.3],[.62,.86,.6],i%2?"rust":"olive","商品");
  add("街灯杆",[-16,0,6],[.3,15,.3],"ink","外景");
  add("街灯臂",[-16,14.7,6],[3.4,.3,.3],"ink","外景");
  add("街灯灯头",[-13.3,14.05,5.6],[1.35,.55,1.1],"warm","外景");
 }else if(which==="street"){
  add("雪地",[-42,-.65,-32],[84,.3,70],"snow","道路");
  add("车行道",[-38,-.35,-6],[76,.28,14],"road","道路");
  add("积雪路缘",[-38,-.05,-8],[76,.46,1.4],"snow","道路");
  add("人行步道",[-38,-.2,-22],[76,.45,14],"plaster","道路");
  for(let b=0;b<5;b++){
   const x=-38+b*17,h=17+(b%3)*3;
   add("工人住宅 "+(b+1),[x,.25,-32],[15,h,10],b%2?"rust":"steel","住宅");
   add("屋顶檐口 "+(b+1),[x-.3,h+.25,-32.3],[15.6,.43,10.6],"slate","住宅");
   for(let floor=0;floor<4;floor++)for(let c=0;c<3;c++)add("住宅窗 "+b+"-"+floor+"-"+c,[x+1.6+c*4,3+floor*3.8,-21.94],[2.4,2.2,.09],(b+c+floor)%5===0?"warm":"ink","住宅窗");
  }
  for(let j=0;j<3;j++){const x=-27+j*25;add("路灯杆 "+j,[x,.1,6],[.28,15,.28],"ink","照明");add("路灯横臂 "+j,[x,14.8,6],[3.5,.28,.28],"ink","照明");add("路灯头 "+j,[x+2.8,14.1,5.65],[1.2,.55,1.05],"warm","照明");}
  add("候车亭棚顶",[12,6,-13],[12,.45,5],"slate","车站");
  add("候车亭左柱",[12.5,.25,-12.7],[.27,5.75,.27],"steel","车站");
  add("候车亭右柱",[23,.25,-12.7],[.27,5.75,.27],"steel","车站");
  add("候车长椅",[14,1.65,-12],[8,.42,1.5],"wood","车站");
  add("站牌杆",[8,.25,-9],[.25,7,.25],"ink","车站");
  add("站牌",[7.1,5.95,-9],[2,1.5,.2],"olive","车站");
 }else if(which==="home"){
  add("木地板",[-10,0,-7],[20,.36,15],"wood","房屋");
  add("后墙",[-10,.36,-7],[20,11,.4],"plaster","房屋");
  add("左墙",[-10,.36,-7],[.4,11,15],"paper","房屋");
  add("右墙",[9.6,.36,-7],[.4,11,15],"paper","房屋");
  add("床底座",[-8,.7,-1],[7,1,4],"slate","家具");
  add("床垫",[-7.8,1.7,-.8],[6.6,.5,3.6],"paper","家具");
  add("枕头",[-7.35,2.2,-.6],[2.1,.36,3.1],"snow","家具");
  add("毛毯",[-4.7,2.2,-.7],[3.3,.35,3.4],"olive","家具");
  add("餐桌",[1,3,-.3],[6,.35,3.5],"wood","家具");
  for(const x of [1.35,6.2])for(const z of [.1,2.5])add("桌腿 "+x+" "+z,[x,.36,z],[.4,2.7,.4],"slate","家具");
  add("暖气片",[2,.7,-6.5],[5.8,2.5,.5],"steel","设施");
  for(let j=0;j<8;j++)add("散热管 "+j,[2.25+j*.66,.85,-5.97],[.23,2.15,.17],"plaster","设施");
  add("窗玻璃",[-.65,5.3,-6.57],[6.1,3.7,.12],"glass","窗户");
  add("左窗框",[-.82,5.1,-6.34],[.3,4.1,.27],"ink","窗户");
  add("右窗框",[5.38,5.1,-6.34],[.3,4.1,.27],"ink","窗户");
  add("顶窗框",[-.82,8.95,-6.34],[6.5,.27,.27],"ink","窗户");
  add("底窗框",[-.82,5.1,-6.34],[6.5,.27,.27],"ink","窗户");
  add("中窗框",[2.25,5.1,-6.3],[.24,4.1,.18],"ink","窗户");
  add("吊灯线",[0,8,-.2],[.16,3.3,.16],"ink","灯光");
  add("灯罩",[-.85,7.4,-1],[1.8,.65,1.8],"warm","灯光");
  add("收音机",[3.5,3.36,1.2],[2.4,1.15,.88],"rust","用品");
  add("收音机面板",[3.85,3.65,2.09],[1.6,.55,.04],"ink","用品");
 }else add("方块",[-1,0,-1],[2,2,2],"olive","模型");
 return {version:1,id:which,name:PRESETS.find(x=>x[0]===which)?.[1]||"空白模型",parts};
}
export function normalizeScene(s){
 if(!s||!Array.isArray(s.parts)||s.parts.length<1||s.parts.length>800)throw Error("方块数量必须为 1—800。");
 const seen=new Set(),parts=s.parts.map((p,i)=>{
  if(!Array.isArray(p.from)||!Array.isArray(p.to)||p.from.length!==3||p.to.length!==3)throw Error("方块 "+(i+1)+" 坐标格式错误");
  const from=p.from.map(Number),to=p.to.map(Number),rotation=(p.rotation||[0,0,0]).map(Number);
  if(rotation.length!==3||[...from,...to,...rotation].some(n=>!Number.isFinite(n)||Math.abs(n)>3000)||from.some((v,k)=>v>=to[k]))throw Error("方块 "+(i+1)+" 的尺寸无效");
  const id=String(p.id||uuid());if(seen.has(id))throw Error("重复的方块 ID");seen.add(id);
  return {id,name:String(p.name||"Cube").slice(0,80),group:String(p.group||"模型").slice(0,50),from,to,rotation,color:hex(p.color),visible:p.visible!==false};
 });
 return {version:1,id:String(s.id||"custom"),name:String(s.name||"未命名场景").slice(0,80),parts};
}
export function exportBBModel(scene,source=""){
 const s=normalizeScene(scene),colors=[...new Set(s.parts.map(p=>p.color))];
 const elements=s.parts.map(p=>{
  const row=colors.indexOf(p.color);
  const faces=Object.fromEntries(["north","east","south","west","up","down"].map(n=>[n,{uv:[0,row*16,16,row*16+16],texture:0}]));
  return {name:p.name,type:"cube",uuid:p.id,from:p.from,to:p.to,origin:p.from.map((v,i)=>(v+p.to[i])/2),rotation:p.rotation,faces,box_uv:false,visibility:p.visible,studio_color:p.color};
 });
 const outliner=[...new Set(s.parts.map(p=>p.group))].map(group=>({name:group,uuid:uuid(),origin:[0,0,0],children:s.parts.filter(p=>p.group===group).map(p=>p.id)}));
 return {meta:{format_version:"4.10",model_format:"free",box_uv:false},name:s.name,resolution:{width:16,height:16*colors.length},
  elements,outliner,textures:source?[{name:"world-palette.png",id:"0",uuid:uuid(),source,mode:"bitmap",visible:true,saved:true,uv_width:16,uv_height:colors.length*16}]:[],
  studio:{version:1,id:s.id,colors}};
}
export function importBBModel(raw){
 if(typeof raw==="string")raw=JSON.parse(raw);
 if(!raw||!Array.isArray(raw.elements))throw Error("这不是有效的 Blockbench .bbmodel 文件。");
 const groups=new Map();
 const walk=(nodes,group="导入",depth=0)=>{if(depth>24)return;for(const n of nodes){
   if(typeof n==="string")groups.set(n,group);
   else if(n&&typeof n==="object")walk(n.children||[],n.name||group,depth+1);
 }};
 walk(raw.outliner||[]);
 return normalizeScene({id:"imported",name:raw.name||"导入的公开模型",parts:raw.elements.filter(e=>(e.type||"cube")==="cube").map(e=>({
  id:e.uuid||uuid(),name:e.name||"方块",group:groups.get(e.uuid)||"导入",from:e.from,to:e.to,rotation:e.rotation||[0,0,0],
  color:e.studio_color||PALETTE.steel,visible:e.visibility!==false
 }))});
}
export function textureAtlas(scene){
 const colors=[...new Set(scene.parts.map(p=>p.color))];
 const c=document.createElement("canvas");c.width=16;c.height=16*colors.length;
 const g=c.getContext("2d");colors.forEach((color,i)=>{g.fillStyle=color;g.fillRect(0,i*16,16,16);});
 return c.toDataURL("image/png");
}
