import * as THREE from "../vendor/three/three.module.js";
import { FBXLoader } from "./addons/loaders/FBXLoader.js";

const viewport = document.getElementById("viewport");
const statusText = document.getElementById("statusText");
const jointSelect = document.getElementById("jointSelect");
const selectedJointLabel = document.getElementById("selectedJointLabel");
const importFbxInput = document.getElementById("importFbx");
const clearFbxButton = document.getElementById("clearFbx");
const fbxInfo = document.getElementById("fbxInfo");
const fbxBadge = document.getElementById("fbxBadge");
const animationSelect = document.getElementById("animationSelect");
const playAnimationButton = document.getElementById("playAnimation");
const stopAnimationButton = document.getElementById("stopAnimation");
const animationSpeed = document.getElementById("animationSpeed");
const animationSpeedValue = document.getElementById("animationSpeedValue");

const defaults = {
  headSize: 0.82,
  upperTorsoHeight: 1.15,
  lowerTorsoHeight: 0.88,
  shoulderWidth: 1.72,
  hipWidth: 1.04,
  upperArmLength: 1.05,
  forearmLength: 0.96,
  palmLength: 0.46,
  thighLength: 1.38,
  shinLength: 1.30,
  footLength: 0.66,
  bodyDepth: 0.48,
  limbThickness: 0.30
};

const proportionDefs = [
  ["headSize", "头部尺寸", 0.55, 1.20, 0.01, "m"],
  ["upperTorsoHeight", "上身体长度", 0.75, 1.60, 0.01, "m"],
  ["lowerTorsoHeight", "下身体长度", 0.55, 1.25, 0.01, "m"],
  ["shoulderWidth", "肩宽", 1.10, 2.30, 0.01, "m"],
  ["hipWidth", "胯宽", 0.70, 1.55, 0.01, "m"],
  ["upperArmLength", "大臂长度", 0.65, 1.45, 0.01, "m"],
  ["forearmLength", "小臂长度", 0.60, 1.35, 0.01, "m"],
  ["palmLength", "手掌长度", 0.28, 0.70, 0.01, "m"],
  ["thighLength", "大腿长度", 0.85, 1.80, 0.01, "m"],
  ["shinLength", "小腿长度", 0.80, 1.70, 0.01, "m"],
  ["footLength", "脚掌长度", 0.38, 0.95, 0.01, "m"],
  ["bodyDepth", "躯干厚度", 0.28, 0.80, 0.01, "m"],
  ["limbThickness", "四肢粗细", 0.16, 0.52, 0.01, "m"]
];

const jointDefs = [
  ["lowerTorso", "下身体 / 骨盆根节点", 0],
  ["upperTorso", "上身体", 1],
  ["head", "头部", 2],
  ["leftUpperArm", "左 · 大臂", 2],
  ["leftForearm", "左 · 小臂", 3],
  ["leftPalm", "左 · 手掌", 3],
  ["rightUpperArm", "右 · 大臂", 2],
  ["rightForearm", "右 · 小臂", 3],
  ["rightPalm", "右 · 手掌", 3],
  ["leftThigh", "左 · 大腿", 1],
  ["leftShin", "左 · 小腿", 2],
  ["leftFoot", "左 · 脚掌", 3],
  ["rightThigh", "右 · 大腿", 1],
  ["rightShin", "右 · 小腿", 2],
  ["rightFoot", "右 · 脚掌", 3]
];

let params = { ...defaults };
let pose = Object.fromEntries(jointDefs.map(([key]) => [key, { x: 0, y: 0, z: 0 }]));
let selectedJoint = "lowerTorso";
let rig = null;
let groups = {};
let jointMarkers = {};
let solidObjects = [];
let skeletonObjects = [];
let importedContainer = null;
let importedObject = null;
let importedSkeletonHelper = null;
let animationMixer = null;
let activeAnimationAction = null;
const animationClock = new THREE.Clock();
const fbxLoader = new FBXLoader();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111419);
scene.fog = new THREE.Fog(0x111419, 10, 24);

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}
viewport.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x22272d, 1.7));
const keyLight = new THREE.DirectionalLight(0xfff2da, 3.2);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -6;
keyLight.shadow.camera.right = 6;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -2;
scene.add(keyLight);

const rim = new THREE.DirectionalLight(0x9ec8ff, 1.35);
rim.position.set(-4, 5, -5);
scene.add(rim);

const grid = new THREE.GridHelper(14, 28, 0x46515f, 0x252b33);
grid.material.transparent = true;
grid.material.opacity = 0.52;
scene.add(grid);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.22 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.002;
ground.receiveShadow = true;
scene.add(ground);

const orbit = {
  target: new THREE.Vector3(0, 3.0, 0),
  radius: 9.4,
  theta: Math.PI * 0.22,
  phi: Math.PI * 0.39
};

function updateCamera() {
  const sinPhi = Math.sin(orbit.phi);
  camera.position.set(
    orbit.target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
    orbit.target.y + orbit.radius * Math.cos(orbit.phi),
    orbit.target.z + orbit.radius * sinPhi * Math.cos(orbit.theta)
  );
  camera.lookAt(orbit.target);
}
updateCamera();

const pointer = { active: false, mode: "rotate", x: 0, y: 0 };

renderer.domElement.addEventListener("contextmenu", event => event.preventDefault());
renderer.domElement.addEventListener("pointerdown", event => {
  pointer.active = true;
  pointer.mode = event.button === 2 || event.shiftKey ? "pan" : "rotate";
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  renderer.domElement.setPointerCapture?.(event.pointerId);
});
renderer.domElement.addEventListener("pointerup", event => {
  pointer.active = false;
  renderer.domElement.releasePointerCapture?.(event.pointerId);
});
renderer.domElement.addEventListener("pointercancel", () => { pointer.active = false; });
renderer.domElement.addEventListener("pointermove", event => {
  if (!pointer.active) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  pointer.x = event.clientX;
  pointer.y = event.clientY;

  if (pointer.mode === "rotate") {
    orbit.theta -= dx * 0.007;
    orbit.phi = THREE.MathUtils.clamp(orbit.phi + dy * 0.007, 0.12, Math.PI - 0.12);
  } else {
    const distanceScale = orbit.radius * 0.0018;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    orbit.target.addScaledVector(right, -dx * distanceScale);
    orbit.target.addScaledVector(up, dy * distanceScale);
  }
  updateCamera();
});
renderer.domElement.addEventListener("wheel", event => {
  event.preventDefault();
  orbit.radius = THREE.MathUtils.clamp(orbit.radius * Math.exp(event.deltaY * 0.001), 3.8, 20);
  updateCamera();
}, { passive: false });

const colors = {
  torso: 0xd9f28b,
  limb: 0xa7c7e7,
  hand: 0xf0c7a5,
  head: 0xf1d6bd,
  skeleton: 0xf6fbff,
  selected: 0xffdf72
};

function makeMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.02
  });
}

function addJointMarker(parent, name, radius) {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 18, 12),
    new THREE.MeshBasicMaterial({ color: colors.skeleton, transparent: true, opacity: 0.92 })
  );
  marker.userData.kind = "skeleton";
  marker.userData.joint = name;
  parent.add(marker);
  skeletonObjects.push(marker);
  jointMarkers[name] = marker;
  return marker;
}

function addCylinderBone(parent, length, radius, direction = -1, axis = "y") {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 10);
  const material = new THREE.MeshBasicMaterial({ color: colors.skeleton, transparent: true, opacity: 0.66 });
  const bone = new THREE.Mesh(geometry, material);
  bone.userData.kind = "skeleton";

  if (axis === "y") {
    bone.position.y = direction * length * 0.5;
  } else if (axis === "z") {
    bone.rotation.x = Math.PI / 2;
    bone.position.z = direction * length * 0.5;
  }
  parent.add(bone);
  skeletonObjects.push(bone);
  return bone;
}

function addBoxSegment(parent, width, length, depth, color, direction = -1) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, length, depth),
    makeMaterial(color)
  );
  mesh.position.y = direction * length * 0.5;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.kind = "solid";
  parent.add(mesh);
  solidObjects.push(mesh);
  return mesh;
}

function applyStoredRotation(group, key) {
  const rotation = pose[key] || { x: 0, y: 0, z: 0 };
  group.rotation.set(
    THREE.MathUtils.degToRad(rotation.x),
    THREE.MathUtils.degToRad(rotation.y),
    THREE.MathUtils.degToRad(rotation.z)
  );
}

function makeLinearJoint(parent, key, position, length, width, depth, color, direction = -1) {
  const group = new THREE.Group();
  group.name = key;
  group.position.copy(position);
  parent.add(group);
  groups[key] = group;
  addJointMarker(group, key, Math.max(0.055, width * 0.22));
  addCylinderBone(group, length, Math.max(0.025, width * 0.08), direction, "y");
  addBoxSegment(group, width, length, depth, color, direction);
  applyStoredRotation(group, key);
  return group;
}

function makePalm(parent, key, position, length, width, depth) {
  const group = new THREE.Group();
  group.name = key;
  group.position.copy(position);
  parent.add(group);
  groups[key] = group;
  addJointMarker(group, key, Math.max(0.05, width * 0.24));
  addCylinderBone(group, length, Math.max(0.022, width * 0.07), -1, "y");
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, depth), makeMaterial(colors.hand));
  mesh.position.y = -length * 0.5;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.kind = "solid";
  group.add(mesh);
  solidObjects.push(mesh);
  applyStoredRotation(group, key);
  return group;
}

function makeFoot(parent, key, position, length, width, height) {
  const group = new THREE.Group();
  group.name = key;
  group.position.copy(position);
  parent.add(group);
  groups[key] = group;
  addJointMarker(group, key, Math.max(0.055, width * 0.22));
  addCylinderBone(group, length, Math.max(0.024, width * 0.07), 1, "z");

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), makeMaterial(colors.hand));
  mesh.position.set(0, -height * 0.42, length * 0.42);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.kind = "solid";
  group.add(mesh);
  solidObjects.push(mesh);
  applyStoredRotation(group, key);
  return group;
}

function buildRig() {
  if (rig) scene.remove(rig);
  groups = {};
  jointMarkers = {};
  solidObjects = [];
  skeletonObjects = [];

  rig = new THREE.Group();
  rig.name = "ProceduralHumanRig";
  scene.add(rig);

  const limb = params.limbThickness;
  const armWidth = limb;
  const legWidth = limb * 1.18;
  const handWidth = limb * 1.25;
  const footWidth = limb * 1.45;
  const footHeight = limb * 0.62;
  const legHeight = params.thighLength + params.shinLength + footHeight;
  rig.position.y = legHeight;

  const lowerTorso = makeLinearJoint(
    rig,
    "lowerTorso",
    new THREE.Vector3(0, 0, 0),
    params.lowerTorsoHeight,
    params.hipWidth * 0.92,
    params.bodyDepth,
    colors.torso,
    1
  );

  const upperTorso = makeLinearJoint(
    lowerTorso,
    "upperTorso",
    new THREE.Vector3(0, params.lowerTorsoHeight, 0),
    params.upperTorsoHeight,
    params.shoulderWidth * 0.72,
    params.bodyDepth * 0.94,
    colors.torso,
    1
  );

  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, params.upperTorsoHeight + params.headSize * 0.18, 0);
  upperTorso.add(head);
  groups.head = head;
  addJointMarker(head, "head", Math.max(0.06, params.headSize * 0.1));

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(params.headSize * 0.5, 28, 20),
    makeMaterial(colors.head)
  );
  headMesh.position.y = params.headSize * 0.42;
  headMesh.scale.set(0.88, 1.0, 0.84);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headMesh.userData.kind = "solid";
  head.add(headMesh);
  solidObjects.push(headMesh);
  addCylinderBone(head, params.headSize * 0.48, Math.max(0.025, params.headSize * 0.035), 1, "y");
  applyStoredRotation(head, "head");

  const shoulderY = params.upperTorsoHeight * 0.78;
  const leftUpperArm = makeLinearJoint(
    upperTorso,
    "leftUpperArm",
    new THREE.Vector3(-params.shoulderWidth * 0.5, shoulderY, 0),
    params.upperArmLength,
    armWidth,
    armWidth * 0.9,
    colors.limb,
    -1
  );
  const leftForearm = makeLinearJoint(
    leftUpperArm,
    "leftForearm",
    new THREE.Vector3(0, -params.upperArmLength, 0),
    params.forearmLength,
    armWidth * 0.9,
    armWidth * 0.84,
    colors.limb,
    -1
  );
  makePalm(
    leftForearm,
    "leftPalm",
    new THREE.Vector3(0, -params.forearmLength, 0),
    params.palmLength,
    handWidth,
    handWidth * 0.55
  );

  const rightUpperArm = makeLinearJoint(
    upperTorso,
    "rightUpperArm",
    new THREE.Vector3(params.shoulderWidth * 0.5, shoulderY, 0),
    params.upperArmLength,
    armWidth,
    armWidth * 0.9,
    colors.limb,
    -1
  );
  const rightForearm = makeLinearJoint(
    rightUpperArm,
    "rightForearm",
    new THREE.Vector3(0, -params.upperArmLength, 0),
    params.forearmLength,
    armWidth * 0.9,
    armWidth * 0.84,
    colors.limb,
    -1
  );
  makePalm(
    rightForearm,
    "rightPalm",
    new THREE.Vector3(0, -params.forearmLength, 0),
    params.palmLength,
    handWidth,
    handWidth * 0.55
  );

  const leftThigh = makeLinearJoint(
    rig,
    "leftThigh",
    new THREE.Vector3(-params.hipWidth * 0.28, 0, 0),
    params.thighLength,
    legWidth,
    legWidth * 0.92,
    colors.limb,
    -1
  );
  const leftShin = makeLinearJoint(
    leftThigh,
    "leftShin",
    new THREE.Vector3(0, -params.thighLength, 0),
    params.shinLength,
    legWidth * 0.88,
    legWidth * 0.82,
    colors.limb,
    -1
  );
  makeFoot(
    leftShin,
    "leftFoot",
    new THREE.Vector3(0, -params.shinLength, -params.footLength * 0.16),
    params.footLength,
    footWidth,
    footHeight
  );

  const rightThigh = makeLinearJoint(
    rig,
    "rightThigh",
    new THREE.Vector3(params.hipWidth * 0.28, 0, 0),
    params.thighLength,
    legWidth,
    legWidth * 0.92,
    colors.limb,
    -1
  );
  const rightShin = makeLinearJoint(
    rightThigh,
    "rightShin",
    new THREE.Vector3(0, -params.thighLength, 0),
    params.shinLength,
    legWidth * 0.88,
    legWidth * 0.82,
    colors.limb,
    -1
  );
  makeFoot(
    rightShin,
    "rightFoot",
    new THREE.Vector3(0, -params.shinLength, -params.footLength * 0.16),
    params.footLength,
    footWidth,
    footHeight
  );

  applyVisibility();
  updateSelectionVisual();
  updateOrbitTarget();
  statusText.textContent = "模型已重新生成";
}

function disposeMaterial(material) {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    for (const value of Object.values(item)) {
      if (value?.isTexture) value.dispose?.();
    }
    item.dispose?.();
  }
}

function clearImportedModel({ restoreStatus = true } = {}) {
  animationMixer?.stopAllAction();
  activeAnimationAction = null;
  animationMixer = null;

  if (importedSkeletonHelper) {
    scene.remove(importedSkeletonHelper);
    importedSkeletonHelper.geometry?.dispose?.();
    importedSkeletonHelper.material?.dispose?.();
    importedSkeletonHelper = null;
  }

  if (importedContainer) {
    importedContainer.traverse(node => {
      node.geometry?.dispose?.();
      if (node.material) disposeMaterial(node.material);
    });
    scene.remove(importedContainer);
  }

  importedContainer = null;
  importedObject = null;
  clearFbxButton.hidden = true;
  fbxBadge.textContent = "未载入";
  fbxBadge.classList.remove("ready", "error");
  fbxInfo.textContent = "选择顶部“导入 FBX”，模型会直接在浏览器本地解析，不上传到服务器。";
  animationSelect.innerHTML = '<option value="">无动画</option>';
  animationSelect.disabled = true;
  playAnimationButton.disabled = true;
  stopAnimationButton.disabled = true;
  if (rig) rig.visible = true;
  applyVisibility();
  updateOrbitTarget();
  if (restoreStatus) statusText.textContent = "已返回程序化模型";
}

function describeFbx(object, file) {
  let meshCount = 0;
  let skinnedMeshCount = 0;
  let boneCount = 0;
  object.traverse(node => {
    if (node.isMesh) meshCount++;
    if (node.isSkinnedMesh) skinnedMeshCount++;
    if (node.isBone) boneCount++;
  });
  const clips = object.animations || [];
  const megabytes = (file.size / 1024 / 1024).toFixed(1);
  return { meshCount, skinnedMeshCount, boneCount, clips, megabytes };
}

function fitImportedObject() {
  if (!importedContainer || !importedObject) return;
  importedContainer.scale.setScalar(1);
  importedContainer.position.set(0, 0, 0);
  importedObject.updateWorldMatrix(true, true);

  const rawBox = new THREE.Box3().setFromObject(importedObject);
  if (rawBox.isEmpty()) return;
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const targetHeight = 5.8;
  const scale = rawSize.y > 0.0001 ? targetHeight / rawSize.y : 1;
  importedContainer.scale.setScalar(scale);
  importedContainer.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(importedContainer);
  const center = box.getCenter(new THREE.Vector3());
  importedContainer.position.x -= center.x;
  importedContainer.position.z -= center.z;
  importedContainer.position.y -= box.min.y;
  importedContainer.updateWorldMatrix(true, true);

  const finalBox = new THREE.Box3().setFromObject(importedContainer);
  const finalSize = finalBox.getSize(new THREE.Vector3());
  const finalCenter = finalBox.getCenter(new THREE.Vector3());
  orbit.target.set(finalCenter.x, finalBox.min.y + finalSize.y * 0.5, finalCenter.z);
  orbit.radius = THREE.MathUtils.clamp(Math.max(finalSize.y * 1.45, finalSize.x * 2.2, 5.2), 4.2, 18);
  updateCamera();
}

function populateAnimationControls(clips) {
  animationSelect.innerHTML = "";
  if (!clips.length) {
    animationSelect.innerHTML = '<option value="">无动画</option>';
    animationSelect.disabled = true;
    playAnimationButton.disabled = true;
    stopAnimationButton.disabled = true;
    return;
  }

  clips.forEach((clip, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = clip.name || `Animation ${index + 1}`;
    animationSelect.appendChild(option);
  });
  animationSelect.disabled = false;
  playAnimationButton.disabled = false;
  stopAnimationButton.disabled = false;
  animationSelect.value = "0";
}

function playSelectedAnimation() {
  if (!animationMixer || !importedObject) return;
  const clips = importedObject.animations || [];
  const clip = clips[Number(animationSelect.value)];
  if (!clip) return;
  animationMixer.stopAllAction();
  activeAnimationAction = animationMixer.clipAction(clip);
  activeAnimationAction.reset();
  activeAnimationAction.setLoop(THREE.LoopRepeat, Infinity);
  activeAnimationAction.play();
  statusText.textContent = `播放动画：${clip.name || "Animation"}`;
}

async function importFbxFile(file) {
  if (!file) return;
  statusText.textContent = `正在解析 ${file.name}…`;
  fbxBadge.textContent = "解析中";
  fbxBadge.classList.remove("ready", "error");

  try {
    const buffer = await file.arrayBuffer();
    const object = fbxLoader.parse(buffer, "");
    clearImportedModel({ restoreStatus: false });

    importedContainer = new THREE.Group();
    importedContainer.name = "ImportedFBXContainer";
    importedObject = object;
    importedContainer.add(importedObject);
    scene.add(importedContainer);

    importedObject.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    importedSkeletonHelper = new THREE.SkeletonHelper(importedObject);
    importedSkeletonHelper.material.transparent = true;
    importedSkeletonHelper.material.opacity = 0.82;
    scene.add(importedSkeletonHelper);

    animationMixer = new THREE.AnimationMixer(importedObject);
    animationMixer.timeScale = Number(animationSpeed.value) || 1;

    const info = describeFbx(importedObject, file);
    populateAnimationControls(info.clips);
    fitImportedObject();

    if (rig) rig.visible = false;
    clearFbxButton.hidden = false;
    fbxBadge.textContent = "已载入";
    fbxBadge.classList.add("ready");
    fbxInfo.innerHTML =
      `<strong>${file.name}</strong>\n` +
      `${info.megabytes} MB · 网格 ${info.meshCount} · 蒙皮网格 ${info.skinnedMeshCount}\n` +
      `骨骼 ${info.boneCount} · 动画 ${info.clips.length}`;
    statusText.textContent = `FBX 已载入：${info.boneCount} 根骨骼 / ${info.clips.length} 个动画`;
    applyVisibility();

    if (info.clips.length) playSelectedAnimation();
  } catch (error) {
    console.error(error);
    clearImportedModel({ restoreStatus: false });
    fbxBadge.textContent = "载入失败";
    fbxBadge.classList.add("error");
    fbxInfo.textContent = "FBX 解析失败。请确认文件是 FBX 7.x，或检查浏览器控制台中的具体错误。";
    statusText.textContent = "FBX 载入失败";
  }
}

function updateOrbitTarget() {
  const totalHeight =
    params.thighLength +
    params.shinLength +
    params.lowerTorsoHeight +
    params.upperTorsoHeight +
    params.headSize +
    params.limbThickness * 0.62;
  orbit.target.set(0, totalHeight * 0.50, 0);
  updateCamera();
}

function applyVisibility() {
  const showMesh = document.getElementById("showMesh").checked;
  const showSkeleton = document.getElementById("showSkeleton").checked;
  solidObjects.forEach(object => { object.visible = showMesh; });
  skeletonObjects.forEach(object => { object.visible = showSkeleton; });
  if (importedObject) {
    importedObject.traverse(node => {
      if (node.isMesh) node.visible = showMesh;
    });
  }
  if (importedSkeletonHelper) importedSkeletonHelper.visible = showSkeleton;
  grid.visible = document.getElementById("showGrid").checked;
}

function updateSelectionVisual() {
  Object.entries(jointMarkers).forEach(([key, marker]) => {
    const active = key === selectedJoint;
    marker.scale.setScalar(active ? 1.65 : 1);
    marker.material.color.setHex(active ? colors.selected : colors.skeleton);
    marker.material.opacity = active ? 1 : 0.92;
  });

  document.querySelectorAll(".rig-node").forEach(node => {
    node.classList.toggle("active", node.dataset.joint === selectedJoint);
  });

  const def = jointDefs.find(([key]) => key === selectedJoint);
  selectedJointLabel.textContent = def ? def[1] : selectedJoint;
}

function setSelectedJoint(key) {
  if (!groups[key]) return;
  selectedJoint = key;
  jointSelect.value = key;
  updatePoseUI();
  updateSelectionVisual();
}

function updatePoseUI() {
  const rotation = pose[selectedJoint] || { x: 0, y: 0, z: 0 };
  for (const axis of ["X", "Y", "Z"]) {
    const key = axis.toLowerCase();
    const input = document.getElementById("rot" + axis);
    const output = document.getElementById("rot" + axis + "Value");
    input.value = String(rotation[key]);
    output.textContent = Math.round(rotation[key]) + "°";
  }
}

function applyPoseAxis(axis, value) {
  pose[selectedJoint][axis] = value;
  const group = groups[selectedJoint];
  if (!group) return;
  group.rotation[axis] = THREE.MathUtils.degToRad(value);
  document.getElementById("rot" + axis.toUpperCase() + "Value").textContent = Math.round(value) + "°";
  statusText.textContent = selectedJointLabel.textContent + " 已调整";
}

function buildProportionControls() {
  const container = document.getElementById("proportionControls");
  container.innerHTML = "";

  proportionDefs.forEach(([key, label, min, max, step, unit]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "control";
    wrapper.innerHTML = `
      <label for="param-${key}">${label}</label>
      <output id="value-${key}">${params[key].toFixed(2)}${unit}</output>
      <input id="param-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${params[key]}">
    `;
    const input = wrapper.querySelector("input");
    const output = wrapper.querySelector("output");
    input.addEventListener("input", () => {
      params[key] = Number(input.value);
      output.textContent = params[key].toFixed(2) + unit;
      buildRig();
    });
    container.appendChild(wrapper);
  });
}

function buildJointUI() {
  jointSelect.innerHTML = "";
  const hierarchy = document.getElementById("hierarchy");
  hierarchy.innerHTML = "";

  jointDefs.forEach(([key, label, depth]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    jointSelect.appendChild(option);

    const button = document.createElement("button");
    button.type = "button";
    button.className = `rig-node depth-${Math.min(depth, 3)}`;
    button.dataset.joint = key;
    button.innerHTML = `<i aria-hidden="true"></i><span>${label}</span>`;
    button.addEventListener("click", () => setSelectedJoint(key));
    hierarchy.appendChild(button);
  });

  jointSelect.value = selectedJoint;
  jointSelect.addEventListener("change", () => setSelectedJoint(jointSelect.value));
}

function resetPose() {
  pose = Object.fromEntries(jointDefs.map(([key]) => [key, { x: 0, y: 0, z: 0 }]));
  Object.entries(groups).forEach(([key, group]) => {
    if (pose[key]) group.rotation.set(0, 0, 0);
  });
  updatePoseUI();
  statusText.textContent = "全部关节已归零";
}

function resetAll() {
  params = { ...defaults };
  pose = Object.fromEntries(jointDefs.map(([key]) => [key, { x: 0, y: 0, z: 0 }]));
  selectedJoint = "lowerTorso";
  buildProportionControls();
  buildRig();
  setSelectedJoint(selectedJoint);
  statusText.textContent = "已恢复默认模型";
}

function exportJson() {
  const payload = {
    format: "paperchalk-procedural-human",
    version: 1,
    params,
    pose
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "paperchalk-procedural-human.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  statusText.textContent = "JSON 已导出";
}

async function importJsonFile(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (payload.format !== "paperchalk-procedural-human") throw new Error("格式不匹配");

    if (payload.params) {
      for (const [key] of proportionDefs) {
        if (Number.isFinite(Number(payload.params[key]))) params[key] = Number(payload.params[key]);
      }
    }
    if (payload.pose) {
      for (const [key] of jointDefs) {
        const incoming = payload.pose[key];
        if (!incoming) continue;
        pose[key] = {
          x: Number(incoming.x) || 0,
          y: Number(incoming.y) || 0,
          z: Number(incoming.z) || 0
        };
      }
    }

    buildProportionControls();
    buildRig();
    setSelectedJoint(selectedJoint);
    statusText.textContent = "JSON 已载入";
  } catch (error) {
    console.error(error);
    statusText.textContent = "载入失败：JSON 格式不正确";
  }
}

for (const axis of ["X", "Y", "Z"]) {
  const input = document.getElementById("rot" + axis);
  input.addEventListener("input", () => applyPoseAxis(axis.toLowerCase(), Number(input.value)));
}

document.getElementById("zeroJoint").addEventListener("click", () => {
  pose[selectedJoint] = { x: 0, y: 0, z: 0 };
  groups[selectedJoint]?.rotation.set(0, 0, 0);
  updatePoseUI();
  statusText.textContent = selectedJointLabel.textContent + " 已归零";
});
document.getElementById("resetPose").addEventListener("click", resetPose);
document.getElementById("resetAll").addEventListener("click", resetAll);
document.getElementById("exportJson").addEventListener("click", exportJson);
document.getElementById("importJson").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) importJsonFile(file);
  event.target.value = "";
});

importFbxInput.addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) importFbxFile(file);
  event.target.value = "";
});
clearFbxButton.addEventListener("click", () => clearImportedModel());
playAnimationButton.addEventListener("click", playSelectedAnimation);
stopAnimationButton.addEventListener("click", () => {
  animationMixer?.stopAllAction();
  activeAnimationAction = null;
  statusText.textContent = "动画已停止";
});
animationSelect.addEventListener("change", playSelectedAnimation);
animationSpeed.addEventListener("input", () => {
  const speed = Number(animationSpeed.value) || 1;
  animationSpeedValue.textContent = speed.toFixed(2) + "×";
  if (animationMixer) animationMixer.timeScale = speed;
});

viewport.addEventListener("dragover", event => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});
viewport.addEventListener("drop", event => {
  event.preventDefault();
  const file = [...(event.dataTransfer.files || [])].find(item => item.name.toLowerCase().endsWith(".fbx"));
  if (file) importFbxFile(file);
});

for (const id of ["showMesh", "showSkeleton", "showGrid"]) {
  document.getElementById(id).addEventListener("change", applyVisibility);
}

const views = {
  threeQuarter: { theta: Math.PI * 0.22, phi: Math.PI * 0.39, radius: 9.4 },
  front: { theta: 0, phi: Math.PI * 0.46, radius: 9.0 },
  side: { theta: Math.PI * 0.5, phi: Math.PI * 0.46, radius: 9.0 }
};

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    Object.assign(orbit, views[button.dataset.view]);
    updateCamera();
  });
});

const resizeObserver = new ResizeObserver(() => {
  const width = Math.max(1, viewport.clientWidth);
  const height = Math.max(1, viewport.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
resizeObserver.observe(viewport);

buildProportionControls();
buildJointUI();
buildRig();
setSelectedJoint(selectedJoint);

function animate() {
  const delta = Math.min(animationClock.getDelta(), 0.05);
  animationMixer?.update(delta);
  importedSkeletonHelper?.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
