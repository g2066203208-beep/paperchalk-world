/* Shared paper stock material for terrain and later papercraft entities.
 * Procedural textures are deterministic and intentionally subtle.
 */
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function createPaperTexture(THREE,{side=false}={}){
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=side?'#f2e1c9':'#faf7ee';ctx.fillRect(0,0,256,256);
  let seed=side?0x6d2b79f5:0x2f6e2b1d;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<3200;i++){
    const v=218+Math.floor(rnd()*35),a=.018+rnd()*.055;
    ctx.fillStyle=`rgba(${v},${Math.max(0,v-(side?18:6))},${Math.max(0,v-(side?28:10))},${a})`;
    const x=rnd()*256,y=rnd()*256,r=.25+rnd()*.85;ctx.fillRect(x,y,r,r);
  }
  ctx.lineCap='round';
  const fibres=side?520:310;
  for(let i=0;i<fibres;i++){
    const x=rnd()*256,y=rnd()*256,len=(side?4:2)+rnd()*(side?20:11);
    const angle=side?(rnd()-.5)*.16:(rnd()-.5)*.65;
    ctx.strokeStyle=side?`rgba(105,72,45,${.025+rnd()*.07})`:`rgba(130,112,86,${.018+rnd()*.045})`;
    ctx.lineWidth=.25+rnd()*.55;ctx.beginPath();ctx.moveTo(x,y);
    ctx.lineTo(x+Math.cos(angle)*len,y+Math.sin(angle)*len);ctx.stroke();
  }
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
  tex.generateMipmaps=true;tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

export function createPaperMaterialSet(THREE,settings){
  const textures={top:createPaperTexture(THREE),side:createPaperTexture(THREE,{side:true})};
  const make=({side=false,bevel=false}={})=>{
    const uniforms={
      uPaperFiber:{value:Number(settings.fiberStrength)||0},
      uPaperPrint:{value:Number(settings.printNoiseStrength)||0},
      uPaperSide:{value:side?1:0},
      uPaperBevel:{value:bevel?1:0},
      uPaperBandHeight:{value:Math.max(.08,Number(settings.paperThickness)||.30)}
    };
    const paperMap=side?textures.side:textures.top;
    const mat=new THREE.MeshStandardMaterial({
      vertexColors:true,map:paperMap,bumpMap:paperMap,bumpScale:side?.020:.012,
      roughness:side?.97:.93,metalness:0,side:THREE.DoubleSide,flatShading:!!side,
      emissive:side?0x24170f:0x000000,emissiveIntensity:side?.20:0
    });
    mat.userData.paperRole=side?'side':bevel?'bevel':'top';
    mat.userData.paperUniforms=uniforms;
    mat.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nvarying vec3 vPaperWorldPos;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvPaperWorldPos=(modelMatrix*vec4(position,1.0)).xyz;');
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>',`#include <common>
          varying vec3 vPaperWorldPos;
          uniform float uPaperFiber;
          uniform float uPaperPrint;
          uniform float uPaperSide;
          uniform float uPaperBevel;
          uniform float uPaperBandHeight;
          float paperHash(vec2 p){
            p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);
            return fract(p.x*p.y);
          }`)
        .replace('#include <color_fragment>',`#include <color_fragment>
          float broad=paperHash(floor(vPaperWorldPos.xz*1.35)+floor(vPaperWorldPos.xy*.31))-.5;
          float grain=paperHash(floor(vPaperWorldPos.xz*31.0)+floor(vPaperWorldPos.xy*11.0))-.5;
          float fine=paperHash(floor(vPaperWorldPos.xy*89.0)+floor(vPaperWorldPos.zy*47.0))-.5;
          float fiberLine=sin(vPaperWorldPos.x*76.0+vPaperWorldPos.z*29.0+fine*7.0);
          float paperVar=1.0+broad*uPaperPrint*.72+grain*uPaperFiber*.60+fine*uPaperFiber*.22+fiberLine*uPaperFiber*.12;
          diffuseColor.rgb*=paperVar;
          if(uPaperSide>.5){
            float bandPhase=fract((vPaperWorldPos.y+1000.0)/max(.04,uPaperBandHeight));
            float bandEdge=min(bandPhase,1.0-bandPhase);
            float layerSeam=1.0-smoothstep(.015,.10,bandEdge);
            diffuseColor.rgb*=.99-layerSeam*.11;
          }
          if(uPaperBevel>.5)diffuseColor.rgb*=1.065;`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          float paperRough=paperHash(floor(vPaperWorldPos.xz*53.0)+floor(vPaperWorldPos.xy*19.0))-.5;
          roughnessFactor=clamp(roughnessFactor+paperRough*uPaperFiber*.42,.82,1.0);`);
    };
    mat.customProgramCacheKey=()=>`paper-stock-v1-${side?1:0}-${bevel?1:0}`;
    return mat;
  };
  const materials=[make(),make({side:true}),make({bevel:true})];

  const sync=next=>{
    for(const mat of materials){
      const u=mat.userData.paperUniforms;if(!u)continue;
      u.uPaperFiber.value=Number(next.fiberStrength)||0;
      u.uPaperPrint.value=Number(next.printNoiseStrength)||0;
      u.uPaperBandHeight.value=Math.max(.08,Number(next.paperThickness)||.30);
      const f=clamp(Number(next.fiberStrength)||0,0,.12);
      mat.bumpScale=(mat.userData.paperRole==='side'?.014:.008)+f*(mat.userData.paperRole==='side'?.12:.08);
    }
  };
  const dispose=()=>{
    for(const m of materials)m.dispose();
    textures.top.dispose();textures.side.dispose();
  };
  return {textures,materials,sync,dispose};
}
