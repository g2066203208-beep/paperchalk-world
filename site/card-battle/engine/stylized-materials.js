/* Small reusable painted-surface atlas for WebGL1. No Anima drawing is
 * invented: these are deterministic procedural FALLBACK tiles until actual
 * hand-painted Anima images are supplied and dropped into this loader.
 * 2x2 atlas: lush grass, earthy soil, slate stone, natural bark.
 * One shared texture allocation, mipmapped and repeated in world coordinates
 * using fract() inside the game's shader; no per-tile textures or extra meshes.
 */
(function(root){'use strict';
function create(gl){
 const side=1024,cell=512,can=document.createElement('canvas');
 can.width=can.height=side;const ctx=can.getContext('2d');
 let state=874291;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const paints=[
  {base:[125,145,93],dark:[72,111,64],light:[166,173,107]},  // forest ground
  {base:[141,119,86],dark:[103,85,61],light:[176,147,101]},  // earthy cliff
  {base:[139,143,132],dark:[97,110,100],light:[183,181,157]},// stone
  {base:[123,91,57],dark:[78,61,43],light:[155,120,76]}      // bark
 ];
 for(let kind=0;kind<4;kind++){
  const ox=(kind%2)*cell,oy=Math.floor(kind/2)*cell,p=paints[kind];
  const img=ctx.createImageData(cell,cell);
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
   const coarse=Math.sin(x*.039+Math.cos(y*.026)*1.1)*Math.cos(y*.050-x*.022);
   const mid=Math.sin(x*.115-y*.076)*Math.cos(y*.137+x*.052);
   const fine=(rnd()-.5);
   const shade=(coarse*.065+mid*.033+fine*.037);
   const i=(y*cell+x)*4;
   for(let c=0;c<3;c++)img.data[i+c]=Math.max(0,Math.min(255,p.base[c]*(1+shade)));
   img.data[i+3]=255;
  }
  ctx.putImageData(img,ox,oy);
  // Hand-painted-looking broken strokes distributed away from the atlas
  // boundaries, with no shadow, object, tree, large flower or baked highlight.
  for(let j=0;j<(kind===0?5200:kind===1?2600:1550);j++){
   const x=ox+8+rnd()*496,y=oy+8+rnd()*496;
   const col=rnd()<.57?p.light:p.dark;
   const a=kind===0?.10:.09;
   ctx.strokeStyle='rgba('+col.join(',')+','+(a*(.6+rnd()*.65)).toFixed(3)+')';
   ctx.lineWidth=kind===0?.65+rnd()*.85:1+rnd()*1.3;
   ctx.beginPath();ctx.moveTo(x,y);
   if(kind===0)ctx.lineTo(x+(rnd()-.5)*3,y-1.4-rnd()*4);
   else if(kind===3)ctx.lineTo(x+(.3+rnd()*.5),y+4+rnd()*12);
   else ctx.lineTo(x+1+rnd()*7,y+(rnd()-.5)*2.4);
   ctx.stroke();
  }
 }
 const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,can);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.generateMipmap(gl.TEXTURE_2D);
 gl.activeTexture(gl.TEXTURE0);
 return Object.freeze({
  texture:tex,
  bind(uniforms){
   gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,tex);
   gl.uniform1i(uniforms.materialAtlas,2);
   gl.activeTexture(gl.TEXTURE0);
  },
  get snapshot(){return {ready:true,type:'worldspace-stylized-material-atlas',
   resolution:[1024,1024],materials:['grass','soil','stone','bark'],
   source:'procedural-fallback-anima-asset-ready',normalResponse:true,roughnessResponse:true,
   drawCallsAdded:0};}
 });
}
root.PaperchalkMaterialAtlas=Object.freeze({version:'1.1.0',create});
})(window);
