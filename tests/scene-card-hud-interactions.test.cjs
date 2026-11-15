'use strict';
// Headless WebGL adapter regression: the seven-slot case is a screen UI,
// top card responds on hover, click draws/selects and hand/deck drag releases.
const assert=require('node:assert/strict'),fs=require('node:fs'),
 vm=require('node:vm'),path=require('node:path');
const context2d={
 createLinearGradient:()=>({addColorStop(){}}),fillRect(){},strokeRect(){},
 beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){},arc(){},fill(){},fillText(){},
 measureText:value=>({width:String(value).length*14})
};
const window={PaperchalkProfessionDecks:{CLASSES:[]}};
const document={createElement:()=>({width:0,height:0,
 getContext:()=>context2d})};
const ctx=vm.createContext({window,document,Image:class {},Math,Map,Set,
 Array,Object,Number,Error});
for(const name of ['card-hand-motion','card-case-motion','scene-card-hud']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,
 '../site/card-battle/engine/'+name+'.js'),'utf8'),ctx);
}
const I=()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
const roster=[{id:'woodcutter',profession:'warrior',name:'伐木少女',
 deckCount:4,slot:0}];
const hand=[],drawn=[],drops=[],dragMoves=[];
const pile=[
 {id:'guard',name:'架斧',type:'guard',profession:'warrior',block:3},
 {id:'heavy-strike',name:'重劈',type:'attack',profession:'warrior',power:5},
 {id:'cleave',name:'横扫',type:'attack',profession:'warrior',power:2},
 {id:'strike',name:'斧劈',type:'attack',profession:'warrior',power:3}
];
let selected=null,screenBegins=0,screenEnds=0,staged=[];
const o={
 canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720})},
 gl:{viewport(){},clear(){},deleteBuffer(){},DEPTH_BUFFER_BIT:256},
 drawCard(){},
 renderGeom(){},
 makeGeom:(v,i)=>({b:{},i:{},count:i.length}),
 box:{b:{},i:{},count:36},
 cardW:1,cardH:1.5,cardD:.055,T:I,S:I,RX:I,RZ:I,mul:I,
 perspective:I,getVP:I,uniformVP(){},
 makeTexture:()=>({}),
 snapshot:()=>({count:hand.length,hand:hand.slice(),roster,
  classes:[{id:'warrior',deckCount:roster[0].deckCount}]}),
 remainingCards:()=>pile.map(c=>({...c})),
 staged:()=>staged,
 selected:()=>selected,
 draw:ownerId=>{
  if(roster[0].deckCount===0)return{ok:false,reason:'empty'};
  const next=pile.pop();
  const c={...next,ownerId,instance:'draw-'+(drawn.length+1)};
  roster[0].deckCount--;hand.push(c);drawn.push(c);
  return{ok:true,card:c};
 },
 ensureSelected:instance=>{selected=instance;},
 dragMove:(instance,x,y)=>dragMoves.push({instance,x,y}),
 dropCard:(instance,x,y)=>drops.push({instance,x,y}),
 beginScreenPass:()=>screenBegins++,
 endScreenPass:()=>screenEnds++
};
const hud=window.PaperchalkSceneCardHUD.create(o);
const pointer=(x,y)=>({clientX:x,clientY:y,preventDefault(){}});
hud.setCollapsed(false);
hud.render(1,1280,720);
assert.equal(hud.drawer.phase,'open');
assert.equal(hud.snapshot.caseSlideAxis,'screen-vertical');
const deck=hud.pointFor('deck:woodcutter');
assert.ok(deck);
hud.move(pointer(deck.x,deck.y));
hud.render(1.12,1280,720);
assert.equal(hud.snapshot.hoverTopCard,true);
assert.equal(hud.snapshot.faceUpDecks,true);
assert.equal(hud.snapshot.topCards[0].name,'斧劈',
 'the NEXT playable card must be printed on the exposed pile top');
assert.ok(hud.snapshot.liftedDecks.some(p=>p.id==='deck:woodcutter'&&p.lift>.3),
 'top face must physically lift when hovered, without moving the shell');
hud.down(pointer(deck.x,deck.y));
hud.up(pointer(deck.x,deck.y));
assert.equal(drawn.length,1,'click top card draws exactly one');
assert.equal(selected,'draw-1','click-to-play selects just-drawn card');
assert.equal(drawn[0].name,'斧劈','first draw must equal previously visible top face');
assert.equal(hud.snapshot.cardMotion.activeFlights.length,1,
 'click must launch an immediately visible real card flight');
hud.render(1.25,1280,720);
assert.equal(hud.snapshot.topCards[0].name,'横扫',
 'face-up deck top must change immediately to the NEXT actual draw');
const handPoint=hud.pointFor('hand:draw-1');
assert.ok(handPoint);
hud.down(pointer(handPoint.x,handPoint.y));
hud.up(pointer(handPoint.x,handPoint.y));
assert.equal(selected,'draw-1',
 'clicking an already selected card must not accidentally cancel click-to-place');
// The hand is a movable object: drag it off the tray and release to the stage.
hud.down(pointer(handPoint.x,handPoint.y));
hud.move(pointer(handPoint.x,handPoint.y-65));
assert.equal(hud.dragging,true);
assert.equal(hud.snapshot.interaction.source,'hand');
hud.up(pointer(610,200));
assert.equal(drops.length,1);
assert.equal(drops[0].instance,'draw-1');
assert.equal(hud.dragging,false);
hud.render(1.5,1280,720);
// The top card also supports a single gesture from the deck directly.
hud.down(pointer(deck.x,deck.y));
hud.move(pointer(610,320));
assert.equal(drawn.length,2,'drag draws only after crossing gesture threshold');
assert.equal(hud.dragging,true);
assert.equal(selected,'draw-2');
assert.equal(hud.snapshot.interaction.source,'deck');
hud.up(pointer(650,245));
assert.equal(drops.length,2);
assert.equal(drops[1].instance,'draw-2');
assert.equal(drawn[1].name,'横扫');
assert.ok(dragMoves.length>=2,'world target preview follows the pointer');
// A character staged ON the top card must react too, without covering the tray.
staged=[{id:'woodcutter',profession:'warrior'}];
hud.render(1.6,1280,720);
const ownerPile=hud.snapshot.visible.find(p=>p.id==='deck:woodcutter');
const heroCard=hud.snapshot.visible.find(p=>p.id==='character:woodcutter');
assert.equal(heroCard.x,ownerPile.x,'character card must share OWN deck x');
assert.equal(heroCard.y,ownerPile.y,'character must REST on deck, not hover in its own row');
assert.equal(hud.snapshot.characterRestingOnOwnerPile,true);
hud.move(pointer(deck.x,deck.y));
hud.render(1.75,1280,720);
assert.equal(hud.snapshot.hoverTopCard,true);
assert.equal(hud.snapshot.renderSpace,'screen-fixed-post-world');
assert.equal(hud.snapshot.receivesWorldClouds,false);
assert.equal(hud.snapshot.receivesWorldShadows,true);
assert.equal(hud.snapshot.sceneLighting,true);
assert.equal(screenBegins,screenEnds);
assert.ok(screenBegins>=5,'each visible UI pass must restore host state');
hud.setCollapsed(true);
hud.render(1.84,1280,720);
assert.equal(hud.snapshot.drawer.phase,'closing');
assert.ok(hud.snapshot.drawer.y<0,'entire physical case slides below screen edge');
assert.equal(hud.hit(pointer(deck.x,deck.y)),null);
hud.render(2.5,1280,720);
assert.equal(hud.snapshot.drawer.phase,'closed');
assert.equal(hud.snapshot.visibleDeckPiles,0);
assert.equal(hud.snapshot.handPersistsWhenCollapsed,true);
assert.equal(hud.snapshot.visible.filter(p=>p.kind==='hand').length,2,
 'closing the case must NOT retract either of the two hand cards');
assert.ok(hud.pointFor('hand:draw-1'),'folded case still allows playing hand cards');
assert.ok(hud.snapshot.drawCalls>0,'hand must still render when the case is closed');
assert.equal(hud.snapshot.cardMotion.activeReturns.length,0,
 'snap-back motion should finish before a later independent interaction');
assert.ok(hud.snapshot.handCardScale>.65,'full size cards must replace tiny old fan');
const foldedHand=hud.pointFor('hand:draw-1');
hud.down(pointer(foldedHand.x,foldedHand.y));
hud.move(pointer(foldedHand.x,foldedHand.y-110));
assert.equal(hud.dragging,true,'folded tray must not disable hand dragging');
hud.up(pointer(610,190));
assert.equal(drops.length,3);
assert.equal(hud.snapshot.cardMotion.activeReturns.length,1,
 'invalid placement should animate back instead of teleporting');
console.log('SCREEN_TRAY_POINTER_PASS face_up_top_click_flight large_persistent_hand layered_drag_hover');
