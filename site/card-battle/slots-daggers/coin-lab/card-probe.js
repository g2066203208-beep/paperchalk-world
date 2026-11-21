
/* Research derivative of WORK coin-art.js git blob 244779b322b33559c31aa1ae11bf6f0f7d15fe0c
 * ONLY changes: render sampling scale and read-only internal instrumentation.
 * See build-probe.py for the entire precise diff. */
/* Original struck brass: a faceted, solid planchet, two relief dies and a
   fixed-step table solver. All geometry, normals and pixels originate here. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const STEP = 1 / 240;
  const G = 24600;
  const FLOOR_Y = .82, LIFT_Y = .67;
  let TILE = 380, CENTRE = 190, TILE_RADIUS = 167;
  const MAX_DISCS = 96;
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(v,hi));
  const mix = (a,b,t) => a + (b-a)*t;
  const round = n => Math.round(n*1000)/1000;
  const normalized = (x,y,z) => {
    const l = Math.hypot(x,y,z) || 1;
    return [x/l,y/l,z/l];
  };
  const eye = normalized(0,LIFT_Y,FLOOR_Y);
  function random(seed) {
    let s = seed >>> 0;
    return () => {
      s += 0x6d2b79f5;
      let a = Math.imul(s ^ s >>> 15, 1 | s);
      a ^= a + Math.imul(a ^ a >>> 7, 61 | a);
      return ((a ^ a >>> 14) >>> 0) / 4294967296;
    };
  }
  // Quaternions use x,y,z,w. All angular velocities below are in world axes.
  function product(a,b) {
    return [
      a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
      a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
      a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
      a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
    ];
  }
  function axis(x,y,z,angle) {
    const k=Math.sin(angle*.5)/(Math.hypot(x,y,z)||1);
    return [x*k,y*k,z*k,Math.cos(angle*.5)];
  }
  function basis(q) {
    const [x,y,z,w]=q;
    return [1-2*(y*y+z*z),2*(x*y-w*z),2*(x*z+w*y),
      2*(x*y+w*z),1-2*(x*x+z*z),2*(y*z-w*x),
      2*(x*z-w*y),2*(y*z+w*x),1-2*(x*x+y*y)];
  }
  function extent(b) {
    const z=b.matrix[8];
    return b.r*(Math.sqrt(Math.max(0,1-z*z))+.134*Math.abs(z));
  }
  function rotate(b,dt) {
    const a=Math.hypot(b.wx,b.wy,b.wz);
    if(a<.0005)return;
    b.q=product(axis(b.wx,b.wy,b.wz,a*dt),b.q);
    const l=Math.hypot(...b.q);
    b.q=b.q.map(x=>x/l);
    b.matrix=basis(b.q);
  }

  // Same six-ring physical planchet topology as WORK's coin. ONLY change
  // its outline from 10-sided circle to rounded-rectangle portrait card.
  // Three dimensions, 6 bevel steps, front and reverse caps, faceted sides.
  const HALFW=.56, HALFH=1.0, CORNER=.124, SEG=8, SIDECOUNT=SEG*4;
  function planchet() {
    const points=[],faces=[];
    const rings=[[.972,.022],[.992,.019],[1,.012],[1,-.012],[.992,-.019],[.972,-.022]];
    const outline=[];
    for(const [cx,cy,a0] of [[HALFW-CORNER,HALFH-CORNER,0],[-HALFW+CORNER,HALFH-CORNER,Math.PI/2],[-HALFW+CORNER,-HALFH+CORNER,Math.PI],[HALFW-CORNER,-HALFH+CORNER,Math.PI*1.5]]){
      for(let k=0;k<SEG;k++){
        const t=a0+(k/(SEG-1))*Math.PI*.5;
        outline.push([cx+CORNER*Math.cos(t),cy+CORNER*Math.sin(t)]);
      }
    }
    for(const [r,z] of rings)for(const [x,y] of outline)points.push([x*r,y*r,z]);
    function face(ids,material,side) {
      const [a,b,c]=ids.map(i=>points[i]);
      const u=b.map((t,i)=>t-a[i]),v=c.map((t,i)=>t-a[i]);
      const n=normalized(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);
      faces.push({ids,material,side,normal:n});
    }
    face(Array.from({length:SIDECOUNT},(_,i)=>i),0,0);
    face(Array.from({length:SIDECOUNT},(_,i)=>6*SIDECOUNT-1-i),1,0);
    for(let j=0;j<5;j++)for(let i=0;i<SIDECOUNT;i++){
      const a=j*SIDECOUNT+i,b=j*SIDECOUNT+(i+1)%SIDECOUNT;
      face([b,a,a+SIDECOUNT,b+SIDECOUNT],j===2?3:2,i);
    }
    return {points,faces};
  }
  const mesh = planchet();
  const dieSize = 96;
  // WORK original die-height -> finite difference normal field. The sole
  // artwork change is rectangular seals, corner chase and character crest.
  let mark=0;
  const insignia=[
    [[-.24,-.14,0,-.43],[0,-.43,.24,-.14],[.24,-.14,.15,.11],[.15,.11,0,.22],[0,.22,-.15,.11],[-.15,.11,-.24,-.14]],
    [[-.36,-.27,.36,-.27],[0,-.41,0,.25],[-.33,.29,.33,.29],[-.23,.42,.23,.42]]
  ];
  function seg(x,y,a,b,c,d){
    const dx=c-a,dy=d-b,t=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy),0,1);
    return Math.hypot(x-a-dx*t,y-b-dy*t);
  }
  function rectangularRing(x,y,w,h,thick){
    const r=Math.max(Math.abs(x)/w,Math.abs(y)/h);
    return clamp(1-Math.abs(r-1)/thick,0,1);
  }
  function dieHeight(x,y,k) {
    // x,y use the SAME normalized local-space coordinates as WORK's coin.
    const rim=.048*rectangularRing(x,y,.83,.864,.035);
    const inner=.020*rectangularRing(x,y,.72,.79,.024);
    const outer=.016*rectangularRing(x,y,.90,.938,.022);
    // Hairline machining and two stamped rectangular panel dividers.
    const rulings=.012*clamp(1-Math.abs(y+.69)/.012,0,1)*clamp((.69-Math.abs(x))/.035,0,1)
      +.018*clamp(1-Math.abs(y-.674)/.019,0,1)*clamp((.69-Math.abs(x))/.035,0,1);
    const crestLine=insignia[(mark+k)%2];
    let d=3;
    for(const s of crestLine)d=Math.min(d,seg(x,y,...s));
    const crest=.051*clamp((.092-d)*13,0,1)*clamp((Math.abs(y)-.10)/.15,0,1);
    const cornerScratch=.010*Math.max(0,Math.cos((x+y)*20+mark*1.1)) * clamp((Math.abs(x)-.70)/.17,0,1);
    const planished=.13*Math.max(0,.22-.82*x+.43*y)+.037*Math.max(0,-.37-.21*x-.71*y);
    return planished+rim+inner+outer+rulings+crest+cornerScratch;
  }
  function inside(x,y,vertices){
    let winding=false;
    for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
      const a=vertices[i],b=vertices[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])winding=!winding;
    }
    return winding;
  }
  const punches=[
    [[-.48,-.72],[.48,-.72],[.48,.57],[-.48,.57]],
    [[-.42,-.55],[.42,-.55],[.42,.55],[-.42,.55]]
  ];
  function makeDies(){
    return [0,1].map(side=>{
      const data=new Float32Array(dieSize*dieSize*4),grain=random(57299+side*83);
      for(let y=0;y<dieSize;y++)for(let x=0;x<dieSize;x++){
        const u=(x+.5)/dieSize*2-1,v=(y+.5)/dieSize*2-1,i=(y*dieSize+x)*4;
        const h=dieHeight(u,v,side),e=.031;
        const nx=-(dieHeight(u+e,v,side)-dieHeight(u-e,v,side))/(2*e);
        const ny=-(dieHeight(u,v+e,side)-dieHeight(u,v-e,side))/(2*e);
        const normal=normalized(nx,ny,1);
        data[i]=normal[0];data[i+1]=normal[1];data[i+2]=side?-normal[2]:normal[2];
        data[i+3]=.022*(grain()-.5)+(inside(u,v,punches[side])?-.18:0)+(h>.038?.022:0)+(h<-.002?-.06:0);
      }
      return data;
    });
  }
  let dies=makeDies();
  const texture=[];
  const palette=Array.from({length:256},(_,i)=>{
    const x=i/255;
    const stops=[[0,28,27,22],[.20,65,53,34],[.42,119,94,49],[.64,179,141,72],
      [.80,217,177,95],[.93,247,214,134],[1,255,241,188]];
    let j=1;while(j<stops.length-1&&stops[j][0]<x)j++;
    const a=stops[j-1],b=stops[j],t=clamp((x-a[0])/(b[0]-a[0]),0,1);
    return [1,2,3].map(c=>Math.round(mix(a[c],b[c],t)));
  });
  const alloy={metallic:.20,smoothness:.60};
  const highlightExponent=2+82*alloy.smoothness*alloy.smoothness;
  const key=normalized(-.38,-.63,.72);
  const fill=normalized(.80,.05,.47);
  const burnish=normalized(-.33,-.14,.93);
  function metal(nx,ny,nz,rough,ambient,lamp) {
    const d=Math.max(0,nx*key[0]+ny*key[1]+nz*key[2]);
    const viewDot=nx*eye[0]+ny*eye[1]+nz*eye[2];
    // Virtual amber window and a smaller grazing strip light reflected in brass.
    const rx=2*viewDot*nx-eye[0],ry=2*viewDot*ny-eye[1],rz=2*viewDot*nz-eye[2];
    const b=Math.max(0,rx*burnish[0]+ry*burnish[1]+rz*burnish[2]);
    const d2=Math.max(0,rx*fill[0]+ry*fill[1]+rz*fill[2]);
    const soft=Math.max(0,rx*lamp[0]+ry*lamp[1]+rz*lamp[2]);
    const fresnel=1-clamp(viewDot,0,1);
    const coated=.45+.45*alloy.metallic;
    return ambient+.44*d+.10*b**5+.30*b**27+coated*d2**highlightExponent+.075*fresnel*fresnel+.17*soft**5+.65*soft**21+rough;
  }
  function apronReflection(nx,ny,nz,panel){
    if(!panel)return 0;
    const v=2*(ny*eye[1]+nz*eye[2]);
    const spec=Math.max(0,(nx*v)*panel[0]+(ny*v-eye[1])*panel[1]+(nz*v-eye[2])*panel[2]);
    return .32*spec**10+.055*spec**4;
  }
  const TEXTURE_W=256,TEXTURE_H=384;
  let artworkReady=false;
  function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`;}
  // Museum-style minimal collectible card. Original Anima painting is never
  // repainted; the ONLY chrome is real Work planchet geometry and bevel lighting.
  function prepareTexture(item,img){
    const accent=item.accent||'#857453';
    const front=document.createElement('canvas');front.width=TEXTURE_W;front.height=TEXTURE_H;
    const cc=front.getContext('2d',{willReadFrequently:true});
    const bg=cc.createLinearGradient(0,0,256,384);
    bg.addColorStop(0,'#293329');bg.addColorStop(.33,'#18231b');bg.addColorStop(1,'#101811');
    cc.fillStyle=bg;cc.fillRect(0,0,256,384);
    const halo=cc.createRadialGradient(119,138,10,127,215,214);
    halo.addColorStop(0,rgba(accent,.44));halo.addColorStop(.51,rgba(accent,.15));halo.addColorStop(1,'rgba(12,20,14,0)');
    cc.fillStyle=halo;cc.fillRect(0,0,256,384);
    artworkReady=false;
    if(img&&img.complete&&img.naturalWidth){
      // The original 1024×1536 artwork remains a single complete illustration.
      // Scale only to fit the card; its proportions are never distorted.
      const w=232,h=350,iw=img.naturalWidth,ih=img.naturalHeight;
      const scale=Math.min(w/iw,h/ih);
      const dw=Math.max(1,Math.round(iw*scale)),dh=Math.max(1,Math.round(ih*scale));
      const layer=document.createElement('canvas');layer.width=w;layer.height=h;
      const lc=layer.getContext('2d',{willReadFrequently:true});
      const ox=Math.round((w-dw)/2),oy=h-dh;
      lc.drawImage(img,ox,oy,dw,dh);
      const im=lc.getImageData(0,0,w,h),d=im.data;
      const mask=new Uint8Array(w*h),queue=new Int32Array(w*h);
      let read=0,write=0;
      function pale(i){
        const o=i*4,r=d[o],g=d[o+1],b=d[o+2];
        return d[o+3]>12&&Math.min(r,g,b)>207&&Math.max(r,g,b)-Math.min(r,g,b)<48;
      }
      function add(i){if(i<0||i>=w*h||mask[i]||!pale(i))return;mask[i]=1;queue[write++]=i;}
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}
      for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
      for(let x=ox;x<ox+dw;x++){add(oy*w+x);add((oy+dh-1)*w+x);}
      for(let y=oy;y<oy+dh;y++){add(y*w+ox);add(y*w+ox+dw-1);}
      while(read<write){
        const i=queue[read++],x=i%w,y=(i-x)/w;
        if(x>0)add(i-1);if(x+1<w)add(i+1);
        if(y>0)add(i-w);if(y+1<h)add(i+w);
      }
      for(let i=0;i<w*h;i++)if(mask[i]){
        const o=i*4,min=Math.min(d[o],d[o+1],d[o+2]);
        const fade=clamp((min-202)/42,0,1);
        d[o+3]=Math.round(d[o+3]*(1-fade));
      }
      lc.putImageData(im,0,0);
      // Gold is on the actual bevel, not a giant opaque card border.
      cc.drawImage(layer,12,14);
      artworkReady=true;
    }
    // Delicate stamped alignment lines. No fake rivets, title-box, or RPG UI
    // competing with the original character artwork.
    cc.lineWidth=1;
    cc.strokeStyle='rgba(228,200,133,.32)';cc.strokeRect(5.5,5.5,245,373);
    cc.strokeStyle='rgba(240,224,177,.09)';cc.strokeRect(8.5,8.5,239,367);
    cc.fillStyle='rgba(228,204,148,.32)';
    for(let x of [20,236])for(let y of [20,362]){
      cc.fillRect(x-6,y,12,1);cc.fillRect(x,y-6,1,12);
    }
    const back=document.createElement('canvas');back.width=TEXTURE_W;back.height=TEXTURE_H;
    const bc=back.getContext('2d',{willReadFrequently:true});
    const bkg=bc.createRadialGradient(118,138,8,128,190,250);
    bkg.addColorStop(0,'#374530');bkg.addColorStop(.57,'#1e2b20');bkg.addColorStop(1,'#101811');
    bc.fillStyle=bkg;bc.fillRect(0,0,256,384);
    bc.strokeStyle='#ae9866';bc.lineWidth=1.5;bc.strokeRect(8,8,240,368);
    bc.strokeStyle='rgba(221,197,130,.37)';bc.lineWidth=1;bc.strokeRect(17,17,222,350);
    const pattern=bc.createRadialGradient(128,188,5,128,188,106);
    pattern.addColorStop(0,'rgba(225,198,130,.20)');pattern.addColorStop(1,'rgba(225,198,130,0)');
    bc.fillStyle=pattern;bc.fillRect(24,72,208,238);
    bc.strokeStyle='rgba(222,197,128,.43)';bc.lineWidth=2;
    bc.beginPath();bc.arc(128,185,78,0,TAU);bc.stroke();
    bc.lineWidth=1;bc.beginPath();bc.arc(128,185,67,0,TAU);bc.stroke();
    bc.fillStyle='#cdb67f';bc.textAlign='center';bc.font='600 62px Georgia,serif';
    bc.fillText(item.symbol||'✦',128,208);
    bc.font='11px monospace';bc.fillStyle='rgba(225,204,152,.76)';
    bc.fillText('W O R K',128,49);
    bc.font='9px monospace';bc.fillText('COLLECTION  /  '+String(item.index+1).padStart(2,'0'),128,347);
    texture[0]=cc.getImageData(0,0,TEXTURE_W,TEXTURE_H).data;
    texture[1]=bc.getImageData(0,0,TEXTURE_W,TEXTURE_H).data;
    dies=makeDies();
  }
  function raster(b,light,lampX,lampY){
    if(!b.sprite || b.sprite.width!==TILE){
      b.sprite=document.createElement('canvas');b.sprite.width=TILE;b.sprite.height=TILE;
      b.sctx=b.sprite.getContext('2d');b.buf=b.sctx.createImageData(TILE,TILE);
    }
    const data=b.buf.data;data.fill(0);
    let highlight=0,hotX=0,hotY=0;
    const m=b.matrix,a=TILE_RADIUS,vertices=mesh.points.map(([x,y,z])=>{
      const wx=m[0]*x+m[1]*y+m[2]*z,wy=m[3]*x+m[4]*y+m[5]*z,wz=m[6]*x+m[7]*y+m[8]*z;
      return [CENTRE+wx*a,CENTRE+(wy*FLOOR_Y-wz*LIFT_Y)*a];
    });
    const project=(nx,ny,nz)=>[
      m[0]*nx+m[1]*ny+m[2]*nz,m[3]*nx+m[4]*ny+m[5]*nz,m[6]*nx+m[7]*ny+m[8]*nz
    ];
    const ambient=.057+b.patina+light*.26;
    const lamp=normalized((lampX-b.x)*.012+.15,(lampY-b.y)*.009,1.03);
    // The returning face catches the pale front apron as it leaves the chute.
    const panel=b.pattern==='return'?normalized(72-b.x,314-b.y,130-b.z):null;
    for(const f of mesh.faces){
      const norm=project(...f.normal);
      if(norm[1]*eye[1]+norm[2]*eye[2] <= .0001)continue;
      const ids=f.ids,ia=ids[0],A=vertices[ia],la=mesh.points[ia];
      const isFace=f.material<2;
      const bezel=f.material===2?.080:f.material===3?-.03:0;
      const value=metal(...norm,bezel,ambient,lamp)+apronReflection(...norm,panel);
      const die=dies[f.material];
      for(let ti=1;ti<ids.length-1;ti++){
        const ib=ids[ti],ic=ids[ti+1],B=vertices[ib],C=vertices[ic],lb=mesh.points[ib],lc=mesh.points[ic];
        const bx=B[0]-A[0],by=B[1]-A[1],cx=C[0]-A[0],cy=C[1]-A[1],den=bx*cy-by*cx;
        if(Math.abs(den)<.005)continue;
        const inv=1/den,x0=clamp(Math.floor(Math.min(A[0],B[0],C[0])),0,TILE-1);
        const x1=clamp(Math.ceil(Math.max(A[0],B[0],C[0])),0,TILE-1);
        const y0=clamp(Math.floor(Math.min(A[1],B[1],C[1])),0,TILE-1);
        const y1=clamp(Math.ceil(Math.max(A[1],B[1],C[1])),0,TILE-1);
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
          const dx=x+.5-A[0],dy=y+.5-A[1],u=(dx*cy-dy*cx)*inv,v=(bx*dy-by*dx)*inv;
          if(u<-.001||v<-.001||u+v>1.001)continue;
          let level=value;
          const lx=la[0]+u*(lb[0]-la[0])+v*(lc[0]-la[0]);
          const ly=la[1]+u*(lb[1]-la[1])+v*(lc[1]-la[1]);
          if(isFace){
            const tx=clamp(Math.floor((lx/HALFW+1)*.5*dieSize),0,dieSize-1);
            const ty=clamp(Math.floor((ly/HALFH+1)*.5*dieSize),0,dieSize-1),p=(ty*dieSize+tx)*4;
            const ax=die[p],ay=die[p+1],az=die[p+2];
            const nx=m[0]*ax+m[1]*ay+m[2]*az,ny=m[3]*ax+m[4]*ay+m[5]*az,nz=m[6]*ax+m[7]*ay+m[8]*az;
            level=metal(nx,ny,nz,die[p+3],ambient+(f.material===1?-.032:.018),lamp)+apronReflection(nx,ny,nz,panel);
          }else if(f.material===3){
            const t=Math.atan2(ly,lx)*7.96;
            const tooth=t-Math.floor(t);
            level+=tooth<.20?-.18:tooth>.80?.09:.015;
          }
          const over=Math.max(0,level-.82);
          highlight+=over;hotX+=over*(x+.5);hotY+=over*(y+.5);
          const p=(y*TILE+x)*4;
          const col=palette[clamp(Math.round(level*255),0,255)];
          if(isFace&&texture[f.material]&&Math.abs(lx)<.527&&Math.abs(ly)<.945){
            // Embossed image paper is a separate finish. WORK metal() and
            // brass palette remain untouched for the thick model and bevel.
            const ux=clamp(Math.floor((lx/.527+1)*.5*TEXTURE_W),0,TEXTURE_W-1);
            const uy=clamp(Math.floor((ly/.945+1)*.5*TEXTURE_H),0,TEXTURE_H-1);
            const o=(uy*TEXTURE_W+ux)*4,t=texture[f.material],alpha=t[o+3]/255;
            const coat=clamp(.89+level*.16,.78,1.11),gloss=Math.pow(Math.max(0,level-.76),2)*36;
            data[p]=clamp(Math.round((t[o]*coat+gloss)*alpha+col[0]*(1-alpha)),0,255);
            data[p+1]=clamp(Math.round((t[o+1]*coat+gloss*.8)*alpha+col[1]*(1-alpha)),0,255);
            data[p+2]=clamp(Math.round((t[o+2]*coat+gloss*.49)*alpha+col[2]*(1-alpha)),0,255);
          }else{data[p]=col[0];data[p+1]=col[1];data[p+2]=col[2];}
          data[p+3]=255;
        }
      }
    }
    b.hot=clamp(highlight/39,0,1);
    b.hotX=highlight?hotX/highlight/TILE-.5:0;b.hotY=highlight?hotY/highlight/TILE-.5:0;
    b.sctx.putImageData(b.buf,0,0);
  }
  let glowKernel;
  function drawBloom(c,b,x,y,width){
    if(b.hot<.025||window.WorkCardProbe?.bloom===false)return;
    if(!glowKernel){
      glowKernel=document.createElement('canvas');glowKernel.width=80;glowKernel.height=80;
      const a=glowKernel.getContext('2d'),g=a.createRadialGradient(40,40,0,40,40,40);
      g.addColorStop(0,'rgba(255,232,145,.94)');g.addColorStop(.14,'rgba(255,215,111,.45)');
      g.addColorStop(.41,'rgba(255,197,92,.15)');g.addColorStop(1,'rgba(246,162,65,0)');
      a.fillStyle=g;a.fillRect(0,0,80,80);
    }
    const size=width*(1.24+b.hot*.68);
    c.save();c.globalCompositeOperation='screen';c.globalAlpha=.65*b.hot;
    c.drawImage(glowKernel,x+b.hotX*width-size*.5,y+b.hotY*width-size*.5,size,size);c.restore();
  }
  const rimPoints=mesh.points.slice(SIDECOUNT*2,SIDECOUNT*3);
  function cross2(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
  function shadowShape(c,b,sx,sy,pad){
    // Project both faces of the solid rim onto its support plane, then take the
    // convex silhouette. A turning coin casts a turning and narrowing shadow.
    const corners=[],m=b.matrix,rx=b.r+pad,ground=b.z-b.base;
    for(const v of rimPoints)for(const zg of [-.041,.041]){
      const wx=m[0]*v[0]+m[1]*v[1]+m[2]*zg;
      const wy=m[3]*v[0]+m[4]*v[1]+m[5]*zg;
      const wz=m[6]*v[0]+m[7]*v[1]+m[8]*zg;
      corners.push([b.x+wx*rx+(ground+wz*rx)*sx,
        b.y-b.base*LIFT_Y+wy*rx*FLOOR_Y+(ground+wz*rx)*sy]);
    }
    corners.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const lower=[],upper=[];
    for(const p of corners){
      while(lower.length>=2&&cross2(lower.at(-2),lower.at(-1),p)<=0)lower.pop();
      lower.push(p);
    }
    for(let j=corners.length-1;j>=0;j--){
      const p=corners[j];
      while(upper.length>=2&&cross2(upper.at(-2),upper.at(-1),p)<=0)upper.pop();
      upper.push(p);
    }
    lower.pop();upper.pop();const points=lower.concat(upper);
    c.beginPath();c.moveTo(points[0][0],points[0][1]);for(let k=1;k<points.length;k++)c.lineTo(points[k][0],points[k][1]);
    c.closePath();c.fill();
  }
  const cadence=[0,.039,.108,.219,.257,.332,.407,.475,.483,.562,.636,.674,.853,1];
  function phaseAt(t) {
    const x=clamp(t,0,1)*(cadence.length-1),i=Math.floor(x);
    return mix(cadence[i],cadence[Math.min(cadence.length-1,i+1)],x-i);
  }
  const CHUTE={x:285,y:162};
  class CoinTable {
    constructor(seed=1,onClink=()=>{}){
      this.seed=seed>>>0;this.onClink=typeof onClink==='function'?onClink:()=>{};
      this.reset(11);
    }
    reset(balance=11){
      this.time=0;this.acc=0;this.rand=random(this.seed);this.nextId=1;this.batchId=0;
      this.balance=Math.max(0,Math.floor(balance));this.discs=[];this.queue=[];this.flecks=[];
      this.collisionAt=new Map();this.latest=null;this.purchase=null;
      const n=Math.min(this.balance,70);
      for(let i=0;i<n;i++){
        const val=Math.floor((i+1)*this.balance/n)-Math.floor(i*this.balance/n);
        const b=this.make(val,0);
        let best=-1,bx=154,by=187;
        for(let k=0;k<10;k++){
          const y=80+this.rand()*219;
          const left=leftWall(y)+b.r+3,right=278-b.r;
          const x=mix(left,right,this.rand());
          const near=this.discs.reduce((d,p)=>Math.min(d,Math.hypot(x-p.x,(y-p.y)/FLOOR_Y)),70);
          if(near>best){best=near;bx=x;by=y;}
        }
        b.x=bx;b.y=by;
        const tilt=(this.rand()-.5)*.67;
        b.q=product(axis(0,0,1,this.rand()*TAU),axis(1,.24,0,(this.rand()>.48?Math.PI:0)+tilt));
        b.matrix=basis(b.q);b.height=extent(b);b.z=b.height;b.mode='rest';
        if(i>4&&i%5===1){
          const anchor=this.discs[(i*7+1)%i];
          b.x=anchor.x+(this.rand()-.5)*11;b.y=anchor.y+(this.rand()-.5)*11;
          b.base=anchor.z+anchor.height;b.support=anchor.id;b.z=b.base+b.height;
        }
        this.discs.push(b);
      }
    }
    make(value,batch) {
      const r=this.rand;
      return {id:this.nextId++,value,batch,age:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0,
        r:13.2+r()*1.75,patina:(r()-.5)*.155,q:[0,0,0,1],matrix:basis([0,0,0,1]),
        mode:'air',rollX:0,rollY:0,rebound:.14,firstHit:null,contacts:0,support:0,base:0,cache:'',spendDelay:0};
    }
    award(amount,kind='coin'){
      const sum=Math.max(0,Math.floor(amount));if(!sum)return;
      this.balance+=sum;
      const count=Math.min(68,sum),id=++this.batchId;
      this.latest={id,kind,count,value:sum,start:this.time,born:0,firstContacts:0,rested:0,
        traceId:0,trace:[],events:[],births:[]};
      const windowS=(count-1)/29.2;
      for(let i=0;i<count;i++){
        const frac=count===1?0:i/(count-1);
        const value=Math.floor((i+1)*sum/count)-Math.floor(i*sum/count);
        const gap=i>0&&i<count-1?(this.rand()-.5)*.009:0;
        this.queue.push({at:this.time+windowS*phaseAt(frac)+gap,value,id,i,kind,count});
      }
      this.queue.sort((a,b)=>a.at-b.at);
      this.releaseDue();
    }
    spend(amount){
      let need=Math.min(this.balance,Math.max(0,Math.floor(amount)));
      if(!need)return;
      this.balance-=need;
      this.purchase={start:this.time,amount:need,visible:0,complete:0,lastSink:0,well:[188,282]};
      // Disks that are actually visible leave first, in a short counted stream.
      const candidates=this.discs.filter(b=>b.value>0)
        .sort((a,b)=>(b.base||0)-(a.base||0)||b.id-a.id);
      let n=0;
      for(const b of candidates){
        if(!need)break;
        const take=Math.min(need,b.value);b.value-=take;need-=take;
        let spent=b;
        if(b.value>0){
          spent=Object.assign(this.make(0,0),{x:b.x,y:b.y,z:b.z,r:b.r,q:b.q.slice(),matrix:b.matrix.slice()});
          this.discs.push(spent);
        }
        spent.mode='spend';spent.purchase=this.purchase;this.purchase.visible++;
        const scatter=n++;
        spent.spendAt=this.time;spent.gatherDelay=Math.min(.10,scatter*.008);
        spent.gatherTime=.34+this.rand()*.12;
        const a=this.rand()*TAU,rad=Math.sqrt(this.rand())*13;
        spent.gx=192+Math.cos(a)*rad;spent.gy=226+Math.sin(a)*rad*.75;
        spent.sx=spent.x;spent.sy=spent.y;spent.sz=spent.z;
        spent.stackHeight=2+scatter%5*1.6;spent.drainAt=.55+this.rand()*.22;
        spent.drainTime=.33+this.rand()*.13;
      }
      for(let k=this.queue.length-1;k>=0&&need;k--){
        const p=this.queue[k],take=Math.min(need,p.value);need-=take;p.value-=take;
        if(!p.value)this.queue.splice(k,1);
      }
    }
    releaseDue(){
      while(this.queue.length&&this.queue[0].at<=this.time+.00001){
        const e=this.queue.shift(),r=this.rand,b=this.make(e.value,e.id);
        // The reference single payout crosses roughly a hundred horizontal pixels
        // in four 60-Hz frames. The chute is physically above the felt.
        const longJet=e.kind==='long'||e.i===1||e.count>5&&e.i%8===5||
          e.count<=3&&e.id%4===3&&e.i===0;
        const specimen=!longJet&&e.i===0&&e.count<=3;
        b.pattern=specimen?'return':longJet?'skip':'scatter';
        b.z=specimen?85.03:longJet?26+r()*7:59+r()*44;
        b.x=CHUTE.x+(specimen?-3:longJet?-4:(r()-.5)*4);
        const startY=CHUTE.y+(specimen?2:longJet?11:(r()-.5)*12);
        b.y=startY+b.z*LIFT_Y;
        const fan=r();
        b.vx=specimen?-1570:longJet?-1940:-(820+r()*1290);
        b.vy=specimen?-765:longJet?-326:mix(-1000,160,fan);
        b.vz=specimen?-150:longJet?-125:-(85+r()*220);
        b.rollX=specimen?1074.25:longJet?-1940:mix(-280,540,r());
        b.rollY=specimen?530:longJet?122.5:mix(-370,535,r());
        b.q=product(axis(0,0,1,r()*TAU),axis(1,.33,0,.5+r()*2));
        b.matrix=basis(b.q);b.height=extent(b);
        b.wx=37+r()*50;b.wy=-58-r()*72;b.wz=(r()-.5)*48;
        if(specimen){
          // Chute attitude and angular velocity from the broad face visible
          // through the first two distinct frames of the returning throw.
          b.r=15.475;b.q=[.318024,-.878656,-.225906,-.275302];b.matrix=basis(b.q);
          b.wx=-21.72;b.wy=2.84;b.wz=35.38;b.height=extent(b);
        }
        b.rebound=specimen?.1286:.08+r()*.18;
        this.discs.push(b);this.flare(b.x,startY,.78,6);
        if(specimen)this.chuteSpray(b.x,startY,b.id);
        this.sound('chute',b,.45);
        const info=this.latest;
        if(info&&info.id===e.id){
          info.born++;info.births.push(round(this.time-info.start));
          if(!info.traceId){info.traceId=b.id;this.sample(b);}
        }
      }
    }
    sound(kind,b,power){
      this.onClink({kind,power:clamp(power,.04,1),pan:clamp((b.x-480)/460,-1,1),
        frequency:(kind==='wall'?1680:kind==='coin'?2030:kind==='chute'?1520:1210)*(14/b.r),id:b.id});
    }
    flare(x,y,p,n){
      for(let k=0;k<n;k++){
        const a=this.rand()*TAU,s=(10+this.rand()*80)*p;
        this.flecks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-23,age:0,life:.08+this.rand()*.13,hot:this.rand()>.66});
      }
    }
    chuteSpray(x,y,id){
      // Chips already inside the moving escapement are visible on the release
      // frame. Thin flakes slow quickly in air; a few stay bright at the lip.
      // Visual sampling has its own seed, independent of the wallet and solver.
      const noise=random(this.seed^Math.imul(id,0x632be5ab));
      for(let i=0;i<15;i++){
        const jet=i<7,life=.21+noise()*.15;
        this.flecks.push({x:x+3-noise()*(jet?20:14),y:y-11+noise()*29,
          vx:jet?-410-noise()*970:(noise()-.70)*165,
          vy:jet?(noise()-.40)*680:(noise()-.42)*290,
          drag:jet?8.4+noise()*3:4.4+noise()*2.1,age:0,life,
          chip:true,wide:noise()>.64,hot:true});
      }
    }
    contact(b,floor,kind,other){
      const speed=-b.vz,first=b.firstHit===null;
      b.contacts++;b.base=floor;b.z=floor+b.height;b.support=other?other.id:0;
      if(first){
        b.firstHit=this.time;
        // An edge entering with considerable underspin changes direction on
        // first contact. Resolve the measured tangential slip, limited by the
        // available normal impulse. Subsequent contacts use rolling friction.
        const dx=b.rollX-b.vx,dy=(b.rollY-b.vy)/FLOOR_Y;
        const scale=Math.min(1,Math.max(0,speed)*1.58/(Math.hypot(dx,dy)||1));
        b.vx+=dx*scale;b.vy+=dy*scale*FLOOR_Y;
        const returning=b.pattern==='return';
        b.wx*=returning?.5:.24;b.wy*=returning?.5:.24;b.wz*=returning?.5:.55;
      }else{
        b.vx*=b.pattern==='return'?.4215:b.pattern==='skip'?1:.95;b.vy*=b.pattern==='return'?.5766:.95;
        const spin=b.pattern==='return'?.983:.59;b.wx*=spin;b.wy*=spin;
      }
      if(b.pattern==='return'){
        // An off-centre normal impulse acts at the lowest point of the rim.
        // The lever arm is the horizontal component of that contact point.
        const m=b.matrix,nz=m[8];
        const impulse=.1301*speed*nz/(b.r*Math.max(.14,Math.sqrt(1-nz*nz)));
        b.wx+=m[5]*impulse;b.wy-=m[2]*impulse;
      }
      b.vz=speed*(first?b.rebound:.18);
      b.mode=b.vz>78?'air':'roll';if(b.mode==='roll')b.vz=0;
      const info=this.latest;
      if(info&&b.batch===info.id){
        if(first)info.firstContacts++;
        if(b.id===info.traceId&&info.events.length<32)info.events.push({kind:kind,t:round(this.time-info.start),
          x:round(b.x),y:round(b.y-b.z*LIFT_Y),speed:round(speed)});
      }
      if(speed>130){
        this.sound(kind,b,speed/1850);
        if(first&&speed>550)this.flare(b.x,b.y-b.base*LIFT_Y,.45,4);
      }
    }
    update(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      this.acc+=dt;
      while(this.acc+1e-10>=STEP){this.acc-=STEP;this.step(STEP);}
    }
    step(dt){
      this.time+=dt;this.releaseDue();
      const bodies=this.discs;
      const supports=new Map(bodies.filter(b=>b.value>0).map(b=>[b.id,b]));
      for(const b of bodies){
        if(b.mode==='gone')continue;
        if(b.mode==='spend'){
          const elapsed=this.time-b.spendAt,u=clamp((elapsed-b.gatherDelay)/b.gatherTime,0,1);
          const gather=u*u*(3-2*u);
          // Money vanishes from the numerical balance on the purchase frame.
          // The paid pieces make a temporary mound, then drain into the till.
          b.x=mix(b.sx,b.gx,gather);b.y=mix(b.sy,b.gy+b.stackHeight*LIFT_Y,gather);
          b.z=mix(b.sz,b.stackHeight,gather)+Math.sin(u*Math.PI)*12;
          b.wx=12*(1-gather);b.wy=-17*(1-gather);b.wz=4;rotate(b,dt);
          if(elapsed>=b.drainAt){
            const k=clamp((elapsed-b.drainAt)/b.drainTime,0,1);
            b.x=mix(b.gx,188,k*k);b.y=mix(b.gy+b.stackHeight*LIFT_Y,305,k*k);
            b.z=mix(b.stackHeight,2,k);b.wy=3+k*12;rotate(b,dt);
            if(k>=1){
              b.mode='gone';this.sound('spend',b,.32);
              b.purchase.complete++;b.purchase.lastSink=this.time-b.purchase.start;
            }
          }
          continue;
        }
        if(b.support){
          const support=supports.get(b.support);
          if(!support||Math.hypot(b.x-support.x,(b.y-support.y)/FLOOR_Y)>1.42*b.r){
            b.base=0;b.support=0;b.vz=0;b.mode='air';if(b.firstHit===null)b.firstHit=this.time;
          }
        }
        if(b.mode==='rest')continue;
        b.age+=dt;
        const pz=b.z,prevBottom=pz-b.height;
        b.x+=b.vx*dt;b.y+=b.vy*dt;
        if(b.mode==='roll'){
          const normalZ=b.matrix[8],side=normalZ>=0?1:-1;
          const grip=b.pattern==='return'?clamp(1-Math.hypot(b.vx,b.vy)/220,.361,1):1;
          const seek=60*grip;
          b.wx+=b.matrix[5]*side*dt*seek;b.wy-=b.matrix[2]*side*dt*seek;
          const rotDrag=Math.exp(-8.9*grip*dt);b.wx*=rotDrag;b.wy*=rotDrag;b.wz*=Math.exp(-6.3*grip*dt);
          // Settle the convex edge onto the nearest broad face instead of
          // snapping between sprite orientations.
          const tilt=normalized(b.matrix[5]*side,-b.matrix[2]*side,0);
          const away=Math.acos(clamp(normalZ*side,-1,1));
          if(away>.0001)b.q=product(axis(...tilt,away*(1-Math.exp(-7.8*grip*dt))),b.q);
          const slipTime=this.time-b.firstHit;
          const drag=Math.exp(-dt*(slipTime<.25?(b.pattern==='return'?1.303:b.pattern==='skip'?.25:2.04):8.1));b.vx*=drag;b.vy*=drag;
        }
        rotate(b,dt);b.matrix=basis(b.q);b.height=extent(b);
        if(b.mode==='air'){
          b.z+=b.vz*dt-.5*G*dt*dt;b.vz-=G*dt;
          let floor=b.base,other;
          if(b.vz<0){
            for(const a of bodies){
              if(a===b||a.mode!=='rest')continue;
              const top=a.z+a.height;
              if(top<floor||prevBottom<top-1.2)continue;
              const rr=(a.r+b.r)*.63;
              const dx=a.x-b.x,dy=(a.y-b.y)/FLOOR_Y;
              if(dx*dx+dy*dy<rr*rr){floor=top;other=a;}
            }
            if(b.z-b.height<=floor+.1)this.contact(b,floor,other?'coin':'felt',other);
          }
        }else b.z=b.base+b.height;
        this.bounds(b);
        if(b.mode==='roll'&&this.time-b.firstHit>.36&&Math.hypot(b.vx,b.vy)<5&&Math.hypot(b.wx,b.wy,b.wz)<.32){
          b.mode='rest';b.vx=b.vy=b.wx=b.wy=b.wz=0;
          if(this.latest&&this.latest.id===b.batch&&!b.reportedSleep){this.latest.rested++;b.reportedSleep=true;}
        }
      }
      this.pairs();
      this.discs=bodies.filter(b=>b.mode!=='gone');
      if(this.discs.length>MAX_DISCS)this.condense();
      for(const f of this.flecks){
        f.age+=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
        if(f.chip){const air=Math.exp(-f.drag*dt);f.vx*=air;f.vy=f.vy*air+43*dt;}
        else f.vy+=160*dt;
      }
      this.flecks=this.flecks.filter(f=>f.age<f.life);
      const info=this.latest;
      if(info&&this.time-info.start<2.25){
        const b=this.discs.find(p=>p.id===info.traceId);
        if(b&&(info.trace.length===0||this.time-info.start-info.trace.at(-1).t>=.015))this.sample(b);
      }
    }
    bounds(b){
      // The high chute and its first six centimetres clear the cut lip.
      if(b.firstHit===null)return;
      const rim=leftWall(b.y)+b.r*.78;
      if(b.pattern==='skip'&&!b.apron&&b.x<rim+30.3&&b.vx< -980){
        // A nearly horizontal rim strike can skip OVER the sloped lip; the
        // wide launch-trailer shot follows one such disk out to the table edge.
        b.apron=true;b.mode='air';b.support=0;b.base=0;b.vz=Math.max(b.vz,1097);b.vx*=.642;
        b.vy-=124;b.wz+=13;this.sound('wall',b,.71);
      }
      const lowX=b.apron?15:rim,highX=283-b.r*.68;
      const lowY=56+b.r*.7,highY=306-b.r*.72;
      let mag=0;
      if(b.x<lowX){mag=Math.abs(b.vx);b.x=lowX;b.vx=Math.abs(b.vx)*.34;b.vy*=.91;}
      else if(b.x>highX){mag=Math.abs(b.vx);b.x=highX;b.vx=-Math.abs(b.vx)*(Math.abs(b.vx)<500?.11:.31);b.vy*=.89;}
      if(b.y<lowY){mag=Math.max(mag,Math.abs(b.vy));b.y=lowY;b.vy=Math.abs(b.vy)*.29;}
      else if(b.y>highY){mag=Math.max(mag,Math.abs(b.vy));b.y=highY;b.vy=-Math.abs(b.vy)*.31;}
      if(mag>55){
        b.wz+=Math.sign(b.vx+b.vy)*mag*.025;
        this.sound('wall',b,mag/620);
        if(this.latest&&b.id===this.latest.traceId)this.latest.events.push({kind:'wall',t:round(this.time-this.latest.start),
          x:round(b.x),y:round(b.y-b.z*LIFT_Y),speed:round(mag)});
      }
    }
    pairs(){
      const a=this.discs;
      for(let i=0;i<a.length;i++){
        const b=a[i];if(!b.value||b.mode==='rest'||b.firstHit===null)continue;
        for(let j=0;j<a.length;j++){
          const d=a[j];if(!d.value||b===d||d.firstHit===null&&d.mode!=='rest')continue;
          if(d.mode!=='rest'&&j<i)continue;
          if(b.support===d.id||d.support===b.id)continue;
          const limit=(b.r+d.r)*.79,dx=b.x-d.x,dy=(b.y-d.y)/FLOOR_Y,ds=dx*dx+dy*dy;
          if(ds>limit*limit||Math.abs(b.z-d.z)>(b.height+d.height)*.91)continue;
          const dist=Math.sqrt(ds)||.001,nx=dist>.002?dx/dist:1,ny=dist>.002?dy/dist:0;
          const vrel=(b.vx-d.vx)*nx+(b.vy-d.vy)*ny/FLOOR_Y;
          const wake=vrel< -82&&d.mode==='rest';
          if(wake){d.mode='roll';d.firstHit=this.time-.22;}
          const still=d.mode==='rest',fix=(limit-dist+.02)*(still?.82:.46);
          b.x+=nx*fix;b.y+=ny*fix*FLOOR_Y;
          if(!still){d.x-=nx*fix;d.y-=ny*fix*FLOOR_Y;}
          if(vrel>=0)continue;
          const push=-vrel*(still?1.18:.65);
          b.vx+=push*nx;b.vy+=push*ny*FLOOR_Y;b.wz+=ny*push*.03;
          if(!still){d.vx-=push*nx;d.vy-=push*ny*FLOOR_Y;d.wz+=nx*push*.023;}
          if(-vrel>65){
            const sig=Math.min(b.id,d.id)*100000+Math.max(b.id,d.id);
            if(this.time-(this.collisionAt.get(sig)??-2)>.065){
              this.collisionAt.set(sig,this.time);this.sound('coin',b,-vrel/720);
            }
          }
        }
      }
      if(this.collisionAt.size>130){
        for(const [key,t] of this.collisionAt)if(this.time-t>.09)this.collisionAt.delete(key);
      }
    }
    condense(){
      const low=this.discs.filter(b=>b.mode==='rest'&&b.value>0).sort((a,b)=>a.z-b.z);
      for(let i=0;i+1<low.length&&this.discs.length>MAX_DISCS;i+=2){
        const b=low[i],d=low[i+1];d.value+=b.value;b.value=0;
        this.discs.splice(this.discs.indexOf(b),1);
      }
    }
    sample(b){
      this.latest.trace.push({t:round(this.time-this.latest.start),x:round(b.x),y:round(b.y-b.z*LIFT_Y),z:round(b.z),
        face:round(b.matrix[5]*eye[1]+b.matrix[8]*eye[2]),mode:b.mode});
    }
    draw(c,opts={}){
      const flash=clamp(opts.flash||0,0,1),t=opts.reduce?0:(opts.time??this.time);
      const lampX=opts.light?.x??(206+4.3*Math.sin(t*.76)+flash*9);
      const lampY=opts.light?.y??(54+3.3*Math.sin(t*.31)+flash*4);
      const lampCell=(lampX/3|0)+','+(lampY/3|0);
      const live=this.discs.slice().sort((a,b)=>(a.y*.62+a.z*.82)-(b.y*.62+b.z*.82));
      c.save();
      for(const b of live){
        if(b.mode==='gone')continue;
        const h=Math.max(0,b.z-b.height-b.base),contact=b.mode==='rest'||b.mode==='roll';
        const sx=.18+(b.x-lampX)*.0006,sy=.12+(b.y-lampY)*.00036;
        if(h>9){
          c.fillStyle='rgba(15,16,11,.08)';shadowShape(c,b,sx,sy,Math.min(5,1+h*.035));
        }
        c.fillStyle=contact?'rgba(15,15,10,.59)':'rgba(17,17,11,'+Math.max(.13,.55-h*.005)+')';
        shadowShape(c,b,sx,sy,.65);
      }
      c.imageSmoothingEnabled=false;
      for(const b of live){
        const light=Math.round((flash*.72+Math.max(0,(b.x-146)/180)*.19)*12)/12;
        const key=b.q.map(t=>Math.round(t*64)).join(',')+'/'+(b.x/9|0)+'/'+(b.y/9|0)+'/'+light+'/'+lampCell;
        if(b.cache!==key){raster(b,light,lampX,lampY);b.cache=key;}
        const perspective=1+Math.min(.115,Math.max(0,b.z-10)*.00115);
        const width=b.r*perspective*TILE/TILE_RADIUS,px=b.x,py=b.y-b.z*LIFT_Y;
        if(b.mode==='spend'&&this.time-b.spendAt>=b.drainAt){
          c.save();c.beginPath();c.rect(-64,-160,500,443);c.clip();
          c.drawImage(b.sprite,Math.round(px-width*.5),Math.round(py-width*.5),width,width);c.restore();
        }else{
          c.drawImage(b.sprite,Math.round(px-width*.5),Math.round(py-width*.5),width,width);
          drawBloom(c,b,px,py,width);
        }
      }
      for(const f of this.flecks){
        const k=1-f.age/f.life;if(opts.reduce&&k<.40)continue;
        if(f.chip){
          const x=Math.round(f.x),y=Math.round(f.y);
          c.globalAlpha=Math.min(1,k*3);c.fillStyle='#d9c195';
          c.fillRect(x-1,y,f.wide?4:3,1);
          if(f.wide&&k>.55)c.fillRect(x,y-1,1,3);
          c.fillStyle='#fff5d7';c.fillRect(x,y,k>.43?2:1,k>.71?2:1);
          continue;
        }
        c.globalAlpha=Math.min(1,k*1.6);c.fillStyle=f.hot?'#f9d990':'#b58c47';
        const size=f.hot&&k>.60?2:1;c.fillRect(Math.round(f.x),Math.round(f.y),size,size);
      }
      c.restore();
    }
    stats(){
      const a=this.latest;
      return {balance:this.balance,visible:this.discs.length,pending:this.queue.length,
        liveValue:this.discs.reduce((s,b)=>s+b.value,0)+this.queue.reduce((s,b)=>s+b.value,0),
        moving:this.discs.filter(p=>p.mode!=='rest').length,
        resting:this.discs.filter(p=>p.mode==='rest').length,emitted:a?a.born:0,landed:a?a.firstContacts:0,
        time:round(this.time),source:{...CHUTE},payment:this.purchase?{...this.purchase}:null,last:a?{...a,trace:a.trace.slice(),events:a.events.slice(),births:a.births.slice()}:null};
    }
  }
  function leftWall(y){return 101-(y-56)*.20;}
  /* Research-only instrumentation: reveal WORK's ACTUAL local mesh,
     die-normal buffer, BRDF-like shader and quaternion math. */
   window.WorkCardProbe={CoinTable,mesh,palette,dieHeight,metal,basis,axis,product,rotate,bloom:true,
      get dies(){return dies;},get tileSize(){return TILE;},get dieSize(){return dieSize;},
      get artworkReady(){return artworkReady;},
      setItem(item,img){mark=item.index|0;prepareTexture(item,img);},
      makeCard(seed=151){const table=new CoinTable(seed);table.reset(0);const b=table.make(1,0);
        b.x=180;b.y=190;b.z=0;b.patina=-.008;b.r=15;b.q=[0,0,0,1];b.matrix=basis(b.q);
        b.mode='rest';b.height=extent(b);return b;},
      rasterCard(b,lampX=240,lampY=115,light=.42){raster(b,light,lampX,lampY);return b.sprite;},
      drawBloom,
      setSampleScale(factor){const k=clamp(Math.round(Number(factor)||1),1,4);TILE=190*k;CENTRE=TILE*.5;TILE_RADIUS=83.5*k;return TILE;}
   };
})();

