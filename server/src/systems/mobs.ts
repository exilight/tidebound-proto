import {
  BOAR_MIN_DOCK_DIST, DOCKS, ISLAND, MOB_STATS, inSafeLight, isFree, landFactor, rng, type MobStats, type MobType,
} from "@tidebound/shared";
import { damagePlayer } from "./combat.ts";
import type { Ctx, MobRt } from "./context.ts";
import { Mob, type Player } from "../rooms/schema/IslandState.ts";

const rand = rng(7031);
const between = (a: number, b: number) => a + rand() * (b - a);

const mobCanStand = (x: number, z: number, radius: number) =>
  landFactor(ISLAND, x, z) > 0.03 && !inSafeLight(x, z) && isFree(x, z, radius);

export function spawnMobs(ctx: Ctx) {
  for (const type of Object.keys(MOB_STATS) as MobType[]) {
    const stats = MOB_STATS[type];
    for (let i = 0; i < stats.count; i++) {
      const spot = pickSpawn(type, stats);
      const m = new Mob();
      m.type = type;
      m.x = spot.x;
      m.z = spot.z;
      m.rotY = rand() * Math.PI * 2;
      m.hp = stats.hp;
      m.state = "idle";
      m.alive = true;
      const id = `${type}${i}`;
      ctx.state.mobs.set(id, m);
      ctx.mobs.set(id, { homeX: spot.x, homeZ: spot.z, headX: 0, headZ: 1, stateLeft: between(0.5, 3), threatId: "", respawnLeft: 0 });
    }
  }
}

function pickSpawn(type: MobType, stats: MobStats) {
  for (let i = 0; i < 300; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * ISLAND.r;
    const x = ISLAND.x + Math.cos(a) * d, z = ISLAND.z + Math.sin(a) * d;
    if (!mobCanStand(x, z, stats.radius) || landFactor(ISLAND, x, z) < 0.1) continue;
    const dockDist = Math.hypot(x - DOCKS.island.landX, z - DOCKS.island.landZ);
    if (dockDist < (type === "boar" ? BOAR_MIN_DOCK_DIST : 10)) continue;
    return { x, z };
  }
  return { x: 10, z: 0 };
}

function nearestPlayer(ctx: Ctx, m: Mob) {
  let best: { id: string; p: Player; d: number } | null = null;
  ctx.state.players.forEach((p, id) => {
    if (p.sailing) return;
    const d = Math.hypot(p.x - m.x, p.z - m.z);
    if (!best || d < best.d) best = { id, p, d };
  });
  return best as { id: string; p: Player; d: number } | null;
}

/** 진행 방향이 막히면 좌우로 꺾어 본다. 움직였으면 true */
function steer(m: Mob, rt: MobRt, radius: number, speed: number, dt: number) {
  const base = Math.atan2(rt.headX, rt.headZ);
  for (const turn of [0, 0.6, -0.6, 1.2, -1.2, 2, -2]) {
    const a = base + turn, hx = Math.sin(a), hz = Math.cos(a);
    const x = m.x + hx * speed * dt, z = m.z + hz * speed * dt;
    if (!mobCanStand(x, z, radius)) continue;
    m.x = x;
    m.z = z;
    m.rotY = a;
    rt.headX = hx;
    rt.headZ = hz;
    return true;
  }
  return false;
}

function headTo(rt: MobRt, dx: number, dz: number) {
  const len = Math.hypot(dx, dz) || 1;
  rt.headX = dx / len;
  rt.headZ = dz / len;
}

function startWander(m: Mob, rt: MobRt) {
  m.state = "wander";
  rt.stateLeft = between(1.5, 3.5);
  // 집에서 멀어지면 돌아오는 쪽으로 걷는다
  const toHome = Math.hypot(rt.homeX - m.x, rt.homeZ - m.z);
  if (toHome > 9) headTo(rt, rt.homeX - m.x, rt.homeZ - m.z);
  else { const a = rand() * Math.PI * 2; rt.headX = Math.sin(a); rt.headZ = Math.cos(a); }
}

function updateRoam(m: Mob, rt: MobRt, stats: MobStats, dt: number) {
  rt.stateLeft -= dt;
  if (m.state === "wander") {
    if (!steer(m, rt, stats.radius, stats.walkSpeed, dt)) rt.stateLeft = 0;
    if (rt.stateLeft <= 0) { m.state = "idle"; rt.stateLeft = between(1, 4); }
  } else if (rt.stateLeft <= 0) {
    startWander(m, rt);
  }
}

// 토끼, 사슴: 플레이어가 다가오면 달아나고, 지치면 잠깐 멈춘다
function updateSkittish(ctx: Ctx, m: Mob, rt: MobRt, stats: MobStats, dt: number) {
  const near = nearestPlayer(ctx, m);
  if (m.state === "flee") {
    rt.stateLeft -= dt;
    if (near) {
      const dx = m.x - near.p.x, dz = m.z - near.p.z, len = Math.hypot(dx, dz) || 1;
      const wobble = Math.sin(ctx.now * 7 + rt.homeX) * 0.5;
      headTo(rt, dx / len + rt.headZ * wobble * 0.5, dz / len - rt.headX * wobble * 0.5);
    }
    steer(m, rt, stats.radius, stats.runSpeed, dt);
    if (rt.stateLeft <= 0) { m.state = "rest"; rt.stateLeft = stats.restTime!; }
    return;
  }
  if (m.state === "rest") {
    rt.stateLeft -= dt;
    if (rt.stateLeft <= 0) { m.state = "idle"; rt.stateLeft = 0.2; }
    return;
  }
  if (near && near.d < stats.alertRadius!) {
    m.state = "flee";
    rt.stateLeft = stats.fleeTime!;
    return;
  }
  updateRoam(m, rt, stats, dt);
}

// 멧돼지: 가까이 오면 먼저 달려든다. 불빛 안으로는 쫓아오지 않는다.
function updateBoar(ctx: Ctx, m: Mob, rt: MobRt, stats: MobStats, dt: number) {
  const threat = rt.threatId ? ctx.state.players.get(rt.threatId) : undefined;
  const dropAggro = () => { rt.threatId = ""; startWander(m, rt); };

  if (m.state === "chase" || m.state === "windup" || m.state === "recover") {
    if (!threat || threat.sailing || inSafeLight(threat.x, threat.z)) return dropAggro();
    if (Math.hypot(m.x - rt.homeX, m.z - rt.homeZ) > stats.leashRadius!) return dropAggro();
    const dx = threat.x - m.x, dz = threat.z - m.z, d = Math.hypot(dx, dz);
    if (m.state === "chase") {
      headTo(rt, dx, dz);
      if (d <= stats.attackRange!) { m.state = "windup"; rt.stateLeft = stats.windup!; m.rotY = Math.atan2(dx, dz); return; }
      steer(m, rt, stats.radius, stats.runSpeed, dt);
      return;
    }
    rt.stateLeft -= dt;
    if (rt.stateLeft > 0) return;
    if (m.state === "windup") {
      m.state = "recover";
      rt.stateLeft = stats.recover!;
      if (d <= stats.hitRange!) damagePlayer(ctx, rt.threatId, threat, stats.damage!);
    } else {
      m.state = "chase";
    }
    return;
  }

  const near = nearestPlayer(ctx, m);
  if (near && near.d < stats.aggroRadius! && !inSafeLight(near.p.x, near.p.z)) {
    rt.threatId = near.id;
    m.state = "chase";
    return;
  }
  updateRoam(m, rt, stats, dt);
}

export function updateMobs(ctx: Ctx, dt: number) {
  ctx.state.mobs.forEach((m, id) => {
    const rt = ctx.mobs.get(id)!;
    const stats = MOB_STATS[m.type as MobType];
    if (!m.alive) {
      rt.respawnLeft -= dt;
      if (rt.respawnLeft > 0) return;
      m.x = rt.homeX;
      m.z = rt.homeZ;
      m.hp = stats.hp;
      m.state = "idle";
      m.alive = true;
      rt.threatId = "";
      rt.stateLeft = between(0.5, 2);
      return;
    }
    if (m.type === "boar") updateBoar(ctx, m, rt, stats, dt);
    else updateSkittish(ctx, m, rt, stats, dt);
  });
}
