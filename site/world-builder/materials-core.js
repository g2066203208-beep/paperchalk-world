/**
 * PAPERWORLD / World Builder · tileable native pixel materials.
 * 32 structured 16x16 tiles, 4 game inks (indices 1–4) and zero interpolation.
 * The saved pack is shared by Material Studio and the original WebGL game origin.
 */
export const TILE=16, ATLAS_COLS=8, ATLAS_ROWS=4;
export const PALETTE=Object.freeze(['#393657','#F2A5C2','#A9BAE9','#FFF5E6']);
export const STORAGE_KEY='paperworld-world-materials-v1';
export const MATERIALS=Object.freeze([
 {id:'stone',name:'石砌墙',en:'CUT STONE',role:'墙体 / 基础',scale:2,group:'building'},
 {id:'brick',name:'樱色砖',en:'PINK BRICK',role:'建筑外墙',scale:2,group:'building'},
 {id:'wood',name:'木板',en:'PLANKS',role:'梁柱 / 家具',scale:2,group:'building'},
 {id:'plaster',name:'粉刷墙',en:'PLASTER',role:'室内 / 外墙',scale:3,group:'building'},
 {id:'roof',name:'屋瓦',en:'ROOF TILES',role:'屋顶',scale:2,group:'building'},
 {id:'paving',name:'石板路',en:'PAVING',role:'道路 / 地板',scale:2,group:'ground'},
 {id:'grass',name:'草地',en:'MEADOW',role:'地形 / 庭院',scale:3,group:'ground'},
 {id:'glass',name:'彩色窗',en:'GLASS',role:'窗户 / 门',scale:2,group:'building'},
 // 地表：草甸、岩石、泥土、细沙、人行道、石路不使用同一张重复图。
 {id:'wildgrass',name:'高草甸',en:'TALL GRASS',role:'原野 / 草坡',scale:3,group:'ground'},
 {id:'clover',name:'三叶草',en:'CLOVER',role:'草坪 / 庭园',scale:3,group:'ground'},
 {id:'flowers',name:'野花丛',en:'WILDFLOWERS',role:'花田 / 公园',scale:3,group:'ground'},
 {id:'dirt',name:'土壤',en:'EARTH',role:'林地 / 裸土',scale:2,group:'ground'},
 {id:'pebbles',name:'河卵石',en:'PEBBLE BANK',role:'溪岸 / 碎石滩',scale:2,group:'ground'},
 {id:'sand',name:'浅沙地',en:'PALE SAND',role:'沙地 / 岸边',scale:2,group:'ground'},
 {id:'moss',name:'苔石',en:'MOSS STONE',role:'苔藓 / 遗迹',scale:2,group:'ground'},
 {id:'gravel',name:'细碎石',en:'GRAVEL',role:'小径 / 路基',scale:2,group:'ground'},
 {id:'cobble',name:'鹅卵石路',en:'COBBLESTONE',role:'老街 / 广场',scale:2,group:'ground'},
 {id:'path',name:'土径',en:'WORN PATH',role:'公园小路',scale:2,group:'ground'},
 {id:'asphalt',name:'深色路面',en:'DARK ROAD',role:'主街 / 马路',scale:3,group:'ground'},
 {id:'sidewalk',name:'人行道',en:'SIDEWALK',role:'街沿 / 步道',scale:2,group:'ground'},
 {id:'wetsoil',name:'湿土',en:'WET GROUND',role:'树林 / 岸线',scale:2,group:'ground'},
 {id:'limestone',name:'浅岩地',en:'LIMESTONE',role:'岩丘 / 石层',scale:2,group:'ground'},
 // 建筑构件：门必须像门，窗必须有窗框，不能用一块石头代替。
 {id:'timber',name:'木梁纹',en:'TIMBER BEAMS',role:'梁柱 / 结构',scale:2,group:'building'},
 {id:'wallblue',name:'蓝灰墙',en:'BLUE MASONRY',role:'住宅 / 商铺',scale:3,group:'building'},
 {id:'door',name:'木门板',en:'WOODEN DOOR',role:'民居 / 商店入口',scale:2,group:'building'},
 {id:'doorframe',name:'门框',en:'DOOR FRAME',role:'木门 / 框架',scale:2,group:'building'},
 {id:'window',name:'玻璃窗格',en:'WINDOW PANE',role:'窗格 / 采光',scale:2,group:'building'},
 {id:'windowlit',name:'暖光窗',en:'LIT WINDOW',role:'夜晚 / 商铺',scale:2,group:'building'},
 // 树木从“方块堆叠”升级成树皮、叶簇和灌木的可替换美术资产。
 {id:'bark',name:'树皮',en:'TREE BARK',role:'树干 / 树枝',scale:2,group:'nature'},
 {id:'leavesblue',name:'蓝色树叶',en:'BLUE FOLIAGE',role:'林木 / 树冠',scale:2,group:'nature'},
 {id:'leavespink',name:'樱花树叶',en:'BLOSSOM FOLIAGE',role:'樱花 / 花树',scale:2,group:'nature'},
 {id:'hedge',name:'灌木叶',en:'HEDGE',role:'灌木 / 树篱',scale:2,group:'nature'}
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

 case 'wildgrass':
  a=blank(3);
  for(const [x,y,c] of [[1,0,1],[5,6,1],[12,4,1],[9,11,1],[15,14,1]]){
   v(a,x,y,3,c);set(a,x-1,y+1,2);set(a,x+1,y,4);h(a,x-1,y+3,3,3);
  }
  h(a,7,2,2,4);h(a,0,12,3,2);
  break;
 case 'clover':
  a=blank(3);
  for(const [x,y] of [[3,3],[11,10],[13,1]]){
   set(a,x,y,4);set(a,x+1,y,2);set(a,x,y+1,2);set(a,x+1,y+1,1);
   set(a,x,y+2,4);set(a,x-1,y+1,4);
  }
  h(a,7,6,2,2);v(a,1,11,3,1);
  break;
 case 'flowers':
  a=blank(3);
  for(const [x,y,c] of [[2,2,2],[10,4,4],[5,12,4],[14,13,2]]){
   set(a,x,y,c);set(a,x-1,y+1,c);set(a,x+1,y+1,c);set(a,x,y+2,c);
   set(a,x,y+1,1);v(a,x,y+3,2,1);
  }
  h(a,8,11,3,4);
  break;
 case 'dirt':
  a=blank(2);
  for(const [x,y,n,c] of [[0,1,4,1],[9,3,3,1],[3,8,5,3],[11,12,4,1],[6,15,3,4],[1,13,3,3]])h(a,x,y,n,c);
  for(const [x,y] of [[6,2],[14,7],[1,11],[9,9]])set(a,x,y,4);
  break;
 case 'pebbles':
  a=blank(1);
  for(const [x,y] of [[1,2],[8,0],[12,7],[3,10],[9,12]]){
   h(a,x,y,3,4);h(a,x-1,y+1,5,3);h(a,x,y+2,3,3);set(a,x+4,y+1,2);
  }
  break;
 case 'sand':
  a=blank(4);
  for(const [x,y] of [[1,1],[8,3],[4,9],[13,12],[0,15]]){
   h(a,x,y,4,3);h(a,x+1,y+1,2,2);set(a,x+2,y+2,3);
  }
  h(a,10,7,4,3);
  break;
 case 'moss':
  a=blank(3);
  for(const [x,y] of [[0,0],[8,0],[4,8],[12,8]]){
   h(a,x,y,8,1);v(a,x,y,8,1);h(a,x+1,y+2,4,4);h(a,x+3,y+5,4,2);
  }
  for(const [x,y] of [[3,4],[10,6],[5,13],[14,14]]){set(a,x,y,2);set(a,x+1,y,2);set(a,x,y+1,1)}
  break;
 case 'gravel':
  a=blank(1);
  for(const [x,y,c] of [[1,1,3],[5,3,4],[12,0,3],[2,10,4],[9,9,3],[13,13,4]]){
   h(a,x,y,3,c);h(a,x+1,y+1,2,2);set(a,x+2,y+2,c);
  }
  break;
 case 'cobble':
  a=blank(1);
  for(let y=0;y<16;y+=5)for(let x=(y%2)*2;x<18;x+=7){
   h(a,x+1,y+1,5,3);h(a,x+1,y+2,5,3);h(a,x+2,y+3,4,4);set(a,x+1,y+3,2);
  }
  break;
 case 'path':
  a=blank(2);
  for(let y=0;y<16;y+=6){h(a,0,y,16,3);h(a,2,y+1,7,4);h(a,9,y+4,5,1)}
  set(a,13,8,4);set(a,14,8,4);
  break;
 case 'asphalt':
  a=blank(1);
  for(const [x,y] of [[1,2],[10,4],[5,9],[13,13]]){h(a,x,y,3,3);set(a,x+1,y+1,2)}
  h(a,4,15,3,3);
  break;
 case 'sidewalk':
  a=blank(4);
  for(const y of [0,8])h(a,0,y,16,1);
  for(const x of [0,8])v(a,x,0,16,1);
  for(const [x,y] of [[2,2],[10,2],[2,10],[10,10]]){h(a,x,y,3,3);h(a,x+1,y+1,4,3)}
  break;
 case 'wetsoil':
  a=blank(1);
  for(const [x,y] of [[0,2],[8,0],[4,8],[11,12]]){h(a,x,y,6,2);h(a,x+1,y+1,4,3);set(a,x+4,y+3,4)}
  break;
 case 'limestone':
  a=blank(4);
  for(let y=0;y<16;y+=7){
   h(a,0,y,16,3);h(a,2,y+2,7,3);
   for(let x=(y===0?1:5);x<18;x+=8){v(a,x,y,7,1);h(a,x+2,y+5,4,2)}
  }
  break;
 case 'timber':
  a=blank(2);
  for(let x=0;x<16;x+=6){v(a,x,0,16,1);v(a,x+1,0,16,4);v(a,x+4,0,16,3)}
  for(const y of [3,11]){h(a,0,y,16,1);h(a,0,y+1,16,4)}
  break;
 case 'wallblue':
  a=blank(3);
  for(let y=0;y<16;y+=8){h(a,0,y,16,4);h(a,1,y+1,6,4);h(a,9,y+6,5,1)}
  for(const [x,y] of [[2,4],[11,2],[6,12],[14,14]])set(a,x,y,2);
  break;
 case 'door':
  a=blank(2);
  for(const x of [0,15])v(a,x,0,16,1);
  for(const y of [0,15])h(a,0,y,16,1);
  for(const x of [3,11])v(a,x,2,12,1);
  h(a,2,4,12,4);h(a,2,11,12,1);
  for(const y of [6,13])h(a,4,y,6,3);
  set(a,12,9,4);set(a,12,10,1);
  break;
 case 'doorframe':
  a=blank(4);
  for(const x of [0,1,14,15])v(a,x,0,16,1);
  for(const y of [0,1,14,15])h(a,0,y,16,1);
  v(a,3,3,10,2);v(a,12,3,10,2);h(a,3,3,10,2);
  break;
 case 'window':
  a=blank(3);
  for(const x of [0,7,15])v(a,x,0,16,1);
  for(const y of [0,8,15])h(a,0,y,16,1);
  for(let i=0;i<6;i++){set(a,1+i,1+i,4);set(a,8+i,9+i,4)}
  h(a,9,3,4,2);
  break;
 case 'windowlit':
  a=blank(4);
  for(const x of [0,7,15])v(a,x,0,16,1);
  for(const y of [0,8,15])h(a,0,y,16,1);
  h(a,2,2,4,2);h(a,9,10,4,2);
  for(let i=0;i<4;i++){set(a,1+i,10+i,3);set(a,9+i,1+i,3)}
  break;
 case 'bark':
  a=blank(1);
  for(const x of [1,6,11]){v(a,x,0,16,2);v(a,x+1,0,16,3);v(a,x+3,2,9,4)}
  h(a,1,7,4,1);h(a,10,13,4,1);
  break;
 case 'leavesblue':
  a=blank(3);
  for(const [x,y] of [[1,1],[9,0],[4,8],[12,10]]){
   h(a,x,y,5,1);h(a,x,y+1,6,2);h(a,x+1,y+2,5,4);h(a,x+2,y+3,3,3);
  }
  break;
 case 'leavespink':
  a=blank(2);
  for(const [x,y] of [[1,2],[8,0],[4,10],[12,9]]){
   h(a,x,y,5,1);h(a,x,y+1,6,4);h(a,x+2,y+2,5,3);set(a,x+2,y,2);
  }
  break;
 case 'hedge':
  a=blank(3);
  for(const [x,y] of [[0,0],[8,0],[0,8],[8,8]]){
   h(a,x,y,7,1);h(a,x+1,y+1,6,2);h(a,x+1,y+3,6,4);
   h(a,x+2,y+5,4,1);set(a,x+3,y+6,2);
  }
  break;
 default:throw Error('Unknown material '+type);
 }
 return a;
}
export function freshPack(){
 return {format:FORMAT,tileSize:TILE,palette:[...PALETTE],
  materials:MATERIALS.map(m=>({id:m.id,name:m.name,pixels:drawTile(m.id)}))};
}
/** Keep the user's eight original edited materials when upgrading the live game. */
export function migratePack(value){
 if(!value||value.format!==FORMAT||value.tileSize!==TILE||!Array.isArray(value.materials))return value;
 if(value.materials.length!==8)return value;
 const fresh=freshPack();
 if(value.materials.some((item,i)=>item?.id!==MATERIALS[i].id))return value;
 fresh.materials.splice(0,8,...value.materials);
 return fresh;
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
 try{const text=storage?.getItem(STORAGE_KEY);if(text&&text.length<=100000)return validatePack(migratePack(JSON.parse(text)))}catch{}
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
