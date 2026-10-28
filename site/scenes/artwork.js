/** Original scene illustrations: silhouette, flat color and readable hotspots. */
const rect=(x,y,w,h,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'"/>';
const path=(d,c,stroke='')=>'<path d="'+d+'" fill="'+c+'" '+stroke+'/>';
const windows=(x,y,n=3)=>Array.from({length:n},(_,i)=>rect(x+i*83,y,49,84,'#29404d')+rect(x+i*83+8,y+8,33,62,'#cd9a91')+path('M'+(x+i*83+24)+' '+y+'v84','none','stroke="#efdbbc" stroke-width="5"')).join('');
const building=(x,y,w,h,color)=>rect(x,y,w,h,color)+rect(x+9,y+12,w-18,14,'#e9d3b4')+windows(x+24,y+72,Math.min(4,Math.floor(w/85)))+
 '<g opacity=".18" stroke="#34353a" stroke-width="3">'+Array.from({length:8},(_,i)=>'<path d="M'+x+' '+(y+i*41)+'h'+w+'"/>').join('')+'</g>';
const person=(x,y,coat='#647c82',s=1)=>'<g transform="translate('+x+' '+y+') scale('+s+')"><g class="art-person">'+
 '<ellipse cx="1" cy="8" rx="47" ry="10" fill="#1c2934" opacity=".27"/>'+
 path('M-31 -88L-28 0H-4L5 -58L13 0H39L31 -91Z','#24313d','stroke="#1b2833" stroke-width="5"')+
 path('M-37 -171L23 -173L48 -89H-48Z',coat,'stroke="#172431" stroke-width="7"')+
 path('M-33 -146L-56 -95L-38 -85L-14 -128Z',coat)+
 path('M27 -148L51 -93L35 -85L16 -128Z',coat)+
 path('M-17 -188L-13 -163L17 -156L19 -188Z','#d9a48c')+
 path('M-35 -252Q-25 -280 5 -272Q40 -270 42 -231L32 -189Q5 -166 -21 -191Z','#edc6a7','stroke="#1b2732" stroke-width="6"')+
 path('M-40 -238L-46 -269L-5 -300L39 -282L53 -246L33 -260L14 -240L-13 -270Z','#243645')+
 '<path d="M-18 -227h12M16 -227h13" stroke="#263441" stroke-width="5"/>'+
 '<path d="M-4 -203L14 -206" stroke="#ad7478" stroke-width="3"/>'+
 '</g></g>';
const sidewalk=()=>path('M0 500L1200 478V670H0Z','#505b60')+path('M0 515L1200 493','none','stroke="#eadabe" stroke-width="13"')+
 path('M0 633L1200 625','none','stroke="#b24954" stroke-width="9"');
const skyline=()=>rect(0,0,1200,670,'#dcad9f')+
 path('M0 263L168 185L310 232L470 174L649 220L833 151L1020 224L1200 178V520H0Z','#b78081');
const poster=(x,y,message)=>rect(x,y,168,90,'#eadbc1')+
 '<text x="'+(x+11)+'" y="'+(y+51)+'" fill="#a84550" font-weight="900" font-size="23">'+message+'</text>';
const office=()=>rect(0,0,1200,670,'#e8dbc8')+
 rect(0,0,1200,59,'#2b3743')+
 path('M0 0H780L683 476H0Z','#f1e6d4')+
 path('M0 486L1200 443V670H0Z','#8c938d')+
 rect(113,113,330,295,'#283d4b')+rect(135,135,285,250,'#d2a092')+
 path('M135 380L203 283L252 329L312 241L420 326V389H135Z','#536879')+
 path('M269 119V400M123 268H435','none','stroke="#efdfc5" stroke-width="12"')+
 rect(837,110,219,333,'#69737b')+rect(855,129,177,293,'#3d4d58')+
 rect(989,282,15,15,'#e4bc86')+
 path('M34 461L424 425L454 499L48 518Z','#c4a27c','stroke="#263441" stroke-width="8"')+
 rect(63,518,28,132,'#32404a')+rect(396,508,28,139,'#32404a')+
 rect(476,543,158,90,'#b69a75')+rect(672,563,124,80,'#bf9c72')+
 poster(121,369,'第一张地契')+
 path('M486 492L611 484L638 527L484 532Z','#ead4b3','stroke="#263440" stroke-width="6"')+
 path('M676 510L792 499L808 541L675 548Z','#e3ceb2','stroke="#263441" stroke-width="6"')+
 person(769,571,'#536b79',.89)+
 '<text x="489" y="121" fill="#a04752" font-size="33" font-weight="900">初次开门 · DAY 01</text>'+
 '<text x="492" y="155" fill="#364551" font-size="17">新买的毛坯办公室 / 无地盘</text>';
const alley=()=>skyline()+building(-34,99,363,416,'#bba18a')+
 building(328,71,409,455,'#888c91')+building(739,115,494,414,'#b97572')+
 sidewalk()+poster(410,313,'蒙面人？')+
 rect(80,340,141,150,'#344755')+rect(1090,355,113,150,'#293d4c')+
 person(513,551,'#7f9286',.7)+person(836,542,'#97727d',.72)+
 person(1101,551,'#718a9a',.55)+
 '<text x="374" y="264" fill="#f8e5c9" stroke="#243441" stroke-width="8" paint-order="stroke" font-size="36" font-weight="900">旧港背街</text>';
const market=()=>skyline()+building(0,111,349,405,'#a59a90')+
building(348,84,409,430,'#a6a398')+building(765,100,460,423,'#b9787d')+
sidewalk()+path('M151 356L494 341L530 482H131Z','#bb4855','stroke="#263442" stroke-width="11"')+
rect(184,407,322,97,'#ac8e72')+
Array.from({length:8},(_,i)=>'<circle cx="'+(225+i*34)+'" cy="'+(455+(i%2)*11)+'" r="16" fill="'+(i%2?'#8aab76':'#b2ba7b')+'" stroke="#36454d" stroke-width="4"/>').join('')+
person(579,546,'#859a8b',.83)+person(863,551,'#657a88',.68)+
person(1019,559,'#a6787c',.59)+poster(849,337,'市集 / 工作')+
'<text x="428" y="263" font-size="39" stroke="#263641" stroke-width="8" paint-order="stroke" fill="#f4d9b2" font-weight="900">清晨集市</text>';
const labor=()=>skyline()+building(0,130,335,393,'#8c9898')+
rect(322,57,585,455,'#80979e')+
rect(367,109,498,95,'#283e4b')+
'<text x="390" y="173" fill="#f7dec0" font-size="41" font-weight="900">旧厂职业介绍所</text>'+
rect(443,250,319,267,'#d0b89c')+
windows(454,283,3)+building(904,133,335,392,'#b79084')+
sidewalk()+poster(96,341,'工厂停工')+
person(407,570,'#8c7f7d',.73)+person(654,562,'#5b7889',.8)+
person(877,571,'#b4937b',.65);
const docks=()=>skyline()+path('M0 405L1200 334V537H0Z','#759baa')+
path('M0 463L1200 425V559H0Z','#517b8c')+
building(-30,204,530,295,'#8d7372')+
path('M617 0L664 0L732 422','none','stroke="#263942" stroke-width="25"')+
path('M548 120L1150 72','none','stroke="#263942" stroke-width="22"')+
path('M862 101V324','none','stroke="#263942" stroke-width="8"')+
rect(813,306,106,89,'#b24a54')+
sidewalk()+rect(127,446,186,82,'#c1a078')+rect(339,470,157,61,'#aa8a74')+
person(570,559,'#ac8881',.82)+person(927,556,'#7192a3',.8)+
'<text x="104" y="278" fill="#f5d9b5" stroke="#263642" stroke-width="7" paint-order="stroke" font-size="38" font-weight="900">旧港码头</text>';
const attic=()=>rect(0,0,1200,670,'#b49c8e')+
path('M0 0L593 188L1200 0','none','stroke="#32404b" stroke-width="27"')+
rect(0,534,1200,136,'#45515a')+
rect(381,166,419,280,'#263b4a')+rect(401,189,377,235,'#bb9090')+
path('M402 423L497 274L559 339L638 265L778 423Z','#4f6473')+
path('M591 170V452M389 318H796','none','stroke="#e7d1b4" stroke-width="10"')+
rect(84,484,415,68,'#93777b')+rect(88,440,406,43,'#e7d5b7')+
rect(807,447,209,92,'#a18568')+poster(102,334,'孤儿院徽章')+
'<text x="520" y="101" fill="#3b4650" font-size="30" font-weight="900">曾经打工的阁楼 · 回忆</text>';
const artists={office,alley,market,labor,docks,attic};
export function sceneArtwork(id){
 return '<svg class="explore-art" viewBox="0 0 1200 670" preserveAspectRatio="xMidYMid slice" role="img" aria-label="原创二次元城市场景">'+(artists[id]||office)()+'</svg>';
}
