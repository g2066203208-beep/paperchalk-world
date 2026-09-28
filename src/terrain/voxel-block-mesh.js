/*
 * Single-layer voxel terrain renderer.
 * Data remains TerrainWorld[x][y]. Each cell is rendered as a real 3D cube.
 * No extra Z depth is generated.
 */
(function(global){
'use strict';

function buildSingleLayerCubeMesh(THREE, terrain, cx, cy){
  const size=terrain.chunkSize;
  const box=new THREE.BoxGeometry(terrain.tileSize, terrain.tileSize, terrain.tileSize);
  const positions=[];
  const indices=[];
  let vertex=0;

  const solid=(x,y)=>terrain.isSolid(x,y);

  for(let ly=0;ly<size;ly++){
    for(let lx=0;lx<size;lx++){
      const gx=cx*size+lx;
      const gy=cy*size+ly;
      if(!solid(gx,gy))continue;

      // Temporary correct implementation: real cubes.
      // Later optimized with greedy meshing after interaction is verified.
      const x=(gx+0.5)*terrain.tileSize;
      const y=(gy+0.5)*terrain.tileSize;
      const z=0;
      const base=box.getAttribute('position');
      for(let i=0;i<base.count;i++){
        positions.push(
          base.getX(i)+x,
          base.getY(i)+y,
          base.getZ(i)+z
        );
      }
      for(let i=0;i<box.index.count;i++){
        indices.push(box.index.getX(i)+vertex);
      }
      vertex+=base.count;
    }
  }

  box.dispose();
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

global.PaperchalkVoxelBlockMesh={buildSingleLayerCubeMesh};
})(window);
