/* TV surface pixel renderer: exact Work CoinTable random, makeDies, palette, metal shader; rasterized per visible 3D TV triangle texel. */
(()=>{'use strict';
  const TAU=Math.PI*2,clamp=(v,lo,hi)=>Math.max(lo,Math.min(v,hi));
  const mix=(a,b,t)=>a+(b-a)*t;
  const normalized=(x,y,z)=>{let m=Math.hypot(x,y,z)||1;return [x/m,y/m,z/m]};
  const eye=normalized(0,.67,.82);
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

  const dieSize=48;
  const insignia=[
    [[-.35,.25,-.12,.02],[-.12,.02,-.21,-.18],[-.21,-.18,.36,-.46],[.36,-.46,.12,.12],[.12,.12,-.08,.03],[-.08,.03,-.33,.35],[-.33,.35,-.42,.27]],
    [[-.36,.28,-.36,-.20],[-.36,-.20,0,-.46],[0,-.46,.36,-.20],[.36,-.20,.36,.28],[.36,.28,.12,.28],[.12,.28,.12,-.07],[.12,-.07,-.11,-.07],[-.11,-.07,-.11,.28],[-.11,.28,-.36,.28]]
  ];
  function seg(x,y,a,b,c,d){
    const dx=c-a,dy=d-b,t=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy),0,1);
    return Math.hypot(x-a-dx*t,y-b-dy*t);
  }
  function dieHeight(x,y,k) {
    const r=Math.hypot(x,y),a=Math.atan2(y,x);
    let d=3;
    for(const s of insignia[k])d=Math.min(d,seg(x,y,...s));
    const crest=clamp((.105-d)*12,0,1)*.060;
    const rim=.031*clamp(1-Math.abs(r-.707)/.044,0,1);
    const punch=.012*clamp(1-Math.abs(r-.555)/.047,0,1)*Math.max(0,Math.cos(a*5+.3));
    // Several broad facets on the struck field split the window reflection.
    const planished=.13*Math.max(0,.22-.82*x+.43*y)+.037*Math.max(0,-.37-.21*x-.71*y);
    return planished+crest+rim+punch-.019*clamp(1-Math.abs(r-.785)/.025,0,1);
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
    [[-.36,.36],[-.43,.24],[-.14,-.04],[-.20,-.20],[.38,-.46],[.11,.15],[-.05,.07]],
    [[-.37,.30],[-.37,-.20],[0,-.46],[.37,-.20],[.37,.30],[.11,.30],[.11,-.065],[-.11,-.065],[-.11,.30]]
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
  const dies=makeDies();

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


  const warmLamp=normalized(-.27,-.41,1.03);
  let patina=null,stats={pixelShaders:0,normalMapHits:0,goldPixels:0,materialTexels:0,lightEvaluations:0,normalCacheHits:0,dieSize};
  // Cache original Work metal() result by snapped normal as CoinTable does for
  // rotated coin sprites: 2k reflections, not 260k expensive power calls.
  const normalLightCache=new Map();
  function attachCabinetPixels(pixels){patina=pixels;}
  function resetStats(){stats.pixelShaders=stats.normalMapHits=stats.goldPixels=stats.materialTexels=stats.lightEvaluations=stats.normalCacheHits=0;}
  const mat={
    // Work cabinet procedural casting is the base texel pigment;
    // Work CoinTable metal() supplies each visible pixel's environment reflection.
    bodyEnamel:[137,132,118,.16,.080],frontCast:[134,130,117,.15,.080],porcelain:[137,133,122,.16,.079],pearl:[156,151,136,.18,.082],
    controlInset:[46,50,52,.13,.075],shadowSteel:[35,40,43,.09,.060],edgeSeam:[26,30,32,.06,.060],
    edgeMetal:[94,91,82,.23,.097],rimMetal:[121,115,103,.26,.102],silver:[149,146,135,.25,.100],brushed:[126,122,110,.23,.094],dialFace:[155,148,128,.30,.108],
    rubber:[16,20,23,.03,.052],recessDark:[15,19,22,.04,.039],glassEdge:[35,43,48,.08,.061],
    engraving:[34,33,30,.07,.062],base:[40,43,42,.11,.066],tableEdge:[125,86,53,.13,.080],tableLeg:[99,68,45,.09,.078],
    pot:[145,126,97,.13,.080],soil:[34,29,22,.05,.052],stem:[48,98,59,.08,.081],
    leafA:[71,124,73,.08,.083],leafB:[89,141,80,.08,.090],leafC:[111,151,84,.08,.089],petal:[216,209,165,.13,.108],
    woodTop:[47,37,28,.08,.07],lamp:[210,151,88,.24,.11]
  };
  const goldTypes=new Set(['edgeMetal','rimMetal','silver','brushed','dialFace']);
  const darkTypes=new Set(['rubber','recessDark','glassEdge','soil','engraving']);
  const patinaTypes=new Set(['bodyEnamel','porcelain','frontCast','pearl','controlInset','edgeMetal','rimMetal','silver','brushed','dialFace','tableEdge']);
  const dieTypes=new Set(['dialFace','silver']);
  function shade(kind,nx,ny,nz,wx,wy,wz){
    ++stats.pixelShaders;
    const t=mat[kind]||mat.bodyEnamel;
    const isDie=dieTypes.has(kind);
    let du=0,dv=0,rough=0;
    if(isDie){
      // ORIGINAL 48x48 Work dieHeight() / makeDies() normal field,
      // applied to the two real metal dials, not to a fake face bitmap.
      const second=wy<0?1:0,die=dies[second];
      const cx=2.76,cy=wy<0?-.45:.53;
      const x=clamp((wx-cx)/.158,-1,1),y=clamp((wy-cy)/.158,-1,1);
      const i=(clamp(Math.floor((x+1)*.5*dieSize),0,dieSize-1)+clamp(Math.floor((y+1)*.5*dieSize),0,dieSize-1)*dieSize)*4;
      du=die[i]*.33;dv=die[i+1]*.33;rough=die[i+3]*.20;
      ++stats.normalMapHits;
    }else{
      const kx=wx*19.71+wz*6.13,ky=wy*23.1+wz*4.07;
      const h1=Math.sin(kx)*.022+Math.sin(kx*.37+ky*.26)*.014;
      const h2=Math.sin(ky*.71)*.018+Math.sin(kx*.31-ky*.49)*.012;
      const strength=goldTypes.has(kind)?.67:darkTypes.has(kind)?.11:.47;
      du=h1*strength;dv=h2*strength;
      rough=.011*Math.sin(kx*.83+ky*.38);
    }
    const almostZ=Math.abs(nz)>.58;
    const tx=almostZ?1:0,ty=almostZ?0:0,tz=almostZ?0:1;
    const bx=ny*tz-nz*ty,by=nz*tx-nx*tz,bz=nx*ty-ny*tx;
    let a=nx+du*tx+dv*bx,b=ny+du*ty+dv*by,c=nz+du*tz+dv*bz;
    const inv=1/(Math.hypot(a,b,c)||1);a*=inv;b*=inv;c*=inv;
    // Work's original normal -> exact metal() -> original palette.
    const na=clamp(Math.round(a*127)+127,0,254),nb=clamp(Math.round(b*127)+127,0,254),nc=clamp(Math.round(c*127)+127,0,254);
    const keyCode=(na<<16)|(nb<<8)|nc;
    let reflection=normalLightCache.get(keyCode);
    if(reflection===undefined){
      reflection=metal(a,b,c,0,0,warmLamp); // ORIGINAL unmodified Work shader
      normalLightCache.set(keyCode,reflection);
      stats.lightEvaluations++;
    }else stats.normalCacheHits++;
    const light=reflection+rough+t[4];
    const grit=((Math.sin(wx*47.2+wy*29.4+wz*10.9)*.5+.5)-.5)*3.4;
    const exposure=clamp(.79+light*.80,.43,1.80);
    let r=t[0]*exposure,g=t[1]*exposure,bcol=t[2]*exposure;
    if(patina&&patinaTypes.has(kind)){
      const sx=20+((Math.floor((wx+5.7)*35.0)%151+151)%151);
      const sy=17+((Math.floor((wy+2.7)*30+wz*9.0)%102+102)%102);
      const i=(sy*192+sx)*4;
      const f=patina[i]*.299+patina[i+1]*.587+patina[i+2]*.114;
      const p=clamp(.80+f/410,.86,1.10);
      r*=p;g*=p;bcol*=p;stats.materialTexels++;
    }
    if(goldTypes.has(kind)){
      stats.goldPixels++;
      const col=palette[clamp(Math.round(light*255),0,255)];
      // A restrained satin accent rather than gold-plating every TV edge.
      const metalMix=kind==='rimMetal'?.16:kind==='dialFace'?.24:.14;
      r=r*(1-metalMix)+col[0]*metalMix;
      g=g*(1-metalMix)+col[1]*metalMix;
      bcol=bcol*(1-metalMix)+col[2]*metalMix;
    }
    if(kind==='lamp'){r=231;g=154;bcol=88;}
    if(kind==='engraving'){r*=.63;g*=.65;bcol*=.56;}
    const n=clamp(grit,-2,2);
    const R=clamp(Math.round(r+n),0,255),G=clamp(Math.round(g+n*.86),0,255),B=clamp(Math.round(bcol+n*.74),0,255);
    return (R<<16)|(G<<8)|B;
  }
  window.WorkTVCPU=Object.freeze({metal,dieHeight,makeDies,shade,attachCabinetPixels,resetStats,stats,paletteSize:palette.length,dieSize});
})();
