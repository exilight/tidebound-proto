import * as THREE from "three";

// 모든 재질에 "빛 반경 밖은 안개" 를 주입한다. 화면 공간이 아니라 월드 좌표로 계산한다.
export const MAX_LIGHTS = 12;

export const fogUniforms = {
  uLights: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4()) }, // x, z, 반경, 온기색 세기
  uLightCount: { value: 0 },
  uTime: { value: 0 },
  uFogColor: { value: new THREE.Color(0x141c3c) },
  uFogDensity: { value: 0.94 },
  uCutout: { value: new THREE.Vector2() }, // 내 캐릭터 위치
};

const VERT_DECL = "varying vec3 vWorldP;\n";
const VERT_BODY = `
  vec4 fogWp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    fogWp = instanceMatrix * fogWp;
  #endif
  vWorldP = (modelMatrix * fogWp).xyz;
`;

const FRAG_DECL = `
varying vec3 vWorldP;
uniform vec4 uLights[${MAX_LIGHTS}];
uniform int uLightCount;
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec2 uCutout;
float fogWave(vec2 p) {
  return 0.5 + 0.25 * sin(p.x * 0.31 + uTime * 0.23 + sin(p.y * 0.17 - uTime * 0.11) * 2.0)
             + 0.25 * sin(p.y * 0.43 - uTime * 0.19 + sin(p.x * 0.23 + uTime * 0.13) * 2.0);
}
`;

const FRAG_BODY = `
  #ifdef USE_INSTANCING
    // 쿼터뷰에서 캐릭터를 가리는 나무는 망점으로 비쳐 보이게 한다 (카메라 방향 1, 1.2, 1)
    vec2 fogAlong = vWorldP.xz - (vWorldP.y - 0.8) / 1.2;
    if (vWorldP.y > 0.9 && distance(fogAlong, uCutout) < 1.5 &&
        mod(floor(gl_FragCoord.x / 2.0) + floor(gl_FragCoord.y / 2.0), 2.0) < 1.0) discard;
  #endif
  float fogLit = 0.0, fogGlow = 0.0;
  for (int i = 0; i < uLightCount; i++) {
    float d = distance(vWorldP.xz, uLights[i].xy);
    float r = uLights[i].z;
    fogLit = max(fogLit, 1.0 - smoothstep(r * 0.5, r, d));
    fogGlow = max(fogGlow, (1.0 - smoothstep(0.0, r * 0.8, d)) * uLights[i].w);
  }
  float fogN = fogWave(vWorldP.xz);
  gl_FragColor.rgb *= 1.0 + fogGlow * vec3(0.55, 0.28, 0.02);
  float fogAmt = (1.0 - fogLit) * uFogDensity * (0.86 + 0.14 * fogN);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor * (0.75 + 0.6 * fogN), clamp(fogAmt, 0.0, 1.0));
`;

const WATER_BODY = `
  float wa = sin(vWorldP.x * 1.1 + uTime * 0.9) * sin(vWorldP.z * 0.9 - uTime * 0.7);
  float wb = sin((vWorldP.x + vWorldP.z) * 2.3 + uTime * 1.4);
  gl_FragColor.rgb += vec3(0.05, 0.09, 0.11) * smoothstep(0.55, 1.0, wa * 0.7 + wb * 0.3);
`;

export function patchFog<T extends THREE.Material>(mat: T, water = false): T {
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, fogUniforms);
    s.vertexShader = VERT_DECL + s.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>\n${VERT_BODY}`);
    s.fragmentShader = FRAG_DECL + s.fragmentShader.replace(
      "#include <dithering_fragment>",
      `${water ? WATER_BODY : ""}${FRAG_BODY}\n#include <dithering_fragment>`,
    );
  };
  mat.customProgramCacheKey = () => (water ? "fog-water" : "fog");
  return mat;
}

export const lit = (opts: THREE.MeshLambertMaterialParameters = {}) =>
  patchFog(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...opts }));

export const litMat = lit();
export const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
