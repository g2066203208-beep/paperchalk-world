// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
import {rng,clamp} from './math.js';
import {createStorybookPaperMaps,STORYBOOK_PAPER_PALETTE,STORYBOOK_PAPER_DEFAULTS} from './storybook-paper-maps.js';

export function createPaperMaterials({THREE,renderer}){
function mistTexture(seed=1){
  const w=512,h=192,c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d'),r=rng(7400+seed*131);
  g.clearRect(0,0,w,h);

  // One strong torn-paper silhouette plus one lighter offset layer.
  for(let s=0;s<2;s++){
    const top=28+s*30+r()*8;
    const thickness=74+r()*34;
    const bottom=top+thickness;

    g.beginPath();
    g.moveTo(-24,top);
    for(let x=-24;x<=w+24;x+=16){
      const y=top+(r()-.5)*18+Math.sin((x+seed*37)*.034)*5;
      g.lineTo(x,y);
    }
    for(let x=w+24;x>=-24;x-=16){
      const y=bottom+(r()-.5)*20+Math.sin((x+seed*19)*.029)*6;
      g.lineTo(x,y);
    }
    g.closePath();

    const grad=g.createLinearGradient(0,top,0,bottom);
    const a=s===0?.88:.62;
    grad.addColorStop(0,'rgba(255,255,248,'+(a*.68).toFixed(3)+')');
    grad.addColorStop(.18,'rgba(252,253,247,'+a.toFixed(3)+')');
    grad.addColorStop(.74,'rgba(236,245,239,'+(a*.94).toFixed(3)+')');
    grad.addColorStop(1,'rgba(205,221,214,'+(a*.60).toFixed(3)+')');
    g.fillStyle=grad;g.fill();

    // Paper underside/edge.
    g.strokeStyle='rgba(91,112,104,.25)';
    g.lineWidth=1.6+s*.5;g.stroke();

    g.save();g.clip();
    for(let i=0;i<320;i++){
      const x=r()*w,y=top+r()*thickness,len=2+r()*11,a2=r()*Math.PI;
      g.strokeStyle=r()>.5?'rgba(255,255,255,.24)':'rgba(78,100,91,.14)';
      g.lineWidth=.45+r()*.75;
      g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a2)*len,y+Math.sin(a2)*len);g.stroke();
    }
    for(let i=0;i<54;i++){
      g.fillStyle=r()>.5?'rgba(255,255,255,.13)':'rgba(66,88,80,.10)';
      const q=.8+r()*3.2;g.fillRect(r()*w,top+r()*thickness,q,q);
    }
    g.restore();
  }

  // Fade only at horizontal ends; keep the torn top/bottom crisp.
  const sideFade=g.createLinearGradient(0,0,w,0);
  sideFade.addColorStop(0,'rgba(255,255,255,0)');
  sideFade.addColorStop(.045,'rgba(255,255,255,1)');
  sideFade.addColorStop(.955,'rgba(255,255,255,1)');
  sideFade.addColorStop(1,'rgba(255,255,255,0)');
  g.globalCompositeOperation='destination-in';
  g.fillStyle=sideFade;g.fillRect(0,0,w,h);
  g.globalCompositeOperation='source-over';

  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;
  return t;
}

function fillWrappedRect(ctx,size,x,y,w,h,fillStyle){
  ctx.fillStyle=fillStyle;
  const xs=[x],ys=[y];
  if(x<0)xs.push(x+size); if(x+w>size)xs.push(x-size);
  if(y<0)ys.push(y+size); if(y+h>size)ys.push(y-size);
  for(const xx of xs)for(const yy of ys)ctx.fillRect(xx,yy,w,h);
}

// ---------------------------------------------------------------------------
// Original Demo forest material system; terrain has its own Olive Fiber maps.
// One shared PBR set = albedo + NORMAL + roughness.  The height field is built
// once on CPU, then converted into a tangent-space normal map.  No per-block
// material allocation and no 18x 512px texture farm.
// ---------------------------------------------------------------------------
function makePaperSurface(baseHex,patchHexes,seed,{cutEdge=false,green=false}={}){
  const size=256;
  const colorCanvas=document.createElement('canvas');
  const heightCanvas=document.createElement('canvas');
  colorCanvas.width=colorCanvas.height=heightCanvas.width=heightCanvas.height=size;
  const cg=colorCanvas.getContext('2d'),hg=heightCanvas.getContext('2d');
  const r=rng(seed);

  cg.fillStyle=baseHex;cg.fillRect(0,0,size,size);
  hg.fillStyle='rgb(128,128,128)';hg.fillRect(0,0,size,size);

  // Broad pulp clouds: low frequency, quiet and handmade instead of noisy.
  for(let i=0;i<34;i++){
    const x=r()*size,y=r()*size,rx=18+r()*54,ry=12+r()*38;
    cg.globalAlpha=.055+r()*.075;
    cg.fillStyle=patchHexes[(r()*patchHexes.length)|0];
    cg.beginPath();cg.ellipse(x,y,rx,ry,r()*Math.PI,0,Math.PI*2);cg.fill();
  }
  cg.globalAlpha=1;

  // Random pressed-paper blocks. These are deliberately near-square rather
  // than generic noise: the SAME masks change albedo + height, so their edges
  // catch real light through the derived normal map.
  const patchCount=cutEdge?44:(green?30:36);
  for(let i=0;i<patchCount;i++){
    const w=Math.round((cutEdge?16:11)+r()*(cutEdge?44:34));
    const h=Math.round(w*(.72+r()*.56));
    const x=Math.floor(r()*size-w*.35);
    const y=Math.floor(r()*size-h*.35);
    const raised=r()>.48;

    const alpha=(cutEdge?.085:.060)+r()*(cutEdge?.105:.075);
    const dark=green?'rgba(64,92,48,':cutEdge?'rgba(79,46,31,':'rgba(76,63,43,';
    const light=green?'rgba(224,239,167,':cutEdge?'rgba(232,181,139,':'rgba(238,220,174,';
    fillWrappedRect(cg,size,x,y,w,h,(raised?light:dark)+alpha.toFixed(3)+')');

    // Feathered outer shelf + stronger inner plateau/depression.
    const outer=raised?(168+(r()*14|0)):(88-(r()*10|0));
    const inner=raised?(218+(r()*24|0)):(40-(r()*18|0));
    fillWrappedRect(hg,size,x,y,w,h,`rgb(${outer},${outer},${outer})`);
    const inset=Math.max(1,Math.round(Math.min(w,h)*.12));
    fillWrappedRect(hg,size,x+inset,y+inset,Math.max(2,w-inset*2),Math.max(2,h-inset*2),`rgb(${inner},${inner},${inner})`);
  }

  // Visible fibres. Cut cardboard fibres run mostly horizontally; face stock
  // stays much finer and more randomly oriented.
  const fibreCount=cutEdge?900:620;
  for(let i=0;i<fibreCount;i++){
    const x=r()*size,y=r()*size;
    const a=cutEdge?(r()-.5)*.34:r()*Math.PI;
    const len=cutEdge?2+r()*12:1+r()*7;
    const w=cutEdge?.42+r()*.78:.28+r()*.52;
    const light=r()>.48;

    cg.strokeStyle=light
      ?(green?'rgba(245,250,215,.20)':'rgba(255,239,212,.20)')
      :'rgba(61,42,31,.13)';
    cg.lineWidth=w;
    cg.beginPath();cg.moveTo(x,y);cg.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);cg.stroke();

    const hv=light?150+(r()*18|0):105+(r()*18|0);
    hg.strokeStyle=`rgb(${hv},${hv},${hv})`;
    hg.lineWidth=w*(cutEdge?1.35:1.0);
    hg.beginPath();hg.moveTo(x,y);hg.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);hg.stroke();
  }

  if(cutEdge){
    // Compressed lamination lines make the exposed edge read as real paper
    // stock rather than a brown game texture.
    for(let y=8;y<size;y+=11+(r()*7|0)){
      const a=.08+r()*.09;
      cg.fillStyle=`rgba(62,37,25,${a.toFixed(3)})`;
      cg.fillRect(0,y,size,1+r()*1.4);
      hg.fillStyle='rgb(108,108,108)';
      hg.fillRect(0,y,size,1);
    }
  }

  const hdata=hg.getImageData(0,0,size,size).data;
  const ndata=new Uint8Array(size*size*4);
  const rdata=new Uint8Array(size*size*4);
  const aodata=new Uint8Array(size*size*4);
  const sample=(x,y)=>hdata[((Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4)]/255;
  const normalStrength=cutEdge?4.8:(green?3.15:3.55);

  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const o=(y*size+x)*4;
    const dx=(sample(x+1,y)-sample(x-1,y))*normalStrength;
    const dy=(sample(x,y+1)-sample(x,y-1))*normalStrength;
    let nx=-dx,ny=dy,nz=1;
    const inv=1/Math.max(1e-5,Math.hypot(nx,ny,nz));
    nx*=inv;ny*=inv;nz*=inv;
    ndata[o]=(nx*.5+.5)*255;
    ndata[o+1]=(ny*.5+.5)*255;
    ndata[o+2]=(nz*.5+.5)*255;
    ndata[o+3]=255;

    const h=sample(x,y);
    const rough=clamp((cutEdge?.968:.942)-(h-.5)*(cutEdge?.12:.085),.86,.995);
    const rv=Math.round(rough*255);
    rdata[o]=rdata[o+1]=rdata[o+2]=rv;rdata[o+3]=255;

    // Cavity AO from height + local curvature. It is subtle on grass, stronger
    // on exposed cardboard so recessed paper blocks read even under fill light.
    const around=(sample(x+2,y)+sample(x-2,y)+sample(x,y+2)+sample(x,y-2))*.25;
    const cavity=clamp((around-h)*2.2+(.48-h)*1.45,0,1);
    const ao=clamp(1-cavity*(cutEdge?.46:.28),.50,1);
    const av=Math.round(ao*255);
    aodata[o]=aodata[o+1]=aodata[o+2]=av;aodata[o+3]=255;
  }

  const color=new THREE.CanvasTexture(colorCanvas);
  color.colorSpace=THREE.SRGBColorSpace;
  color.wrapS=color.wrapT=THREE.RepeatWrapping;
  color.minFilter=THREE.LinearMipmapLinearFilter;
  color.magFilter=THREE.LinearFilter;
  color.generateMipmaps=true;
  color.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());

  const normal=new THREE.DataTexture(ndata,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  normal.wrapS=normal.wrapT=THREE.RepeatWrapping;
  normal.minFilter=THREE.LinearMipmapLinearFilter;normal.magFilter=THREE.LinearFilter;
  normal.generateMipmaps=true;normal.needsUpdate=true;
  normal.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());

  const roughness=new THREE.DataTexture(rdata,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  roughness.wrapS=roughness.wrapT=THREE.RepeatWrapping;
  roughness.minFilter=THREE.LinearMipmapLinearFilter;roughness.magFilter=THREE.LinearFilter;
  roughness.generateMipmaps=true;roughness.needsUpdate=true;
  roughness.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());

  const ao=new THREE.DataTexture(aodata,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  ao.wrapS=ao.wrapT=THREE.RepeatWrapping;
  ao.minFilter=THREE.LinearMipmapLinearFilter;ao.magFilter=THREE.LinearFilter;
  ao.generateMipmaps=true;ao.needsUpdate=true;
  ao.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());

  return {color,normal,roughness,ao};
}

// The gameplay scene uses a deliberately quieter stock than the old Olive
// Fiber scan. Large colour fields and real paper thickness carry the form;
// micro texture belongs in the reference board, not on every visible face.
const storybook=createStorybookPaperMaps({THREE,renderer});
const {paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet}=storybook;
// Compatibility arrays for cut grass / forest materials. All share GPU maps;
// colour variation now comes from instance/material tint, not duplicate textures.


function standardPaperMaterial(set,{normalScale=0,roughness=1,color=0xffffff,side=THREE.FrontSide,ao=0}={}){
  const m=new THREE.MeshPhysicalMaterial({
    color,
    map:set.color,
    normalMap:null,
    roughnessMap:null,
    aoMap:null,
    aoMapIntensity:ao,
    normalScale:new THREE.Vector2(normalScale,normalScale),
    roughness,
    metalness:0,
    specularIntensity:.05,
    clearcoat:0,
    sheen:0,
    ior:1.38,
    side
  });
  return m;
}


return {paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet,standardPaperMaterial,mistTexture,
  storybookPalette:STORYBOOK_PAPER_PALETTE,storybookDefaults:STORYBOOK_PAPER_DEFAULTS,
  storybookMaps:storybook,textures:[...storybook.textures]};
}
