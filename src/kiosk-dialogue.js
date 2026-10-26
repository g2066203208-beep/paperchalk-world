// Local-only NPC speech visibility. Never serialized or used for financial authority.
// A new customer speaks briefly; later interaction/mistake/commission revives the bubble.
export function createSpeechPresentation(durationMs=4300){
 let lastToken=null,expiresAt=0;
 return {
  sample(shop,now){
   if(!shop?.windowOpen||shop.phase==="summary"){
    lastToken=null;expiresAt=0;return false;
   }
   const token=[shop.orderIndex,Boolean(shop.spoken),Boolean(shop.wrongAttempted),
    Boolean(shop.favorDone)].join(":");
   if(token!==lastToken){lastToken=token;expiresAt=now+durationMs;}
   return now<expiresAt;
  },
  prompt(now){expiresAt=Math.max(expiresAt,now+durationMs);},
  reset(){lastToken=null;expiresAt=0;}
 };
}
