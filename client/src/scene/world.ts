import * as THREE from "three";
import {
  CAMPFIRE, DOCKS, HOUSES, ISLAND, LANDS, LANTERN_POSTS, LIGHTHOUSE, PIERS, STORAGE, VILLAGE, WORLD,
  groundY, heightAt, landFactor, rng, type Land, type Deco,
} from "@tidebound/shared";
import { glowMat, litMat, patchFog } from "./fog.ts";
import * as M from "./models.ts";

const dummy = new THREE.Object3D();

function landMesh(l: Land) {
  const size = l.r * 2.6, seg = Math.round(size / (l === ISLAND ? 1.05 : 0.8));
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  geo.translate(l.x, 0, l.z);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const rand = rng(l.r * 13);
  const sand = new THREE.Color(0xc8b288), wet = new THREE.Color(0x8f8468), dirt = new THREE.Color(0x94795a);
  const grassA = new THREE.Color(0x5f8f47), grassB = new THREE.Color(0x4c7d45), grassC = new THREE.Color(0x76a252);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), f = landFactor(l, x, z);
    pos.setY(i, heightAt(x, z));
    const patch = 0.5 + 0.5 * Math.sin(x * 0.33 + Math.sin(z * 0.27) * 1.6) * Math.cos(z * 0.21 - x * 0.08);
    c.copy(grassB).lerp(patch > 0.5 ? grassC : grassA, Math.abs(patch - 0.5) * 2);
    c.offsetHSL(0, 0, (rand() - 0.5) * 0.03);
    if (f < 0.1) c.lerp(sand, Math.min(1, (0.1 - f) / 0.05));
    if (f < 0.03) c.copy(wet);
    if (l === VILLAGE && Math.hypot(x - CAMPFIRE.x, z - CAMPFIRE.z) < 5 + Math.sin(x * 2) * 0.4) c.lerp(dirt, 0.8);
    if (l === VILLAGE && Math.abs(z - x * 0.02 - 0.5) < 1.5 && x > CAMPFIRE.x) c.lerp(dirt, 0.75); // 부두로 가는 길
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, litMat);
  mesh.receiveShadow = true;
  return mesh;
}

function place(scene: THREE.Scene, geo: THREE.BufferGeometry, x: number, z: number, rot = 0, scale = 1, mat: THREE.Material = litMat, y = groundY(x, z)) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = rot;
  m.scale.setScalar(scale);
  m.castShadow = mat === litMat;
  m.receiveShadow = mat === litMat;
  scene.add(m);
  return m;
}

function instanced(scene: THREE.Scene, geo: THREE.BufferGeometry, list: { x: number; z: number; rot: number; scale: number }[], shadow: boolean) {
  const mesh = new THREE.InstancedMesh(geo, litMat, list.length);
  list.forEach((d, i) => {
    dummy.position.set(d.x, heightAt(d.x, d.z), d.z);
    dummy.rotation.set(0, d.rot, 0);
    dummy.scale.setScalar(d.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

/** 살아있으면 본 모델, 채집되면 그루터기/돌무더기로 바꾼다 */
export class ResourceLayer {
  private slots = new Map<string, { live: THREE.InstancedMesh; dead: THREE.InstancedMesh | null; index: number; matrix: THREE.Matrix4 }>();
  private alive = new Map<string, boolean>();
  private static ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(scene: THREE.Scene) {
    const groups = new Map<string, typeof WORLD.resources>();
    for (const r of WORLD.resources) {
      const key = r.type === "grass" ? "grass" : `${r.type}${r.variant}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const stump = M.stumpGeo(), rubble = M.rubbleGeo();
    for (const [key, list] of groups) {
      const type = list[0].type;
      const geo = key === "tree0" ? M.pineGeo() : key === "tree1" ? M.broadTreeGeo() : type === "rock" ? M.rockGeo(list[0].variant) : M.fiberGrassGeo();
      const live = instanced(scene, geo, list, true);
      const dead = type === "grass" ? null : instanced(scene, type === "tree" ? stump : rubble, list, false);
      list.forEach((r, index) => {
        const matrix = new THREE.Matrix4();
        live.getMatrixAt(index, matrix);
        dead?.setMatrixAt(index, ResourceLayer.ZERO);
        this.slots.set(r.id, { live, dead, index, matrix });
        this.alive.set(r.id, true);
      });
    }
  }

  setAlive(id: string, alive: boolean) {
    if (this.alive.get(id) === alive) return;
    this.alive.set(id, alive);
    const s = this.slots.get(id)!;
    s.live.setMatrixAt(s.index, alive ? s.matrix : ResourceLayer.ZERO);
    s.live.instanceMatrix.needsUpdate = true;
    if (s.dead) {
      s.dead.setMatrixAt(s.index, alive ? ResourceLayer.ZERO : s.matrix);
      s.dead.instanceMatrix.needsUpdate = true;
    }
  }
}

function buildDecos(scene: THREE.Scene) {
  const makers: Record<Deco["type"], (v: number) => THREE.BufferGeometry> = {
    bush: M.bushGeo, tuft: M.tuftGeo, fern: M.fernGeo, flower: M.flowerGeo, mushroom: M.mushroomGeo, pebble: M.pebbleGeo,
  };
  const groups = new Map<string, Deco[]>();
  for (const d of WORLD.decos) {
    const key = `${d.type}:${d.variant}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  for (const list of groups.values()) {
    const { type, variant } = list[0];
    instanced(scene, makers[type](variant), list, type === "bush");
  }
}

function buildVillage(scene: THREE.Scene) {
  const house = M.houseGeo(), houseGlow = M.houseGlowGeo();
  for (const h of HOUSES) {
    place(scene, house, h.x, h.z, h.rot, h.scale);
    place(scene, houseGlow, h.x, h.z, h.rot, h.scale, glowMat);
  }
  place(scene, M.lighthouseGeo(), LIGHTHOUSE.x, LIGHTHOUSE.z, 0, 1);
  place(scene, M.lighthouseGlowGeo(), LIGHTHOUSE.x, LIGHTHOUSE.z, 0, 1, glowMat);
  place(scene, M.storageGeo(), STORAGE.x, STORAGE.z, 0.5);
  place(scene, M.campfireGeo(), CAMPFIRE.x, CAMPFIRE.z);

  const fence = M.fenceGeo();
  for (let i = 0; i < 26; i++) {
    const a = 0.5 + (i / 26) * (Math.PI * 2 - 1);
    const x = VILLAGE.x + Math.cos(a) * 12.3, z = VILLAGE.z + Math.sin(a) * 12.3;
    if (landFactor(VILLAGE, x, z) > 0.06) place(scene, fence, x, z, -a + Math.PI / 2 + Math.PI / 2);
  }
  const pine = M.pineGeo(), broad = M.broadTreeGeo();
  ([[-84, -7, 0], [-82, 7, 1], [-72, -11, 1], [-61, -10, 0], [-68, 13, 0], [-77, 12, 1]] as const).forEach(([x, z, kind], i) => {
    if (landFactor(VILLAGE, x, z) > 0.03) place(scene, kind ? broad : pine, x, z, i * 1.7, 0.95 + (i % 3) * 0.12);
  });
}

function buildPiers(scene: THREE.Scene) {
  for (const r of PIERS) {
    const length = r.maxX - r.minX;
    const pier = new THREE.Mesh(M.pierGeo(length), litMat);
    pier.position.set((r.minX + r.maxX) / 2, 0, 0);
    pier.castShadow = pier.receiveShadow = true;
    scene.add(pier);
  }
  const boat = M.boatGeo();
  place(scene, boat, DOCKS.village.boatX, DOCKS.village.boatZ, Math.PI / 2, 1, litMat, -0.1);
  place(scene, boat, DOCKS.island.boatX, DOCKS.island.boatZ, -Math.PI / 2, 1, litMat, -0.1);
}

export function buildWorld(scene: THREE.Scene) {
  for (const l of LANDS) scene.add(landMesh(l));

  const waterGeo = new THREE.PlaneGeometry(320, 240);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, patchFog(new THREE.MeshLambertMaterial({ color: 0x2c6a80 }), true));
  water.position.set(-30, -0.2, 0);
  water.receiveShadow = true;
  scene.add(water);

  buildVillage(scene);
  buildPiers(scene);
  const post = M.lanternPostGeo(), glow = M.lanternGlowGeo();
  for (const p of LANTERN_POSTS) {
    place(scene, post, p.x, p.z);
    place(scene, glow, p.x, p.z, 0, 1, glowMat);
  }
  buildDecos(scene);

  // 호박등과 모닥불은 불꽃만 움직인다
  const flame = place(scene, M.flameGeo(), CAMPFIRE.x, CAMPFIRE.z, 0, 1, glowMat, groundY(CAMPFIRE.x, CAMPFIRE.z) + 0.1);
  const fireLight = new THREE.PointLight(0xffa64d, 40, 16, 1.6);
  fireLight.position.set(CAMPFIRE.x, groundY(CAMPFIRE.x, CAMPFIRE.z) + 1.3, CAMPFIRE.z);
  scene.add(fireLight);

  const resources = new ResourceLayer(scene);
  return {
    resources,
    animate(t: number) {
      flame.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 17) * 0.16, 1 + Math.cos(t * 11) * 0.08);
      fireLight.intensity = 40 + Math.sin(t * 15) * 6;
    },
  };
}

