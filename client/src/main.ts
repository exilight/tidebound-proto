import * as THREE from "three";
import {
  ATTACK_COOLDOWN, ATTACK_RANGE, DOCK_RANGE, DOCKS, EVT, GATHER_RANGE, ISLAND, LANTERN_POSTS, LANTERN_POST_RADIUS, MOB_STATS, MSG,
  PLAYER_LIGHT_RADIUS, PLAYER_SPEED, RESOURCE_INFO, STORAGE, STORAGE_RANGE, VILLAGE, VILLAGE_LIGHT, canStand, landFactor, onPier, stepMove,
  type DockId, type HitEvent, type ItemId, type MobType, type NoticeEvent, type ResourceType, type RespawnEvent,
} from "@tidebound/shared";
import { connect, type PlayerState } from "./net.ts";
import { Input } from "./input.ts";
import { Stage } from "./scene/stage.ts";
import { buildWorld } from "./scene/world.ts";
import { DropView, MobView, PlayerView } from "./scene/entities.ts";
import { fogUniforms } from "./scene/fog.ts";
import { Floaters, Hud } from "./ui/hud.ts";
import { Minimap } from "./ui/minimap.ts";
import { setupMobileMode } from "./ui/mobile.ts";

type Goal =
  | { kind: "ground"; x: number; z: number }
  | { kind: "mob"; id: string }
  | { kind: "resource"; id: string }
  | { kind: "dock"; dock: DockId }
  | { kind: "storage" };
type Action = { kind: "board" | "deposit" | "gather"; label: string; id?: string };

const FIXED_LIGHTS = [
  ...LANTERN_POSTS.map((p) => [p.x, p.z, LANTERN_POST_RADIUS, 0.8] as const),
  [VILLAGE_LIGHT.x, VILLAGE_LIGHT.z, VILLAGE_LIGHT.radius, 0] as const,
];

async function main() {
  const canvas = document.getElementById("view") as HTMLCanvasElement;
  const gameEl = document.getElementById("game")!;
  const hud = new Hud();
  const floaters = new Floaters();
  const minimap = new Minimap(document.getElementById("minimap") as HTMLCanvasElement);
  setupMobileMode();

  const stage = new Stage(canvas, gameEl);
  const world = buildWorld(stage.scene);
  const input = new Input(canvas);

  let room: Awaited<ReturnType<typeof connect>>;
  try {
    room = await connect();
  } catch (e) {
    console.error(e);
    hud.overlay("접속할 수 없습니다. 방이 가득 찼거나(최대 2명) 서버가 꺼져 있습니다.");
    return;
  }
  const state = room.state;
  const myId = room.sessionId;

  const playerViews = new Map<string, PlayerView>();
  const mobViews = new Map<string, MobView>();
  const dropViews = new Map<string, DropView>();
  const local = { x: 0, z: 0, rot: 0, ready: false };
  let goal: Goal | null = null;
  let lastDirX = 0, lastDirZ = 0, lastSend = 0, attackReady = 0, goalStuck = 0;

  room.onMessage(EVT.notice, (m: NoticeEvent) => hud.notice(m.text));
  room.onMessage(EVT.hit, (m: HitEvent) => {
    floaters.add(m.x, m.onPlayer ? 2.2 : 1.8, m.z, String(m.amount), m.onPlayer ? "player" : "mob");
    if (!m.onPlayer) mobViews.forEach((v) => { if (v.root.position.distanceTo(new THREE.Vector3(m.x, v.root.position.y, m.z)) < 1.2) v.hurt(); });
  });
  room.onMessage(EVT.respawn, (m: RespawnEvent) => {
    hud.flashFade();
    goal = null;
    const why = m.reason === "hp" ? "쓰러졌습니다" : "온기가 다했습니다";
    hud.notice(`${why}. 마을에서 깨어났습니다.${m.lost ? ` 재료 ${m.lost}개를 잃었습니다.` : ""}`);
  });
  room.onLeave(() => hud.overlay("서버 연결이 끊겼습니다. 새로고침 해 주세요."));

  const me = () => state.players?.get(myId); // 첫 상태가 도착하기 전에는 비어 있다

  function currentAction(p: PlayerState): Action | null {
    if (p.sailing) return null;
    for (const id of Object.keys(DOCKS) as DockId[]) {
      if (Math.hypot(p.x - DOCKS[id].landX, p.z - DOCKS[id].landZ) <= DOCK_RANGE)
        return { kind: "board", label: id === "village" ? "배 타고 안개섬으로" : "배 타고 마을로" };
    }
    if (Math.hypot(p.x - STORAGE.x, p.z - STORAGE.z) <= STORAGE_RANGE) return { kind: "deposit", label: "창고에 재료 맡기기" };
    if (p.gathering) return null;
    let best: Action | null = null, bestD = GATHER_RANGE;
    state.resources.forEach((r, id) => {
      const d = Math.hypot(p.x - r.x, p.z - r.z);
      if (r.alive && d <= bestD) { bestD = d; best = { kind: "gather", id, label: RESOURCE_INFO[r.type as ResourceType].verb }; }
    });
    return best;
  }

  function doAction(a: Action | null) {
    if (!a) return;
    if (a.kind === "board") room.send(MSG.board);
    else if (a.kind === "deposit") room.send(MSG.deposit);
    else room.send(MSG.gather, { resourceId: a.id });
  }

  function sendAttack(targetId?: string) {
    const now = performance.now();
    if (now < attackReady) return;
    attackReady = now + ATTACK_COOLDOWN * 1000 + 30;
    room.send(MSG.attack, { targetId });
  }

  function pickGoal(x: number, z: number): Goal | null {
    let best: Goal | null = null, bestD = 1.6;
    state.mobs.forEach((m, id) => {
      const d = Math.hypot(m.x - x, m.z - z);
      if (m.alive && d < bestD) { bestD = d; best = { kind: "mob", id }; }
    });
    if (best) return best;
    bestD = 1.4;
    state.resources.forEach((r, id) => {
      const d = Math.hypot(r.x - x, r.z - z);
      if (r.alive && d < bestD) { bestD = d; best = { kind: "resource", id }; }
    });
    if (best) return best;
    for (const id of Object.keys(DOCKS) as DockId[])
      if (Math.hypot(DOCKS[id].boatX - x, DOCKS[id].boatZ - z) < 2) return { kind: "dock", dock: id };
    if (Math.hypot(STORAGE.x - x, STORAGE.z - z) < 2.4) return { kind: "storage" };
    return canStand(x, z) ? { kind: "ground", x, z } : null;
  }

  input.onTap = (cx, cy) => {
    const p = stage.pick(cx, cy);
    if (p) goal = pickGoal(p.x, p.z);
  };
  input.onZoom = () => stage.toggleZoom();
  input.onInteract = () => { const p = me(); if (p) { goal = null; doAction(currentAction(p)); } };

  /** 클릭한 목표로 걸어가고, 도착하면 동작한다. 판정은 서버가 한다. */
  function steerToGoal(): { x: number; z: number } {
    const g = goal;
    if (!g) return { x: 0, z: 0 };
    const walk = (x: number, z: number, stop: number, arrive: () => void) => {
      const dx = x - local.x, dz = z - local.z, d = Math.hypot(dx, dz);
      if (d <= stop) { arrive(); return { x: 0, z: 0 }; }
      return { x: dx / d, z: dz / d };
    };
    switch (g.kind) {
      case "ground": return walk(g.x, g.z, 0.25, () => { goal = null; });
      case "mob": {
        const m = state.mobs.get(g.id);
        if (!m || !m.alive) { goal = null; return { x: 0, z: 0 }; }
        return walk(m.x, m.z, ATTACK_RANGE + MOB_STATS[m.type as MobType].radius - 0.4, () => sendAttack(g.id));
      }
      case "resource": {
        const r = state.resources.get(g.id);
        if (!r || !r.alive) { goal = null; return { x: 0, z: 0 }; }
        return walk(r.x, r.z, GATHER_RANGE - 0.3, () => { room.send(MSG.gather, { resourceId: g.id }); goal = null; });
      }
      case "dock": {
        const d = DOCKS[g.dock];
        // 해안을 따라 비스듬히 가면 부두 옆에 걸리므로 입구를 거쳐 간다
        if (!onPier(local.x, local.z)) return walk(d.mouthX, 0, 0.3, () => {});
        return walk(d.landX, d.landZ, DOCK_RANGE - 0.5, () => { room.send(MSG.board); goal = null; });
      }
      case "storage":
        return walk(STORAGE.x, STORAGE.z, STORAGE_RANGE - 0.4, () => { room.send(MSG.deposit); goal = null; });
    }
  }

  function syncViews(dt: number) {
    const camQ = stage.camera.quaternion;
    state.resources.forEach((r, id) => world.resources.setAlive(id, r.alive));

    state.mobs.forEach((m, id) => {
      let v = mobViews.get(id);
      if (!v) { v = new MobView(stage.scene, m.type as MobType, m.x, m.z, m.rotY); mobViews.set(id, v); }
      v.update(m, dt, camQ);
    });

    dropViews.forEach((v, id) => { if (!state.drops.get(id)) { v.dispose(stage.scene); dropViews.delete(id); } });
    state.drops.forEach((d, id) => {
      let v = dropViews.get(id);
      if (!v) { v = new DropView(stage.scene, d.itemId as ItemId, d.x, d.z); dropViews.set(id, v); }
      v.update(dt);
    });

    playerViews.forEach((v, id) => { if (!state.players.get(id)) { v.dispose(stage.scene); playerViews.delete(id); } });
    state.players.forEach((p, id) => {
      let v = playerViews.get(id);
      if (!v) { v = new PlayerView(stage.scene, p.colorIdx, p.x, p.z); playerViews.set(id, v); }
      if (id === myId) v.update(local.x, local.z, local.rot, p.sailing, p.attackSeq, !!p.gathering, dt, false);
      else v.update(p.x, p.z, p.rotY, p.sailing, p.attackSeq, !!p.gathering, dt, true);
    });
  }

  function updateFog(t: number) {
    const lights = fogUniforms.uLights.value;
    let n = 0;
    const add = (x: number, z: number, r: number, w: number) => { lights[n++].set(x, z, r, w); };
    add(local.x, local.z, PLAYER_LIGHT_RADIUS, 0.45);
    state.players.forEach((p, id) => { if (id !== myId) add(p.x, p.z, PLAYER_LIGHT_RADIUS, 0.45); });
    for (const [x, z, r, w] of FIXED_LIGHTS) add(x, z, r, w);
    fogUniforms.uLightCount.value = n;
    fogUniforms.uCutout.value.set(local.x, local.z);
    fogUniforms.uTime.value = t;
  }

  function zoneName(x: number, z: number) {
    if (landFactor(VILLAGE, x, z) > -0.3) return VILLAGE.name;
    if (landFactor(ISLAND, x, z) > -0.3) return ISLAND.name;
    return "물길 위";
  }

  let last = performance.now();
  let firstFrame = true;
  let fps = 60;
  function frame(nowMs: number) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    const moveDt = Math.min(0.5, (nowMs - last) / 1000); // 프레임이 낮아도 예측이 서버보다 뒤처지지 않게 한다
    fps += (1 / Math.max(0.001, (nowMs - last) / 1000) - fps) * 0.05;
    last = nowMs;
    const p = me();
    if (!p) return;

    if (!local.ready) { local.x = p.x; local.z = p.z; local.rot = p.rotY; local.ready = true; hud.overlay(null); }

    // 입력
    let dir = input.moveDir();
    if (dir.x !== 0 || dir.z !== 0) goal = null;
    else dir = steerToGoal();
    if (p.sailing) { dir = { x: 0, z: 0 }; goal = null; }
    if (input.attackHeld) sendAttack();

    if (dir.x !== lastDirX || dir.z !== lastDirZ || (nowMs - lastSend > 200 && (dir.x !== 0 || dir.z !== 0))) {
      room.send(MSG.move, { dirX: dir.x, dirZ: dir.z });
      lastDirX = dir.x; lastDirZ = dir.z; lastSend = nowMs;
    }

    // 자기 캐릭터 예측 + 서버 보정
    if (p.sailing) {
      local.x = p.x; local.z = p.z; local.rot = p.rotY;
    } else {
      const moving = dir.x !== 0 || dir.z !== 0;
      if (moving) {
        const before = { x: local.x, z: local.z };
        const next = stepMove(local.x, local.z, dir.x * PLAYER_SPEED * moveDt, dir.z * PLAYER_SPEED * moveDt);
        local.x = next.x; local.z = next.z;
        local.rot = Math.atan2(dir.x, dir.z);
        // 장애물에 막혀 못 가면 클릭 이동을 멈춘다
        goalStuck = goal && Math.hypot(next.x - before.x, next.z - before.z) < PLAYER_SPEED * moveDt * 0.2 ? goalStuck + moveDt : 0;
        if (goalStuck > 0.4) { goal = null; goalStuck = 0; }
      } else {
        local.rot = p.rotY;
      }
      const ex = p.x - local.x, ez = p.z - local.z, err = Math.hypot(ex, ez);
      if (err > 3) { local.x = p.x; local.z = p.z; }
      else if (err > (moving ? 0.7 : 0.02)) {
        const k = 1 - Math.exp(-dt * (moving ? 4 : 10));
        local.x += ex * k; local.z += ez * k;
      }
    }

    syncViews(dt);
    updateFog(nowMs / 1000);
    world.animate(nowMs / 1000);
    stage.follow(local.x, 0, local.z, dt, firstFrame);
    firstFrame = false;
    floaters.update(dt, (x, y, z) => stage.project(x, y, z));

    hud.update(p, state.storage, zoneName(local.x, local.z));
    hud.setPrompt(currentAction(p)?.label ?? null);
    let ally: PlayerState | null = null;
    state.players.forEach((o, id) => { if (id !== myId) ally = o; });
    minimap.draw(local, ally);

    stage.render();
  }
  requestAnimationFrame(frame);

  // Playwright 테스트용 진입점
  (window as any).__game = {
    room, state, myId, local,
    get fps() { return fps; },
    tapWorld: (x: number, z: number) => { goal = pickGoal(x, z); },
    setGoal: (g: Goal | null) => { goal = g; },
    interact: () => input.onInteract(),
    attack: () => sendAttack(),
  };
}

main();
