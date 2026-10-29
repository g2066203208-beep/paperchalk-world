/**
 * Explicit scene lifecycle bus. No DOM or game content imports.
 * Scene plugins can be added, replaced, disabled or removed independently.
 * Driver contract: enter(context), leave(context), refresh(context),
 * dispose(), isVisible() (optional). One active view at a time.
 */
export function createSceneManager(){
 const registry=new Map();
 let active=null,history=[],disposed=false;
 const guard=()=>{if(disposed)throw Error('scene manager destroyed');};
 const get=id=>{const driver=registry.get(id);if(!driver)throw Error('scene not registered: '+id);return driver;};
 const leave=reason=>{if(active!==null)get(active).leave?.({reason,scene:active});};
 function register(id,driver){
  guard();
  if(!/^[a-z][a-z0-9-]*$/.test(id)||registry.has(id))throw Error('scene duplicate or invalid: '+id);
  if(!driver||typeof driver.enter!=='function'||typeof driver.leave!=='function')throw Error('scene must expose enter/leave: '+id);
  registry.set(id,driver);return id;
 }
 function unregister(id,{fallback}={}){
  guard();if(!registry.has(id))return false;
  if(active===id){
   if(!fallback||fallback===id||!registry.has(fallback))throw Error('active scene removal requires valid fallback');
   activate(fallback,{replace:true});
  }
  const driver=registry.get(id);driver.dispose?.();registry.delete(id);
  history=history.filter(h=>h!==id);
  return true;
 }
 function activate(id,{replace=false}={}){
  guard();const next=get(id);
  if(active===id)return false;
  const from=active;
  if(from!==null){
   leave('navigate');
   if(!replace){history.push(from);if(history.length>20)history.shift();}
  }
  active=id;next.enter({from,to:id});
  return true;
 }
 function back(fallback='story'){
  guard();
  const old=active;
  let destination=null;
  while(history.length){const candidate=history.pop();if(candidate!==old&&registry.has(candidate)){destination=candidate;break;}}
  if(!destination&&registry.has(fallback)&&fallback!==old)destination=fallback;
  if(!destination)return false;
  leave('back');active=destination;get(destination).enter({from:old,to:destination,resume:true});
  return true;
 }
 function refresh(){if(active!==null)get(active).refresh?.({scene:active});}
 function destroy(){if(disposed)return;leave('destroy');
  for(const driver of registry.values())driver.dispose?.();
  registry.clear();history=[];active=null;disposed=true;
 }
 return Object.freeze({register,unregister,activate,back,refresh,destroy,
  get active(){return active;},registered:()=>[...registry.keys()],history:()=>[...history]});
}
