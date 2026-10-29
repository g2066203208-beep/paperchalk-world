const $=s=>document.querySelector(s);
const svg=$('#avatar'),pixel=$('#pixel'),ctx=pixel.getContext('2d');
const theme={blue:{hue:0},purple:{hue:55},green:{hue:138},rose:{hue:285}};
const state={mood:'sleepy',head:100,hair:100,shade:75,palette:'blue',mode:'vector',res:64,outline:true,highlights:true};
const eyeGroups={sleepy:$('#eyes-open'),bright:$('#eyes-happy'),surprised:$('#eyes-surprised')};
function setBody(){
 const ratio=state.head/100;
 const transform='translate(320 350) scale('+ratio+') translate(-320 -350)';
 $('#head').setAttribute('transform',transform);
 $('#hair-back').setAttribute('transform',transform);
 const hairSize=state.hair/100;
 $('#hair-front').setAttribute('transform','translate(320 246) scale('+hairSize+') translate(-320 -246)');
 Object.entries(eyeGroups).forEach(([mood,g])=>{g.style.display=state.mood===mood?'':'none';});
 $('#mouth').setAttribute('d',state.mood==='bright'?'M299 510 Q317 527 338 507':state.mood==='surprised'?'M310 506 Q317 496 323 505 Q324 520 316 521 Q309 516 310 506Z':'M310 511 Q318 514 326 511');
 $('#mouth').setAttribute('fill',state.mood==='surprised'?'#9d6c70':'none');
 for(const id of ['hair-back','hair-front'])
  $('#'+id).style.filter='hue-rotate('+theme[state.palette].hue+'deg)';
 const contrast=state.shade/100;
 $('#backBottom').setAttribute('stop-color',mix('#9ed0f6','#4d77a0',contrast));
 $('#frontBottom').setAttribute('stop-color',mix('#86c0ee','#4480b5',contrast));
 for(const mark of svg.querySelectorAll('.shine'))
  mark.style.opacity=state.highlights?Math.max(.15,state.shade/100):0;
 svg.classList.toggle('no-outline',!state.outline);
 svg.classList.toggle('no-highlights',!state.highlights);
 $('#head-value').textContent=state.head+'%';
 $('#hair-value').textContent=state.hair+'%';
 $('#shade-value').textContent=state.shade+'%';
 $('#mood-value').textContent={sleepy:'慵懒',bright:'开心',surprised:'惊讶'}[state.mood];
 for(const b of document.querySelectorAll('[data-palette]'))
  b.classList.toggle('active',b.dataset.palette===state.palette);
 if(state.mode==='pixel')updatePixel();
}
function mix(a,b,t){
 const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 const a0=rgb(a),b0=rgb(b);
 return '#'+a0.map((v,i)=>Math.round(v*(1-t)+b0[i]*t).toString(16).padStart(2,'0')).join('');
}
function serialize(){
 const clone=svg.cloneNode(true);
 const stylesheet=document.createElementNS('http://www.w3.org/2000/svg','style');
 stylesheet.textContent='.edge{stroke:#364f65;stroke-width:4.5;stroke-linejoin:round;stroke-linecap:round}.no-outline .edge{stroke:none!important}.no-highlights .shine{opacity:0!important}';
 clone.insertBefore(stylesheet,clone.firstChild);
 return new XMLSerializer().serializeToString(clone);
}
let generation=0;
async function rasterize(resolution){
 const id=++generation;
 const markup=serialize(),url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Cannot rasterize character SVG'));img.src=url;});
  if(id!==generation)return;
  pixel.width=resolution;pixel.height=Math.round(resolution*760/640);
  ctx.imageSmoothingEnabled=true;ctx.clearRect(0,0,pixel.width,pixel.height);
  ctx.drawImage(img,0,0,pixel.width,pixel.height);
  $('#render-status').textContent='PIXEL / '+pixel.width+'×'+pixel.height+' · NEAREST NEIGHBOR';
 }finally{URL.revokeObjectURL(url);}
}
let debounce;
function updatePixel(){clearTimeout(debounce);debounce=setTimeout(()=>rasterize(state.res).catch(e=>console.error(e)),95);}
function mode(value){
 state.mode=value;
 $('.stage').classList.toggle('pixelmode',value==='pixel');
 for(const b of document.querySelectorAll('[data-mode]'))
  b.classList.toggle('selected',b.dataset.mode===value);
 $('#render-status').textContent=value==='vector'?'VECTOR / 640×760':'PIXEL / '+state.res+'×'+Math.round(state.res*760/640);
 if(value==='pixel')updatePixel();
}
function download(name,blob){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$('#save-svg').addEventListener('click',()=>download('character-atelier-layered.svg',new Blob([serialize()],{type:'image/svg+xml;charset=utf-8'})));
$('#save-png').addEventListener('click',async()=>{
 const image=serialize(),url=URL.createObjectURL(new Blob([image],{type:'image/svg+xml'}));
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
  const out=document.createElement('canvas');
  out.width=state.mode==='pixel'?state.res:1280;
  out.height=Math.round(out.width*760/640);
  out.getContext('2d').drawImage(img,0,0,out.width,out.height);
  out.toBlob(b=>{if(b)download('character-atelier-'+out.width+'.png',b);},'image/png');
 }finally{URL.revokeObjectURL(url);}
});
for(const id of ['mood','head','hair','shade']){
 $('#'+id).addEventListener('input',e=>{state[id]=id==='mood'?e.target.value:Number(e.target.value);setBody();});
}
$('#outline').addEventListener('change',e=>{state.outline=e.target.checked;setBody();});
$('#highlights').addEventListener('change',e=>{state.highlights=e.target.checked;setBody();});
for(const b of document.querySelectorAll('[data-palette]'))b.addEventListener('click',()=>{state.palette=b.dataset.palette;setBody();});
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>mode(b.dataset.mode));
for(const b of document.querySelectorAll('[data-res]'))b.addEventListener('click',()=>{
 state.res=Number(b.dataset.res);
 document.querySelectorAll('[data-res]').forEach(x=>x.classList.toggle('chosen',x===b));
 mode('pixel');
});
window.__CHARACTER_ATELIER__={get state(){return {...state};},get vector(){return serialize();},render:()=>rasterize(state.res),get svg(){return svg}};
setBody();