// Client-local presentation only: no shop inventory, save data or multiplayer
// authority is changed by these animation states. All times are milliseconds.
import {CUSTOMERS,GOODS} from "./kiosk-core.js";
export const CUSTOMER_HANDOFF_MS=520;
export const CUSTOMER_FAVOR_MS=620;
export const CUSTOMER_EXIT_MS=640;
export const CUSTOMER_ENTER_MS=860;
const ease=t=>t*t*(3-2*t);
const hidden=()=>({visible:false,stage:"hidden",tone:0,offset:0,drop:0,talking:false,receiving:false,refusing:false,handoff:null,payment:null});
export function createCustomerMotion(){
 let previousOrder=null,previousOpen=false,previousFavorDone=false,stage="hidden",startedAt=0,departingOrder=null;
 return function sampleCustomerMotion(shop,now=0){
  const order=Number.isInteger(shop?.orderIndex)?shop.orderIndex:0;
  const favorDone=Boolean(shop?.favorDone);
  if(!shop?.windowOpen){
   previousOrder=order;previousFavorDone=favorDone;previousOpen=false;stage="hidden";departingOrder=null;
   return hidden();
  }
  if(!previousOpen){stage="enter";startedAt=now;departingOrder=null;}
  else if(previousOrder!==order){departingOrder=previousOrder;stage="handoff";startedAt=now;}
  else if(!previousFavorDone&&favorDone&&CUSTOMERS[order%CUSTOMERS.length]?.favor){
   // Commission completion is a separate physical handoff. It does not
   // advance the order or consume stock: the authoritative host already did.
   stage="favor";startedAt=now;departingOrder=null;
  }
  previousOrder=order;previousFavorDone=favorDone;previousOpen=true;
  let elapsed=Math.max(0,now-startedAt);
  if(stage==="favor"&&elapsed>=CUSTOMER_FAVOR_MS){
   stage="idle";startedAt+=CUSTOMER_FAVOR_MS;
   elapsed=Math.max(0,now-startedAt);
  }
  if(stage==="handoff"&&elapsed>=CUSTOMER_HANDOFF_MS){
   stage="exit";startedAt+=CUSTOMER_HANDOFF_MS;
   elapsed=Math.max(0,now-startedAt);
  }
  if(stage==="exit"&&elapsed>=CUSTOMER_EXIT_MS){
   stage=shop.phase==="summary"?"hidden":"enter";
   startedAt+=CUSTOMER_EXIT_MS;departingOrder=null;
   elapsed=Math.max(0,now-startedAt);
  }
  if(stage==="enter"&&elapsed>=CUSTOMER_ENTER_MS)stage="idle";
  if(stage==="hidden")return hidden();
  const amount=stage==="exit"?ease(Math.min(1,elapsed/CUSTOMER_EXIT_MS)):
   stage==="enter"?ease(Math.min(1,elapsed/CUSTOMER_ENTER_MS)):1;
  const index=(stage==="handoff"||stage==="exit")?departingOrder:order;
  const customer=CUSTOMERS[((index%CUSTOMERS.length)+CUSTOMERS.length)%CUSTOMERS.length];
  // The paid item crosses the counter while the customer waits at the window.
  // Only after the hand reaches it does the customer turn to leave. This is
  // never written to shop state, so no duplicate stock or network mutations.
  const handoff=stage==="favor"?{
   sku:customer.favor.sku,
   progress:ease(Math.min(1,elapsed/CUSTOMER_FAVOR_MS))
  }:(stage==="handoff"||stage==="exit")?{
   sku:customer.sku,
   progress:stage==="exit"?1:ease(Math.min(1,elapsed/CUSTOMER_HANDOFF_MS))
  }:null;
  // Presentation-only payment: the host has already credited the shop.
  // Neither cash balance nor the save/network schema is touched here.
  const paying=stage==="handoff"||stage==="favor";
  const payment=paying?{
   kind:stage==="favor"?"favor":"sale",
   amount:stage==="favor"?customer.favor.tip:GOODS[customer.sku].price,
   progress:ease(Math.max(0,Math.min(1,(elapsed/(stage==="favor"?CUSTOMER_FAVOR_MS:CUSTOMER_HANDOFF_MS)-.24)/.72)))
  }:null;
  return {visible:true,stage,tone:customer.tone,
   offset:stage==="enter"?(1-amount)*.76:stage==="exit"?-amount*.76:0,
   drop:stage==="enter"?(1-amount)*.06:stage==="exit"?amount*.03:0,
   talking:stage==="idle"&&Boolean(shop.spoken),
   refusing:stage==="idle"&&Boolean(shop.wrongAttempted),
   receiving:stage==="favor"||stage==="handoff"||stage==="exit",handoff,payment};
 };
}
