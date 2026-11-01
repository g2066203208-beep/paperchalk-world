// PIXEL ATELIER: game production pipeline core.
// All scene geometry and every shader pixel are rendered on a 384x216 integer grid.
export const WIDTH=384, HEIGHT=216;
export const COLOR={
 night:'#101923', wall:'#323a46',wallLight:'#3f4754',mortar:'#283440',
 floor:'#2c2938',floorLine:'#272632',timberDark:'#48333b',timber:'#745047',
 timberLight:'#ad7961',timberTop:'#b78d70',rim:'#e2b08b',
 gold:'#e7ad75',light:'#f5d9a0',cream:'#e9d8ba',red:'#a45d5c',
 glass:'#48707c',glow:'#9dc5c4',plant:'#526c5a',plantLight:'#81a279',
 black:'#181c2b',shadow:'#202632',highlight:'#f8e9c8'
};
export const ASSETS={
 door:{title:'门 · 可开合结构',w:52,h:109,group:'structure'},
 window:{title:'窗 · 雨夜玻璃',w:75,h:57,group:'structure'},
 shelf:{title:'后墙杯架',w:131,h:67,group:'structure'},
 lamp:{title:'吊灯',w:31,h:65,group:'lighting'},
 counter:{title:'吧台 · 顶面透视',w:276,h:70,group:'furniture'},
 stool:{title:'吧台凳',w:37,h:39,group:'furniture'},
 plant:{title:'室内绿植',w:37,h:63,group:'prop'},
 coffee:{title:'咖啡器具',w:36,h:33,group:'prop'},
 sign:{title:'装饰画',w:53,h:35,group:'prop'},
 npc:{title:'NPC占位精灵',w:34,h:65,group:'character'}
};
export const CHARACTER_BIBLE={
 id:'nightlamp-hostess',name:'夜航灯 · 柜台角色',status:'REFERENCE_ONLY_NOT_APPROVED',
 frontReference:'assets/hostess-redraw-v1-192x256.png',
 alternativeReference:'assets/hostess-20261030-D-192x256.png',
 nativeReference:{width:192,height:256},
 invariant:['脸部轮廓','眼距和眼型','发际线和主发束','制服结构','服装主配色','身高与身体比例'],
 variable:['表情','手部动作','站姿','光照条件'],
 rights:'project-original-provenance-review-required',
 model:'Anima Base v1.0',
 lora:'NOT_TRAINED',
 train_ready:false
};
export function defaultScene(){
return {version:1,width:WIDTH,height:HEIGHT,name:'夜航灯 / 吧台',style:'original-native-pixel',objects:[
{id:'door1',type:'door',x:15,y:60,z:10},
{id:'window1',type:'window',x:82,y:45,z:10},
{id:'shelf1',type:'shelf',x:193,y:46,z:10},
{id:'sign1',type:'sign',x:140,y:61,z:10},
{id:'lamp1',type:'lamp',x:100,y:0,z:20},
{id:'lamp2',type:'lamp',x:261,y:0,z:20},
{id:'plant1',type:'plant',x:335,y:114,z:23},
{id:'npc1',type:'npc',x:217,y:105,z:30},
{id:'coffee1',type:'coffee',x:306,y:135,z:38},
{id:'counter1',type:'counter',x:60,y:141,z:40},
{id:'stool1',type:'stool',x:124,y:179,z:49}
]};
}
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
const line=(c,x,y,w,h,col)=>rect(c,x,y,w,h,col);
function polygon(c,p,fill){c.fillStyle=fill;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
const rr=(ctx,x,y,w,h,c)=>rect(ctx,x,y,w,h,COLOR[c]||c);
function objectDraw(ctx,t){
switch(t){
case 'door':
 rr(ctx,0,0,52,109,'black');rr(ctx,3,3,46,106,'timber');rr(ctx,8,9,36,89,'timberDark');
 rr(ctx,11,13,30,40,'timber');rr(ctx,11,59,30,35,'timber');rr(ctx,13,15,26,3,'timberLight');
 rr(ctx,13,61,26,3,'timberLight');rr(ctx,37,58,4,4,'gold');rr(ctx,0,107,52,2,'rim');break;
case 'window':
 rr(ctx,0,0,75,57,'black');rr(ctx,3,4,69,49,'timber');rr(ctx,7,7,61,42,'glass');
 for(let i=0;i<18;i++){const x=(i*31+9)%61,y=(i*23+7)%42;rr(ctx,7+x,7+y,1,5,i%3?'glow':'cream');}
 rr(ctx,36,7,4,42,'timberDark');rr(ctx,7,26,61,4,'timberDark');rr(ctx,0,54,75,3,'timberLight');break;
case 'shelf':
 rr(ctx,0,0,131,67,'timberDark');rr(ctx,3,3,125,61,'wall');
 for(const y of [20,41,61]){rr(ctx,3,y,125,4,'timber');rr(ctx,5,y,121,1,'rim')}
 for(let y=6;y<=45;y+=22)for(let x=13;x<117;x+=19){rr(ctx,x,y,11,13,'cream');rr(ctx,x+2,y+4,7,7,'wallLight');rr(ctx,x+3,y+13,9,2,'timberLight')}
 break;
case 'lamp':
 rr(ctx,14,0,3,34,'timberLight');rr(ctx,7,32,17,3,'gold');
 polygon(ctx,[[8,35],[23,35],[30,48],[1,48]],COLOR.gold);
 rr(ctx,4,47,24,4,'rim');rr(ctx,10,51,12,2,'light');break;
case 'counter':
 // Counter top has a genuinely visible polygonal surface, not a flat head-on strip.
 polygon(ctx,[[25,3],[264,3],[276,20],[0,20]],COLOR.timberTop);
 polygon(ctx,[[0,20],[276,20],[276,65],[0,65]],COLOR.timberDark);
 rr(ctx,0,20,276,4,'rim');rr(ctx,0,24,276,5,'timber');
 rr(ctx,8,32,260,25,'timber');rr(ctx,10,34,256,3,'timberLight');
 for(let x=39;x<270;x+=47){rr(ctx,x,29,3,31,'timberDark');rr(ctx,x+3,31,1,24,'timberLight')}
 rr(ctx,7,59,264,3,'black');rr(ctx,0,65,276,5,'shadow');
 rr(ctx,35,5,209,1,'cream');break;
case 'stool':
 rr(ctx,7,4,23,5,'timberLight');rr(ctx,4,9,28,4,'timber');
 rr(ctx,11,13,4,25,'black');rr(ctx,26,13,4,25,'black');
 rr(ctx,12,28,17,3,'timberLight');rr(ctx,8,37,9,2,'timberDark');rr(ctx,25,37,9,2,'timberDark');break;
case 'plant':
 rr(ctx,12,39,17,20,'timber');rr(ctx,9,38,22,5,'timberLight');rr(ctx,11,58,20,4,'black');
 rr(ctx,18,11,3,29,'plant');for(const [x,y,w,h] of [[3,15,16,8],[12,6,14,10],[20,17,13,8],[7,24,17,7],[14,2,7,12],[24,26,10,6]])rr(ctx,x,y,w,h,'plant');
 rr(ctx,7,17,6,3,'plantLight');rr(ctx,18,7,5,3,'plantLight');rr(ctx,22,22,5,3,'plantLight');break;
case 'coffee':
 rr(ctx,4,14,27,16,'timberDark');rr(ctx,5,12,23,4,'cream');
 rr(ctx,7,18,19,8,'metal');rr(ctx,13,7,6,6,'cream');rr(ctx,15,1,2,7,'glow');
 rr(ctx,29,15,4,11,'rim');rr(ctx,2,30,32,3,'black');break;
case 'sign':
 rr(ctx,0,0,53,35,'black');rr(ctx,3,3,47,29,'timberLight');rr(ctx,6,6,41,23,'wallLight');
 rr(ctx,10,21,31,2,'gold');rr(ctx,12,17,24,2,'rim');rr(ctx,18,10,14,4,'gold');break;
case 'npc':
 // Native 34x65 placeholder ONLY — does not impersonate a trained character LoRA.
 rr(ctx,7,1,21,21,'timberDark');rr(ctx,11,5,16,18,'cream');rr(ctx,7,13,4,12,'timberDark');
 rr(ctx,13,13,3,2,'night');rr(ctx,22,13,3,2,'night');rr(ctx,16,20,7,1,'red');
 rr(ctx,4,25,28,29,'blue' in COLOR?'blue':'glass');rr(ctx,7,25,21,4,'cream');
 rr(ctx,0,27,5,20,'cream');rr(ctx,28,27,5,20,'cream');
 rr(ctx,8,52,8,12,'timberDark');rr(ctx,20,52,8,12,'timberDark');
 rr(ctx,7,63,11,2,'black');rr(ctx,19,63,11,2,'black');break;
}
}
export function validateScene(s){
if(!s||s.version!==1||s.width!==WIDTH||s.height!==HEIGHT||!Array.isArray(s.objects)||s.objects.length>150)throw Error('场景JSON结构或画布尺寸不符');
const ids=new Set();
for(const o of s.objects){if(!o||typeof o.id!=='string'||ids.has(o.id)||!ASSETS[o.type]||!Number.isInteger(o.x)||!Number.isInteger(o.y)||!Number.isInteger(o.z)||Math.abs(o.x)>1000||Math.abs(o.y)>1000||Math.abs(o.z)>1000)throw Error('存在非法对象/坐标/层级');ids.add(o.id)}
return s;
}
export function renderScene(ctx,scene,{selected=null,selection=false}={}){
validateScene(scene);ctx.imageSmoothingEnabled=false;
rr(ctx,0,0,WIDTH,142,'wall');
for(let y=12;y<136;y+=16){rr(ctx,0,y,WIDTH,1,'mortar');for(let x=0;x<WIDTH;x+=48){rr(ctx,(x+(Math.floor(y/16)%2)*24)%WIDTH,y,1,15,'mortar')}}
rr(ctx,0,136,WIDTH,80,'floor');rr(ctx,0,136,WIDTH,4,'timberDark');
for(let y=153;y<HEIGHT;y+=12){rr(ctx,0,y,WIDTH,1,'floorLine');for(let x=0;x<WIDTH;x+=52)rr(ctx,(x+(y%2)*26)%WIDTH,y,1,11,'floorLine')}
for(const o of [...scene.objects].sort((a,b)=>a.z-b.z||a.id.localeCompare(b.id))){const a=ASSETS[o.type];ctx.save();ctx.translate(o.x,o.y);objectDraw(ctx,o.type);ctx.restore();
if(selection&&o.id===selected){ctx.strokeStyle='#f2a5c2';ctx.lineWidth=1;ctx.strokeRect(o.x+.5,o.y+.5,a.w,a.h)}}
}
export function hitTest(scene,x,y){validateScene(scene);return [...scene.objects].sort((a,b)=>b.z-a.z||b.id.localeCompare(a.id)).find(o=>x>=o.x&&y>=o.y&&x<o.x+ASSETS[o.type].w&&y<o.y+ASSETS[o.type].h)?.id||null}
export function addObject(scene,type,x=160,y=60){validateScene(scene);if(!ASSETS[type])throw Error('未知模块');if(scene.objects.length>=150)throw Error('场景对象数量已达上限');const id=type+'-'+(scene.objects.length+1)+'-'+Math.round(Math.random()*10000);scene.objects.push({id,type,x:Math.max(-99,Math.min(WIDTH,Math.round(x))),y:Math.max(-99,Math.min(HEIGHT,Math.round(y))),z:type==='counter'?40:type==='npc'?30:20});return id}
export function pixelAudit(imageData){const {width,height,data}=imageData;if(!Number.isInteger(width)||!Number.isInteger(height)||data.length!==width*height*4)throw Error('图片数据无效');
let translucent=0,colors=new Set(),mixedEdges=0;
for(let i=0;i<data.length;i+=4){const a=data[i+3];if(a!==0&&a!==255)translucent++;if(a)colors.add([data[i],data[i+1],data[i+2],a].join(','))}
return {width,height,uniqueColors:colors.size,translucentPixels:translucent,strictRGBA:translucent===0,nativeGridSourceVerified:false,semanticArtApproved:false};
}
export function validateCharacterBible(b){
if(!b||!b.id||!Array.isArray(b.invariant)||b.invariant.length<4||!Array.isArray(b.variable))throw Error('人物母版信息不足');return b;
}
export function makeAnimaPrompt({kind='character',artist='',person='1girl'}={}){
const safeArtist=String(artist).trim();if(safeArtist&&!/^@[a-z0-9][a-z0-9 .()_-]{0,65}$/i.test(safeArtist))throw Error('画师必须写成 @画师ID；不确认模型是否识别');
const meta='masterpiece, best quality, safe, ';
const a=safeArtist?safeArtist+', ':'';
if(kind==='character')return meta+person+', solo, original character, '+a+'full body, feet visible, three-quarter view, same identity, consistent facial anatomy, same hairstyle silhouette, same clothing pattern, original japanese pixel art game portrait, organized pixel clusters, matte limited palette, flat hard shadows, simple background';
if(kind==='environment')return meta+'no humans, '+a+'original pixel art game environment, cozy rainy night bar, front-facing game view, wall behind a visibly perspectival countertop, consistent architectural scale, modular furniture, clean foreground and background layers, controlled lighting, limited palette';
if(kind==='prop')return meta+'no humans, '+a+'single original game prop, isolated on simple neutral background, three-quarter view, full object visible, clean silhouette, limited palette, pixel art game asset';
if(kind==='ui')return meta+'no humans, '+a+'original pixel art game ui ornament, isolated modular frame with empty center, no text, rectangular dialog window, crisp border, limited palette';
throw Error('未知的提示词类别');
}
export function checkTrainingManifest(manifest){
if(!manifest||manifest.schema!==1||!Array.isArray(manifest.images))throw Error('训练清单版本无效');
const checks=[];const imgs=manifest.images;
const eligible=imgs.filter(x=>x.approved===true&&x.aiTrainingRights==='granted'&&x.source==='original-pixel-art'&&x.identity===manifest.characterId);
const poses=new Set(eligible.map(x=>x.pose)),views=new Set(eligible.map(x=>x.view)),expressions=new Set(eligible.map(x=>x.expression));
checks.push({id:'source',ok:imgs.every(x=>x.aiTrainingRights!=='prohibited'),text:'不包含明确禁止AI训练的作品'});
checks.push({id:'rights',ok:imgs.length>0&&eligible.length===imgs.length,text:'所有图片有授权+人工验收+原生像素来源'});
checks.push({id:'quantity',ok:eligible.length>=20,text:'至少20张独立合格图片（试验门槛，不是效果保证）'});
checks.push({id:'poses',ok:poses.size>=4,text:'至少4种姿势'});
checks.push({id:'views',ok:views.size>=3,text:'至少3种视角'});
checks.push({id:'expressions',ok:expressions.size>=4,text:'至少4种表情'});
checks.push({id:'identity',ok:typeof manifest.characterId==='string'&&manifest.characterId.length>0&&!!manifest.fixedCharacterBible,text:'角色固定母版存在'});
return {ready:checks.every(x=>x.ok),eligible:eligible.length,total:imgs.length,checks,model:'Anima Base v1.0',loraWeightsCreated:false};
}
