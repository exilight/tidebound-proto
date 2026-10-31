import { LANTERN_POST_RADIUS, VILLAGE_LIGHT_RADIUS } from "./constants.ts";

export interface Land { id: "village" | "island"; name: string; x: number; z: number; r: number; phase: number }
export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }

export const VILLAGE: Land = { id: "village", name: "등대고개 마을", x: -72, z: 0, r: 15, phase: 2.1 };
export const ISLAND: Land = { id: "island", name: "안개섬", x: 0, z: 0, r: 34, phase: 0.7 };
export const LANDS = [VILLAGE, ISLAND];

export const PIER_HEIGHT = 0.5;
export const PIERS: Rect[] = [
  { minX: -60, maxX: -54, minZ: -1.3, maxZ: 1.3 },
  { minX: -38, maxX: -28.5, minZ: -1.3, maxZ: 1.3 },
];
// 배가 서는 곳과 내려서 서는 곳
export const DOCKS = {
  village: { boatX: -53, boatZ: 0, landX: -55.5, landZ: 0, mouthX: -59.5, dest: "island" as const },
  island: { boatX: -39, boatZ: 0, landX: -36.5, landZ: 0, mouthX: -29, dest: "village" as const },
};
export type DockId = keyof typeof DOCKS;

export const STORAGE = { x: -67, z: -7 };
export const SPAWN = { x: -66, z: 3 };
export const LIGHTHOUSE = { x: -78, z: -4 };
export const CAMPFIRE = { x: -70, z: 3 };
export const HOUSES = [
  { x: -74, z: 9, rot: 0.3, scale: 1 },
  { x: -64, z: 9.5, rot: -0.4, scale: 0.9 },
  { x: -80, z: 3, rot: 1.2, scale: 0.85 },
];
// 섬의 고정 호박등. 부두 앞 + 내륙 쉼터 2곳
export const LANTERN_POSTS = [
  { x: -28.5, z: 2.2 },
  { x: 6, z: -17 },
  { x: 5, z: 18 },
];

export const landRadius = (l: Land, theta: number) =>
  l.r * (1 + 0.07 * Math.sin(3 * theta + l.phase) + 0.04 * Math.sin(5 * theta + l.phase * 2.3) + 0.02 * Math.sin(9 * theta));

/** 0 = 해안선, 1 = 중심. 음수면 바다 */
export function landFactor(l: Land, x: number, z: number) {
  const dx = x - l.x, dz = z - l.z;
  return 1 - Math.hypot(dx, dz) / landRadius(l, Math.atan2(dz, dx));
}

export const inRect = (r: Rect, x: number, z: number) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
export const onPier = (x: number, z: number) => PIERS.some((r) => inRect(r, x, z));
export const isLand = (x: number, z: number) => LANDS.some((l) => landFactor(l, x, z) > 0.015);
export const isWalkable = (x: number, z: number) => isLand(x, z) || onPier(x, z);

const smooth = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

/** 렌더링용 지형 높이. 판정은 평면 기준이라 서버는 쓰지 않는다. */
export function heightAt(x: number, z: number) {
  let f = -1;
  for (const l of LANDS) f = Math.max(f, landFactor(l, x, z));
  if (f <= 0) return -0.7 * smooth(-f * 6);
  const bumps = Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17) * 0.5 + Math.sin(x * 0.53 - z * 0.41) * 0.18;
  return smooth(f * 7) * 0.55 + smooth(f * 3) * (0.35 + bumps);
}
export const groundY = (x: number, z: number) => (onPier(x, z) ? Math.max(PIER_HEIGHT, heightAt(x, z)) : heightAt(x, z));

/** 온기가 차오르는 고정 불빛 안인가 (마을 + 호박등) */
export function inSafeLight(x: number, z: number) {
  if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.r + 5) return true;
  return LANTERN_POSTS.some((p) => Math.hypot(x - p.x, z - p.z) < LANTERN_POST_RADIUS);
}
export const VILLAGE_LIGHT = { x: VILLAGE.x, z: VILLAGE.z, radius: VILLAGE_LIGHT_RADIUS };
