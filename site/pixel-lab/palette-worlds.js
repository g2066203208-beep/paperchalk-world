/* First-party game art-direction scenes. Every canvas pixel is 100% opaque
   and uses exactly one of the 4 supplied RGB colors. No antialias / gradients.
   These are original design studies, not borrowed game or artist assets. */
export const WORLD_W=224,WORLD_H=144;
const COLORS=4;
export function drawWorld(canvas,palette,theme){
 if(!canvas||!Array.isArray(palette)||palette.length!==COLORS)throw Error('Invalid world palette');
 canvas.width=WORLD_W;canvas.height=WORLD_H;
 const g=canvas.getContext('2d',{willReadFrequently:true});
 g.imageSmoothingEnabled=false;
 const C=palette;
 function R(x,y,w,h,k){g.fillStyle=C[k];g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 function E(cx,cy,rx,ry,k){for(let yy=Math.floor(cy-ry);yy<=Math.ceil(cy+ry);yy++){
  let d=(yy+.5-cy)/ry;if(Math.abs(d)>1)continue;
  const dx=rx*Math.sqrt(1-d*d);
  R(Math.ceil(cx-dx),yy,Math.max(1,Math.floor(cx+dx)-Math.ceil(cx-dx)+1),1,k);
 }}
 function L(x0,y0,x1,y1,k,th=2){let x=Math.round(x0),y=Math.round(y0),u=Math.round(x1),v=Math.round(y1);
  const dx=Math.abs(u-x),dy=-Math.abs(v-y),sx=x<u?1:-1,sy=y<v?1:-1;let err=dx+dy;
  for(let guard=0;guard<512;guard++){R(x,y,th,th,k);if(x===u&&y===v)break;const e2=2*err;if(e2>=dy){err+=dy;x+=sx;}if(e2<=dx){err+=dx;y+=sy;}}}
 function building(x,y,w,h,k){R(x,y,w,h,k);for(let yy=y+10;yy<y+h-5;yy+=12)for(let xx=x+5;xx<x+w-3;xx+=13)R(xx,yy,4,5,k===0?3:0)}
 function pixelStar(x,y,k){R(x-2,y-2,5,5,k);R(x,y-7,1,15,k);R(x-7,y,15,1,k)}
 // The bottom 29 rows are an *actual* four-color HUD preview.
 R(0,0,WORLD_W,WORLD_H,0);
 switch(theme){
 case 'A':{
  R(0,0,224,115,3);E(172,34,28,28,1);
  R(0,73,224,42,2);R(0,89,224,26,0);
  building(8,53,28,62,0);building(43,39,26,76,0);building(76,63,27,52,0);
  building(115,48,30,67,0);building(155,67,19,48,0);building(184,52,28,63,0);
  R(16,60,12,4,1);R(51,45,9,4,1);R(124,53,12,4,1);
  for(let i=0;i<8;i++)R(8+i*28,106,16,3,3);
  R(4,4,44,3,0);R(4,4,3,22,0);R(188,4,30,3,0);R(215,4,3,21,0);
  break;
 }
 case 'B':{
  R(0,0,224,115,0);E(164,27,20,20,1);E(164,27,12,12,0);R(161,7,6,42,1);
  for(let i=0;i<11;i++){let x=i*24-5;R(x,62+(i%3)*4,18,3,2);R(x+6,68+(i%2)*6,14,2,3);}
  R(0,85,224,30,2);for(let i=0;i<12;i++)R(i*21-4,84+(i%3)*4,13,5,0);
  R(24,71,7,34,3);E(27,67,17,14,1);E(28,68,9,8,0);
  R(88,68,9,35,3);E(92,62,21,20,1);E(92,60,13,12,0);
  for(let y=78;y<112;y+=10)R(111,y,27,4,1);
  L(190,65,190,91,3,2);R(171,86,40,10,0);R(177,83,25,4,3);
  R(191,69,12,3,1);pixelStar(196,20,1);pixelStar(42,20,3);
  break;
 }
 case 'C':{
  R(0,0,224,115,0);R(0,82,224,33,2);
  for(let x=8;x<225;x+=39){let h=32+(x*7%47);building(x,82-h,27,h,2);}
  for(let i=0;i<5;i++){let bx=16+i*43;R(bx,98,35,3,1);}
  L(8,7,36,23,1,4);L(36,23,18,40,1,4);L(18,40,55,56,1,4);
  E(164,32,23,23,1);E(164,32,14,14,0);E(164,32,8,8,3);
  L(110,8,121,17,3,4);L(121,17,111,26,3,4);
  for(let x=10;x<224;x+=42){R(x,91,24,5,3);R(x+9,104,6,7,3);}
  break;
 }
 case 'D':{
  R(0,0,224,115,3);
  E(42,32,34,14,2);E(75,28,23,12,2);E(162,24,34,15,1);
  E(186,30,22,13,1);R(0,97,224,18,2);
  R(48,68,52,30,0);R(52,72,44,26,3);
  L(45,68,75,46,0,4);L(75,46,104,68,0,4);
  R(67,79,13,19,0);R(70,81,7,17,1);R(54,79,9,10,2);
  R(132,66,6,32,0);E(136,57,25,19,1);E(149,49,18,13,1);R(149,54,3,2,3);
  R(8,95,31,3,0);R(176,99,32,4,0);
  pixelStar(120,22,2);
  break;
 }
 case 'E':{
  R(0,0,224,115,3);E(171,25,24,24,1);
  R(0,78,224,37,2);
  for(let i=0;i<5;i++){const x=i*48-12,h=18+(i*13%26);
   R(x,78-h,38,h+16,1);R(x+8,78-h-10,23,10,1);R(x+14,78-h-16,12,6,1);}
  R(0,97,224,18,0);
  R(36,55,49,42,0);R(41,60,39,37,1);R(52,75,12,22,0);
  R(105,68,27,29,0);R(110,72,17,25,1);R(112,76,13,6,3);
  R(170,80,5,17,0);R(160,73,24,7,2);R(166,65,12,8,2);
  for(let i=0;i<10;i++)R(i*23+4,105,9,3,3);
  break;
 }
 case 'F':{
  R(0,0,224,115,2);E(177,29,24,24,3);
  R(0,72,224,43,3);
  for(let i=0;i<7;i++){let x=i*37-9;R(x,69+(i%3)*5,24,6,2);R(x+4,74+(i%3)*5,30,7,3);}
  R(84,22,9,75,0);R(91,33,10,64,0);R(74,86,40,10,0);
  R(67,22,36,5,0);R(77,14,14,8,0);R(80,6,8,8,1);
  L(89,15,66,52,0,2);L(89,15,116,53,0,2);R(58,54,61,4,0);
  for(let i=0;i<4;i++)R(148+i*16,70-i*7,10,25+i*7,0);
  R(145,77,70,7,1);R(165,92,24,5,0);
  pixelStar(27,22,3);R(12,40,29,4,3);
  break;
 }
 case 'G':{
  R(0,0,224,115,0);E(170,23,23,23,3);
  R(0,94,224,21,2);R(0,107,224,8,3);
  R(25,51,11,48,2);E(31,43,30,19,2);E(49,34,18,16,2);
  R(91,46,14,54,3);E(97,47,32,19,1);R(76,49,43,4,0);
  R(154,62,11,38,3);E(159,60,30,18,1);E(159,57,18,10,3);
  R(92,72,14,28,0);R(96,79,6,21,3);R(98,85,2,3,1);
  R(14,101,28,4,0);R(182,94,31,6,0);R(190,89,12,6,3);
  for(let i=0;i<9;i++)R(i*25+7,108,8,3,0);
  break;
 }
 case 'H':{
  R(0,0,224,115,3);E(174,31,28,28,1);
  R(0,85,224,30,2);
  for(let i=0;i<7;i++)R(i*38-9,85+(i%2)*7,30,5,3);
  R(12,47,41,38,0);R(16,51,33,34,1);R(20,58,24,7,3);
  R(65,39,25,46,0);R(69,43,17,42,2);R(92,50,21,35,0);
  R(132,30,4,56,0);L(134,31,193,31,0,3);L(187,31,187,68,0,2);
  R(176,67,23,10,1);R(146,85,63,8,0);R(162,81,26,4,1);
  R(20,94,100,5,0);for(let i=0;i<7;i++)R(i*35,101,20,3,3);
  break;
 }
 default: throw Error('Unknown art direction '+theme);
 }
 // HUD design changes from direction to direction.
 R(0,115,224,29,0);
 if(theme==='A'){
  R(5,119,214,21,3);R(9,123,54,13,0);R(65,123,4,13,1);
  R(77,122,85,5,2);R(77,131,50,5,1);R(182,122,26,14,1);
 }else if(theme==='B'){
  R(4,119,216,21,2);R(7,122,210,15,0);R(11,125,54,9,1);
  for(let x=75;x<176;x+=16)R(x,128+(x%3),11,3,2);R(184,124,26,10,3);
 }else if(theme==='C'){
  R(6,119,212,20,2);R(10,122,205,14,0);R(15,125,45,8,3);
  R(70,125,102,8,1);for(let x=70;x<172;x+=18)R(x+3,126,5,6,0);
  R(183,124,25,10,3);
 }else if(theme==='D'){
  R(5,118,214,23,3);R(9,121,60,17,2);R(13,125,51,9,3);
  R(78,124,100,4,1);R(78,132,82,4,2);R(182,123,29,14,1);
 }else if(theme==='E'){
  R(5,120,214,19,3);R(8,123,51,13,1);
  R(67,123,3,13,0);R(77,126,74,5,2);R(162,126,49,8,0);R(171,128,30,3,3);
 }else if(theme==='F'){
  R(4,119,216,21,3);R(8,123,51,13,0);R(11,126,45,7,1);
  R(67,124,104,4,0);R(67,132,72,5,2);R(176,123,39,14,1);
 }else if(theme==='G'){
  R(4,119,216,22,3);R(8,123,52,14,2);R(12,125,45,10,0);
  R(70,125,91,4,2);R(70,133,66,4,1);R(176,123,35,14,1);R(182,126,21,8,3);
 }else if(theme==='H'){
  R(4,119,216,21,3);R(8,123,56,13,1);R(12,126,46,7,0);
  R(70,123,102,5,2);R(70,132,77,5,0);R(183,123,29,14,1);
 }
 return canvas;
}
export function validateWorld(canvas,palette) {
 const rgba=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
 const allowed=palette.map(h=>h.toUpperCase());
 const seen=new Set();let invalid=0,transparency=0;
 for(let i=0;i<rgba.length;i+=4){
  if(rgba[i+3]!==255)transparency++;
  const h='#'+[rgba[i],rgba[i+1],rgba[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
  if(!allowed.includes(h))invalid++;else seen.add(h);
 }
 return {width:canvas.width,height:canvas.height,colors:seen.size,invalid,transparency};
}