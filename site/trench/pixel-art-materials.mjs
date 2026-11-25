// V33 "Ash and Amber": authored pixel motifs, fixed hue ramps, no per-pixel RNG.
// Each 64x64 tile is painted with connected shapes. Geometry and lighting are separate.
const ramps={
 stone:['#54575b','#747577','#91918a','#b3ad98','#d4c7a9'],darkStone:['#363d43','#505963','#69727a','#858c8c','#a4a9a1'],
 plaster:['#68696a','#989184','#b8ad94','#d1c1a3','#e2d2b1'],cream:['#77766d','#a59b86','#c5b89c','#ded0b0','#efe0bf'],
 trim:['#646569','#8f8b80','#b1a48e','#cabea0','#e5d3ac'],brick:['#463638','#73504c','#93665b','#b67d69','#ca9877'],
 cobble:['#454950','#5b6065','#777975','#92938a','#b0aa95'],road:['#3f474e','#5c6265','#747873','#898d83','#a5a99c'],
 asphalt:['#363d44','#4b555c','#626a6d','#787f80','#939992'],wood:['#302d33','#50413c','#74594b','#96765a','#b79774'],
 woodLight:['#55423c','#795c49','#9b7959','#bd986d','#d4b68a'],roof:['#343a46','#4c5667','#657083','#879099','#a6b0b5'],
 roof2:['#2c3543','#414e60','#596b7d','#728598','#99a8b5'],roof3:['#4a3a40','#665055','#82676a','#9c8480','#b8a29a'],
 glass:['#172a34','#263e49','#3c5860','#668183','#a1b6a7'],iron:['#232b34','#36434d','#52636c','#798788','#a9b2a9'],
 mud:['#34343a','#514940','#6b5c4d','#8a775f','#a8997b'],water:['#253d4b','#355364','#496e7b','#759394','#a4b5ac'],
 grass:['#343e39','#495649','#63715a','#7b896b','#a2ac84'],earth:['#413d3b','#5d5145','#7d6851','#9d8668','#b9a485']
};
const aliases={ochre:'plaster',rose:'brick',white:'cream',rubble:'stone',leaf:'grass',leaf2:'grass',moss:'grass',rail:'iron',rust:'brick',char:'darkStone',smoke:'darkStone'};
const mod=(x,n)=>((x%n)+n)%n;
function colors(name,base){let r=ramps[name]||ramps[aliases[name]];if(!r){let b=[1,3,5].map(i=>parseInt(base.slice(i,i+2),16));return [.56,.79,1,1.13,1.24].map(f=>b.map(v=>Math.min(255,Math.round(v*f))))}return r.map(s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)))}
export function paintTile(name,base){
 const p=new Uint8Array(4096).fill(2),set=(x,y,v)=>{p[mod(y,64)*64+mod(x,64)]=v},rect=(x,y,w,h,v)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)set(x+i,y+j,v)};
 const stamp=(x,y,rows,v)=>{rows.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(row[i]==='#')set(x+i,y+j,v)})};
 const family=aliases[name]||name;
 if(['stone','darkStone','brick','cobble'].includes(family)){
  const brick=family==='brick',cob=family==='cobble',bw=brick?16:cob?16:32,bh=brick?8:cob?16:16;
  for(let row=0;row<64/bh;row++)for(let col=-1;col<64/bw;col++){
   let x=col*bw+(row%2)*bw/2,y=row*bh,variation=mod(col*3+row*5,7),tone=variation===0?1:variation===2?3:2;
   rect(x,y,bw,bh,1);rect(x+1,y+1,bw-2,bh-2,tone);
   // Broken bevel highlights, one shared light direction; no outline on every edge.
   rect(x+2,y+1,bw-5,1,Math.min(4,tone+1));rect(x+1,y+2,1,Math.max(2,bh-5),Math.min(3,tone+1));
   rect(x+3,y+bh-2,bw-6,1,Math.max(0,tone-1));if(variation===3||variation===5)stamp(x+4,y+3,['####','###.','##..'],Math.max(0,tone-1));
   if(cob){set(x+1,y+1,1);set(x+bw-2,y+1,1);set(x+1,y+bh-2,1);set(x+bw-2,y+bh-2,1);}
  }
 }else if(['plaster','cream','trim'].includes(family)){
  // Mostly clean limewash, isolated chipped edges, water run-off.
  stamp(3,12,['######..','########','..######','....###.'],1);
  stamp(44,43,['..######','########','#######.','..####..','...##...'],1);
  stamp(4,11,['#####','..###'],3);stamp(43,42,['.#####','###...'],3);
  rect(49,0,2,12,1);rect(50,12,1,5,1);
  if(family==='trim'){rect(0,0,64,2,3);rect(0,61,64,3,1);}
 }else if(['road','asphalt','mud','earth','grass'].includes(family)){
  // Broad fragments with interlocking stair-step silhouettes.
  const glyphs=[['..######..','##########','########..','..#####...'],['####....','######..','..######','....###.'],['...###','#####.','####..']];
  for(let k=0;k<6;k++){let x=mod(k*23+7,64),y=mod(k*31+11,64);stamp(x,y,glyphs[k%3],k%3===0?1:3);}
  if(family==='mud'||family==='earth'){stamp(30,19,['..########..','############','..########..','....####....'],1);stamp(30,18,['..######','####....'],3)}
 }else if(['wood','woodLight'].includes(family)){
  for(let x=0;x<64;x+=16){rect(x,0,1,64,0);rect(x+1,0,1,64,3);rect(x+14,0,1,64,1);let y=mod(x*7+11,64);stamp(x+5,y,['.##.','###.','.##.','.##.','..#.'],1);rect(x+8,y+11,1,8,3);}
 }else if(['roof','roof2','roof3'].includes(family)){
  for(let y=0;y<64;y+=8)for(let x=-8;x<64;x+=16){let u=x+(y%16===0?0:8),tone=mod(u/8+y/8,5)===0?1:2;rect(u,y,16,8,tone);rect(u+1,y+1,13,1,3);rect(u+2,y+7,12,1,1);rect(u,y+2,1,5,1)}
 }else if(family==='glass'){
  rect(0,0,64,64,1);stamp(5,6,['#######........','..#######......','....#######....','......#######..','........#######'],2);rect(0,0,64,3,2);rect(0,61,64,3,0);
 }else if(family==='iron'){
  rect(0,0,64,64,1);rect(0,0,64,2,3);rect(0,2,64,2,2);rect(0,62,64,2,0);
 }else if(family==='water'){
  for(let i=0;i<6;i++){let x=mod(i*19,64),y=mod(i*11,64);rect(x,y,8+i,1,3);rect(x+3,y+1,6,1,1)}
 }
 const pal=colors(name,base),out=new Uint8Array(64*64*3);for(let i=0;i<p.length;i++)out.set(pal[p[i]],i*3);return out;
}
