/**
 * Scene lifecycle contract. No game state, DOM ownership, save schema, or URL is
 * hard-coded in the registry. A scene is a replaceable module:
 *   {id, render(context) => html, mount(root, context) => instance?, dispose(instance)?}
 * A transition always disposes the previous scene before replacing its DOM.
 */
export function createSceneHost(initial=[]){
 const definitions=new Map();
 let active=null;
 function register(module){
  if(!module||!/^[a-z][a-z0-9-]*$/.test(module.id)||
   typeof module.render!=='function'||(module.mount&&typeof module.mount!=='function')||
   (module.dispose&&typeof module.dispose!=='function')||definitions.has(module.id)){
   throw Error('Invalid or duplicate scene module: '+String(module?.id));
  }
  definitions.set(module.id,module);
  return module.id;
 }
 function unmount(){
  if(!active)return;
  const old=active;active=null;
  try{old.definition.dispose?.(old.instance);}finally{
   if(!old.definition.dispose&&old.instance?.destroy)old.instance.destroy();
  }
 }
 function unregister(id){
  if(active?.id===id)unmount();
  return definitions.delete(id);
 }
 function render(id,context){
  unmount();
  const definition=definitions.get(id);
  if(!definition)throw Error('Unknown scene module '+id);
  active={id,definition,context,instance:null,mounted:false};
  return definition.render(context);
 }
 function mount(root){
  if(!active)throw Error('No scene selected');
  if(active.mounted)throw Error('Scene is already mounted: '+active.id);
  const instance=active.definition.mount?.(root,active.context)||null;
  active.instance=instance;active.mounted=true;
  return instance;
 }
 function current(){return active?Object.freeze({id:active.id,mounted:active.mounted,instance:active.instance}):null;}
 function list(){return [...definitions.keys()];}
 for(const module of initial)register(module);
 return Object.freeze({register,unregister,render,mount,unmount,current,list});
}
