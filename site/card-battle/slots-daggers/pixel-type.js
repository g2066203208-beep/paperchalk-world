(() => {
'use strict';
const {clamp}=SlotStudy;
const glyphs={
 A:'0e11111f111111',B:'1e11111e11111e',C:'0f10101010100f',D:'1e11111111111e',E:'1f10101e10101f',
 F:'1f10101e101010',G:'0f10101711110e',H:'1111111f111111',I:'0e04040404040e',J:'0702020212120c',
 K:'11121418141211',L:'1010101010101f',M:'111b1515111111',N:'11191915131311',O:'0e11111111110e',
 P:'1e11111e101010',Q:'0e11111115120d',R:'1e11111e141211',S:'0f10100e01011e',T:'1f040404040404',
 U:'1111111111110e',V:'11111111110a04',W:'1111111515150a',X:'11110a040a1111',Y:'11110a04040404',Z:'1f01020408101f',
 0:'0e11131519110e',1:'040c040404040e',2:'0e11010204081f',3:'1e01010e01011e',4:'02060a121f0202',
 5:'1f10101e01011e',6:'0e10101e11110e',7:'1f010204080808',8:'0e11110e11110e',9:'0e11110f01010e',
 a:'00000e011f110f',b:'10101e1111111e',c:'00000f1010100f',d:'01010f1111110f',e:'00000e111f100f',
 f:'0609081e080808',g:'00000f110f010e',h:'10101e11111111',i:'04000c0404040e',k:'10101214181412',
 l:'0c04040404040e',m:'00001a15151515',n:'00001e11111111',o:'00000e1111110e',p:'00001e111e1010',
 r:'00001619101010',s:'00000f100e011e',t:'08081e08080906',u:'0000111111110f',v:'00001111110a04',
 y:'000011110f010e','+':'0004041f040400','-':'0000001f000000','/':'01010204081010',
 '!':'04040404040004',"'":'04040800000000','.':'00000000000c0c','?':'0e110102040004',':':'000c0c000c0c00',
 '$':'040f140e051e04','>':'10080402040810','<':'01020408040201',' ':'00000000000000'
};
const textCache=new Map();
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function label(c,str,x,y,size,color,align='left',maxWidth=Infinity){
 str=String(str);const key=str+'|'+color;
 let im=textCache.get(key);
 if(!im){
  im=makeCanvas(Math.max(1,str.length*6-1),7);const t=im.getContext('2d');t.fillStyle=color;
  [...str].forEach((ch,n)=>{const bits=glyphs[ch]||glyphs[ch.toUpperCase()]||glyphs['?'];
   for(let row=0;row<7;row++){const line=parseInt(bits.slice(row*2,row*2+2),16);
    for(let col=0;col<5;col++)if(line&(16>>col))t.fillRect(n*6+col,row,1,1);}
  });if(textCache.size>550)textCache.clear();textCache.set(key,im);
 }
 const w=Math.min(im.width*size,maxWidth);x-=align==='center'?w/2:align==='right'?w:0;
 c.save();c.imageSmoothingEnabled=false;c.drawImage(im,x,y,w,7*size);c.restore();
}
function glow(c,x,y,r,color,power){
 if(power<.006||r<1)return;
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=clamp(power,0,1);
 const grad=c.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'transparent');
 c.fillStyle=grad;c.fillRect(x-r,y-r,2*r,2*r);c.restore();
}

Object.assign(SlotStudy,{label,makeCanvas,glow});
})();
