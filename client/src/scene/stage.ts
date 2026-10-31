import * as THREE from "three";

const CAM_DIR = new THREE.Vector3(1, 1.2, 1).normalize();
const CAM_DIST = 70;
const ZOOMS = [22, 13]; // 기획서의 줌 2단계: 탐험, 가까이

/** 렌더러, 쿼터뷰 카메라, 조명 */
export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  sun = new THREE.DirectionalLight(0xc9d4f0, 1.5);
  private focus = new THREE.Vector3();
  private zoom = 0;
  private viewH = ZOOMS[0];
  private aspect = 1;
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3);

  constructor(canvas: HTMLCanvasElement, private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.background = new THREE.Color(0x141c3c);

    this.scene.add(new THREE.HemisphereLight(0xbfcdf0, 0x4a4438, 1.5));
    this.sun.position.set(-20, 40, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = this.sun.shadow.camera;
    s.left = -34; s.right = 34; s.top = 34; s.bottom = -34; s.near = 1; s.far = 110;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);

    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.aspect = w / h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(w, h, false);
    this.applyView();
  }

  private applyView() {
    const c = this.camera, half = this.viewH / 2;
    c.left = -half * this.aspect; c.right = half * this.aspect; c.top = half; c.bottom = -half;
    c.updateProjectionMatrix();
  }

  toggleZoom() { this.zoom = (this.zoom + 1) % ZOOMS.length; }

  follow(x: number, y: number, z: number, dt: number, snap = false) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 8);
    this.focus.lerp(new THREE.Vector3(x, y, z), k);
    this.viewH += (ZOOMS[this.zoom] - this.viewH) * (1 - Math.exp(-dt * 7));
    this.applyView();
    this.camera.position.copy(this.focus).addScaledVector(CAM_DIR, CAM_DIST);
    this.camera.lookAt(this.focus);
    this.sun.target.position.copy(this.focus);
    this.sun.position.set(this.focus.x - 20, 40, this.focus.z + 12);
  }

  /** 화면 좌표 → 지면 좌표 */
  pick(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    return this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
  }

  /** 월드 좌표 → game 요소 기준 픽셀 */
  project(x: number, y: number, z: number) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2 * this.host.clientWidth, y: (1 - v.y) / 2 * this.host.clientHeight };
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
