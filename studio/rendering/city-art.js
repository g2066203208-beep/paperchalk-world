/** Original illustrated paper stock for Moonlamp Academy Street. */
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
    const ink='#896553',cream='#fff0cc',white='#fff8e7',teal='#376e64',mint='#b7d9b5';
    const font='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
    // Facade cards have deliberately different world/atlas aspect ratios.
    // Counter-stretch lettering, rather than printing squat, distorted glyphs.
    const textAspect={school:(9/3.65)/(768/640),store:(6/2.84)/(768/512),
      pharmacy:4.35/2.95,closed:4.43/3.30,office:1,highrise:1,
      gate:(4.1/.53)/(768/192),detail:(1.11/.45)/(235/166)};
    let letteringAspect=1;
    ctx.fillStyle=cream;ctx.fillRect(0,0,width,height);em.fillStyle='#000';em.fillRect(0,0,width,height);
    ctx.lineJoin='round';ctx.lineCap='round';
    function rect(x,y,w,h,color,glow=null){
      ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
      if(glow){em.fillStyle=glow;em.fillRect(x,y,w,h);}
    }
    function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
    function line(points,color=ink,size=2){ctx.strokeStyle=color;ctx.lineWidth=size;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
    function ellipse(x,y,rx,ry,color,glow=null){
      ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
      if(glow){em.fillStyle=glow;em.beginPath();em.ellipse(x,y,rx,ry,0,0,Math.PI*2);em.fill();}
    }
    function label(text,x,y,size,color,align='center',weight=600,glow=null){
      ctx.save();ctx.translate(x,y);ctx.scale(1,letteringAspect);
      ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,0,0);
      if(glow){em.save();em.translate(x,y);em.scale(1,letteringAspect);em.font=ctx.font;em.textAlign=align;em.textBaseline='middle';em.fillStyle=glow;em.fillText(text,0,0);em.restore();}
      ctx.restore();
    }
    // Slightly misaligned corners and a narrow offset ply make clean cut paper,
    // without covering the illustration with distressed photographic noise.
    function paper(x,y,w,h,color,edge=white,depth=5){
      poly([[x+2,y+depth],[x+w+depth,y+depth+1],[x+w+depth-1,y+h+depth],[x,y+h+depth]],'#b99579');
      poly([[x,y+1],[x+w-2,y],[x+w,y+h-2],[x+2,y+h]],color);
      line([[x+1,y+h-2],[x+1,y+2],[x+w-3,y+1]],edge,3);
    }
    function tape(x,y,w=28,rotation=-.12){
      ctx.save();ctx.translate(x,y);ctx.rotate(rotation);rect(-w/2,-6,w,12,'rgba(255,240,195,.65)');
      line([[-w/2,-5],[w/2,-5]],'rgba(255,251,224,.6)',1);ctx.restore();
    }
    function baseboard(w,y,h,color='#d3a28d'){
      rect(0,y,w,h,color);rect(0,y,w,8,'#efd6b8');rect(0,y+8,w,3,'#c0937f');
      line([[0,y+h*.56],[w,y+h*.56]],'#e6bd9e',2);
      for(let i=0;i<Math.ceil(w/92);i++){
        line([[i*92+20,y+12],[i*92+20,y+h*.56]],'#e6bd9e',2);
        line([[i*92+63,y+h*.56],[i*92+63,y+h-2]],'#e6bd9e',2);
      }
    }
    function sprig(x,y,scale=1,color='#729b80'){
      line([[x,y],[x+4*scale,y-28*scale]],'#69846d',2*scale);
      for(let i=0;i<3;i++){
        ellipse(x-(5+i%2)*scale,y-(9+i*7)*scale,7*scale,3*scale,color);
        ellipse(x+(7+i%2)*scale,y-(12+i*6)*scale,7*scale,3*scale,color);
      }
    }
    function planter(x,y,w=75){
      for(let i=0;i<4;i++)sprig(x+12+i*(w-24)/3,y-4,.9,i%2?'#88a879':'#608f76');
      poly([[x,y-4],[x+w,y-4],[x+w-6,y+20],[x+6,y+20]],'#bf8272');
      rect(x-3,y-8,w+6,8,'#e4b39b');line([[x+10,y+2],[x+w-11,y+2]],'#d79d86',2);
    }
    function star(x,y,size,color='#f2cc7c'){
      const pts=[];for(let i=0;i<8;i++){const angle=Math.PI*i/4,r=i%2?size*.28:size;pts.push([x+Math.cos(angle)*r,y+Math.sin(angle)*r]);}poly(pts,color);
    }
    function moon(x,y,r,back,glow=false){
      ellipse(x,y,r,r,'#f6d28b',glow?'#6f4b21':null);ellipse(x+r*.36,y-r*.24,r*.82,r*.82,back);
      star(x+r*.5,y+r*.1,r*.23,white);
    }
    function window(x,y,w,h,{lit=true,curtain='#ddaaa0',flowers=false,crossbar=true}={}){
      paper(x-8,y-8,w+16,h+17,white,'#fffdf0',4);
      rect(x-2,y-2,w+4,h+4,'#325d55');
      rect(x+4,y+4,w-8,h-8,lit?'#edc176':'#4d7976',lit?'#6b4522':null);
      rect(x+4,y+4,w-8,10,lit?'#c89458':'#456b6b');
      rect(x+4,y+h*.79,w-8,h*.17,lit?'#d7a15e':'#638a7c');
      if(lit){
        rect(x+4,y+4,w-8,8,'#ffedbd','#77552d');
        poly([[x+4,y+4],[x+w*.32,y+4],[x+w*.24,y+h*.57],[x+4,y+h*.79]],curtain);
        poly([[x+w-4,y+4],[x+w*.7,y+4],[x+w*.78,y+h*.59],[x+w-4,y+h*.81]],curtain);
        line([[x+6,y+h*.57],[x+w*.22,y+h*.55]],'#f7deb9',3);
        line([[x+w*.8,y+h*.55],[x+w-6,y+h*.58]],'#f7deb9',3);
      }else{
        poly([[x+4,y+14],[x+w*.75,y+14],[x+w*.3,y+h-5],[x+4,y+h-5]],'#82a898');
      }
      // A single broad mullion reads from the gameplay camera; no tiny grid.
      rect(x+w*.48,y,5,h,white);
      if(crossbar)rect(x,y+h*.56,w,4,'#ebdec0');
      rect(x-13,y+h+5,w+26,9,'#f8e8c6');rect(x-9,y+h+14,w+20,4,'#c5a183');
      if(flowers)planter(x+8,y+h+17,w-16);
    }
    function hangingLamp(x,y){
      line([[x,y],[x,y+16]],ink,3);poly([[x-10,y+16],[x+10,y+16],[x+15,y+40],[x-15,y+40]],'#f6d49a');
      rect(x-10,y+20,20,16,'#ffe8ae','#86582e');rect(x-15,y+40,30,4,teal);ellipse(x,y+14,13,4,teal);
    }
    function tile(name,draw){
      letteringAspect=textAspect[name]??1;
      const [x,y,w,h]=tiles[name];ctx.save();em.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();em.beginPath();em.rect(x,y,w,h);em.clip();
      ctx.translate(x,y);em.translate(x,y);draw(w,h);
      // Fibres are long, sparse and low contrast; the colour remains deliberate.
      ctx.save();ctx.globalAlpha=.07;ctx.strokeStyle='#fffaf0';ctx.lineWidth=1;
      for(let i=0;i<76;i++){const sx=(i*137+23)%w,sy=(i*89+41)%h;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+9+i%19,sy+1+i%3);ctx.stroke();}
      ctx.restore();ctx.restore();em.restore();
    }
    tile('school',(w,h)=>{
      rect(0,0,w,h,'#f0dfb6');rect(16,20,w-32,h-40,'#f9e9c6');
      rect(0,0,w,15,'#75a694');rect(0,15,w,10,'#fff3d5');rect(0,25,w,5,'#c8ac87');
      rect(17,37,15,526,'#fff2d5');rect(w-33,37,15,526,'#fff2d5');
      rect(308,30,151,551,'#ead8ae');rect(314,34,137,540,'#fff0cb');
      paper(232,39,304,75,'#e9c790','#fff1d2',5);
      label('市立中学',384,76,31,'#355e4e','center',700);
      // Two pairs of generous windows per floor, designed for a low, wide card.
      for(const [i,x] of [51,185,477,611].entries()){
        window(x,155,101,133,{lit:i!==2,curtain:i%2?'#e2b18e':'#d9a2a0'});
        window(x,365,101,133,{lit:i!==0,curtain:i%2?'#b5c3a2':'#e6b19c'});
      }
      rect(33,319,w-66,9,'#ffefce');rect(33,328,w-66,5,'#dab994');
      // The cut-paper school badge echoes an open book beneath a little sun.
      ellipse(384,207,32,66,'#d6b57e');ellipse(381,203,29,60,'#fff4d4');
      ellipse(381,175,10,21,'#dfac4e');
      poly([[352,202],[379,209],[381,242],[354,232]],'#77a998');
      poly([[381,209],[408,202],[406,232],[381,242]],'#477f77');
      line([[359,212],[375,216],[375,233]],'#dfe2b9',2);line([[388,216],[402,212]],'#dfe2b9',2);
      label('知 · 行',383,281,14,'#6a8265');
      paper(327,356,115,236,'#f7e9c9',white,5);
      rect(334,363,102,224,'#315c50');rect(343,377,36,127,'#88b09c');rect(389,377,37,127,'#96bea4');
      rect(343,513,36,59,'#5d9680');rect(389,513,37,59,'#5d9680');
      line([[348,383],[366,383],[347,475]],'#bbd4b9',3);line([[394,383],[416,383],[394,475]],'#bbd4b9',3);
      rect(377,477,3,36,'#efcb81');rect(388,477,3,36,'#efcb81');
      hangingLamp(300,371);hangingLamp(468,371);
      baseboard(w,567,73);rect(317,589,132,15,'#fff0cd');rect(309,604,149,15,'#dec5a4');rect(299,619,168,19,'#f1d9b5');
      // A small string of paper flags gives the facade a handmade silhouette.
      line([[37,112],[113,126],[220,116]],'#b29370',2);
      for(let i=0;i<5;i++)poly([[51+i*33,116+i%2*5],[69+i*33,118+i%2*5],[60+i*33,137+i%2*5]],['#d99b8f','#94b7a0','#e7bf75'][i%3]);
      line([[549,117],[645,127],[732,113]],'#b29370',2);
      for(let i=0;i<5;i++)poly([[561+i*32,119+i%2*4],[579+i*32,118+i%2*4],[570+i*32,136+i%2*4]],['#94b7a0','#e7bf75','#d99b8f'][i%3]);
    });
    tile('store',(w,h)=>{
      rect(0,0,w,h,'#d79068');rect(13,15,w-26,h-29,'#f2b780');
      paper(18,20,w-36,104,mint,'#edf1cf',6);
      rect(141,34,4,73,'#e1e8bf');
      ctx.save();ctx.translate(82,72);ctx.scale(1,letteringAspect);
      ellipse(0,0,35,35,'#578c75');ellipse(-1,-1,31,31,'#fff0c9');moon(-4,-4,21,'#fff0c9');ctx.restore();
      label('青灯便利店',437,67,48,'#275e50','center',700);
      // Printed folds complement the separate paper roof and projecting canopy.
      rect(7,131,w-14,51,'#f5e5bf');
      for(let x=7;x<w;x+=84){rect(x,131,42,51,'#d58a5f');poly([[x+4,133],[x+20,133],[x+38,180],[x+24,180]],'#efad76');}
      rect(7,129,w-14,6,'#ffefd0');rect(7,179,w-14,7,'#b3846c');
      for(let x=7;x<w;x+=42){poly([[x,182],[x+42,182],[x+39,199],[x+21,205],[x+2,198]],Math.floor((x-7)/42)%2?'#f4e5bf':'#c98153');}
      paper(24,212,484,229,white,'#fff5d8',6);rect(34,222,464,210,'#66472e');
      rect(42,230,448,192,'#e7b66b','#64401d');rect(43,246,446,10,'#a7753f');
      rect(45,229,442,18,'#fff0c3','#835c31');
      // Three calm shelf bands, with a few large, legible product silhouettes.
      for(let row=0;row<3;row++){
        const y=271+row*50;rect(56,y+29,330,10,'#a16d3d');rect(54,y+29,334,4,'#ffe9b1');
        for(let col=0;col<7;col++){
          const x=65+col*46,bh=22+(col+row)%3*5,c=['#b66e50','#5c8c73','#d19e44','#a47770'][(col+row)%4];
          paper(x,y+28-bh,27,bh,c,c,2);rect(x+4,y+33-bh,19,8,'#f8e6bd');
        }
      }
      rect(396,252,76,109,'#c2cdb0');rect(403,260,61,90,'#e3e1ba');
      for(let row=0;row<3;row++){rect(406,281+row*26,55,3,'#9caf95');for(let i=0;i<3;i++){rect(411+i*16,267+row*26,9,13,'#7c9e88');rect(413+i*16,264+row*26,5,4,'#eed79c');}}
      paper(351,383,133,39,'#dca773','#f8dca6',3);rect(345,377,146,9,'#fff0c6');rect(413,351,27,23,'#568377');rect(417,355,19,12,'#c6dbba');
      rect(258,219,10,216,'#f4e7c8');rect(263,222,3,206,'#c6b191');
      poly([[45,234],[59,234],[126,419],[111,419]],'rgba(255,251,222,.23)');
      poly([[275,234],[284,234],[349,420],[340,420]],'rgba(255,251,222,.18)');
      paper(531,211,210,230,'#3c745c','#d4dfb8',6);rect(546,226,179,200,'#cb9458','#64401f');
      rect(555,235,161,179,'#f0c982');rect(548,358,175,9,'#6f9b76');
      rect(630,225,10,203,'#3f745d');rect(616,313,5,41,'#fff0c7');rect(647,313,5,41,'#fff0c7');
      paper(661,254,45,58,'#fff0cc',white,2);label('24',684,282,26,'#365f48');
      paper(560,377,149,37,'#dfaa72','#f4d9ae',2);label('欢迎光临',635,395,20,'#754a30','center',600);
      baseboard(w,454,58,'#bd7855');rect(519,448,231,12,'#ffebc4');rect(513,461,244,12,'#dda67d');
      paper(73,245,85,46,'#f8e9bf',white,3);label('新鲜到店',116,269,17,'#9b543b');tape(116,244,30,.06);
    });
    tile('pharmacy',(w,h)=>{
      rect(0,0,w,h,'#92b18f');rect(13,16,w-26,h-30,'#b6cba0');
      paper(17,22,w-34,99,'#f4ebc9',white,5);
      ctx.save();ctx.translate(66,71);ctx.scale(1,letteringAspect);
      ellipse(0,0,30,30,'#729d73');rect(-18,-6,36,12,'#f9edc9');rect(-6,-18,12,36,'#f9edc9');ctx.restore();
      label('便民药房',307,72,39,'#456c45','center',700);
      rect(0,136,w,12,'#718f76');rect(0,148,w,9,'#f4e7c2');
      paper(25,181,264,257,white,'#fff8e3',5);rect(34,190,246,239,'#668665');
      rect(42,198,230,223,'#dfd29b','#493b1e');
      rect(40,196,234,24,'#f8e7b8');
      for(let row=0;row<3;row++){
        for(let col=0;col<6;col++){const x=49+col*35,y=242+row*54;rect(x,y,21,29,['#acc3a0','#dfbd8a','#d5c6a8'][col%3]);rect(x+3,y+8,15,4,'#fcf0ce');}
        rect(43,275+row*54,229,6,'#9ba887');rect(43,273+row*54,229,3,'#f8edc9');
      }
      rect(151,190,8,239,'#f6efce');poly([[44,226],[57,226],[105,422],[95,422]],'rgba(255,253,225,.24)');
      paper(312,181,175,257,'#527b54','#e6e5bd',6);rect(326,194,147,141,'#a4bb8b');
      rect(334,202,131,122,'#e8e0b8','#363c20');rect(326,345,147,78,'#729971');
      rect(448,337,6,42,'#f8e3ac');label('夜间服务',399,384,25,'#fff0c9');
      baseboard(w,456,56,'#9eaf95');
      paper(61,375,77,42,'#f8eac4',white,2);label('安心',100,396,24,'#54724b');tape(97,374,25,-.1);
    });
    tile('closed',(w,h)=>{
      rect(0,0,w,h,'#c38e9e');rect(15,15,w-30,h-30,'#e2b7bf');
      paper(20,25,w-40,93,'#9e5f71','#efc4b4',6);
      label('文具 · 书刊',w*.5,72,42,'#fff0d0','center',600);
      rect(8,137,w-16,15,'#814f63');rect(5,134,w-10,6,'#e5b9ab');
      paper(27,176,239,271,'#b57c81','#eed6bd',6);rect(39,188,214,248,'#593b4e');
      rect(48,198,196,225,'#a7838e');
      for(let row=0;row<3;row++){
        const y=253+row*58;rect(48,y,196,7,'#8f7072');
        for(let col=0;col<6;col++){
          const x=56+col*30,hh=29+(col+row)%3*5;
          rect(x,y-hh,20,hh,['#6d997e','#bb756d','#e0b773','#8c7ba7'][(col+row)%4]);
          rect(x+4,y-hh+5,3,hh-11,'#e2c9a6');
        }
      }
      rect(139,184,8,254,'#e5c6b0');
      paper(289,176,195,271,'#804d60','#e9cbb8',6);rect(304,190,165,241,'#b27485');
      rect(315,202,143,111,'#d8b7bb');rect(315,327,143,90,'#9d6277');
      line([[326,337],[446,337],[446,404],[326,404],[326,337]],'#ccaaa4',3);ellipse(449,324,5,7,'#e8c58a');
      line([[366,215],[387,202],[411,215]],'#997676',2);paper(330,215,113,67,'#f9e6bf',white,4);
      label('今日休息',387,248,24,'#884d59');
      baseboard(w,457,55,'#b88984');planter(67,439,97);
      paper(166,381,64,41,'#f7deaa','#fff0c8',2);label('新书',198,401,18,'#9a7469');tape(198,380,25,.12);
    });
    tile('office',(w,h)=>{
      rect(0,0,w,h,'#efc8bb');rect(16,25,w-32,h-25,'#f5d5c2');
      rect(0,0,w,17,'#b88582');rect(0,17,w,9,'#ffe8c8');rect(0,26,w,5,'#d2a18e');
      rect(22,37,10,h-38,'#ffe8d0');rect(w-34,37,10,h-38,'#ffe8d0');
      // Upper residences have only two floors and two broad windows per floor.
      for(let row=0;row<2;row++)for(let col=0;col<2;col++){
        window(69+col*226,73+row*225,126,133,{lit:row!==0||col===0,curtain:col?'#bccba8':'#dbaa9e',flowers:row===0});
      }
      rect(33,251,w-66,9,'#ffebd0');rect(33,260,w-66,5,'#d1a28e');
      rect(0,475,w,14,'#e0b29c');rect(0,489,w,23,'#c39888');
      paper(224,321,65,65,'#fcdfb8','#fff0cf',3);moon(256,350,18,'#fcdfb8');
    });
    tile('highrise',(w,h)=>{
      rect(0,0,w,h,'#b7aabe');rect(11,15,w-24,h-17,'#c2b7c9');
      rect(0,0,w,12,'#d6c7d5');rect(w-23,12,23,h,'#a99cb3');
      for(let row=0;row<7;row++)for(let col=0;col<3;col++){
        const x=30+col*69,y=41+row*65,lit=(row*3+col)%8===2;
        rect(x,y,38,38,lit?'#dcccae':'#a99bb6',lit?'#2d251f':null);rect(x,y,38,3,'#cfc1ce');
      }
      for(const y of [167,362]){rect(15,y,w-38,5,'#cfc0d0');rect(15,y+5,w-38,3,'#b0a1b8');}
    });
    tile('gate',(w,h)=>{
      rect(0,0,w,h,'#e7c89a');paper(9,9,w-20,h-20,'#fff1cf','#fff9e4',6);
      line([[30,31],[w-31,31],[w-31,h-34],[30,h-34],[30,31]],'#b7c2a1',3);
      star(89,86,21,'#8eaf91');star(w-89,86,21,'#8eaf91');
      label('市 立 中 学',w*.5,91,65,'#356550','center',700);
      tape(41,23,61,-.16);tape(w-40,h-26,61,-.13);
    });
    tile('detail',(w,h)=>{
      // The four subregions keep their established UV crop coordinates.
      rect(0,0,w,h,'#eee0ba');paper(12,12,235,166,'#5a8b7b','#dce5bb',5);
      line([[23,24],[235,24],[235,164],[23,164],[23,24]],'#bfd1ac',3);
      label('学园路',129,69,41,'#fff0c8','center',700);label('学校 →',129,133,20,'#d6e2b7');
      paper(271,18,118,153,'#c79875','#f4d8ad',4);label('公 告',330,41,18,'#fff0cc');
      paper(283,59,93,94,'#fff0cc','#fff7de',2);tape(330,62,28,-.12);
      for(let i=0;i<6;i++)rect(294,77+i*11,63-(i%3)*12,2,'#b3aa87');
      paper(412,18,133,153,'#e2dcc1','#fff2d0',5);rect(423,31,111,129,'#c0c7b3');
      for(let y=40;y<151;y+=12){rect(426,y,105,4,'#f0e9c9');rect(426,y+4,105,2,'#a4b09f');}
      paper(571,35,151,40,'#fae4ae','#fff6d2',3);rect(579,42,135,23,'#ffedbd','#865c2f');
      paper(571,92,151,57,'#728f7f','#d7deba',3);rect(581,103,130,34,'#587c71');
    });
    // Modulate the mask with the drawing so shelves and curtains retain colour.
    em.globalCompositeOperation='multiply';em.drawImage(canvas,0,0);em.globalCompositeOperation='source-over';
  }
  function texture(source,name,isEmissive=false){
    let result;
    if(source&&ctx){
      if(isEmissive){const small=document.createElement('canvas');small.width=width/2;small.height=height/2;small.getContext('2d').drawImage(source,0,0,small.width,small.height);result=new THREE.CanvasTexture(small);}
      else result=new THREE.CanvasTexture(source);
    }else{
      const w=isEmissive?width/2:width,h=isEmissive?height/2:height,pixels=new Uint8Array(w*h*4);
      for(let i=0;i<pixels.length;i+=4){pixels[i]=isEmissive?0:240;pixels[i+1]=isEmissive?0:221;pixels[i+2]=isEmissive?0:180;pixels[i+3]=255;}
      result=new THREE.DataTexture(pixels,w,h,THREE.RGBAFormat);result.flipY=true;
    }
    result.name=name;result.colorSpace=THREE.SRGBColorSpace;result.generateMipmaps=true;
    result.minFilter=THREE.LinearMipmapLinearFilter;result.magFilter=THREE.LinearFilter;
    result.wrapS=result.wrapT=THREE.ClampToEdgeWrapping;result.needsUpdate=true;return result;
  }
  const color=texture(canvas,'Moonlamp hand-cut architectural paper'),emissive=texture(emitCanvas,'Moonlamp warm window light mask',true);
  return {color,emissive,regions,stats:{width,height,tiles:Object.keys(tiles).length,signText,textureBytes:width*height*5,canvasPainted:!!ctx}};
}
