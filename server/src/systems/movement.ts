import { DOCK_RANGE, DOCKS, PLAYER_SPEED, SAIL_TIME, stepMove, type DockId } from "@tidebound/shared";
import type { Ctx, PlayerRt } from "./context.ts";
import type { Player } from "../rooms/schema/IslandState.ts";

export function setMoveInput(rt: PlayerRt, dirX: number, dirZ: number) {
  const len = Math.hypot(dirX, dirZ);
  if (!Number.isFinite(len) || len === 0) { rt.dirX = rt.dirZ = 0; return; }
  // 조이스틱 입력은 1 이하 길이를 그대로 쓴다
  const scale = len > 1 ? 1 / len : 1;
  rt.dirX = dirX * scale;
  rt.dirZ = dirZ * scale;
}

export function updateMovement(ctx: Ctx, dt: number) {
  ctx.state.players.forEach((p, id) => {
    const rt = ctx.players.get(id)!;
    if (rt.sail) { updateSail(p, rt, dt); return; }
    if (rt.dirX === 0 && rt.dirZ === 0) return;
    const next = stepMove(p.x, p.z, rt.dirX * PLAYER_SPEED * dt, rt.dirZ * PLAYER_SPEED * dt);
    p.x = next.x;
    p.z = next.z;
    p.rotY = Math.atan2(rt.dirX, rt.dirZ);
  });
}

function updateSail(p: Player, rt: PlayerRt, dt: number) {
  const s = rt.sail!;
  s.t += dt / SAIL_TIME;
  if (s.t >= 1) {
    p.x = s.landX;
    p.z = s.landZ;
    p.sailing = false;
    rt.sail = null;
    return;
  }
  p.x = s.fromX + (s.toX - s.fromX) * s.t;
  p.z = s.fromZ + (s.toZ - s.fromZ) * s.t;
  p.rotY = Math.atan2(s.toX - s.fromX, s.toZ - s.fromZ);
}

export function tryBoard(ctx: Ctx, id: string) {
  const p = ctx.state.players.get(id), rt = ctx.players.get(id);
  if (!p || !rt || rt.sail) return;
  const dockId = (Object.keys(DOCKS) as DockId[]).find((d) => Math.hypot(p.x - DOCKS[d].landX, p.z - DOCKS[d].landZ) <= DOCK_RANGE);
  if (!dockId) return;
  const from = DOCKS[dockId], to = DOCKS[from.dest];
  rt.gatherLeft = 0;
  p.gathering = "";
  p.sailing = true;
  rt.sail = { fromX: from.boatX, fromZ: from.boatZ, toX: to.boatX, toZ: to.boatZ, landX: to.landX, landZ: to.landZ, t: 0 };
}
