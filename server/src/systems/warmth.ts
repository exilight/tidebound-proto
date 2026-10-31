import {
  ALLY_WARMTH_FACTOR, ALLY_WARMTH_RADIUS, HP_REGEN_IN_LIGHT, MAX_HP, MAX_WARMTH, WARMTH_DRAIN, WARMTH_REGEN, inSafeLight,
} from "@tidebound/shared";
import { respawnPlayer } from "./combat.ts";
import type { Ctx } from "./context.ts";

export function updateWarmth(ctx: Ctx, dt: number) {
  ctx.state.players.forEach((p, id) => {
    if (p.sailing) return;
    if (inSafeLight(p.x, p.z)) {
      p.warmth = Math.min(MAX_WARMTH, p.warmth + WARMTH_REGEN * dt);
      p.hp = Math.min(MAX_HP, p.hp + HP_REGEN_IN_LIGHT * dt);
      return;
    }
    let drain = WARMTH_DRAIN;
    ctx.state.players.forEach((other, otherId) => {
      if (otherId !== id && Math.hypot(other.x - p.x, other.z - p.z) <= ALLY_WARMTH_RADIUS) drain *= ALLY_WARMTH_FACTOR;
    });
    p.warmth = Math.max(0, p.warmth - drain * dt);
    if (p.warmth === 0) respawnPlayer(ctx, id, p, "warmth");
  });
}
