import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));

test('forest leaves carry contact occlusion and a restrained cut-paper rim light',async()=>{
  const source=await readFile(path.join(root,'studio/rendering/forest.js'),'utf8');
  assert.match(source,/attribute float pulpOcclusion/);
  assert.match(source,/reflectedLight\.indirectDiffuse \*= vPulpOcclusion/);
  assert.match(source,/pulpEdgeFacing/);
  assert.match(source,/vPulpCut\*pulpEdgeFacing/);
  assert.match(source,/ring===0\?\.52/);
});

test('small terrain props use folded paper edge lighting instead of glossy relief maps',async()=>{
  const source=await readFile(path.join(root,'studio/rendering/terrain-dressing.js'),'utf8');
  assert.match(source,/addFoldedPaperEdge/);
  assert.match(source,/tuftMat\.normalMap=null/);
  assert.match(source,/stoneMat\.side=THREE\.DoubleSide/);
  assert.match(source,/foldedFacing/);
});
