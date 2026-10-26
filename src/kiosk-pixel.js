// Pixel-art scene sprites: authored in code at native low resolution.
// Each customer, product and the exterior street is a separate drawable layer.
// No image generation, flattened screenshot, third-party art or sprite atlas.
export const PIXEL_GRID=Object.freeze({customer:[80,120],item:[24,28],street:[160,112]});
const cache=new Map();
function raster(w,h,paint){
 const c=document.createElement("canvas");c.width=w;c.height=h;
 const g=c.getContext("2d",{alpha:true});g.imageSmoothingEnabled=false;
 paint(g);return c;
}
function px(g,x,y,w,h,color){
 if(w<=0||h<=0)return;
 g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function steps(g,rects,color){for(const [x,y,w,h] of rects)px(g,x,y,w,h,color);}
function framed(g,x,y,w,h,border,fill){
 px(g,x-2,y-2,w+4,h+4,border);px(g,x,y,w,h,fill);
}
const palettes=[
 {coat:"#344c79",coatLight:"#6385aa",coatShadow:"#1b3155",hair:"#d8e0ed",hairShade:"#8394ad",skin:"#e9b69c",skinLight:"#ffe0bc",hat:"#293d67",hatLight:"#6d8ab3",scarf:"#f3d4a0",eyes:"#293652"},
 {coat:"#765277",coatLight:"#a7779c",coatShadow:"#43385d",hair:"#9b634c",hairShade:"#603b40",skin:"#f2c6a9",skinLight:"#ffe2c5",hat:"#4a436c",hatLight:"#e2c9d9",scarf:"#d9e4f2",eyes:"#2c3355"},
 {coat:"#416e74",coatLight:"#6d9e9b",coatShadow:"#2a485a",hair:"#c1b5a1",hairShade:"#7d796e",skin:"#d8a88d",skinLight:"#f4cfaa",hat:"#546f79",hatLight:"#a3d0c4",scarf:"#f3d0a0",eyes:"#344454"},
 {coat:"#a16d53",coatLight:"#cb9b6e",coatShadow:"#60495c",hair:"#393b59",hairShade:"#222c49",skin:"#edb89e",skinLight:"#ffddbc",hat:"#2e456e",hatLight:"#9bbce1",scarf:"#b6cbe4",eyes:"#253455"}
];
function paintPerson(g,p,kind,blink,talk,receive,refuse){
 const O="#17213d",shadow="#25304b";
 // Outlined stepped silhouette: long coat, narrow waist, padded sleeves.
 steps(g,[[13,75,54,45],[8,83,64,30],[4,94,72,24]],O);
 steps(g,[[16,77,48,43],[10,86,60,34],[7,98,66,22]],p.coat);
 steps(g,[[10,94,11,26],[60,94,10,26],[19,110,42,10]],p.coatShadow);
 steps(g,[[16,82,6,29],[23,81,3,30],[55,84,5,29]],p.coatLight);
 // Hood/hair sits behind the face, with side locks and square highlights.
 steps(g,[[20,17,40,54],[15,26,50,39],[17,51,11,31],[52,49,11,34]],O);
 steps(g,[[21,19,38,50],[18,29,44,38],[20,55,9,27],[52,55,9,27]],p.hairShade);
 steps(g,[[23,21,34,47],[21,33,39,29],[22,55,6,18],[54,53,5,22]],p.hair);
 // Face and ears, sharp one-pixel edge highlights.
 framed(g,26,32,28,31,O,p.skin);
 steps(g,[[28,34,24,22],[25,42,5,13],[51,42,5,13]],p.skinLight);
 px(g,28,58,24,5,p.skin);px(g,28,58,24,1,"#d89989");
 // Hat and bangs vary between the four original townspeople.
 if(kind===0){
  steps(g,[[18,19,44,11],[23,14,34,6],[30,9,20,6]],O);
  steps(g,[[20,20,40,9],[25,15,30,5],[32,10,16,5]],p.hat);
  px(g,20,27,40,4,p.hatLight);px(g,33,8,13,2,"#f3f3ee");
  steps(g,[[25,31,16,7],[41,31,13,5]],p.hair);
 }else if(kind===1){
  steps(g,[[19,21,42,13],[24,15,32,8],[32,11,16,6]],O);
  steps(g,[[21,23,38,9],[25,16,30,7],[34,12,12,5]],p.hat);
  px(g,23,30,35,4,p.hatLight);
  steps(g,[[25,32,11,10],[45,32,10,7]],p.hair);
  px(g,20,54,5,22,p.hairShade);px(g,55,53,5,22,p.hairShade);
 }else if(kind===2){
  steps(g,[[19,19,42,11],[26,13,28,7],[34,10,12,4]],O);
  steps(g,[[21,20,38,8],[28,14,24,7],[36,11,8,3]],p.hat);
  px(g,19,27,42,5,p.hatLight);
  steps(g,[[18,31,8,21],[54,31,8,21]],p.hat);
  px(g,22,48,5,6,p.hatLight);px(g,54,48,5,6,p.hatLight);
 }else{
  steps(g,[[21,21,38,13],[25,15,30,7],[33,10,14,5]],O);
  steps(g,[[23,23,34,9],[27,16,26,7],[35,11,10,5]],p.hat);
  px(g,23,30,34,3,p.hatLight);
  steps(g,[[26,32,19,7],[46,33,8,6]],p.hairShade);
  px(g,32,8,16,3,p.hatLight);
 }
 // Eyes, optional blink and tiny talking animation. Pixel shading, no curves.
 for(const ex of [31,46]){
  if(blink){px(g,ex,46,6,2,p.eyes);}
  else{
   px(g,ex,43,6,2,p.hairShade);px(g,ex+1,46,4,7,p.eyes);
   px(g,ex+1,46,2,3,"#8fd1ee");px(g,ex+1,46,1,1,"#ffffff");
  }
 }
 if(refuse){ // Lowered brows make an incorrect order visibly upsetting.
  px(g,29,41,10,2,p.eyes);px(g,46,40,10,2,p.eyes);
  px(g,30,42,5,1,p.eyes);px(g,51,42,5,1,p.eyes);
 }
 if(kind===2){ // Small glasses, readable even when the customer blinks.
  px(g,29,43,12,1,"#4d5c6b");px(g,43,43,12,1,"#4d5c6b");px(g,40,44,4,1,"#4d5c6b");
 }
 px(g,39,54,2,2,"#d89487");px(g,28,55,4,2,"#e49d9d");px(g,50,55,4,2,"#e49d9d");
 if(refuse){
  px(g,36,61,9,2,"#754459");px(g,36,59,2,3,"#754459");px(g,43,59,2,3,"#754459");
 }else if(talk){px(g,37,59,7,4,"#a95364");px(g,39,61,3,1,"#f2b4aa");}
 else{px(g,37,60,7,2,"#9b5568");px(g,39,62,3,1,"#f5c6b7");}
 // Scarf + pin + asymmetric scarf tail.
 steps(g,[[22,68,36,10],[24,76,32,5]],O);
 steps(g,[[24,69,32,9],[27,77,26,3]],p.scarf);
 px(g,25,69,29,2,"#fff0dc");
 px(g,46,79,9,28,O);px(g,47,79,7,25,p.scarf);px(g,48,83,4,2,p.coatLight);
 px(g,33,75,13,4,p.coatShadow);px(g,36,76,7,2,p.hatLight);
 // A customer receiving merchandise physically reaches forward.
 if(receive){
  steps(g,[[53,81,17,10],[60,77,15,11]],O);
  steps(g,[[54,82,15,7],[61,78,12,8]],p.coatLight);
  steps(g,[[68,76,8,11]],O);px(g,69,77,6,8,p.skinLight);
  px(g,69,77,6,2,"#fff4d8");
 }else if(refuse){
  // Arms fold across the coat: a separate hand-authored pose.
  steps(g,[[5,88,27,16],[48,88,27,16],[22,96,37,13]],O);
  steps(g,[[7,90,25,12],[48,90,25,12]],p.coatLight);
  steps(g,[[18,96,44,10]],p.coatShadow);
  px(g,21,95,8,7,p.skinLight);px(g,51,95,8,7,p.skinLight);
  px(g,22,95,6,2,"#fff1d8");px(g,52,95,6,2,"#fff1d8");
 }else{
  steps(g,[[5,101,18,15],[57,101,18,15]],O);
  steps(g,[[7,102,14,11],[59,102,14,11]],p.hat);
  px(g,8,103,11,3,p.hatLight);px(g,61,103,11,3,p.hatLight);
 }
 // Individual coat hardware, pockets, fabric highlights.
 px(g,35,87,10,3,p.coatShadow);px(g,38,89,4,5,p.hatLight);
 px(g,27,103,2,9,p.coatShadow);px(g,51,103,2,9,p.coatShadow);
 px(g,27,102,5,1,p.coatLight);px(g,48,102,5,1,p.coatLight);
 px(g,20,117,40,2,shadow);
}
export function drawPixelCustomer(g,{x,y,w,h,tone=0,phase=0,talking=false,receiving=false,refusing=false}){
 const kind=((Math.floor(tone)%4)+4)%4;
 const blink=Math.floor(phase)%197>=193;
 const mouth=Boolean(talking)&&Math.floor(phase/10)%2===0;
 const refusal=Boolean(refusing)&&!receiving;
 const key="person-"+[kind,+blink,+mouth,+Boolean(receiving),+refusal].join("-");
 let img=cache.get(key);
 if(!img){img=raster(80,120,c=>paintPerson(c,palettes[kind],kind,blink,mouth,receiving,refusal));cache.set(key,img);}
 const s=Math.min(w/80,h/120);
 const bob=Math.round(Math.sin(phase*.06)*1.1);
 const xx=Math.round(x+w/2-40*s),yy=Math.round(y+h*.96-120*s+bob);
 g.save();g.imageSmoothingEnabled=false;
 g.drawImage(img,xx,yy,Math.round(80*s),Math.round(120*s));
 g.restore();
}
function paintItem(g,sku){
 const O="#202b4d";
 if(sku==="tea"){
  steps(g,[[5,7,14,18],[19,10,4,10]],O);
  px(g,7,9,11,13,"#f5ebd9");px(g,7,16,11,6,"#5075a4");
  px(g,19,12,2,6,"#f5ebd9");px(g,8,8,10,2,"#ffffff");
  px(g,9,3,2,4,"#b7d9ed");px(g,14,2,2,5,"#b7d9ed");
  px(g,7,23,12,2,"#314e7d");
 }else if(sku==="bread"){
  steps(g,[[3,12,19,12],[6,8,14,17],[9,5,8,6]],O);
  steps(g,[[5,12,15,10],[8,8,10,15],[10,6,6,6]],"#d99a4e");
  px(g,8,13,12,7,"#f3cb80");px(g,10,7,6,3,"#ffe2a0");
  px(g,5,22,16,3,"#7d5d50");px(g,10,12,2,4,"#e4aa5d");
 }else if(sku==="battery"){
  px(g,5,4,14,22,O);px(g,8,2,8,3,"#c8e2ec");
  px(g,7,6,10,18,"#4b85bb");px(g,7,16,10,8,"#244c80");
  px(g,9,10,6,7,"#f1d887");px(g,11,11,2,5,"#e4a14d");
  px(g,8,6,8,2,"#a2c9e4");
 }else{
  px(g,4,5,16,21,O);px(g,6,8,12,15,"#9c78a1");
  px(g,5,4,14,6,"#e4d8df");px(g,7,12,10,9,"#f0c49a");
  px(g,8,14,8,3,"#a8797f");px(g,9,20,6,2,"#a8797f");
  px(g,6,23,12,2,"#523f69");
 }
}
export function drawPixelItem(g,sku,x,y,w,h){
 if(!["tea","bread","battery","cocoa"].includes(sku))return;
 const key="item-"+sku;
 let img=cache.get(key);
 if(!img){img=raster(24,28,c=>paintItem(c,sku));cache.set(key,img);}
 g.save();g.imageSmoothingEnabled=false;
 g.drawImage(img,Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
 g.restore();
}
function paintStreet(g){
 px(g,0,0,160,112,"#24395d");
 // Dithered winter sky: horizontal bands rather than a smooth gradient.
 for(let i=0;i<12;i++)px(g,0,i*6,160,6,i%3===0?"#2b4670":i%3===1?"#334f79":"#3b5882");
 px(g,0,62,160,50,"#627fa1");
 const blocks=[
  [0,48,24,38,"#293d63"],[19,35,32,52,"#344b72"],
  [52,52,26,36,"#304668"],[73,40,34,48,"#253c66"],
  [104,50,27,38,"#3a5379"],[126,34,34,54,"#304668"]
 ];
 for(let i=0;i<blocks.length;i++){
  const [x,y,w,h,col]=blocks[i];
  px(g,x,y,w,h,col);
  // Stepped snow-capped roofs and staggered windows.
  px(g,x,y-3,w,4,"#d6e6ee");px(g,x+4,y-6,w-9,3,"#e6f1f2");
  for(let yy=y+9;yy<y+h-5;yy+=12)for(let xx=x+5;xx<x+w-4;xx+=9){
   px(g,xx,yy,3,5,((xx+yy+i)%4===0)?"#ffd899":"#7794b2");
  }
 }
 // An original chimney silhouette anchors the exhaust to the rooftop.
 px(g,37,28,9,8,"#1b3151");px(g,36,26,11,3,"#c4d9e5");
 px(g,38,25,7,1,"#f0f5f8");
 // Near shopfront silhouettes, winter pavement and snow banks.
 px(g,0,89,160,23,"#e6edf3");
 px(g,0,93,160,3,"#c5d9e9");
 for(let i=0;i<8;i++){px(g,i*24-6,90+i%2*2,18,2,"#f9fcff");px(g,i*19+2,102,11,2,"#c4d5e4");}
 px(g,127,51,3,40,"#263450");px(g,122,51,11,3,"#263450");
 px(g,124,47,7,6,"#ffcd7b");px(g,126,48,3,3,"#fff2c7");
 px(g,125,56,6,3,"#e0a65d");
 // Light spilling across the snow.
 px(g,120,90,20,2,"#e8d4b6");px(g,124,92,13,2,"#e8d4b6");
}

/**
 * Pure frame sampler for original 160x112 exterior pixel animation.
 * Only presentation changes: neither shop inventory nor WebRTC state is touched.
 * The street is painted in independent layers, never a flattened game screenshot.
 */
export function streetAnimationFrame(phase=0){
 const tick=Number.isFinite(phase)?Math.max(0,Math.floor(phase)):0;
 return {
  walkerX:(Math.floor(tick/5)*2)%196-18,
  stride:Math.floor(tick/9)%4,
  busX:(Math.floor(tick/3)%236)-38,
  lampBright:Math.floor(tick/23)%7!==0,
  smoke:Array.from({length:5},(_,i)=>{
   const rise=(Math.floor(tick/9)+i*6)%32;
   return {x:40+Math.floor(rise/8)+((i*3+Math.floor(tick/22))%3)-1,
    y:26-rise,size:Math.max(1,3-Math.floor(rise/13))};
  })
 };
}
function paintStreetMotion(g,phase){
 const f=streetAnimationFrame(phase);
 // Chimney exhaust drifts above the rooftops in individually drawn pixel puffs.
 for(const puff of f.smoke){
  if(puff.y<2)continue;
  px(g,puff.x,puff.y,puff.size+2,2,"#a3bed4");
  px(g,puff.x+1,puff.y-1,puff.size,1,"#e1eaf0");
 }
 // A distant late bus: body, separate windows, wheels and tail lamps.
 const bx=f.busX,by=78;
 px(g,bx-1,by+2,30,9,"#243754");
 px(g,bx,by,28,9,"#57708e");
 px(g,bx+2,by+2,5,3,"#ffe0a0");
 px(g,bx+9,by+2,5,3,"#c8ddeb");
 px(g,bx+16,by+2,5,3,"#ffe0a0");
 px(g,bx+24,by+3,2,3,"#f5a576");
 px(g,bx+4,by+8,4,3,"#172740");
 px(g,bx+21,by+8,4,3,"#172740");
 // A bundled-up passerby walks along the snowy pavement, not inside the shop.
 const x=f.walkerX,y=79;
 px(g,x+2,y,6,3,"#1c3151");
 px(g,x+3,y-3,4,4,"#b9c8d8");
 px(g,x+2,y-2,6,2,"#547c98");
 px(g,x+1,y+3,8,9,"#253d63");
 px(g,x+2,y+4,6,6,"#876c82");
 px(g,x+1,y+5,2,7,"#192c4a");
 px(g,x+8,y+5,2,7,"#192c4a");
 px(g,x+2,y+12,3,4+(f.stride===0?1:0),"#1b2945");
 px(g,x+6,y+12,3,4+(f.stride===2?1:0),"#1b2945");
 px(g,x+2,y+5,6,2,"#e0b18d");
 px(g,x+7,y+5,2,6,"#e0b18d");
 // Gas lamp has a sparse two-tone shimmer; no blurry overlay or imported art.
 px(g,124,47,7,6,f.lampBright?"#ffda91":"#dfad6d");
 px(g,126,48,3,3,f.lampBright?"#fff5d5":"#f6d5a2");
 px(g,120,90,f.lampBright?19:15,2,f.lampBright?"#e8d4b6":"#b8b5b3");
}

export function drawPixelStreet(g,x,y,w,h,phase){
 let img=cache.get("street");
 if(!img){img=raster(160,112,paintStreet);cache.set("street",img);}
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.imageSmoothingEnabled=false;
 // Crop the 160x112 backdrop to the aperture aspect instead of distorting
 // every building when switching between portrait and landscape windows.
 const cover=Math.max(w/160,h/112);
 const sourceW=w/cover,sourceH=h/cover;
 g.drawImage(img,(160-sourceW)/2,(112-sourceH)/2,sourceW,sourceH,
   Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
 // Animated exterior stays a distinct reusable 160x112 transparent layer.
 // Draw with the same source crop so moving objects never stretch on rotation.
 let motion=cache.get("street-motion");
 if(!motion){motion=raster(160,112,()=>{});cache.set("street-motion",motion);}
 const mg=motion.getContext("2d");mg.clearRect(0,0,160,112);
 paintStreetMotion(mg,phase);
 g.drawImage(motion,(160-sourceW)/2,(112-sourceH)/2,sourceW,sourceH,
   Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
 const cell=Math.max(2,Math.round(w/160*2));
 // Snow is a separate time-dependent layer; deterministic across both clients.
 for(let i=0;i<42;i++){
  const sx=((i*59+11+Math.floor(phase/(i%4+2)))%160+160)%160;
  const sy=((i*41+phase*(i%3+1)*.25)%112+112)%112;
  px(g,x+sx/160*w,y+sy/112*h,cell+(i%5===0?1:0),cell,i%7===0?"#fff5cf":"#f2f9ff");
 }
 g.restore();
}
