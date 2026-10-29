/** A small real renderer preview in the original opening scene; no external image. */
import {createPixelStreetRenderer,PIXEL_VIEW} from './pixel-city-art.js';
import {streetBuildingsAt} from '../../world/walkable-street.js';
export function paintPixelEntry(root,world){
 const canvas=root.querySelector('.pixel-entry-preview');
 if(!canvas)return;
 const geography=world?.slices?.geography;
 const x=geography?.x??125,y=geography?.y??112;
 canvas.width=240;canvas.height=150;
 const ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
 ctx.setTransform(canvas.width/PIXEL_VIEW.worldWidth,0,0,canvas.height/PIXEL_VIEW.worldHeight,0,0);
 const renderer=createPixelStreetRenderer({x,y,buildings:streetBuildingsAt(x,y)});
 renderer.render(ctx,2100,world?.slices?.clock?.shift??1,4,[]);
}
