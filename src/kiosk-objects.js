// Persistent identities for physical retail units; legacy v3 quantity saves migrate in place.
// The room host reconciles legal rule transitions, clients only render the result.
function placements(s){
 const result=[];
 for(const [key,v] of Object.entries(s.slots||{}))for(let i=0;i<v.qty;i++)result.push({place:'slot:'+key,index:i,sku:v.sku});
 for(const [id,p] of Object.entries(s.players||{}))if(p.hand)result.push({place:'hand:'+id,index:0,sku:p.hand});
 if(s.counter)result.push({place:'counter',index:0,sku:s.counter});
 for(const [i,sku] of (s.returns||[]).entries())result.push({place:'return',index:i,sku});
 return result;
}
export function reconcileObjects(s,preferredId=null){
 const old=Object.values(s.physicalItems||{}),used=new Set(),wanted=placements(s),next={};
 s.itemSerial=Number.isSafeInteger(s.itemSerial)?s.itemSerial:0;
 // Retain objects in the same physical location before assigning transfers.
 const pending=[];
 for(const v of wanted){
  const match=old.find(o=>!used.has(o.id)&&o.sku===v.sku&&o.place===v.place&&o.id!==preferredId);
  if(match){used.add(match.id);next[match.id]={...match,...v,...(v.place.startsWith('slot:')?{socket:match.socket??match.index}:{})};}else pending.push(v);
 }
 // Prefer a specifically grabbed unit over another identical unit from its shelf.
 const pool=old.filter(o=>!used.has(o.id)).sort((a,b)=>(b.id===preferredId)-(a.id===preferredId));
 for(const v of pending){
  const i=pool.findIndex(o=>o.sku===v.sku);
  let id,previous={};
  if(i>=0){previous=pool.splice(i,1)[0];id=previous.id;}
  else {do{id='item-'+(++s.itemSerial);}while(old.some(o=>o.id===id)||next[id]);}
  const record={...previous,id,...v};
  if(v.place.startsWith('slot:')){
   const occupied=new Set(Object.values(next).filter(o=>o.place===v.place).map(o=>o.socket));
   let socket=previous.lastPlace===v.place?previous.lastSocket:null;
   if(!Number.isInteger(socket)||occupied.has(socket)){socket=0;while(occupied.has(socket))socket++;}
   record.socket=socket;
  }else{
   if(previous.place?.startsWith('slot:')){record.lastPlace=previous.place;record.lastSocket=previous.socket??previous.index;}
   delete record.socket;
  }
  next[id]=record;
 }
 s.physicalItems=next;return next;
}
export function objectsAt(s,place){return Object.values(s.physicalItems||{}).filter(o=>o.place===place).sort((a,b)=>a.index-b.index);}
export function canGrabObject(s,id,key){const o=s.physicalItems?.[id];return Boolean(o&&o.place==='slot:'+key&&o.sku===s.slots[key]?.sku);}
export function validateObjects(s){
 if(s.physicalItems===undefined)return true;
 if(!s.physicalItems||typeof s.physicalItems!=='object'||Array.isArray(s.physicalItems))return false;
 const expected=placements(s),actual=Object.values(s.physicalItems);
 if(actual.length!==expected.length)return false;
 const seen=new Set(),positions=new Set(),sockets=new Set();
 return actual.every(o=>o&&s.physicalItems[o.id]===o&&typeof o.id==='string'&&!seen.has(o.id)&&seen.add(o.id)&&!positions.has(o.place+':'+o.index)&&positions.add(o.place+':'+o.index)&&(!o.place.startsWith('slot:')||(Number.isInteger(o.socket)&&o.socket>=0&&!sockets.has(o.place+':'+o.socket)&&sockets.add(o.place+':'+o.socket)))&&expected.some(v=>v.place===o.place&&v.index===o.index&&v.sku===o.sku));
}
