/** Shared hand-drawn architectural stock for the 21:00 school street. */
export function createCityPaperAtlas({THREE}){
  const width=2048,height=1024;
  const tiles={school:[0,0,768,640],store:[768,0,768,512],pharmacy:[1536,0,512,512],
    closed:[768,512,512,512],office:[1280,512,512,512],highrise:[1792,512,256,512],
    gate:[0,640,768,192],detail:[0,832,768,192]};
  const regions=Object.fromEntries(Object.entries(tiles).map(([key,[x,y,w,h]])=>[key,
    Object.freeze({u0:(x+3)/width,v0:1-(y+h-3)/height,u1:(x+w-3)/width,v1:1-(y+3)/height,aspect:w/h})]));
  const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  const emitCanvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  if(canvas){canvas.width=emitCanvas.width=width;canvas.height=emitCanvas.height=height;}
  const ctx=canvas?.getContext('2d'),em=emitCanvas?.getContext('2d');
  const signText=['市立中学','青灯便利店','便民药房','文具 · 书刊','今日休息','学园路'];
  if(ctx&&em){
    ctx.fillStyle='#737f8e';ctx.fillRect(0,0,width,height);em.fillStyle='#000';em.fillRect(0,0,width,height);
    const font='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
    function rect(x,y,w,h,color,glow=null){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);if(glow){em.fillStyle=glow;em.fillRect(x,y,w,h);}}
    function line(points,color,lineWidth=1){ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
    function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
    function label(text,x,y,size,color,align='left',weight=500,glow=null){
      ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,x,y);
      if(glow){em.font=ctx.font;em.textAlign=align;em.textBaseline='middle';em.fillStyle=glow;em.fillText(text,x,y);}
    }
    function window(x,y,w,h,{warm=false,lit=false,curtain=false,office=false}={}){
      rect(x-4,y-4,w+8,h+8,'#4c5969');rect(x-1,y-1,w+2,h+2,'#acb4b7');
      const glass=lit?(warm?'#d5b78e':'#becfd3'):'#53677a';
      rect(x,y,w,h,glass,lit?(warm?'#d2a771':'#a8c5d5'):null);
      if(lit){
        rect(x+3,y+h*.10,w-6,3,warm?'#ead4af':'#e5ebdf',warm?'#dac69a':'#d4e4e7');
        if(office){
          rect(x+w*.16,y+h*.66,w*.72,4,'#74828a');rect(x+w*.24,y+h*.48,w*.18,h*.16,'#5c6a75');
          rect(x+w*.70,y+h*.51,w*.09,h*.15,'#7f8d94');
        }else if(curtain){
          poly([[x+2,y+1],[x+w*.32,y+1],[x+w*.21,y+h-3],[x+2,y+h-3]],warm?'#a99787':'#98afb4');
          poly([[x+w-2,y+1],[x+w*.72,y+1],[x+w*.82,y+h-3],[x+w-2,y+h-3]],warm?'#b4a18a':'#a2b9bd');
        }
      }else{
        poly([[x+1,y+1],[x+w*.62,y+1],[x+w*.36,y+h-1],[x+1,y+h-1]],'#63768a');
      }
      rect(x+w*.49,y,2,h,'#88959f');rect(x,y+h*.68,w,2,'#7f8f9b');
      rect(x-5,y+h,w+10,5,'#a8adaf');rect(x-5,y+h+5,w+10,3,'#6a7683');
    }
    function panel(x,y,w,h,color){
      rect(x,y,w,h,color);poly([[x,y],[x+w*.085,y],[x+w*.085,y+h],[x,y+h]],'#657281');
      rect(x,y,w,5,'#afb6b6');rect(x,y+h-5,w,5,'#5c6b7e');
    }
    function ac(x,y,w=70,h=38){
      rect(x+3,y+4,w,h,'#5b6675');rect(x,y,w,h,'#99a4ad');rect(x+4,y+4,w-8,h-8,'#84929d');
      ctx.strokeStyle='#657986';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+w*.72,y+h*.51,h*.31,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<5;i++)line([[x+7,y+9+i*4],[x+w*.40,y+9+i*4]],'#bec2be',1);
      line([[x+w-7,y+h],[x+w-7,y+h+18],[x+w+13,y+h+18]],'#88969d',3);
    }
    function tile(name,draw){
      const [x,y,w,h]=tiles[name];ctx.save();em.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();em.beginPath();em.rect(x,y,w,h);em.clip();
      ctx.translate(x,y);em.translate(x,y);draw(w,h);ctx.restore();em.restore();
    }
    tile('school',(w,h)=>{
      rect(0,0,w,h,'#89949d');rect(0,0,w,27,'#5e6d7e');rect(0,27,w,12,'#b0b5b1');
      rect(20,45,728,526,'#8d969d');rect(257,44,74,530,'#6b7b89');rect(609,44,48,530,'#697b8b');
      for(const y of [68,210,350,490]){rect(22,y,w-44,4,'#aeb3b2');rect(22,y+116,w-44,11,'#727f8d');}
      const columns=[47,151,354,458,679];
      for(let row=0;row<4;row++)for(let col=0;col<columns.length;col++){
        const x=columns[col],winW=col===4?50:72;
        window(x,88+row*140,winW,82,{lit:(row===1&&(col===2||col===3))||(row===3&&col===0),warm:row===3,curtain:row!==1,office:row===1});
      }
      rect(0,591,w,49,'#626e7e');rect(0,579,w,12,'#abb0af');
      for(let y=599;y<640;y+=13){line([[0,y],[w,y]],'#74818d');for(let x=(y%2)*25;x<w;x+=70)line([[x,y],[x,y+12]],'#74818d');}
      rect(270,109,50,169,'#536677');label('市',295,139,26,'#c7c8bb','center');label('立',295,177,26,'#c7c8bb','center');
      label('中',295,215,26,'#c7c8bb','center');label('学',295,253,26,'#c7c8bb','center');
      ac(357,187,69,34);ac(465,467,71,34);
      line([[639,40],[639,425],[649,425],[649,581]],'#526575',5);
      rect(20,48,13,526,'#a7adb0');
    });
    tile('store',(w,h)=>{
      rect(0,0,w,h,'#6c7e8c');rect(0,0,w,20,'#a1aaac');rect(0,20,w,100,'#547b82');
      rect(16,33,w-32,73,'#637f86');rect(18,36,8,66,'#a4c8bc');
      label('青灯便利店',w*.51,70,52,'#d5e3d9','center',600,'#819c97');
      rect(0,114,w,13,'#c5d5cb','#546971');rect(0,127,w,14,'#405666');
      rect(20,144,w-40,h-163,'#364f63');
      // White ceiling, layered shelving and products are printed into the card.
      rect(30,150,493,294,'#b8cacc','#8fa9b7');rect(536,150,202,294,'#aebfc4','#7d98aa');
      rect(32,151,491,20,'#dce5dc','#c9dedf');rect(539,151,196,20,'#d3dfd8','#afcbd6');
      for(const y of [233,307,378]){
        rect(51,y+35,445,8,'#70838d');rect(51,y+43,445,7,'#d5ddd4');
        for(let col=0;col<20;col++){
          const x=57+col*21,hh=19+(col*7+y)%17;
          rect(x,y+34-hh,12,hh,['#b49882','#749ba7','#b5b496','#c6c9bd','#8b9996'][col%5]);
          rect(x,y+37-hh,12,3,'#d5d7c7');
        }
      }
      // An empty checkout and a lit refrigeration wall suggest a lived-in store.
      rect(332,394,171,44,'#76888e');rect(337,384,170,13,'#d5d8c8');rect(417,349,34,31,'#4d6577');rect(424,351,23,21,'#adc9c9','#536d80');
      for(let i=0;i<3;i++){rect(558+i*52,192,42,167,'#8fa8b2');rect(562+i*52,199,34,153,'#b2cbd0','#819eaa');for(let j=0;j<5;j++)rect(565+i*52,214+j*26,28,3,'#708b99');}
      for(const x of [25,189,355,526,632,738])rect(x,143,8,313,'#a8b6bb');
      rect(630,148,6,303,'#677e8f');rect(615,293,5,51,'#d3dcd9');rect(638,293,5,51,'#d3dcd9');
      poly([[39,165],[84,165],[159,442],[118,442]],'rgba(235,242,232,.12)');
      poly([[546,177],[567,177],[622,425],[604,425]],'rgba(225,240,234,.13)');
      rect(34,174,78,67,'#bbbc9f');label('热食',73,195,20,'#52686d','center',600);label('新鲜到店',73,221,12,'#637677','center');
      rect(558,377,132,53,'#b5c6c3');label('24H',624,398,22,'#526b79','center',600);label('欢迎光临',624,419,12,'#607884','center');
      rect(0,457,w,19,'#aab6b7');rect(0,476,w,36,'#5b707f');
      line([[0,488],[w,488]],'#88999f',2);
    });
    tile('pharmacy',(w,h)=>{
      rect(0,0,w,h,'#7e8e96');rect(0,18,w,87,'#638882');rect(0,108,w,12,'#abc2b5');
      rect(26,47,40,13,'#b9d5c2','#648a81');rect(40,33,13,42,'#b9d5c2','#648a81');
      label('便民药房',w*.60,62,39,'#d4e1d2','center',600,'#708c88');
      rect(21,139,470,312,'#465f70');
      for(const x of [32,194,350]){
        rect(x,150,139,290,'#acbfbd','#728f9f');
        for(let row=0;row<6;row++){
          rect(x+8,186+row*38,123,4,'#708b98');
          for(let col=0;col<7;col++)rect(x+11+col*16,165+row*38,11,20,['#bfc7b8','#8fa8a5','#d0cfb9'][col%3]);
        }
      }
      rect(192,145,8,303,'#94adb0');rect(343,145,8,303,'#94adb0');rect(477,145,8,303,'#aebdbc');
      rect(322,283,5,50,'#d3dbd0');label('夜间服务',115,389,24,'#506975','center',500);label('健康守护',115,417,15,'#647d83','center');
      rect(0,457,w,15,'#bcc5bf');rect(0,472,w,40,'#647b87');
    });
    tile('closed',(w,h)=>{
      rect(0,0,w,h,'#788492');rect(0,23,w,82,'#747f90');rect(0,26,w,4,'#a5acaa');
      label('文具 · 书刊',w*.5,65,36,'#c4c4b9','center',500);rect(17,117,w-34,347,'#536477');
      rect(28,130,w-56,321,'#7b8995');for(let y=139;y<448;y+=13){rect(28,y,w-56,3,'#667888');rect(28,y+3,w-56,1,'#a0abae');}
      rect(25,126,8,330,'#b1b8b7');rect(w-33,126,8,330,'#929fa5');
      rect(212,277,119,75,'#bcbcae');label('今日休息',272,300,19,'#566674','center',500);label('明日  08:30',272,328,12,'#75838b','center');
      rect(44,331,80,101,'#7a929b');label('开学',84,357,23,'#c6d4cb','center',600);label('新文具',84,388,17,'#bfd0c9','center');
      line([[150,110],[145,170],[159,192],[160,245]],'#4e6276',3);rect(0,465,w,47,'#5b6e80');
    });
    tile('office',(w,h)=>{
      rect(0,0,w,h,'#748597');rect(0,0,w,24,'#4c627a');rect(0,24,w,7,'#9ba9b0');
      rect(229,32,43,480,'#63798f');rect(0,30,18,h-30,'#8f9da9');rect(w-22,30,22,h-30,'#526a81');
      for(let row=0;row<5;row++){
        const y=48+row*92;rect(18,y+78,w-40,7,'#536d85');
        for(let col=0;col<4;col++)window(37+col*117,y,79,64,{lit:(row===1&&col===2)||(row===3&&col===0),warm:row===3,office:true,curtain:row!==1});
      }
      ac(295,287,59,29);line([[481,30],[481,480]],'#445e78',4);
    });
    tile('highrise',(w,h)=>{
      rect(0,0,w,h,'#53687f');rect(0,0,w,15,'#3e556f');rect(0,15,17,h,'#738596');rect(w-26,15,26,h,'#405b75');
      for(let row=0;row<13;row++)for(let col=0;col<5;col++){
        const lit=(row*11+col*7)%17===1||(row===8&&col===3),warm=(row+col)%3===0;
        const x=29+col*39,y=29+row*36;
        rect(x,y,25,24,lit?(warm?'#b7a397':'#9eb9c6'):'#425e7b',lit?(warm?'#806a57':'#688798'):null);
        rect(x,y+11,25,2,'#71889a');
      }
      for(const x of [18,126,229])rect(x,15,3,497,'#7a8b9b');
    });
    tile('gate',(w,h)=>{
      rect(0,0,w,h,'#566c7c');rect(0,0,w,14,'#bbc0b7');rect(0,h-17,w,17,'#354c63');
      rect(16,21,w-32,h-51,'#607888');line([[23,29],[w-23,29],[w-23,h-34],[23,h-34],[23,29]],'#8096a0',2);
      label('市 立 中 学',w*.5,h*.47,74,'#dbd5bf','center',600);label('求 知  ·  明 理  ·  笃 行',w*.5,h*.79,18,'#a5b3b8','center');
    });
    tile('detail',(w,h)=>{
      rect(0,0,w,h,'#687f92');rect(12,12,235,166,'#759399');line([[21,21],[238,21],[238,169],[21,169],[21,21]],'#adc3bb',3);
      label('学园路',129,71,38,'#dae0d2','center',600);label('学校 →',129,126,20,'#bacbc8','center');
      rect(271,18,118,153,'#8397a3');label('公 告',330,40,17,'#d7d9c9','center');rect(283,59,93,94,'#bfc9c6');
      for(let i=0;i<7;i++)rect(292,69+i*10,68-(i%3)*13,2,'#8096a0');
      rect(412,18,133,153,'#657e90');for(let y=32;y<158;y+=11)line([[425,y],[531,y]],'#a5b5ba',3);
      rect(571,35,151,40,'#d4e2dc','#b8d3e3');rect(571,92,151,57,'#384e68');
    });
    // A handful of broad translucent stock fibres; never dirty surface noise.
    ctx.globalAlpha=.025;ctx.strokeStyle='#eef1e5';ctx.lineWidth=1;
    for(let i=0;i<140;i++){const x=(i*163)%width,y=(i*97)%height;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+16+(i%5)*5,y+4);ctx.stroke();}
    ctx.globalAlpha=1;
    // Shelves, mullions and the illustrated interior also modulate emitted
    // light, so a shop window keeps its drawing instead of becoming a white box.
    em.globalCompositeOperation='multiply';em.drawImage(canvas,0,0);em.globalCompositeOperation='source-over';
  }
  function texture(canvas,name,isEmissive=false){
    let result;
    if(canvas&&ctx){
      if(isEmissive){const small=document.createElement('canvas');small.width=width/2;small.height=height/2;small.getContext('2d').drawImage(canvas,0,0,small.width,small.height);result=new THREE.CanvasTexture(small);}
      else result=new THREE.CanvasTexture(canvas);
    }else{
      const w=isEmissive?width/2:width,h=isEmissive?height/2:height,pixels=new Uint8Array(w*h*4);
      for(let i=0;i<pixels.length;i+=4){pixels[i]=isEmissive?0:125;pixels[i+1]=isEmissive?0:140;pixels[i+2]=isEmissive?0:154;pixels[i+3]=255;}
      result=new THREE.DataTexture(pixels,w,h,THREE.RGBAFormat);result.flipY=true;
    }
    result.name=name;result.colorSpace=THREE.SRGBColorSpace;result.generateMipmaps=true;
    result.minFilter=THREE.LinearMipmapLinearFilter;result.magFilter=THREE.LinearFilter;
    result.wrapS=result.wrapT=THREE.ClampToEdgeWrapping;result.needsUpdate=true;return result;
  }
  const color=texture(canvas,'City illustrated architectural paper'),emissive=texture(emitCanvas,'City shop and window light mask',true);
  return {color,emissive,regions,stats:{width,height,tiles:Object.keys(tiles).length,signText,textureBytes:width*height*5,canvasPainted:!!ctx}};
}
