// Original, layered pixel characters for the kiosk window. No image-generation
// service, borrowed sprite sheets, flattened backgrounds or canvas hit areas.
// Geometry is drawn in a 44x72 logical pixel grid at integer scale.
const O={
 skin:['#e7b58e','#d7a581','#bf906f'],
 coats:[['#607e79','#395b59','#90a69b'],['#9e7589','#644a65','#c397a0'],['#a18a62','#665b47','#c3aa7d'],['#66869c','#42586f','#95aabc']],
 hats:[['#405969','#263945','#7792a1'],['#aa7b72','#6d4e59','#e3b59c'],['#68594d','#413c39','#a48b70'],['#546d87','#354759','#8aa3b8']],
 scarves:['#d3b27c','#a8c4b5','#9bbed0','#d8aa86']
};
const box=(g,x,y,w,h,color,scale,ox,oy)=>{g.fillStyle=color;g.fillRect(Math.round(ox+x*scale),Math.round(oy+y*scale),Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));};
export function drawWindowCustomer(g,{x,y,w,h,tone=0,phase=0,talking=false}={}){
 const v=((Number(tone)||0)%4+4)%4;
 const scale=Math.max(1,Math.floor(Math.min(w/44,h/72)));
 const ox=Math.round(x+(w-44*scale)/2),oy=Math.round(y+h-72*scale);
 const [coat,shade,lit]=O.coats[v], [hat,hatShade,hatLit]=O.hats[v];
 const blink=(Math.floor(phase/11)+v*7)%31===0;
 const bob=-(Math.floor(phase/32)%2);
 const armLift=talking&&Math.floor(phase/14)%2===0;
 const R=(a,b,c,d,col)=>box(g,a,b+bob,c,d,col,scale,ox,oy);
 // Silhouette: legs stay behind the counter sill; coat and arms are separate layers.
 R(12,42,21,30,'#202a32');R(9,47,27,24,shade);
 R(11,43,23,27,coat);R(13,44,4,25,lit);R(29,44,4,25,shade);
 R(18,45,8,24,coat);R(21,47,2,18,shade);
 for(const yy of [49,57,65]){R(22,yy,2,2,'#d3c6a6');R(23,yy,1,1,'#f5ddac');}
 R(9,46,5,3,shade);R(32,46,4,3,shade);
 R(12,61,6,1,shade);R(29,61,5,1,shade);
 R(15,59,2,3,lit);R(31,59,2,3,lit);
 // Hands: right arm has a discrete talking/waving pose.
 R(6,45,7,18,shade);R(7,45,5,15,coat);R(7,60,5,5,hatShade);
 if(armLift){R(34,37,6,17,shade);R(35,36,5,12,coat);R(34,31,6,7,O.skin[0]);R(35,30,2,3,O.skin[0]);}
 else{R(33,45,6,18,shade);R(34,45,4,15,coat);R(34,60,5,5,hatShade);}
 // Neck, ears, head shadow and face: eyes and mouth are individually animated.
 R(18,34,10,10,O.skin[2]);R(19,34,9,8,O.skin[0]);
 R(13,15,21,23,'#372d32');R(14,17,19,20,O.skin[2]);R(16,17,17,19,O.skin[0]);
 R(16,25,2,6,O.skin[1]);R(30,24,2,8,O.skin[1]);
 R(12,27,3,6,O.skin[1]);R(33,27,2,6,O.skin[2]);
 R(18,26,4,blink?1:3,'#2d3139');R(28,26,4,blink?1:3,'#2d3139');
 if(!blink){R(19,26,1,1,'#f0e6d4');R(29,26,1,1,'#f0e6d4');}
 R(24,29,2,4,O.skin[1]);R(22,35,6,talking?2:1,'#895f61');
 if(talking){R(23,35,4,3,'#543d49');R(24,36,2,1,'#d9a4a0');}
 else R(24,36,3,1,'#a97473');
 // Individual hats and accessories give customers distinct silhouettes.
 if(v===0){ // ear-flap winter cap, worn fur lining
  R(11,13,25,7,hatShade);R(13,9,21,8,hat);R(16,7,16,3,hatLit);
  R(12,19,5,11,hat);R(32,19,5,11,hat);R(13,27,3,5,hatLit);R(33,27,3,5,hatLit);
  R(15,18,19,3,hatLit);R(21,13,5,2,hatShade);
 }else if(v===1){ // knitted beanie with pom and ribbed brim
  R(12,12,24,9,hat);R(16,8,17,6,hat);R(22,4,7,6,hatLit);
  R(13,19,22,4,hatShade);for(let i=0;i<5;i++)R(16+i*4,19,2,3,hatLit);
  R(17,11,2,5,hatShade);R(27,11,2,5,hatShade);
 }else if(v===2){ // tall ushanka, stitched panels
  R(11,11,26,11,hatShade);R(15,6,18,7,hat);R(18,4,12,4,hatLit);
  R(11,18,5,13,hat);R(33,18,4,13,hat);R(13,28,4,4,hatLit);
  R(16,19,17,5,hatLit);R(19,20,12,3,hat);
 }else{ // fur-lined hood, no hat or shared sprite parts
  R(9,12,29,23,hatShade);R(12,10,23,25,hat);R(15,13,18,24,hatLit);
  R(16,18,17,20,O.skin[0]);R(17,25,4,3,'#2d3139');R(28,25,4,3,'#2d3139');
  R(18,32,12,3,O.skin[1]);R(21,36,7,talking?2:1,'#895f61');
 }
 // Scarf is foreground layer, so it genuinely overlaps the coat/neck.
 R(16,38,17,5,O.scarves[v]);R(16,41,16,2,hatShade);
 R(v%2?17:29,42,5,11,O.scarves[v]);R(v%2?18:30,45,2,6,lit);
 // Cold breath puffs are small detached animated pixels, not a flat overlay.
 if(!talking && Math.floor(phase/27)%3===1){
  const off=Math.floor(phase/9)%3;
  R(37+off,31-off,3,2,'#d8e4e3');R(40+off,27-off,2,2,'#a9c9d4');
 }
}
