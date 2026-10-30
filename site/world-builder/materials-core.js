/**
 * PAPERWORLD / World Builder · tileable native pixel materials.
 * 8 hand-structured 16x16 tiles, 4 game inks (indices 1–4) and zero interpolation.
 * The saved pack is shared by Material Studio and the original WebGL game origin.
 */
export const TILE=16, ATLAS_COLS=4, ATLAS_ROWS=2;
export const PALETTE=Object.freeze(['#393657','#F2A5C2','#A9BAE9','#FFF5E6']);
export const STORAGE_KEY='paperworld-world-materials-v1';
export const MATERIALS=Object.freeze([
 {id:'stone',name:'石砌墙',en:'CUT STONE',role:'墙体 / 基础',scale:2},
 {id:'brick',name:'樱色砖',en:'PINK BRICK',role:'建筑外墙',scale:2},
 {id:'wood',name:'木板',en:'PLANKS',role:'梁柱 / 家具',scale:2},
 {id:'plaster',name:'粉刷墙',en:'PLASTER',role:'室内 / 外墙',scale:3},
 {id:'roof',name:'屋瓦',en:'ROOF TILES',role:'屋顶',scale:2},
 {id:'paving',name:'石板路',en:'PAVING',role:'道路 / 地板',scale:2},
 {id:'grass',name:'草地',en:'MEADOW',role:'地形 / 庭院',scale:3},
 {id:'glass',name:'彩色窗',en:'GLASS',role:'窗户 / 门',scale:2}
]);
export const FORMAT='paperworld-material-pack-v1';
export const SIZE=TILE*TILE;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapped=(v)=>((v%TILE)+TILE)%TILE;
function blank(color){return Array(SIZE).fill(color)}
function set(a,x,y,c){a[wrapped(y)*TILE+wrapped(x)]=c}
function h(a,x,y,n,c){for(let i=0;i<n;i++)set(a,x+i,y,c)}
function v(a,x,y,n,c){for(let i=0;i<n;i++)set(a,x,y+i,c)}
function drawTile(type){
 let a;
 switch(type){
 case 'stone':
  a=blank(3);
  for(let y=0;y<16;y+=8){
   h(a,0,y,16,1);h(a,0,y+1,16,4);
   for(let x=(y===0?0:4);x<20;x+=8){
    v(a,x,y,8,1);v(a,x+1,y+2,5,4);
    h(a,x+3,y+3,3,4);h(a,x+2,y+6,4,2);
   }
  }
  break;
 case 'brick':
  a=blank(2);
  for(let row=0;row<4;row++){
   const y=row*4,offset=(row%2)*4;
   h(a,0,y,16,4);
   for(let x=offset;x<16+offset;x+=8){
    v(a,x,y,4,1);h(a,x+2,y+1,4,3);h(a,x+2,y+3,5,1);
   }
  }
  break;
 case 'wood':
  a=blank(1);
  for(let x=0;x<16;x+=8){
   v(a,x,0,16,4);v(a,x+1,0,16,2);
   v(a,x+5,2,10,2);v(a,x+6,3,6,3);
  }
  h(a,0,0,8,1);h(a,8,8,8,1);
  h(a,1,1,5,3);h(a,9,9,5,3);
  break;
 case 'plaster':
  a=blank(4);
  h(a,1,1,3,3);h(a,11,10,4,3);h(a,7,4,2,2);
  h(a,9,5,2,3);h(a,2,11,2,3);set(a,13,3,2);
  break;
 case 'roof':
  a=blank(3);
  for(let y=0;y<16;y+=4){
   h(a,0,y,16,1);
   for(let x=(y%8===0?0:4);x<20;x+=8){
    v(a,x,y+1,3,1);h(a,x+2,y+1,4,4);h(a,x+2,y+3,5,2);
   }
  }
  break;
 case 'paving':
  a=blank(4);
  for(let y=0;y<16;y+=8){
   h(a,0,y,16,1);
   for(let x=(y===0?0:4);x<20;x+=8){
    v(a,x,y,8,1);
    h(a,x+1,y+1,5,3);h(a,x+2,y+2,4,3);
    h(a,x+3,y+6,4,2);
   }
  }
  break;
 case 'grass':
  a=blank(3);
  for(const [x,y] of [[1,2],[9,1],[4,10],[12,11]]){
   v(a,x+1,y,3,1);set(a,x,y+1,2);set(a,x+2,y+1,2);
   set(a,x+1,y,4);
  }
  h(a,6,6,3,2);h(a,7,7,2,4);
  h(a,0,14,3,2);
  break;
 case 'glass':
  a=blank(3);
  v(a,0,0,16,1);v(a,15,0,16,1);h(a,0,0,16,1);h(a,0,15,16,1);
  v(a,7,0,16,1);h(a,0,8,16,1);
  for(let d=0;d<5;d++){set(a,2+d,1+d,4);set(a,9+d,9+d,4)}
  h(a,9,3,5,2);h(a,2,12,4,2);
  break;
 default:throw Error('Unknown material '+type);
 }
 return a;
}
export function freshPack(){
 return {format:FORMAT,tileSize:TILE,palette:[...PALETTE],
  materials:MATERIALS.map(m=>({id:m.id,name:m.name,pixels:drawTile(m.id)}))};
}
export function validatePack(value){
 if(!value||value.format!==FORMAT||value.tileSize!==TILE)throw Error('材质工程版本不支持');
 if(!Array.isArray(value.palette)||value.palette.length!==4||value.palette.some((p,i)=>p!==PALETTE[i]))throw Error('材质工程必须使用游戏正式四色');
 if(!Array.isArray(value.materials)||value.materials.length!==MATERIALS.length)throw Error('材质数量错误');
 for(let i=0;i<MATERIALS.length;i++){
  const a=value.materials[i],m=MATERIALS[i];
  if(!a||a.id!==m.id||typeof a.name!=='string'||a.name.length>30
    ||!Array.isArray(a.pixels)||a.pixels.length!==SIZE
    ||a.pixels.some(v=>!Number.isInteger(v)||v<1||v>4))throw Error('材质 '+m.id+' 不是有效的四色 16×16 像素');
 }
 return value;
}
export function tryReadPack(storage){
 try{const text=storage?.getItem(STORAGE_KEY);if(text&&text.length<=100000)return validatePack(JSON.parse(text))}catch{}
 return freshPack();
}
export function writePack(storage,pack){
 validatePack(pack);storage.setItem(STORAGE_KEY,JSON.stringify(pack));
}
export function paint(pack,id,x,y,color,wrap=false,brush=1){
 const a=pack.materials[id]?.pixels;
 if(!a||!Number.isInteger(color)||color<1||color>4||!Number.isInteger(x)||!Number.isInteger(y))return false;
 let changed=false;
 for(let j=0;j<brush;j++)for(let i=0;i<brush;i++){
  let xx=x+i,yy=y+j;if(wrap){xx=wrapped(xx);yy=wrapped(yy)}
  if(xx<0||yy<0||xx>=TILE||yy>=TILE)continue;
  const at=yy*TILE+xx;if(a[at]!==color){a[at]=color;changed=true}
 }
 return changed;
}
export function stroke(pack,id,x0,y0,x1,y1,color,brush=1){
 x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
 if([x0,y0,x1,y1].some(v=>!Number.isFinite(v)||Math.abs(v)>64))return false;
 let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy,changed=false;
 while(true){changed=paint(pack,id,x0,y0,color,true,brush)||changed;
  if(x0===x1&&y0===y1)break;
  const twice=2*err;if(twice>=dy){err+=dy;x0+=sx}if(twice<=dx){err+=dx;y0+=sy}
 }
 return changed;
}
export function flood(pack,id,x,y,color){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=TILE||y>=TILE||!Number.isInteger(color)||color<1||color>4)return false;
 const a=pack.materials[id]?.pixels;if(!a)return false;
 const at=y*TILE+x,orig=a[at];if(orig===color)return false;
 const stack=[at];a[at]=color;
 while(stack.length){
  const p=stack.pop(),px=p%TILE,py=Math.floor(p/TILE);
  // Toroidal flood-fill: a seamless material has no artificial boundaries.
  for(const q of [py*TILE+wrapped(px-1),py*TILE+wrapped(px+1),wrapped(py-1)*TILE+px,wrapped(py+1)*TILE+px])
   if(a[q]===orig){a[q]=color;stack.push(q)}
 }
 return true;
}
export const sample=(pack,id,x,y)=>pack.materials[id].pixels[wrapped(y)*TILE+wrapped(x)];
export function tileRGBA(pack,id,repeat=1){
 validatePack(pack);
 const w=TILE*repeat,h=TILE*repeat,out=new Uint8ClampedArray(w*h*4);
 const colors=PALETTE.map(hex=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const c=colors[sample(pack,id,x,y)-1],p=(y*w+x)*4;
  out[p]=c[0];out[p+1]=c[1];out[p+2]=c[2];out[p+3]=255;
 }
 return {width:w,height:h,rgba:out};
}
export function atlasRGBA(pack,webgl=false){
 validatePack(pack);
 const width=TILE*ATLAS_COLS,height=TILE*ATLAS_ROWS,rgba=new Uint8Array(width*height*4);
 for(let m=0;m<MATERIALS.length;m++){
  const tile=tileRGBA(pack,m);const cx=(m%ATLAS_COLS)*TILE,cy=Math.floor(m/ATLAS_COLS)*TILE;
  for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
   const destY=webgl?height-1-(cy+y):cy+y;
   const p=(destY*width+cx+x)*4,q=(y*TILE+x)*4;
   rgba[p]=tile.rgba[q];rgba[p+1]=tile.rgba[q+1];rgba[p+2]=tile.rgba[q+2];rgba[p+3]=255;
  }
 }
 return {width,height,rgba};
}
