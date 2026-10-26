// Local first-person hand animation. Never changes stock, saves or room state.
// Each viewer observes only their own hand; the counter remains host-authoritative.
import {GOODS} from './kiosk-core.js';
export const ITEM_PICKUP_MS=300;
export const ITEM_PLACE_MS=400;
export const ITEM_TAKE_MS=340;
const ease=t=>t*t*(3-2*t);
const empty=()=>({stage:'empty',sku:null,progress:1,hideCounter:false});
export function createHeldItemMotion(){
 let previous=null,stage='empty',sku=null,startedAt=0;
 return function sampleHeldItem(shop,viewerId,now=0){
  const player=shop?.players?.[viewerId];
  if(!player){previous=null;stage='empty';sku=null;return empty();}
  const hand=GOODS[player.hand]?player.hand:null;
  const counter=GOODS[shop.counter]?shop.counter:null;
  if(!previous||previous.viewerId!==viewerId){
   stage=hand?'held':'empty';sku=hand;startedAt=now;
  }else if(previous.hand!==hand||previous.counter!==counter){
   if(previous.hand&&!hand&&counter===previous.hand&&previous.counter!==counter){
    stage='place';sku=previous.hand;startedAt=now;
   }else if(!previous.hand&&hand&&previous.counter===hand&&!counter){
    stage='take';sku=hand;startedAt=now;
   }else if(hand&&hand!==previous.hand){
    stage='pickup';sku=hand;startedAt=now;
   }else if(!hand&&stage!=='place'){
    stage='empty';sku=null;
   }
  }
  previous={viewerId,hand,counter};
  // A second worker may sell immediately: never show a ghost item
  // alongside the customer's already-paid handoff animation.
  if(stage==='place'&&counter!==sku){stage='empty';sku=null;}
  if((stage==='pickup'||stage==='take')&&hand!==sku){stage='empty';sku=null;}
  const duration=stage==='pickup'?ITEM_PICKUP_MS:stage==='take'?ITEM_TAKE_MS:stage==='place'?ITEM_PLACE_MS:0;
  if(duration&&now-startedAt>=duration){
   stage=hand?'held':'empty';sku=hand;
  }
  if(stage==='empty'&&hand){stage='held';sku=hand;}
  return {stage,sku,progress:duration?ease(Math.max(0,Math.min(1,(now-startedAt)/duration))):1,
   hideCounter:stage==='place'};
 };
}
