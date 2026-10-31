import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// 기본 도형 조합 모델링 도구. 도형마다 색을 정점에 구워서 하나의 지오메트리로 합친다.
export type V3 = [number, number, number];
export interface Part { g: THREE.BufferGeometry; c: number; p?: V3; r?: V3; s?: V3 | number }

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const cyl = (top: number, bottom: number, h: number, seg = 7) => new THREE.CylinderGeometry(top, bottom, h, seg);
export const cone = (r: number, h: number, seg = 7) => new THREE.ConeGeometry(r, h, seg);
export const ball = (r: number, detail = 1) => new THREE.IcosahedronGeometry(r, detail);

export function merge(parts: Part[]) {
  const color = new THREE.Color();
  const geos = parts.map(({ g, c, p, r, s }) => {
    const geo = g.index ? g.toNonIndexed() : g.clone();
    geo.deleteAttribute("uv");
    const scale = s === undefined ? [1, 1, 1] : typeof s === "number" ? [s, s, s] : s;
    geo.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(...(p ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r ?? [0, 0, 0]))),
      new THREE.Vector3(...(scale as V3)),
    ));
    const count = geo.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    color.set(c);
    for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  });
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return merged;
}
