/* Hand-authored original stage dioramas; SVG artwork rendered in the browser.
   No borrowed photography or commercial-game assets. */
const defs=`<defs>
  <linearGradient id="night" x2="0" y2="1"><stop stop-color="#080d12"/><stop offset=".57" stop-color="#20201f"/><stop offset="1" stop-color="#46372f"/></linearGradient>
  <radialGradient id="halo"><stop stop-color="#f4c17f" stop-opacity=".49"/><stop offset=".22" stop-color="#be7950" stop-opacity=".27"/><stop offset="1" stop-color="#ab5b38" stop-opacity="0"/></radialGradient>
  <radialGradient id="moon"><stop stop-color="#dfd7b8"/><stop offset=".55" stop-color="#b0aea2"/><stop offset="1" stop-color="#777d7d"/></radialGradient>
  <linearGradient id="stone" x2=".9" y2=".5"><stop stop-color="#49413d"/><stop offset=".38" stop-color="#777166"/><stop offset=".62" stop-color="#514742"/><stop offset="1" stop-color="#242426"/></linearGradient>
  <linearGradient id="wall" x2="1" y2=".4"><stop stop-color="#181b1f"/><stop offset=".4" stop-color="#414045"/><stop offset=".75" stop-color="#26262b"/><stop offset="1" stop-color="#0f1419"/></linearGradient>
  <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#78604a"/><stop offset=".48" stop-color="#47342a"/><stop offset="1" stop-color="#241b1a"/></linearGradient>
  <linearGradient id="glass" x2="1" y2="1"><stop stop-color="#b7805f"/><stop offset=".43" stop-color="#645d5a"/><stop offset=".7" stop-color="#52666b"/><stop offset="1" stop-color="#151d27"/></linearGradient>
  <linearGradient id="fog" x2="0" y2="1"><stop stop-color="#88756c" stop-opacity="0"/><stop offset=".6" stop-color="#9c8e7b" stop-opacity=".16"/><stop offset="1" stop-color="#e9b18a" stop-opacity=".22"/></linearGradient>
  <filter id="blur"><feGaussianBlur stdDeviation="20"/></filter>
  <filter id="glow"><feGaussianBlur stdDeviation="5"/></filter>
  <pattern id="grit" width="61" height="47" patternUnits="userSpaceOnUse"><path d="M8 9l3 -1m23 15l2 2m-14 12l3 -1M52 39l1 -2" stroke="#efd4b2" stroke-opacity=".11" stroke-width="2"/><path d="M15 26l2 0m31 -14l3 1" stroke="#0a0b0f" stroke-opacity=".26" stroke-width="3"/></pattern>
</defs>`;
const r=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const line=(d,color,width=2,opacity=1)=>path(d,'none',`stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round"`);
function church(){
 let x=`<g opacity=".95">${r(60,15,1090,510,'url(#stone)')}${r(0,0,130,560,'#1b1d20')}${r(1060,0,140,560,'#11171c')}`;
 x+=path('M196 545V180Q196 20 352 20H850Q1004 20 1004 180V545Z','#13191e');
 x+=path('M258 545V191Q258 70 364 70H838Q944 70 944 191V545Z','#26282b');
 x+=path('M324 450V222Q324 101 450 101H750Q876 101 876 222V450Z','#151b25');
 x+=path('M362 450V229Q362 145 454 145H746Q838 145 838 229V450Z','url(#glass)');
 x+=path('M598 140V447','none','stroke="#1b252b" stroke-width="20"');
 x+=path('M357 265H842','none','stroke="#202124" stroke-width="12"');
 x+=path('M450 149Q585 313 744 149','none','stroke="#1e272b" stroke-width="13"');
 x+=path('M357 447H841','none','stroke="#22262a" stroke-width="12"');
 x+=path('M378 241L480 169L550 220L470 280Z','#8a644f', 'opacity=".72"');
 x+=path('M655 160L789 238L716 274L632 220Z','#4c5d63','opacity=".8"');
 x+=path('M510 287L594 264L648 360L570 422Z','#6d5647','opacity=".78"');
 x+=path('M372 431L506 317L590 432Z','#313e46','opacity=".75"');
 x+=path('M648 434L748 324L835 430Z','#806652','opacity=".74"');
 x+=path('M360 318L430 270L510 340L580 276','none','stroke="#25252b" stroke-width="11"');
 x+=path('M608 270L694 336L772 269L836 324','none','stroke="#25252b" stroke-width="11"');
 x+=r(592,146,11,280,'#171c22');
 for(let j=0;j<5;j++){
   const dx=j*240;
   x+=path(`M${25+dx} 560L${45+dx} 108Q${58+dx} 54 ${95+dx} 42L${117+dx} 52L${132+dx} 560Z`,'url(#stone)');
   x+=path(`M${54+dx} 546L${67+dx} 122L${81+dx} 108L${86+dx} 545Z`,'#a08f79','opacity=".21"');
 }
 x+=path('M0 510L120 448L240 474L325 440L463 488L581 436L687 483L803 450L929 484L1050 439L1200 508V650H0Z','#252322');
 x+=line('M0 514L310 466L594 505L899 471L1200 518','#a08066',5,.22);
 x+=path('M0 650L250 555L470 580L735 545L989 580L1200 650Z','#3c332d');
 x+=`</g>`;
 return x;
}
function cemetery(){
 let x=r(0,0,1200,600,'#161e24');
 x+=`<circle cx="852" cy="146" r="77" fill="url(#moon)" opacity=".78"/><circle cx="852" cy="146" r="116" fill="url(#halo)" opacity=".32"/>`;
 x+=path('M0 340L131 293L251 322L369 278L475 308L630 276L788 316L955 260L1098 314L1200 282V650H0Z','#172026');
 x+=path('M0 422L121 380L298 403L444 370L602 407L756 354L959 407L1133 364L1200 404V650H0Z','#292e2c');
 const graves=[[105,400,34,76],[195,354,28,68],[310,416,43,78],[431,371,35,94],[548,411,29,66],[681,357,45,91],[793,412,31,80],[923,372,42,92],[1079,414,38,88]];
 graves.forEach(([gx,gy,w,h],i)=>{
  x+=path(`M${gx} ${gy+h}V${gy+Math.round(h*.26)}Q${gx} ${gy} ${gx+w/2} ${gy}Q${gx+w} ${gy} ${gx+w} ${gy+Math.round(h*.26)}V${gy+h}Z`,i%3===0?'#454947':'#353a39');
  x+=line(`M${gx+8} ${gy+30}h${w-16}`,'#9a9080',2,.25);
 });
 x+=line('M230 510L202 112L170 78','#111619',20);
 x+=line('M208 227L98 156M211 279L349 135M230 349L365 246','#111619',13);
 x+=line('M1050 500L990 119L929 78','#111619',19);
 x+=line('M1002 253L1091 146M1004 317L898 182','#111619',12);
 for(let i=0;i<25;i++){let px=(i*167+82)%1200,py=378+(i*61)%210;x+=line(`M${px} ${py}l${i%2?8:-7} -${8+i%5}`,'#68705d',1,.37);}
 x+=path('M0 511Q212 469 419 508T840 511T1200 499V650H0Z','#353731');
 x+=path('M0 590Q201 538 377 575T786 560T1200 571V650H0Z','#575146','opacity=".54"');
 return x;
}
function alley(){
 let x=r(0,0,1200,650,'url(#wall)');
 x+=path('M0 0H368L391 517L0 650Z','#272a2b');
 x+=path('M1200 0H847L815 515L1200 650Z','#1b2025');
 for(let i=0;i<7;i++){
   const yy=65+i*63;
   x+=line(`M0 ${yy}H${381-i*7}`,'#69625a',3,.27);
   x+=line(`M${840+i*6} ${yy-10}H1200`,'#888176',2,.16);
 }
 [[72,120],[220,153],[1010,92],[912,244]].forEach(([gx,gy],i)=>{
   x+=r(gx,gy,60,105,'#0d141c');
   x+=r(gx+7,gy+6,46,91,i===2?'#725d49':'#424e50');
   x+=r(gx+27,gy+6,5,91,'#171c21');
   x+=r(gx+7,gy+45,46,5,'#171c21');
 });
 x+=path('M368 0H847L808 510L406 505Z','#22292f');
 x+=path('M476 0H735L699 380L500 380Z','#161e24');
 x+=r(516,130,156,145,'#303a3b');
 x+=r(531,146,126,115,'#a17451','opacity=".55"');
 x+=path('M550 143L630 265M650 149L530 263','none','stroke="#242323" stroke-width="8"');
 x+=line('M360 71L853 146','#0a1115',9);
 x+=line('M313 104L877 176','#5f5651',3);
 x+=line('M345 96L590 26M832 115L998 31','#111319',7);
 x+=path('M367 511L495 363H697L845 511L1200 650H0Z','#2d2d2a');
 x+=path('M367 511H845L1200 650H0Z','#5b524a','opacity=".45"');
 for(let i=0;i<10;i++){const xx=425+i*47,yy=504+i%3*13;x+=line(`M${xx} ${yy}l${20-i} ${41+i%3*14}`,'#c6a47b',2,.12);}
 x+=r(260,343,70,105,'#292827')+r(269,343,52,12,'#514b45')+r(890,365,88,78,'#202221')+r(900,354,64,12,'#47453f');
 return x;
}
function props(){
 let x=`<g opacity=".95">`;
 x+=path('M0 617Q350 570 600 604T1200 599V650H0Z','#110f10');
 x+=line('M0 599Q250 585 530 599T1200 586','#b69a70',3,.24);
 x+=path('M78 597L86 485L102 473L117 484L126 597Z','#3b3027');
 x+=r(75,480,57,11,'#93775c')+r(82,495,45,72,'#926e4a','opacity=".32"');
 x+=path('M92 509L96 450L102 439L108 451L113 509Z','#e7b86e');
 x+=`<ellipse cx="104" cy="461" rx="45" ry="65" fill="url(#halo)"/>`;
 x+=r(80,589,51,7,'#1e191a');
 x+=path('M1070 584L1077 523L1085 521L1092 585Z','#675540');
 x+=path('M1076 524L1083 508L1087 524Z','#edca84');
 x+=`<ellipse cx="1084" cy="518" rx="55" ry="64" fill="url(#halo)"/>`;
 x+=`</g>`;
 return x;
}
export function environmentImage(location){
 const bg=location==='cemetery'?cemetery():location==='alley'?alley():church();
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" preserveAspectRatio="xMidYMid slice" shape-rendering="geometricPrecision">
 ${defs}
 ${r(0,0,1200,650,'url(#night)')}
 <ellipse cx="770" cy="240" rx="520" ry="330" fill="url(#halo)" opacity=".43"/>
 ${bg}
 ${r(0,0,1200,650,'url(#fog)')}
 ${props()}
 ${r(0,0,1200,650,'url(#grit)')}
 </svg>`;
 return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
