import { box, ball, cone, cyl, merge, type Part } from "./parts.ts";

// 식생
const TRUNK = 0x6b4a2f, BARK = 0x54392a;

export const pineGeo = () => merge([
  { g: cyl(0.16, 0.26, 1.3), c: BARK, p: [0, 0.65, 0] },
  { g: cone(1.25, 1.7), c: 0x2f6b4a, p: [0, 1.75, 0] },
  { g: cone(1.0, 1.5), c: 0x377a52, p: [0, 2.6, 0], r: [0, 0.5, 0] },
  { g: cone(0.72, 1.3), c: 0x41895a, p: [0, 3.4, 0], r: [0, 1, 0] },
]);

export const broadTreeGeo = () => merge([
  { g: cyl(0.17, 0.3, 1.5), c: TRUNK, p: [0, 0.75, 0] },
  { g: cyl(0.06, 0.1, 0.8), c: TRUNK, p: [0.3, 1.5, 0.1], r: [0, 0, -0.7] },
  { g: ball(1.05), c: 0x5b8f3f, p: [0, 2.3, 0], s: [1, 0.85, 1] },
  { g: ball(0.75), c: 0x6ea148, p: [0.62, 2.0, 0.28] },
  { g: ball(0.7), c: 0x4f8238, p: [-0.5, 2.05, -0.35] },
  { g: ball(0.55), c: 0x7cb04f, p: [0.1, 2.95, 0.15] },
]);

export const stumpGeo = () => merge([
  { g: cyl(0.26, 0.32, 0.4), c: TRUNK, p: [0, 0.2, 0] },
  { g: cyl(0.25, 0.25, 0.02), c: 0xc9a877, p: [0, 0.41, 0] },
]);

export const rockGeo = (variant: number) => merge(variant === 0 ? [
  { g: ball(0.8, 0), c: 0x7d8290, p: [0, 0.45, 0], s: [1.1, 0.8, 0.9] },
  { g: ball(0.42, 0), c: 0x93989f, p: [0.6, 0.22, 0.25] },
] : [
  { g: ball(0.65, 0), c: 0x6f7382, p: [-0.2, 0.42, 0], s: [1, 1.05, 0.95] },
  { g: ball(0.55, 0), c: 0x858a95, p: [0.42, 0.3, -0.2], r: [0.6, 0.4, 0] },
  { g: ball(0.28, 0), c: 0x9ca1a8, p: [0.1, 0.16, 0.55] },
]);

export const rubbleGeo = () => merge([
  { g: ball(0.28, 0), c: 0x6f7382, p: [0.1, 0.1, 0] },
  { g: ball(0.2, 0), c: 0x858a95, p: [-0.28, 0.08, 0.16] },
  { g: ball(0.17, 0), c: 0x7d8290, p: [0.2, 0.07, -0.3] },
]);

const blade = (x: number, z: number, h: number, lean: number, c: number): Part =>
  ({ g: cone(0.1, h, 4), c, p: [x, h / 2, z], r: [lean, 0, -lean * 0.6] });

export const fiberGrassGeo = () => merge([
  blade(0, 0, 1.1, 0.05, 0xa6c45a), blade(0.2, 0.1, 0.9, 0.2, 0x8fb04d), blade(-0.18, 0.08, 0.95, -0.2, 0xb4cf68),
  blade(0.05, -0.2, 0.85, -0.25, 0x98b955), blade(-0.1, -0.12, 0.7, 0.25, 0x86a547), blade(0.14, -0.08, 0.75, 0.3, 0xbcd673),
  { g: ball(0.09, 0), c: 0xe6dd86, p: [0, 1.15, 0] },
  { g: ball(0.07, 0), c: 0xe6dd86, p: [-0.27, 0.95, 0.08] },
]);

export const bushGeo = (v: number) => {
  const c = [0x3f7a3f, 0x4c8944, 0x356b45][v % 3];
  return merge([
    { g: ball(0.55), c, p: [0, 0.4, 0], s: [1.1, 0.8, 1] },
    { g: ball(0.4), c: c + 0x0a0d06, p: [0.45, 0.3, 0.15] },
    { g: ball(0.34), c: c - 0x050505, p: [-0.42, 0.26, -0.1] },
    ...(v === 1 ? [0, 1, 2, 3].map((i): Part => ({ g: ball(0.06, 0), c: 0xd8483f, p: [Math.cos(i * 2.1) * 0.5, 0.45 + i * 0.06, Math.sin(i * 2.1) * 0.45] })) : []),
  ]);
};

export const tuftGeo = (v: number) => {
  const c = [0x6d9a44, 0x5e8c40, 0x7aa64b][v % 3];
  return merge([blade(0, 0, 0.5, 0, c), blade(0.1, 0.05, 0.38, 0.35, c), blade(-0.1, 0.04, 0.4, -0.35, c), blade(0.02, -0.1, 0.34, -0.4, c)]);
};

export const fernGeo = (v: number) => {
  const c = [0x3e8050, 0x4b8f55, 0x33704a][v % 3];
  const fronds = [0, 1, 2, 3, 4].map((i): Part => {
    const a = (i / 5) * Math.PI * 2;
    return { g: cone(0.11, 0.8, 4), c, p: [Math.sin(a) * 0.32, 0.26, Math.cos(a) * 0.32], r: [Math.cos(a) * 1, 0, -Math.sin(a) * 1] };
  });
  return merge(fronds);
};

export const flowerGeo = (v: number) => {
  const c = [0xf0d264, 0xe8827a, 0xa997e8][v % 3];
  return merge([
    { g: cyl(0.015, 0.02, 0.32, 4), c: 0x5e8c40, p: [0, 0.16, 0] },
    { g: cyl(0.1, 0.05, 0.04, 6), c, p: [0, 0.33, 0] },
    { g: ball(0.04, 0), c: 0xfff0c8, p: [0, 0.36, 0] },
    { g: cyl(0.015, 0.02, 0.22, 4), c: 0x5e8c40, p: [0.13, 0.11, 0.06] },
    { g: cyl(0.08, 0.04, 0.03, 6), c, p: [0.13, 0.23, 0.06] },
  ]);
};

export const mushroomGeo = (v: number) => {
  const c = [0xc9745a, 0xd9b78a, 0x8e77c4][v % 3];
  return merge([
    { g: cyl(0.05, 0.07, 0.2, 5), c: 0xe8dfca, p: [0, 0.1, 0] },
    { g: cone(0.17, 0.14, 6), c, p: [0, 0.26, 0] },
    { g: cyl(0.03, 0.045, 0.13, 5), c: 0xe8dfca, p: [0.16, 0.06, 0.08] },
    { g: cone(0.1, 0.09, 6), c, p: [0.16, 0.17, 0.08] },
  ]);
};

export const pebbleGeo = (v: number) => merge([
  { g: ball(0.14, 0), c: [0x7f8592, 0x8e8a80, 0x6e7380][v % 3], p: [0, 0.06, 0], s: [1.2, 0.6, 1] },
  { g: ball(0.09, 0), c: 0x8d929c, p: [0.2, 0.04, 0.08], s: [1, 0.6, 1] },
]);

// 마을 구조물
export const houseGeo = () => merge([
  { g: box(4, 2.4, 3.4), c: 0xcbb08a, p: [0, 1.2, 0] },
  { g: box(4.12, 0.28, 3.52), c: 0x7d5a3d, p: [0, 0.14, 0] },
  { g: box(0.2, 2.4, 0.2), c: 0x6b4a2f, p: [2, 1.2, 1.7] },
  { g: box(0.2, 2.4, 0.2), c: 0x6b4a2f, p: [-2, 1.2, 1.7] },
  { g: cone(3.3, 1.8, 4), c: 0xa2573c, p: [0, 3.3, 0], r: [0, Math.PI / 4, 0], s: [1.03, 1, 0.87] },
  { g: box(0.9, 1.5, 0.1), c: 0x5a3c26, p: [0.6, 0.85, 1.72] },
  { g: box(0.42, 0.9, 0.42), c: 0x6f6a70, p: [1.1, 3.9, -0.5] },
]);

export const houseGlowGeo = () => merge([
  { g: box(0.75, 0.65, 0.08), c: 0xffc06a, p: [-1, 1.5, 1.72] },
]);

export const lighthouseGeo = () => merge([
  { g: cyl(1.9, 2.3, 0.6, 9), c: 0x7d8290, p: [0, 0.3, 0] },
  { g: cyl(1.5, 1.8, 2.4, 9), c: 0xe6dcc6, p: [0, 1.8, 0] },
  { g: cyl(1.25, 1.5, 2.2, 9), c: 0xb84d3c, p: [0, 4.1, 0] },
  { g: cyl(1.02, 1.25, 2.2, 9), c: 0xe6dcc6, p: [0, 6.3, 0] },
  { g: cyl(1.5, 1.3, 0.25, 9), c: 0x4a4e5c, p: [0, 7.5, 0] },
  { g: cone(1.15, 0.9, 9), c: 0xb84d3c, p: [0, 9.4, 0] },
  ...[0, 1, 2, 3, 4, 5].map((i): Part => ({ g: box(0.09, 1.2, 0.09), c: 0x4a4e5c, p: [Math.cos(i * 1.05) * 0.85, 8.2, Math.sin(i * 1.05) * 0.85] })),
]);

export const lighthouseGlowGeo = () => merge([{ g: ball(0.65), c: 0xffd27a, p: [0, 8.2, 0] }]);

export const storageGeo = () => merge([
  { g: box(4.2, 0.25, 3.2), c: 0x6b4a2f, p: [0, 0.13, 0] },
  ...([[-1.9, -1.4], [1.9, -1.4], [-1.9, 1.4], [1.9, 1.4]] as const).map(([x, z]): Part =>
    ({ g: box(0.24, 2.5, 0.24), c: 0x5a3c26, p: [x, 1.35, z] })),
  { g: box(4.8, 0.2, 3.8), c: 0x8d4f35, p: [0, 2.7, 0], r: [0.13, 0, 0] },
  { g: box(4.2, 2.2, 0.14), c: 0x7d5a3d, p: [0, 1.3, -1.45] },
  { g: box(1, 0.9, 1), c: 0xa87c4c, p: [-1, 0.72, -0.4] },
  { g: box(0.8, 0.8, 0.8), c: 0x96703f, p: [0.1, 0.67, -0.6], r: [0, 0.3, 0] },
  { g: box(0.65, 0.65, 0.65), c: 0xb88a56, p: [-0.95, 1.5, -0.45], r: [0, 0.5, 0] },
  { g: cyl(0.4, 0.4, 0.95, 8), c: 0x7d5a3d, p: [1.2, 0.72, -0.6] },
  { g: cyl(0.43, 0.43, 0.08, 8), c: 0x4a4e5c, p: [1.2, 0.85, -0.6] },
  { g: box(1.5, 0.55, 0.08), c: 0xd0b285, p: [0, 2.3, 1.75] },
]);

export const campfireGeo = () => merge([
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): Part => ({ g: ball(0.17, 0), c: 0x7d8290, p: [Math.cos(i * 0.785) * 0.65, 0.1, Math.sin(i * 0.785) * 0.65] })),
  { g: cyl(0.08, 0.1, 1.1, 5), c: 0x5a3c26, p: [0, 0.18, 0], r: [1.4, 0, 0.5] },
  { g: cyl(0.08, 0.1, 1.1, 5), c: 0x54392a, p: [0, 0.2, 0], r: [1.4, 0, -0.9] },
]);

export const flameGeo = () => merge([
  { g: cone(0.3, 0.9, 6), c: 0xff8a2e, p: [0, 0.45, 0] },
  { g: cone(0.17, 0.6, 6), c: 0xffd36b, p: [0.03, 0.33, 0.02] },
]);

export const lanternPostGeo = () => merge([
  { g: cyl(0.3, 0.4, 0.3, 6), c: 0x5f6371, p: [0, 0.15, 0] },
  { g: cyl(0.07, 0.1, 2.3, 6), c: 0x4f3524, p: [0, 1.4, 0] },
  { g: box(0.9, 0.08, 0.08), c: 0x4f3524, p: [0.35, 2.5, 0] },
  { g: cone(0.3, 0.2, 7), c: 0x3a2a20, p: [0.7, 2.28, 0] },
]);

/** 호박등: 골이 진 호박 모양 등불 */
export const lanternGlowGeo = () => merge([
  { g: ball(0.27), c: 0xffa53f, p: [0.7, 1.95, 0], s: [1.1, 0.9, 1.1] },
  { g: ball(0.15), c: 0xffe19a, p: [0.7, 1.95, 0] },
]);

export const fenceGeo = () => merge([
  { g: box(0.13, 0.9, 0.13), c: 0x6b4a2f, p: [-1.1, 0.45, 0] },
  { g: box(0.13, 0.9, 0.13), c: 0x6b4a2f, p: [1.1, 0.45, 0] },
  { g: box(2.5, 0.09, 0.05), c: 0x7d5a3d, p: [0, 0.65, 0] },
  { g: box(2.5, 0.09, 0.05), c: 0x7d5a3d, p: [0, 0.35, 0] },
]);

export const boatGeo = () => merge([
  { g: box(1.2, 0.35, 2.8), c: 0x7d5a3d, p: [0, 0.18, 0] },
  { g: cone(0.85, 1.2, 4), c: 0x6b4a2f, p: [0, 0.18, 1.95], r: [Math.PI / 2, Math.PI / 4, 0], s: [1, 1, 0.3] },
  { g: box(1.32, 0.1, 2.9), c: 0x5a3c26, p: [0, 0.38, 0] },
  { g: box(1.0, 0.07, 0.3), c: 0xa87c4c, p: [0, 0.4, -0.7] },
  { g: cyl(0.04, 0.05, 1.7, 5), c: 0x4f3524, p: [0, 1.1, 0.5] },
  { g: box(0.05, 1.05, 0.9), c: 0xe6dcc6, p: [0.08, 1.35, 0.15] },
]);

export const pierGeo = (length: number) => {
  const parts: Part[] = [];
  for (let i = 0; i < Math.round(length / 0.55); i++)
    parts.push({ g: box(0.5, 0.1, 2.7), c: i % 2 ? 0x8a6545 : 0x7d5a3d, p: [-length / 2 + 0.3 + i * 0.55, 0.45, 0] });
  for (const x of [-length / 2 + 0.3, 0, length / 2 - 0.3])
    for (const z of [-1.25, 1.25]) parts.push({ g: cyl(0.1, 0.12, 1.5, 6), c: 0x54392a, p: [x, -0.1, z] });
  return merge(parts);
};
