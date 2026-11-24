import {subdivide} from './dense-workmesh-v16.mjs';
export function level2(A,B,T){let S=subdivide(A,B,T.positions);let D=subdivide(S.mesh,S.bindings,S.positions);return {mesh:D.mesh,bindings:D.bindings,target:{positions:D.positions,modules:T.modules}}}
