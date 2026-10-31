import * as THREE from "three";
import { MOB_STATS, groundY, type ItemId, type MobType } from "@tidebound/shared";
import { glowMat, lit } from "./fog.ts";
import { ball, box, cone, cyl, merge, type Part } from "./parts.ts";
import { boatGeo } from "./models.ts";

type Limb = THREE.Group;

function limb(parent: THREE.Object3D, mat: THREE.Material, geo: THREE.BufferGeometry, x: number, y: number, z: number): Limb {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  pivot.add(m);
  parent.add(pivot);
  return pivot;
}

function solid(parent: THREE.Object3D, mat: THREE.Material, geo: THREE.BufferGeometry) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  parent.add(m);
  return m;
}

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
function dampAngle(a: number, b: number, k: number, dt: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * (1 - Math.exp(-k * dt));
}

// ---- 몬스터 ----
const legGeo = (w: number, h: number, c: number, hoof?: number) => merge([
  { g: box(w, h, w), c, p: [0, -h / 2, 0] },
  ...(hoof === undefined ? [] : [{ g: box(w * 1.1, h * 0.2, w * 1.1), c: hoof, p: [0, -h * 0.95, 0] } as Part]),
]);

function rabbitBody(root: THREE.Group, mat: THREE.Material) {
  const fur = 0xcbb79d, light = 0xefe6d6;
  solid(root, mat, merge([
    { g: ball(0.3), c: fur, p: [0, 0.32, -0.05], s: [0.85, 0.8, 1.15] },
    { g: ball(0.2), c: fur, p: [0, 0.5, 0.3] },
    { g: box(0.08, 0.36, 0.05), c: fur, p: [-0.08, 0.82, 0.24], r: [-0.25, 0, -0.12] },
    { g: box(0.08, 0.36, 0.05), c: fur, p: [0.08, 0.82, 0.24], r: [-0.25, 0, 0.12] },
    { g: box(0.04, 0.24, 0.02), c: 0xdba99c, p: [-0.08, 0.82, 0.27], r: [-0.25, 0, -0.12] },
    { g: box(0.04, 0.24, 0.02), c: 0xdba99c, p: [0.08, 0.82, 0.27], r: [-0.25, 0, 0.12] },
    { g: ball(0.1, 0), c: light, p: [0, 0.38, -0.4] },
    { g: ball(0.025, 0), c: 0x201814, p: [-0.13, 0.54, 0.42] },
    { g: ball(0.025, 0), c: 0x201814, p: [0.13, 0.54, 0.42] },
    { g: ball(0.03, 0), c: 0xc77d78, p: [0, 0.47, 0.5] },
  ]));
  const leg = legGeo(0.1, 0.18, fur);
  return [limb(root, mat, leg, -0.14, 0.17, 0.18), limb(root, mat, leg, 0.14, 0.17, 0.18), limb(root, mat, leg, -0.16, 0.17, -0.2), limb(root, mat, leg, 0.16, 0.17, -0.2)];
}

function deerBody(root: THREE.Group, mat: THREE.Material) {
  const hide = 0xa9713f, belly = 0xdcc29c, antler = 0xd9c9a8;
  const prong = (x: number, y: number, z: number, rx: number, rz: number): Part =>
    ({ g: cyl(0.015, 0.03, 0.34, 4), c: antler, p: [x, y, z], r: [rx, 0, rz] });
  solid(root, mat, merge([
    { g: ball(0.5), c: hide, p: [0, 1.08, 0], s: [0.72, 0.78, 1.45] },
    { g: ball(0.32), c: belly, p: [0, 0.92, 0.02], s: [0.8, 0.5, 1.5] },
    { g: cyl(0.14, 0.22, 0.75, 6), c: hide, p: [0, 1.5, 0.62], r: [0.55, 0, 0] },
    { g: box(0.26, 0.26, 0.42), c: hide, p: [0, 1.9, 0.86] },
    { g: box(0.17, 0.15, 0.2), c: belly, p: [0, 1.84, 1.13] },
    { g: ball(0.03, 0), c: 0x1a1412, p: [0, 1.87, 1.24] },
    { g: ball(0.03, 0), c: 0x1a1412, p: [-0.135, 1.94, 0.94] },
    { g: ball(0.03, 0), c: 0x1a1412, p: [0.135, 1.94, 0.94] },
    { g: box(0.2, 0.08, 0.05), c: hide, p: [-0.22, 2.02, 0.74], r: [0, 0, 0.3] },
    { g: box(0.2, 0.08, 0.05), c: hide, p: [0.22, 2.02, 0.74], r: [0, 0, -0.3] },
    { g: cyl(0.02, 0.035, 0.5, 4), c: antler, p: [-0.13, 2.26, 0.76], r: [-0.2, 0, 0.3] },
    { g: cyl(0.02, 0.035, 0.5, 4), c: antler, p: [0.13, 2.26, 0.76], r: [-0.2, 0, -0.3] },
    prong(-0.27, 2.37, 0.8, 0.7, 0.8), prong(0.27, 2.37, 0.8, 0.7, -0.8),
    prong(-0.2, 2.2, 0.86, 0.9, 0.2), prong(0.2, 2.2, 0.86, 0.9, -0.2),
    { g: ball(0.1, 0), c: 0xf0e8d8, p: [0, 1.25, -0.72], s: [0.8, 1, 0.8] },
  ]));
  const leg = legGeo(0.1, 0.78, hide, 0x2a2018);
  return [limb(root, mat, leg, -0.2, 0.8, 0.45), limb(root, mat, leg, 0.2, 0.8, 0.45), limb(root, mat, leg, -0.2, 0.8, -0.45), limb(root, mat, leg, 0.2, 0.8, -0.45)];
}

function boarBody(root: THREE.Group, mat: THREE.Material) {
  const hide = 0x4f3b30, dark = 0x33261f, tusk = 0xf0e6d0;
  const bristle = (z: number, h: number): Part => ({ g: cone(0.07, h, 4), c: dark, p: [0, 0.94 + h * 0.3, z], r: [-0.4, 0, 0] });
  solid(root, mat, merge([
    { g: ball(0.55), c: hide, p: [0, 0.65, -0.1], s: [0.85, 0.82, 1.3] },
    { g: ball(0.42), c: dark, p: [0, 0.74, 0.32], s: [0.95, 0.95, 1] },
    { g: box(0.42, 0.38, 0.42), c: hide, p: [0, 0.62, 0.72] },
    { g: cyl(0.14, 0.17, 0.26, 7), c: 0x6a4e43, p: [0, 0.56, 1.02], r: [Math.PI / 2, 0, 0] },
    { g: cyl(0.145, 0.145, 0.02, 7), c: 0x8d6a5e, p: [0, 0.56, 1.16], r: [Math.PI / 2, 0, 0] },
    { g: cone(0.05, 0.34, 5), c: tusk, p: [-0.17, 0.56, 0.98], r: [-0.45, 0, 0.25] },
    { g: cone(0.05, 0.34, 5), c: tusk, p: [0.17, 0.56, 0.98], r: [-0.45, 0, -0.25] },
    { g: ball(0.035, 0), c: 0xd8482f, p: [-0.19, 0.74, 0.86] },
    { g: ball(0.035, 0), c: 0xd8482f, p: [0.19, 0.74, 0.86] },
    { g: cone(0.08, 0.17, 4), c: dark, p: [-0.2, 0.87, 0.62], r: [0, 0, 0.4] },
    { g: cone(0.08, 0.17, 4), c: dark, p: [0.2, 0.87, 0.62], r: [0, 0, -0.4] },
    bristle(0.48, 0.32), bristle(0.26, 0.36), bristle(0.04, 0.34), bristle(-0.18, 0.3), bristle(-0.4, 0.24),
    { g: cyl(0.015, 0.025, 0.3, 4), c: dark, p: [0, 0.78, -0.78], r: [-0.8, 0, 0] },
  ]));
  const leg = legGeo(0.15, 0.36, dark, 0x1b1411);
  return [limb(root, mat, leg, -0.27, 0.38, 0.42), limb(root, mat, leg, 0.27, 0.38, 0.42), limb(root, mat, leg, -0.27, 0.38, -0.5), limb(root, mat, leg, 0.27, 0.38, -0.5)];
}

const HP_GEO = new THREE.PlaneGeometry(1, 0.12);
const HP_BG = new THREE.MeshBasicMaterial({ color: 0x0a0d18, depthTest: false, transparent: true, opacity: 0.8 });
const HP_FG = new THREE.MeshBasicMaterial({ color: 0xe0604f, depthTest: false, transparent: true });

export class MobView {
  root = new THREE.Group();
  private tilt = new THREE.Group();
  private legs: Limb[];
  private mat = lit();
  private hpBar = new THREE.Group();
  private hpFill = new THREE.Mesh(HP_GEO, HP_FG);
  private phase = Math.random() * 6;
  private lastX: number; private lastZ: number;
  private x: number; private z: number; private rot: number;
  private deadFor = 99;
  private flash = 0;
  private hopHeight: number;
  private maxHp: number;
  private barY: number;

  constructor(scene: THREE.Scene, private type: MobType, x: number, z: number, rot: number) {
    this.x = this.lastX = x; this.z = this.lastZ = z; this.rot = rot;
    this.legs = type === "rabbit" ? rabbitBody(this.tilt, this.mat) : type === "deer" ? deerBody(this.tilt, this.mat) : boarBody(this.tilt, this.mat);
    this.hopHeight = type === "rabbit" ? 0.3 : type === "deer" ? 0.1 : 0.04;
    this.maxHp = MOB_STATS[type].hp;
    this.barY = type === "rabbit" ? 1.3 : type === "deer" ? 2.8 : 1.6;
    this.root.add(this.tilt);

    const bg = new THREE.Mesh(HP_GEO, HP_BG);
    this.hpFill.position.z = 0.01;
    bg.renderOrder = 10; this.hpFill.renderOrder = 11;
    this.hpBar.add(bg, this.hpFill);
    this.hpBar.position.y = this.barY;
    this.hpBar.visible = false;
    this.root.add(this.hpBar);
    if (type === "rabbit") this.tilt.scale.setScalar(1.25);
    scene.add(this.root);
  }

  hurt() { this.flash = 0.16; }

  update(m: { x: number; z: number; rotY: number; hp: number; state: string; alive: boolean }, dt: number, camQ: THREE.Quaternion) {
    if (!m.alive) {
      if (this.deadFor === 99) this.root.visible = false;
      this.deadFor += dt;
      const t = Math.min(1, this.deadFor / 0.35);
      this.tilt.rotation.z = t * Math.PI / 2;
      this.tilt.position.y = -Math.max(0, this.deadFor - 1) * 0.9;
      this.hpBar.visible = false;
      if (this.deadFor > 2) this.root.visible = false;
      return;
    }
    if (this.deadFor !== 0) { // 되살아남
      this.deadFor = 0; this.tilt.rotation.z = 0; this.tilt.position.y = 0;
      this.root.visible = true;
      this.x = m.x; this.z = m.z;
    }

    this.x = damp(this.x, m.x, 14, dt);
    this.z = damp(this.z, m.z, 14, dt);
    this.rot = dampAngle(this.rot, m.rotY, 12, dt);
    const speed = Math.hypot(this.x - this.lastX, this.z - this.lastZ) / Math.max(dt, 1e-3);
    this.lastX = this.x; this.lastZ = this.z;

    this.phase += dt * (4 + speed * 3.4);
    const swing = Math.min(1, speed / 3) * 0.75;
    const s = Math.sin(this.phase) * swing;
    if (this.type === "rabbit") {
      this.legs.forEach((l, i) => { l.rotation.x = (i < 2 ? 1 : -1) * Math.abs(s); });
    } else {
      this.legs[0].rotation.x = s; this.legs[3].rotation.x = s;
      this.legs[1].rotation.x = -s; this.legs[2].rotation.x = -s;
    }
    const hop = Math.abs(Math.sin(this.phase)) * this.hopHeight * Math.min(1, speed / 2);
    this.root.position.set(this.x, groundY(this.x, this.z) + hop, this.z);
    this.root.rotation.y = this.rot;

    // 멧돼지 공격 예고: 뒤로 젖혔다가 달려든다
    const lean = m.state === "windup" ? -0.32 : m.state === "recover" ? 0.14 : 0;
    this.tilt.rotation.x = damp(this.tilt.rotation.x, lean, 16, dt);

    this.flash = Math.max(0, this.flash - dt);
    const warn = m.state === "windup" ? 1.7 : 1;
    const g = this.flash > 0 ? 3 : 1;
    this.mat.color.setRGB(g * warn, g, g);

    this.hpBar.visible = m.hp < this.maxHp;
    this.hpBar.quaternion.copy(camQ).premultiply(this.root.quaternion.clone().invert());
    const ratio = Math.max(0, m.hp / this.maxHp);
    this.hpFill.scale.x = ratio;
    this.hpFill.position.x = -(1 - ratio) / 2;
  }

  dispose(scene: THREE.Scene) { scene.remove(this.root); }
}

// ---- 플레이어 ----
const CAPES = [0xc8553d, 0x3f8fa3];

export class PlayerView {
  root = new THREE.Group();
  private body = new THREE.Group();
  private legs: Limb[];
  private spearArm: Limb;
  private boat: THREE.Mesh;
  private phase = 0;
  private swing = 0;
  private x: number; private z: number; private rot: number;
  private lastX: number; private lastZ: number;
  private seq = 0;
  private mat = lit();
  light = new THREE.PointLight(0xffa64d, 34, 13, 1.5);

  constructor(scene: THREE.Scene, colorIdx: number, x: number, z: number) {
    this.x = this.lastX = x; this.z = this.lastZ = z; this.rot = 0;
    const cape = CAPES[colorIdx] ?? CAPES[0], skin = 0xe8c49c, cloth = 0x4d4252, hair = 0x3a2a20;
    solid(this.body, this.mat, merge([
      { g: cyl(0.22, 0.34, 0.72, 8), c: cape, p: [0, 0.86, 0] },
      { g: box(0.56, 0.1, 0.34), c: 0x3a2a20, p: [0, 0.68, 0] },
      { g: cyl(0.26, 0.42, 0.78, 8), c: cape, p: [0, 0.86, -0.08], s: [1, 1, 0.75] },
      { g: ball(0.31), c: skin, p: [0, 1.48, 0] },
      { g: ball(0.33), c: hair, p: [0, 1.56, -0.06], s: [1, 0.85, 0.95] },
      { g: cone(0.36, 0.34, 8), c: cape, p: [0, 1.82, -0.04] },
      { g: ball(0.035, 0), c: 0x1c1410, p: [-0.11, 1.48, 0.29] },
      { g: ball(0.035, 0), c: 0x1c1410, p: [0.11, 1.48, 0.29] },
    ]));
    const leg = legGeo(0.15, 0.5, cloth, 0x2a2018);
    this.legs = [limb(this.body, this.mat, leg, -0.14, 0.52, 0), limb(this.body, this.mat, leg, 0.14, 0.52, 0)];

    this.spearArm = limb(this.body, this.mat, merge([
      { g: box(0.12, 0.46, 0.12), c: cape, p: [0, -0.2, 0] },
      { g: cyl(0.025, 0.03, 1.7, 5), c: 0x7d5a3d, p: [0, -0.42, 0.3], r: [Math.PI / 2 - 0.2, 0, 0] },
      { g: cone(0.07, 0.28, 5), c: 0xc9ced8, p: [0, -0.26, 1.22], r: [Math.PI / 2 - 0.2, 0, 0] },
    ]), 0.34, 1.12, 0);

    // 왼손의 휴대 호박등
    const arm = limb(this.body, this.mat, box(0.12, 0.46, 0.12), -0.34, 0.92, 0.05);
    arm.rotation.x = -0.5;
    const glow = new THREE.Mesh(merge([
      { g: ball(0.14), c: 0xffa53f, p: [-0.36, 0.62, 0.34], s: [1.1, 0.9, 1.1] },
      { g: ball(0.08), c: 0xffe19a, p: [-0.36, 0.62, 0.34] },
    ]), glowMat);
    this.body.add(glow);
    this.light.position.set(-0.3, 1.5, 0.3);
    this.body.add(this.light);

    this.boat = new THREE.Mesh(boatGeo(), lit());
    this.boat.visible = false;
    this.boat.position.y = -0.1;
    this.root.add(this.boat, this.body);
    scene.add(this.root);
  }

  /** x,z 는 자기 캐릭터면 예측 위치, 상대면 서버 위치 */
  update(x: number, z: number, rotY: number, sailing: boolean, attackSeq: number, gathering: boolean, dt: number, smooth: boolean) {
    this.x = smooth ? damp(this.x, x, 13, dt) : x;
    this.z = smooth ? damp(this.z, z, 13, dt) : z;
    this.rot = dampAngle(this.rot, rotY, 16, dt);
    const speed = Math.hypot(this.x - this.lastX, this.z - this.lastZ) / Math.max(dt, 1e-3);
    this.lastX = this.x; this.lastZ = this.z;

    if (attackSeq !== this.seq) { this.seq = attackSeq; this.swing = 1; }
    this.swing = Math.max(0, this.swing - dt * 4.2);

    this.boat.visible = sailing;
    const y = sailing ? -0.1 : groundY(this.x, this.z);
    this.root.position.set(this.x, y, this.z);
    this.root.rotation.y = this.rot;
    this.body.position.y = sailing ? 0.35 : 0;

    const moving = !sailing && speed > 0.6;
    this.phase += dt * (moving ? 11 : 0);
    const s = moving ? Math.sin(this.phase) * 0.8 : 0;
    this.legs[0].rotation.x = s;
    this.legs[1].rotation.x = -s;
    this.body.position.y += moving ? Math.abs(Math.sin(this.phase)) * 0.05 : 0;
    const chop = gathering ? Math.sin(performance.now() / 110) * 0.6 : 0;
    this.spearArm.rotation.x = -Math.sin(this.swing * Math.PI) * 1.2 - 0.25 * s + chop;
  }

  dispose(scene: THREE.Scene) { scene.remove(this.root); }
  get pos() { return { x: this.x, z: this.z }; }
}

// ---- 땅에 떨어진 전리품 ----
const ITEM_COLOR: Record<ItemId, number> = { wood: 0xa87c4c, stone: 0x9ca1a8, fiber: 0xa6c45a, meat: 0xd8604f, hide: 0xa9713f, tusk: 0xf0e6d0 };

export class DropView {
  root = new THREE.Group();
  private spin = Math.random() * 6;
  constructor(scene: THREE.Scene, itemId: ItemId, private x: number, private z: number) {
    const m = new THREE.Mesh(merge([
      { g: ball(0.2, 0), c: ITEM_COLOR[itemId], p: [0, 0, 0] },
      { g: box(0.08, 0.2, 0.08), c: 0xfff0c8, p: [0, 0.2, 0] },
    ]), glowMat);
    this.root.add(m);
    this.root.position.set(x, 0, z);
    scene.add(this.root);
  }
  update(dt: number) {
    this.spin += dt * 2.4;
    this.root.position.y = groundY(this.x, this.z) + 0.42 + Math.sin(this.spin) * 0.08;
    this.root.rotation.y = this.spin;
  }
  dispose(scene: THREE.Scene) { scene.remove(this.root); }
}
