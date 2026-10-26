// Client-local presentation only: no shop inventory, save data or multiplayer
// authority is changed by these animation states. All times are milliseconds.
import {CUSTOMERS} from "./kiosk-core.js";
export const CUSTOMER_EXIT_MS=640;
export const CUSTOMER_ENTER_MS=860;
const ease=t=>t*t*(3-2*t);
const hidden=()=>({visible:false,stage:"hidden",tone:0,offset:0,drop:0,talking:false,receiving:false});
export function createCustomerMotion(){
 let previousOrder=null,previousOpen=false,stage="hidden",startedAt=0,departingOrder=null;
 return function sampleCustomerMotion(shop,now=0){
  const order=Number.isInteger(shop?.orderIndex)?shop.orderIndex:0;
  if(!shop?.windowOpen){
   previousOrder=order;previousOpen=false;stage="hidden";departingOrder=null;
   return hidden();
  }
  if(!previousOpen){stage="enter";startedAt=now;departingOrder=null;}
  else if(previousOrder!==order){departingOrder=previousOrder;stage="exit";startedAt=now;}
  previousOrder=order;previousOpen=true;
  let elapsed=Math.max(0,now-startedAt);
  if(stage==="exit"&&elapsed>=CUSTOMER_EXIT_MS){
   stage=shop.phase==="summary"?"hidden":"enter";
   startedAt+=CUSTOMER_EXIT_MS;departingOrder=null;
   elapsed=Math.max(0,now-startedAt);
  }
  if(stage==="enter"&&elapsed>=CUSTOMER_ENTER_MS)stage="idle";
  if(stage==="hidden")return hidden();
  const amount=stage==="exit"?ease(Math.min(1,elapsed/CUSTOMER_EXIT_MS)):
   stage==="enter"?ease(Math.min(1,elapsed/CUSTOMER_ENTER_MS)):1;
  const index=stage==="exit"?departingOrder:order;
  const tone=CUSTOMERS[((index%CUSTOMERS.length)+CUSTOMERS.length)%CUSTOMERS.length].tone;
  return {visible:true,stage,tone,
   offset:stage==="enter"?(1-amount)*.76:stage==="exit"?-amount*.76:0,
   drop:stage==="enter"?(1-amount)*.06:stage==="exit"?amount*.03:0,
   talking:stage==="idle"&&Boolean(shop.spoken),
   receiving:stage==="exit"};
 };
}
