// Three.js primary world runtime
export class World3DEngine {
  constructor({ THREE, canvas }) {
    this.THREE = THREE;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.entities = new Map();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    this.camera.position.set(0, 8, 18);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.scene.add(new THREE.AmbientLight(0xffffff, 1));
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  addEntity(id, object3d, components = {}) {
    this.entities.set(id, { object3d, components });
    this.scene.add(object3d);
  }
  removeEntity(id) {
    const e = this.entities.get(id);
    if (!e) return;
    this.scene.remove(e.object3d);
    this.entities.delete(id);
  }
  resize() {
    const w = this.renderer.domElement.clientWidth || window.innerWidth;
    const h = this.renderer.domElement.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  update() {
    const dt = this.clock.getDelta();
    for (const e of this.entities.values()) e.components.update?.(dt, e.object3d);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.update());
  }
}

export class WorldSpaceHealthBar {
  constructor(THREE, max = 10) {
    this.group = new THREE.Group();
    this.cells = [];
    for (let i = 0; i < max; i++) {
      const cell = new THREE.Mesh(new THREE.PlaneGeometry(.12,.12), new THREE.MeshBasicMaterial({color:0x00ff00}));
      cell.position.x = i * .14;
      this.group.add(cell);
      this.cells.push(cell);
    }
  }
  set(value) { this.cells.forEach((c,i)=>c.visible=i<value); }
  update(camera) { this.group.lookAt(camera.position); }
}
