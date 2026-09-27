const RUNTIME = window.PaperchalkRuntime;
const SCALE = 128;
const TILE = 1.5;
const ROAD_Z = [-4.2, -2.0];
const LANE_Z = [-4.65, -3.75, -2.45, -1.55];
const VEHICLE_SPEED = 2.7;
const TRACK_LENGTH = 180;
const CAR_FILES = ['./assets/traffic/bus.png', './assets/traffic/sedan.png', './assets/traffic/bus-large.png', './assets/traffic/pickup.png'];
let THREE;
let state;
let scene;
let camera;
let renderer;
let root;
let cars = [];
let raf = 0;
let last = 0;
let ready = false;
const blocks = new Map();
let voxelMode = 'mine';
let selected = null;
let voxelGroup;
let raycaster;
let pointer;

function makeMaterial(map, color) {
  return new THREE.MeshStandardMaterial({ map, color, roughness: 0.9, metalness: 0 });
}

function addVoxelStrip({ x, z, width, depth, height, material }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, -height / 2, z);
  root.add(mesh);
  return mesh;
}

function buildGround() {
  const loader = new THREE.TextureLoader();
  const road = loader.load('./assets/traffic/road.png');
  road.colorSpace = THREE.SRGBColorSpace;
  road.wrapS = road.wrapT = THREE.RepeatWrapping;
  road.repeat.set(5, 1);
  const sidewalk = loader.load('./assets/traffic/sidewalk.png');
  sidewalk.colorSpace = THREE.SRGBColorSpace;
  sidewalk.wrapS = sidewalk.wrapT = THREE.RepeatWrapping;
  sidewalk.repeat.set(5, 1);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x78936f, roughness: 1 });
  const roadMat = makeMaterial(road, 0xffffff);
  const walkMat = makeMaterial(sidewalk, 0xffffff);
  const tileGeo = new THREE.BoxGeometry(TILE, 0.38, TILE);
  const count = 260;
  const ground = new THREE.InstancedMesh(tileGeo, groundMat, count);
  let i = 0;
  for (let x = -TRACK_LENGTH / 2; x < TRACK_LENGTH / 2 && i < count; x += TILE) {
    for (let z = -8; z <= 2; z += TILE) {
      const m = new THREE.Matrix4().makeTranslation(x, -0.19, z);
      ground.setMatrixAt(i++, m);
      if (i >= count) break;
    }
  }
  root.add(ground);
  for (const z of ROAD_Z) addVoxelStrip({ x: 0, z, width: TRACK_LENGTH, depth: 1.7, height: 0.16, material: roadMat });
  addVoxelStrip({ x: 0, z: -5.65, width: TRACK_LENGTH, depth: 0.8, height: 0.24, material: walkMat });
  addVoxelStrip({ x: 0, z: -0.75, width: TRACK_LENGTH, depth: 0.8, height: 0.24, material: walkMat });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf4ead2, roughness: 0.85 });
  for (let x = -4.5; x <= 4.5; x += 0.75) addVoxelStrip({ x, z: -3.1, width: 0.38, depth: 1.65, height: 0.035, material: stripeMat });
  buildInteractiveVoxels();
}

function blockKey(x, y, z) { return `${x}|${y}|${z}`; }
function buildInteractiveVoxels() {
  voxelGroup = new THREE.Group();
  root.add(voxelGroup);
  const material = new THREE.MeshStandardMaterial({ color: 0x76956c, roughness: 1 });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  for (let x = -10; x <= 10; x += 1) {
    for (let z = -8; z <= 2; z += 1) {
      const key = blockKey(x, 0, z);
      const mesh = new THREE.Mesh(geo, material.clone());
      mesh.position.set(x, -0.68, z);
      mesh.userData.voxel = { x, y: 0, z };
      voxelGroup.add(mesh);
      blocks.set(key, mesh);
    }
  }
}

function selectVoxel(mesh) {
  if (selected) selected.material.emissive?.setHex(0x000000);
  selected = mesh;
  if (selected) selected.material.emissive?.setHex(0x8a6f20);
}

function interact(event) {
  if (!renderer || !voxelGroup) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(voxelGroup.children, false)[0];
  if (!hit) return;
  const v = hit.object.userData.voxel;
  selectVoxel(hit.object);
  if (voxelMode === 'mine') {
    blocks.delete(blockKey(v.x, v.y, v.z));
    hit.object.removeFromParent();
    selected = null;
    return;
  }
  const normal = hit.face.normal;
  const x = v.x + Math.round(normal.x);
  const y = v.y + Math.round(normal.y);
  const z = v.z + Math.round(normal.z);
  const key = blockKey(x, y, z);
  if (blocks.has(key)) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x76956c, roughness: 1 }));
  mesh.position.set(x, y - 0.68, z);
  mesh.userData.voxel = { x, y, z };
  voxelGroup.add(mesh);
  blocks.set(key, mesh);
}

function installVoxelControls() {
  const host = document.getElementById('threeWorldLayer');
  const controls = document.createElement('div');
  controls.className = 'voxel-controls';
  controls.innerHTML = '<button type="button" data-voxel-mode="mine">挖方块</button><button type="button" data-voxel-mode="place">放方块</button>';
  controls.addEventListener('click', (event) => {
    const mode = event.target.closest('[data-voxel-mode]')?.dataset.voxelMode;
    if (!mode) return;
    voxelMode = mode;
    controls.querySelectorAll('button').forEach((button) => button.classList.toggle('is-active', button.dataset.voxelMode === mode));
  });
  controls.querySelector('[data-voxel-mode="mine"]').classList.add('is-active');
  host.appendChild(controls);
  renderer.domElement.addEventListener('pointerup', interact, { passive: true });
}

function addCar(index, lane, x) {
  const texture = new THREE.TextureLoader().load(CAR_FILES[index % CAR_FILES.length]);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.7, 1.55, 1);
  sprite.position.set(x, 0.82, LANE_Z[lane]);
  root.add(sprite);
  cars.push({ sprite, lane, x, dir: lane < 2 ? 1 : -1 });
}

function buildTraffic() {
  cars = [];
  for (let lane = 0; lane < 4; lane += 1) {
    addCar(lane, lane, -55 + lane * 14);
    addCar(lane + 1, lane, 5 + lane * 17);
  }
}

function resize() {
  if (!renderer) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  const playerX = (state?.player?.x || 0) / SCALE;
  camera.position.x += (playerX - camera.position.x) * Math.min(1, dt * 5);
  camera.lookAt(camera.position.x, -1.0, -3.0);
  for (const car of cars) {
    car.x += car.dir * VEHICLE_SPEED * dt;
    if (car.x > playerX + TRACK_LENGTH / 2) car.x -= TRACK_LENGTH;
    if (car.x < playerX - TRACK_LENGTH / 2) car.x += TRACK_LENGTH;
    car.sprite.position.x = car.x;
    car.sprite.position.z = LANE_Z[car.lane];
    car.sprite.material.rotation = car.dir < 0 ? Math.PI : 0;
  }
  renderer.render(scene, camera);
}

async function boot() {
  if (ready || !document.getElementById('threeWorldLayer')) return;
  THREE = await import('../../vendor/three/three.module.js');
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  const host = document.getElementById('threeWorldLayer');
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.replaceChildren(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(43, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 500);
  camera.position.set(0, 7.5, 10.5);
  root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xfff5dd, 0x405468, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(-8, 14, 10);
  scene.add(sun);
  buildGround();
  buildTraffic();
  installVoxelControls();
  resize();
  ready = true;
  host.dataset.engine = 'three-voxel';
  raf = requestAnimationFrame(frame);
}

RUNTIME?.subscribe?.((next) => { state = next; });
window.addEventListener('resize', resize, { passive: true });
window.addEventListener('paperchalk-world-enter', boot);
window.addEventListener('DOMContentLoaded', () => {
  // The module is deferred; on some mobile browsers the world-enter event can
  // arrive before this module has finished evaluating. Boot once after load so
  // the 3D layer cannot remain empty after a cold page visit.
  setTimeout(boot, 0);
});
window.addEventListener('load', () => setTimeout(boot, 0), { once: true });
if (document.readyState !== 'loading') setTimeout(boot, 0);
