/* Cloud shadows for the fixed-camera forest board.
 * One tileable, precomputed noise texture; one world-space fragment lookup.
 * Slow wind shifts cloud cover across board/ground without another shadow pass,
 * extra mesh, WebGL2 dependency, or touching the card illustrations.
 */
(function(root){'use strict';
function create(gl){
 const side=256;
 const data=new Uint8Array(side*side*4);
 const fade=x=>x*x*(3-2*x);
 // Periodic value noise: wrap lattice coordinates so the texture has no seams.
 function hash(x,y){
  let v=(Math.imul(x+1973,374761393)+Math.imul(y+9277,668265263))|0;
  v=Math.imul(v^(v>>>13),1274126177);
  return ((v^(v>>>16))>>>0)/4294967295;
 }
 function noise(x,y,frequency){
  const ax=x*frequency,ay=y*frequency;
  const ix=Math.floor(ax),iy=Math.floor(ay);
  const u=fade(ax-ix),v=fade(ay-iy);
  const a=((ix%frequency)+frequency)%frequency,b=((iy%frequency)+frequency)%frequency;
  const nextX=(a+1)%frequency,nextY=(b+1)%frequency;
  const top=hash(a,b)*(1-u)+hash(nextX,b)*u;
  const bottom=hash(a,nextY)*(1-u)+hash(nextX,nextY)*u;
  return top*(1-v)+bottom*v;
 }
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){
  const u=x/side,v=y/side;
  // Broad cloud bodies with fine irregular edges, never a sharp checker grid.
  const n=noise(u,v,4)*.62+noise(u,v,9)*.27+noise(u,v,21)*.11;
  const channel=Math.round(Math.max(0,Math.min(1,n))*255),i=(y*side+x)*4;
  data[i]=data[i+1]=data[i+2]=channel;data[i+3]=255;
 }
 const texture=gl.createTexture();
 gl.activeTexture(gl.TEXTURE3);
 gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,side,side,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 gl.generateMipmap(gl.TEXTURE_2D);
 gl.activeTexture(gl.TEXTURE0);
 function bind(uniforms,time,enabled=true){
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.uniform1i(uniforms.cloudMap,3);
  gl.uniform1f(uniforms.cloudTime,time);
  gl.uniform1f(uniforms.cloudStrength,enabled ? 0.29 : 0);
  gl.activeTexture(gl.TEXTURE0);
 }
 return Object.freeze({bind,get snapshot(){return{
  enabled:true,type:'moving-world-space-cloud-shadows',textureSize:side,
  cloudPeriodWorld:72,windWorldPerSecond:[.60,.23],
  strength:.29,extraDrawCalls:0,extraShadowPasses:0
 };}});
}
root.PaperchalkCloudShadows=Object.freeze({version:'1.0.0',create});
})(window);
