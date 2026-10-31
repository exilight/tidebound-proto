import {
  ATTACK_COOLDOWN, ATTACK_DAMAGE, ATTACK_RANGE, BAG_LOSS_RATIO, MAX_HP, MOB_STATS, RESPAWN_WARMTH, SPAWN,
  type ItemId, type MobType,
} from "@tidebound/shared";
import type { Ctx } from "./context.ts";
import { spawnDrop } from "./gather.ts";
import type { Mob, Player } from "../rooms/schema/IslandState.ts";

export function tryAttack(ctx: Ctx, id: string, targetId?: string) {
  const p = ctx.state.players.get(id), rt = ctx.players.get(id);
  if (!p || !rt || rt.sail || rt.attackCd > 0) return;
  rt.attackCd = ATTACK_COOLDOWN;
  p.attackSeq++;

  let target: Mob | undefined;
  let targetKey = "";
  const inRange = (m: Mob) => m.alive && Math.hypot(m.x - p.x, m.z - p.z) <= ATTACK_RANGE + MOB_STATS[m.type as MobType].radius;
  const wanted = targetId ? ctx.state.mobs.get(targetId) : undefined;
  if (wanted && inRange(wanted)) {
    target = wanted;
    targetKey = targetId!;
  } else {
    let best = Infinity;
    ctx.state.mobs.forEach((m, key) => {
      const d = Math.hypot(m.x - p.x, m.z - p.z);
      if (inRange(m) && d < best) { best = d; target = m; targetKey = key; }
    });
  }
  if (!target) return;

  p.rotY = Math.atan2(target.x - p.x, target.z - p.z);
  target.hp -= ATTACK_DAMAGE;
  ctx.broadcastHit({ x: target.x, z: target.z, amount: ATTACK_DAMAGE, onPlayer: false });

  const mobRt = ctx.mobs.get(targetKey)!;
  mobRt.threatId = id;
  if (target.hp <= 0) {
    killMob(ctx, target, targetKey);
  } else if (target.type === "boar" && target.state !== "windup" && target.state !== "recover") {
    target.state = "chase"; // 맞으면 무조건 반격
  } else if (target.type !== "boar" && target.state !== "rest") {
    target.state = "flee";
    mobRt.stateLeft = MOB_STATS[target.type as MobType].fleeTime!;
  }
}

function killMob(ctx: Ctx, m: Mob, key: string) {
  const stats = MOB_STATS[m.type as MobType];
  m.alive = false;
  m.state = "dead";
  ctx.mobs.get(key)!.respawnLeft = stats.respawn;
  for (const [item, count] of Object.entries(stats.drops))
    spawnDrop(ctx, item as ItemId, count!, m.x, m.z);
}

export function updateCombatTimers(ctx: Ctx, dt: number) {
  ctx.players.forEach((rt) => { rt.attackCd = Math.max(0, rt.attackCd - dt); });
}

export function damagePlayer(ctx: Ctx, id: string, p: Player, amount: number) {
  p.hp = Math.max(0, p.hp - amount);
  ctx.broadcastHit({ x: p.x, z: p.z, amount, onPlayer: true });
  if (p.hp === 0) respawnPlayer(ctx, id, p, "hp");
}

/** 쓰러지면 가방 일부를 잃고 마을에서 깨어난다 */
export function respawnPlayer(ctx: Ctx, id: string, p: Player, reason: "hp" | "warmth") {
  const rt = ctx.players.get(id)!;
  let lost = 0;
  for (const [itemId, count] of [...p.inventory.entries()]) {
    const loss = Math.ceil(count * BAG_LOSS_RATIO);
    lost += loss;
    if (count - loss > 0) p.inventory.set(itemId, count - loss);
    else p.inventory.delete(itemId);
  }
  p.x = SPAWN.x;
  p.z = SPAWN.z;
  p.hp = MAX_HP;
  p.warmth = RESPAWN_WARMTH;
  p.gathering = "";
  rt.gatherLeft = 0;
  rt.sail = null;
  p.sailing = false;
  ctx.sendRespawn(id, { reason, lost });
}
