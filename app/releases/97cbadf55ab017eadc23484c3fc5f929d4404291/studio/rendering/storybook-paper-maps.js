/** Quiet dyed-paper pigment. Shape, light and contact shadows carry the detail. */
export const STORYBOOK_PAPER_PALETTE=Object.freeze({
  grass:0x93aa76,dirt:0xc99c79,leaf:0x668879,trunk:0x9c7865,
  stone:0xbcb5c0,edge:0xd8cdad
});

export const STORYBOOK_PAPER_DEFAULTS=Object.freeze({scale:1.8,normal:0,height:0,blend:0});

const SIZE=256;

function hash(x,y,seed){
  let n=Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^Math.imul(seed,1442695041);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}

// The lattice wraps, not just the resulting texture. Smooth first derivatives
// make the last-to-first texel transition as quiet as any interior transition.
function periodicNoise(x,y,period,seed){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash(ix%period,iy%period,seed),b=hash((ix+1)%period,iy%period,seed);
  const c=hash(ix%period,(iy+1)%period,seed),d=hash((ix+1)%period,(iy+1)%period,seed);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}

function pigmentPixels(hex,seed){
  const pigment=new Float32Array(SIZE*SIZE);
  let sum=0;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const u=x/SIZE,v=y/SIZE;
    const value=periodicNoise(u*3,v*3,3,seed)*.72
      +periodicNoise(u*5,v*5,5,seed+41)*.28;
    pigment[y*SIZE+x]=value;sum+=value;
  }
  const mean=sum/pigment.length;
  const base=[(hex>>>16)&255,(hex>>>8)&255,hex&255];
  const data=new Uint8Array(SIZE*SIZE*4);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const index=y*SIZE+x,offset=index*4;
    // Broad variation is at most a few percent. Grain is under one byte even
    // before quantization, so it cannot turn backlit surfaces into sandpaper.
    const tone=1+(pigment[index]-mean)*.13;
    const grain=(hash(x,y,seed+197)-.5)*.7;
    for(let channel=0;channel<3;channel++){
      data[offset+channel]=Math.max(0,Math.min(255,Math.round(base[channel]*tone+grain)));
    }
    data[offset+3]=255;
  }
  return data;
}

export function createStorybookPaperMaps({THREE,renderer}){
  const maximumAnisotropy=renderer?.capabilities?.getMaxAnisotropy?.()??1;
  const anisotropy=Number.isFinite(maximumAnisotropy)?Math.max(1,Math.min(4,maximumAnisotropy)):1;
  function surface(label,paletteKey,seed){
    const color=new THREE.DataTexture(pigmentPixels(STORYBOOK_PAPER_PALETTE[paletteKey],seed),SIZE,SIZE,
      THREE.RGBAFormat,THREE.UnsignedByteType);
    color.name='StorybookPaper/'+label;
    color.colorSpace=THREE.SRGBColorSpace;
    color.wrapS=color.wrapT=THREE.RepeatWrapping;
    color.minFilter=THREE.LinearMipmapLinearFilter;
    color.magFilter=THREE.LinearFilter;
    color.generateMipmaps=true;
    color.anisotropy=anisotropy;
    color.channel=0;
    color.needsUpdate=true;
    return {color,normal:null,roughness:null,ao:null};
  }
  const paperGrassSet=surface('Grass','grass',731);
  const paperDirtSet=surface('Dirt','dirt',991);
  const paperLeafSet=surface('Leaf','leaf',1201);
  const paperTrunkSet=surface('Trunk','trunk',1571);
  const textures=[paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet].map(set=>set.color);
  function setScale(worldUnits=STORYBOOK_PAPER_DEFAULTS.scale){
    const valid=Number.isFinite(worldUnits)&&worldUnits>0&&Number.isFinite(1/worldUnits);
    const scale=valid?worldUnits:STORYBOOK_PAPER_DEFAULTS.scale;
    for(const texture of textures)texture.repeat.set(1/scale,1/scale);
    return scale;
  }
  setScale();
  return {paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet,textures,setScale};
}
