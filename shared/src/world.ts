import { RESOURCE_COUNT, PLAYER_RADIUS, type ResourceType } from "./constants.ts";
import {
  CAMPFIRE, DOCKS, HOUSES, ISLAND, LANTERN_POSTS, LIGHTHOUSE, STORAGE, VILLAGE, isWalkable, landFactor,
} from "./terrain.ts";

export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ResourceSpawn { id: string; type: ResourceType; x: number; z: number; rot: number; scale: number; variant: number }
export type DecoType = "bush" | "flower" | "tuft" | "pebble" | "mushroom" | "fern";
export interface Deco { type: DecoType; x: number; z: number; rot: number; scale: number; variant: number }
export interface Obstacle { x: number; z: number; r: number }

export const WORLD_SEED = 20261030;
const OBSTACLE_RADIUS: Record<ResourceType, number> = { tree: 0.5, rock: 0.8, grass: 0 };

function generateWorld() {
  const rand = rng(WORLD_SEED);
  const resources: ResourceSpawn[] = [];
  const decos: Deco[] = [];
  const obstacles: Obstacle[] = [
    { x: STORAGE.x, z: STORAGE.z, r: 2 },
    { x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, r: 2.2 },
    { x: CAMPFIRE.x, z: CAMPFIRE.z, r: 0.8 },
    ...HOUSES.map((h) => ({ x: h.x, z: h.z, r: 2.6 * h.scale })),
    ...LANTERN_POSTS.map((p) => ({ x: p.x, z: p.z, r: 0.35 })),
  ];

  const clearOf = (x: number, z: number, gap: number) =>
    !LANTERN_POSTS.some((p) => Math.hypot(x - p.x, z - p.z) < 4) &&
    Math.hypot(x - DOCKS.island.landX, z - DOCKS.island.landZ) > 7 &&
    !resources.some((r) => Math.hypot(x - r.x, z - r.z) < gap);

  const islandPoint = (margin: number) => {
    for (let i = 0; i < 200; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * ISLAND.r * 1.15;
      const x = ISLAND.x + Math.cos(a) * d, z = ISLAND.z + Math.sin(a) * d;
      if (landFactor(ISLAND, x, z) > margin) return { x, z };
    }
    return { x: 0, z: 0 };
  };

  // 숲 군락을 몇 개 잡고 나무를 그 주변에 모은다
  const groves = Array.from({ length: 6 }, () => islandPoint(0.2));
  const place = (type: ResourceType, id: number) => {
    for (let i = 0; i < 80; i++) {
      let p = islandPoint(0.06);
      if (type === "tree" && i < 60) {
        const g = groves[id % groves.length], a = rand() * Math.PI * 2, d = rand() * 9;
        p = { x: g.x + Math.cos(a) * d, z: g.z + Math.sin(a) * d };
        if (landFactor(ISLAND, p.x, p.z) < 0.06) continue;
      }
      if (!clearOf(p.x, p.z, type === "grass" ? 1.6 : 2.4)) continue;
      resources.push({ id: `${type}${id}`, type, ...p, rot: rand() * Math.PI * 2, scale: 0.85 + rand() * 0.45, variant: Math.floor(rand() * 2) });
      if (OBSTACLE_RADIUS[type] > 0) obstacles.push({ ...p, r: OBSTACLE_RADIUS[type] });
      return;
    }
  };
  for (const type of ["tree", "rock", "grass"] as ResourceType[])
    for (let i = 0; i < RESOURCE_COUNT[type]; i++) place(type, i);

  // 장식 식생 (판정 없음)
  const deco = (type: DecoType, count: number, spot: () => { x: number; z: number }) => {
    for (let i = 0; i < count; i++) {
      const p = spot();
      decos.push({ type, ...p, rot: rand() * Math.PI * 2, scale: 0.7 + rand() * 0.7, variant: Math.floor(rand() * 3) });
    }
  };
  const villagePoint = () => {
    for (let i = 0; i < 100; i++) {
      const a = rand() * Math.PI * 2, d = 6 + rand() * VILLAGE.r;
      const x = VILLAGE.x + Math.cos(a) * d, z = VILLAGE.z + Math.sin(a) * d;
      if (landFactor(VILLAGE, x, z) > 0.08) return { x, z };
    }
    return { x: VILLAGE.x, z: VILLAGE.z + 8 };
  };
  deco("bush", 46, () => islandPoint(0.05));
  deco("fern", 60, () => islandPoint(0.08));
  deco("tuft", 170, () => islandPoint(0.03));
  deco("flower", 70, () => islandPoint(0.05));
  deco("mushroom", 30, () => islandPoint(0.1));
  deco("pebble", 50, () => islandPoint(0.01));
  deco("tuft", 28, villagePoint);
  deco("flower", 18, villagePoint);
  deco("bush", 7, villagePoint);

  return { resources, decos, obstacles };
}

export const WORLD = generateWorld();

// 충돌: 4m 격자로 장애물을 찾는다
const CELL = 4;
const cellKey = (cx: number, cz: number) => cx * 1000 + cz;
const grid = new Map<number, Obstacle[]>();
for (const o of WORLD.obstacles) {
  const cx = Math.floor(o.x / CELL), cz = Math.floor(o.z / CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const k = cellKey(cx + i, cz + j);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(o);
  }
}

export function isFree(x: number, z: number, radius: number) {
  const near = grid.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
  return !near || near.every((o) => Math.hypot(x - o.x, z - o.z) >= o.r + radius);
}

export const canStand = (x: number, z: number, radius = PLAYER_RADIUS) => isWalkable(x, z) && isFree(x, z, radius);

/** 벽을 따라 미끄러지는 이동. 서버와 클라이언트 예측이 같은 함수를 쓴다. */
export function stepMove(x: number, z: number, dx: number, dz: number, radius = PLAYER_RADIUS) {
  for (const turn of SLIDE_TURNS) {
    const c = Math.cos(turn), s = Math.sin(turn);
    const nx = x + dx * c - dz * s, nz = z + dx * s + dz * c;
    if (canStand(nx, nz, radius)) return { x: nx, z: nz };
  }
  return { x, z };
}
// 둥근 장애물에 정면으로 막혀도 옆으로 돌아가도록 방향을 조금씩 꺾어 본다
const SLIDE_TURNS = [0, 0.5, -0.5, 1, -1, 1.45, -1.45, 1.9, -1.9];
