/* Independent 2026-11-17 stage studies. User's OWN approved Anima PNG
   is kept byte-identical. Battle cutouts use a display-only external-white
   flood matte. C carnival is an ORIGINAL procedural 2.5D scene, no imports
   of Illusion Carnival's artwork, character or UI files.
 */
(function(){
"use strict";
const mode=document.body.dataset.mode||"a";
const root=document.getElementById("study");
if(!root)return;
const q=(selector,from=root)=>from.querySelector(selector);
const all=(selector,from=root)=>[...from.querySelectorAll(selector)];
const rnd=(seed)=>{let x=seed>>>0;return()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)};
const random=rnd(31985);
let demoPlayed=0,attackTimer=null,debug=false,paused=false;
const asset="../assets/characters/";
const variants={
 a:{
   title:"雪境画卷 · 立绘战斗 A",
   subtitle:"QUIET ENVIRONMENT / LARGE PORTRAIT / GROUND LIGHT",
   hint:"大立绘 · 低对比远景 · 接地阴影 · 少而精的环境信息",
   left:{src:asset+"monster-hunters/04-bounty-markswoman.png",name:"猎魔枪手"},
   right:{src:asset+"crimson-vampires/pureblood-empress.png",name:"猩红女皇"},
   caption:"暮色试炼 · 黄昏的废墟"
 },
 b:{
   title:"幕间决斗 · 立绘战斗 B",
   subtitle:"THEATRICAL DEPTH / SPOTLIGHT / FOREGROUND OCCLUSION",
   hint:"舞台纵深 · 投射聚光 · 前景幕布 · 高反差演出",
   left:{src:asset+"monster-hunters/02-blood-physician.png",name:"疫医"},
   right:{src:asset+"wonder-circus/ringmaster.png",name:"马戏团长"},
   caption:"暗红剧院 · 最后一幕"
 },
 c:{
   title:"奇想机关剧场 · 2.5D 原创实验",
   subtitle:"PAPER THEATRE / PARALLAX / MOVING GEARS",
   hint:"参考《幻象游园剧》的立体书结构，不使用原作角色或场景素材",
   caption:"欢迎来到迷途游园 · THE PAPER CARNIVAL"
 }
};
const v=variants[mode]||variants.a;
function tplDust(n,palette){
 let s='<div class="dust" aria-hidden="true">';
 for(let i=0;i<n;i++){
  const x=(random()*100).toFixed(1)+"%",y=(random()*100).toFixed(1)+"%",size=(1+random()*2.4).toFixed(1)+"px";
  const d=(4+random()*8).toFixed(2)+"s",c=palette[i%palette.length];
  s+='<i style="--x:'+x+';--y:'+y+';--s:'+size+';--d:'+d+';--c:'+c+'"></i>';
 }
 return s+'</div>';
}
function portrait(a,side){
 return '<div class="actor '+side+'" data-actor="'+side+'" role="img" aria-label="'+a.name+'原始Anima立绘">'+
   '<div class="figure"><img src="'+a.src+'" alt="" loading="eager" draggable="false"/></div>'+
   '<span class="name">'+a.name+'</span></div>';
}
function nav(){
 return '<nav class="topnav" aria-label="独立视觉对照">'+
  '<a href="./portrait-study-a.html" class="'+(mode==="a"?"active":"")+'">01 · 留白战斗</a>'+
  '<a href="./portrait-study-b.html" class="'+(mode==="b"?"active":"")+'">02 · 舞台战斗</a>'+
  '<a href="./carnival-study.html" class="'+(mode==="c"?"active":"")+'">03 · 2.5D 游园</a></nav>';
}
function head(){
 return '<header class="study-head"><span class="eyebrow">'+v.subtitle+'</span>'+
  '<h1>'+v.title+'</h1><p>'+v.hint+'</p></header>'+nav();
}
function controls(){
 const b=mode==="c"?
 '<button id="act" class="primary">启动机关演出</button><button id="perspective">切换纸片透视</button>'+
 '<button id="lights">光影对比</button>':
 '<button id="act" class="primary">攻击演出</button><button id="lights">背景光照对比</button>'+
 '<button id="detail">人物接地对比</button>';
 return '<div class="controls"><span class="tag">REAL-TIME STUDY</span>'+b+'</div>';
}
function battle(){
 root.innerHTML='<div class="bg"></div><div class="layer far" data-depth=".15"></div>'+
  '<div class="layer mid" data-depth=".45"></div>'+
  (mode==="b"?'<div class="theatre"><i class="curtain left"></i><i class="curtain right"></i><i class="valance"></i></div>':'')+
  '<div class="stage-ground"></div>'+tplDust(52,mode==="a"?["#ffecc4","#dce9dc","#ebebd4"]:["#ffd6a1","#f99a6e","#f1c1b5"])+
  '<div class="battlelight"></div><div class="actors">'+portrait(v.left,"hero")+portrait(v.right,"villain")+'</div>'+
  '<div class="stage-fg"></div><div class="battle-hud"><p class="emblem">ENCOUNTER · 01</p>'+
  '<span><b>敌方</b><b>LEVEL 03</b></span><div class="hp"><i></i></div><span>时间步 04 / 07</span></div>'+
  '<div class="slash"></div><div class="flash"></div><div class="stage-caption">'+v.caption+'</div>'+
  '<div class="vignette"></div>'+head()+controls();
}
function boatSVG(){
 return '<svg viewBox="0 0 120 165" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
 '<path d="M58 9L17 88L56 76L66 14L104 83L68 75L78 110L40 108Z" fill="#fae5a1" stroke="#4d2a45" stroke-width="5" stroke-linejoin="round"/>'+
 '<path d="M58 9L67 76L40 108L53 90Z" fill="#e8a86e" opacity=".7"/>'+
 '<path d="M13 107L60 126L109 105L88 148L35 150Z" fill="#e9b88e" stroke="#4b2a48" stroke-width="6" stroke-linejoin="round"/>'+
 '<path d="M13 107L60 126L60 147L35 150Z" fill="#fff0b1" stroke="#4b2a48" stroke-width="4"/>'+
 '<path d="M60 126L109 105L88 148L60 147Z" fill="#d78b88" stroke="#4b2a48" stroke-width="4"/>'+
 '<path d="M50 95L59 100M73 95L65 101" fill="none" stroke="#422b46" stroke-width="4" stroke-linecap="round"/>'+
 '<path d="M10 105L60 127L112 105" stroke="#fff6d8" stroke-width="2" fill="none" opacity=".4"/></svg>';
}
function confetti(n){
 const pal=["#ffe2a2","#ff95aa","#ffd264","#d98ae2","#df6b9e","#91e2d2"];let s="";
 for(let i=0;i<n;i++){
  const x=(5+random()*91).toFixed(2)+"%",y=(20+random()*60).toFixed(2)+"%",
   dx=(random()-.5)*350,dy=(random()-.5)*220;
  s+='<i class="particle" style="--x:'+x+';--y:'+y+';--s:'+(5+random()*10).toFixed(1)+'px;--c:'+pal[i%pal.length]+';--delay:-'+(random()*5).toFixed(2)+'s;--dx:'+dx.toFixed(1)+'px;--dy:'+dy.toFixed(1)+'px"></i>';
 }
 return s;
}
function carnival(){
 root.innerHTML='<div class="bg"></div><div class="layer far" data-depth=".12"></div><div class="layer mid" data-depth=".3"></div>'+
  '<div class="paperworld"><div class="world">'+
  '<i class="paper-part cog big"></i><i class="paper-part cog second"></i><i class="paper-part cog third"></i>'+
  '<i class="paper-part sunflower"></i>'+
  '<div class="paper-part paper-stage"></div>'+
  [11,17,23,31,76,83,91].map(x=>'<i class="paper-part pencil" style="--p:'+x+'%"></i>').join("")+
  '<div class="paper-part boat" role="img" aria-label="原创折纸探索者">'+boatSVG()+'</div>'+
  '<div class="boat-shadow"></div>'+confetti(38)+'</div></div>'+
  '<div class="theatre"><div class="bunting"></div></div>'+
  tplDust(90,["#ffedb0","#ffca7f","#f9a6b7"])+
  '<div class="battlelight"></div>'+
  '<i class="paper-part cog front-gear"></i><i class="paper-part cog front-gear right"></i>'+
  '<div class="scenehud"><div class="smiley">☺</div><div class="bar"></div><span>△ 342</span></div>'+
  '<div class="stage-caption">'+v.caption+'</div><div class="vignette"></div>'+
  head()+controls();
}
function cutout(path,img){
 const width=img.naturalWidth,height=img.naturalHeight,sz=width*height;
 if(!width||!height)throw Error("actor image unloaded "+path);
 const c=document.createElement("canvas");c.width=width;c.height=height;
 const context=c.getContext("2d",{willReadFrequently:true});context.drawImage(img,0,0);
 const data=context.getImageData(0,0,width,height),pixels=data.data;
 let alphaCorners=0;
 for(const p of [0,width-1,width*(height-1),sz-1])if(pixels[p*4+3]<70)alphaCorners++;
 if(alphaCorners>=3)return Promise.resolve(img.src);
 const visited=new Uint8Array(sz),queue=new Uint32Array(sz);let tail=0,head=0;
 function canvasColor(id){
  const k=id*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2],a=pixels[k+3];
  const mi=Math.min(r,g,b),ma=Math.max(r,g,b);
  return a>0&&mi>=216&&(ma-mi)<43;
 }
 function seed(id){if(id<0||id>=sz||visited[id]||!canvasColor(id))return;visited[id]=1;queue[tail++]=id;}
 for(let x=0;x<width;x++){seed(x);seed((height-1)*width+x)}
 for(let y=1;y<height-1;y++){seed(y*width);seed(y*width+width-1)}
 while(head<tail){
  const i=queue[head++],x=i%width,y=(i-x)/width;
  if(x>0)seed(i-1);if(x<width-1)seed(i+1);
  if(y>0)seed(i-width);if(y<height-1)seed(i+width);
 }
 if(tail<sz*.03)return Promise.resolve(img.src);
 for(let i=0;i<tail;i++)pixels[queue[i]*4+3]=0;
 for(let i=0;i<tail;i++){
  const id=queue[i],x=id%width,y=(id-x)/width;
  for(const j of [x>0?id-1:-1,x<width-1?id+1:-1,y>0?id-width:-1,y<height-1?id+width:-1]){
   if(j<0||visited[j])continue;
   const k=j*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2],mi=Math.min(r,g,b);
   if(mi>185&&Math.max(r,g,b)-mi<50)pixels[k+3]=Math.min(pixels[k+3],Math.max(32,Math.round((244-mi)*3)));
  }
 }
 context.putImageData(data,0,0);
 return new Promise(resolve=>c.toBlob(blob=>resolve(blob?URL.createObjectURL(blob):img.src),"image/png"));
}
const imagePromise=async img=>{
 if(!img.complete||!img.naturalWidth)await img.decode();
 try{
  const src=await cutout(img.src,img);
  if(src!==img.src){img.src=src;await img.decode();}
  img.closest(".actor").classList.add("ready");
  img.closest(".figure").style.setProperty("--actor-mask",'url("'+src+'")');
  img.dataset.cutoutReady="1";
 }catch(e){
  img.closest(".actor").classList.add("ready");
  img.dataset.cutoutReady="fallback";
  console.warn("portrait art display fallback",e);
 }
};
function attack(){
 if(root.classList.contains("shake"))return;
 demoPlayed++;
 if(mode==="c"){
  const world=q(".paperworld");world.classList.remove("stage-hit");void world.offsetWidth;world.classList.add("stage-hit");
  const parent=q(".sunflower");parent?.animate(
    [{filter:"drop-shadow(0 0 34px #ffd06a)"},{filter:"drop-shadow(0 0 60px #fff6af) brightness(1.65)",offset:.5},{filter:"drop-shadow(0 0 34px #ffd06a)"}],
    {duration:670,fill:"none"});
  setTimeout(()=>world.classList.remove("stage-hit"),700);
 }else{
  const hero=q(".actor.hero"),enemy=q(".actor.villain"),slash=q(".slash"),flash=q(".flash");
  for(const item of [hero,enemy,slash,flash])item.classList.remove("attacking","hit","active");
  void root.offsetWidth;hero?.classList.add("attacking");slash?.classList.add("active");flash?.classList.add("active");
  setTimeout(()=>enemy?.classList.add("hit"),175);
  root.classList.add("shake");
  clearTimeout(attackTimer);
  attackTimer=setTimeout(()=>{hero?.classList.remove("attacking");enemy?.classList.remove("hit");root.classList.remove("shake");slash?.classList.remove("active");flash?.classList.remove("active")},700);
 }
}
function setParallax(x,y){
 all(".layer").forEach(n=>{
  const f=Number(n.dataset.depth||0);
  n.style.setProperty("--px",(x*f*18).toFixed(2)+"px");
  n.style.setProperty("--py",(y*f*11).toFixed(2)+"px");
 });
 if(mode==="c"&&!q("#study")?.classList.contains("is-angled")){
  const w=q(".paperworld .world");
  if(w){w.style.setProperty("--yaw",(x*2.3).toFixed(2)+"deg");w.style.setProperty("--pitch",(y*-1.8).toFixed(2)+"deg");}
 }
}
if(mode==="c")carnival();else battle();
const imageJobs=all(".actor img").map(imagePromise);
Promise.allSettled(imageJobs).then(()=>{root.dataset.studyReady="1";});
q("#act")?.addEventListener("click",attack);
q("#lights")?.addEventListener("click",()=>{debug=!debug;root.classList.toggle("lite",debug);});
q("#detail")?.addEventListener("click",()=>{
 const show=!root.classList.contains("no-ground");root.classList.toggle("no-ground",show);
 let style=document.getElementById("ground-debug-style");
 if(!style){style=document.createElement("style");style.id="ground-debug-style";style.textContent="#study.no-ground .actor:before{display:none}#study.no-ground .battlelight{opacity:0}#study.no-ground .stage-ground:after{opacity:0}";document.head.append(style);}
});
q("#perspective")?.addEventListener("click",()=>{
 const w=q(".paperworld .world");paused=!paused;root.classList.toggle("is-angled",paused);
 if(w){w.style.setProperty("--yaw",paused?"-15deg":"0deg");w.style.setProperty("--pitch",paused?"8deg":"0deg");}
});
root.addEventListener("pointermove",e=>{
 if(e.pointerType!=="mouse")return;
 const x=(e.clientX/innerWidth-.5)*2,y=(e.clientY/innerHeight-.5)*2;
 if(!root.classList.contains("is-angled"))setParallax(x,y);
},{passive:true});
window.addEventListener("keydown",e=>{
 if(e.code==="Space"){e.preventDefault();attack();}
 if(mode==="c"&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code)){
  e.preventDefault();const boat=q(".boat");if(!boat)return;
  const x=e.code==="ArrowLeft"?-12:e.code==="ArrowRight"?12:0;
  const y=e.code==="ArrowUp"?-10:e.code==="ArrowDown"?10:0;
  boat.animate([{translate:"0 0"},{translate:x+"px "+y+"px"},{translate:"0 0"}],{duration:220,easing:"ease-out"});
 }
});
window.PaperchalkVisualStudies=Object.freeze({
 get mode(){return mode},
 get ready(){return root.dataset.studyReady==="1"},
 get played(){return demoPlayed},
 trigger:attack,
 get actorCount(){return all(".actor.ready").length},
 get sceneLayers(){return all(".layer,.paper-part,.actor").length},
 get hasOriginalArt(){return all(".actor img").every(x=>x.dataset.cutoutReady==="1")}
});
})();
