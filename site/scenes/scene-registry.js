/**
 * The only place where scene implementations are registered.
 * Change or remove a scene by editing this registry, not app.js or world runtime.
 */
import {createSceneManager} from '../core/scene-manager.js';
import {createExploreLayer} from './explore.js';
import {createAtlasExplorer} from '../world/atlas-explorer.js';

export function createGameSceneRegistry({host,readWorld,readLegacy,command,openPanel,cue,onToggle}){
 const manager=createSceneManager();
 let explorer,atlas;
 let storyWasVisible=true;
 const showCountry=()=>manager.activate('country');
 explorer=createExploreLayer(host,{readWorld,readLegacy,command,openPanel,
  cue,onToggle,openAtlas:showCountry});
 atlas=createAtlasExplorer({readWorld,openPanel,command,onExit:()=>manager.back('story')});
 manager.register('story',{
  enter(){if(storyWasVisible)explorer.show();},
  leave(){storyWasVisible=explorer.isVisible();explorer.hide();},
  refresh(){explorer.render();},
  dispose(){explorer.hide();}
 });
 manager.register('country',{
  enter(){atlas.open();},
  leave(){atlas.close(true);},
  refresh(){atlas.render?.();},
  dispose(){atlas.close(true);}
 });
 manager.activate('story');
 return Object.freeze({manager,explorer,atlas,openCountry:showCountry});
}
