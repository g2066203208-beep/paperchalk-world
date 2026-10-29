export const PALETTE_ORIGINAL=['#0F0F3B','#E33686','#2C9FCE','#FDEE8F'];
export const ROLES=['轮廓与背景','角色识别色','服饰与结构色','肤色与留白'];
const ORIGINAL=PALETTE_ORIGINAL.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));
const colorOf=(hex)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
export function readSourceTokens(rgba){
 if(rgba.length!==384*512*4)throw new Error('源图的原生像素数量不正确');
 const tokens=new Uint8Array(rgba.length/4);
 const used=new Set();
 for(let p=0;p<tokens.length;p++){
   const i=p*4;let label=-1;
   for(let k=0;k<4;k++){
    const q=ORIGINAL[k];
    if(rgba[i]===q[0]&&rgba[i+1]===q[1]&&rgba[i+2]===q[2]&&rgba[i+3]===255){label=k;break}
   }
   if(label<0)throw Error('源图包含未知颜色 / alpha：像素 '+p);
   tokens[p]=label;used.add(label);
 }
 if(used.size!==4)throw Error('源图必须实际包含4种颜色');
 return tokens;
}
export function recolor(tokens,palette,out){
 if(tokens.length*4!==out.length)throw Error('输出尺寸不正确');
 const colors=palette.map(colorOf);if(colors.length!==4)throw Error('palette must be 4 colors');
 for(let i=0;i<tokens.length;i++){
  const c=colors[tokens[i]],p=i*4;
  out[p]=c[0];out[p+1]=c[1];out[p+2]=c[2];out[p+3]=255;
 }
}
export function validateCanvas(rgba,palette){
 const colors=palette.map(colorOf);const seen=new Set();let alpha=0,other=0;
 for(let i=0;i<rgba.length;i+=4){
  if(rgba[i+3]!==255)alpha++;
  let hit=-1;
  for(let k=0;k<4;k++){
    const c=colors[k];
    if(rgba[i]===c[0]&&rgba[i+1]===c[1]&&rgba[i+2]===c[2]){hit=k;break;}
  }
  if(hit<0)other++;else seen.add(hit);
 }
 return {colors:seen.size,alpha,other};
}