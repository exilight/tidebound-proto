import {
  DROP_LIFETIME, GATHER_RANGE, GATHER_TIME, ITEM_INFO, PICKUP_RADIUS, RESOURCE_INFO, RESOURCE_RESPAWN, STORAGE, STORAGE_RANGE,
  type ItemId, type ResourceType,
} from "@tidebound/shared";
import { addToBag, type Ctx } from "./context.ts";
import { Drop } from "../rooms/schema/IslandState.ts";

export function tryGather(ctx: Ctx, id: string, resourceId: string) {
  const p = ctx.state.players.get(id), rt = ctx.players.get(id);
  const r = ctx.state.resources.get(resourceId);
  if (!p || !rt || !r || !r.alive || rt.sail || p.gathering) return;
  if (Math.hypot(p.x - r.x, p.z - r.z) > GATHER_RANGE) return;
  p.gathering = resourceId;
  p.rotY = Math.atan2(r.x - p.x, r.z - p.z);
  rt.gatherLeft = GATHER_TIME;
}

export function updateGather(ctx: Ctx, dt: number) {
  ctx.state.players.forEach((p, id) => {
    if (!p.gathering) return;
    const rt = ctx.players.get(id)!;
    const r = ctx.state.resources.get(p.gathering);
    // 움직이면 취소된다. 상대가 먼저 캐도 취소된다.
    if (!r || !r.alive || rt.dirX !== 0 || rt.dirZ !== 0) {
      p.gathering = "";
      rt.gatherLeft = 0;
      return;
    }
    rt.gatherLeft -= dt;
    if (rt.gatherLeft > 0) return;
    p.gathering = "";
    const item = RESOURCE_INFO[r.type as ResourceType].item;
    if (addToBag(p, item, 1) === 0) { ctx.notify(id, "가방이 가득 찼습니다. 마을 창고에 맡기세요."); return; }
    r.alive = false;
    r.respawnAt = ctx.now + RESOURCE_RESPAWN;
    ctx.notify(id, `${ITEM_INFO[item].name} +1`);
  });

  ctx.state.resources.forEach((r) => {
    if (!r.alive && ctx.now >= r.respawnAt) r.alive = true;
  });
}

export function spawnDrop(ctx: Ctx, itemId: ItemId, count: number, x: number, z: number) {
  const a = Math.random() * Math.PI * 2, d = 0.3 + Math.random() * 0.8;
  const drop = new Drop();
  drop.itemId = itemId;
  drop.count = count;
  drop.x = x + Math.cos(a) * d;
  drop.z = z + Math.sin(a) * d;
  const id = `d${++ctx.dropSeq}`;
  ctx.state.drops.set(id, drop);
  ctx.dropExpiry.set(id, ctx.now + DROP_LIFETIME);
}

export function updateDrops(ctx: Ctx) {
  ctx.state.drops.forEach((d, dropId) => {
    if (ctx.now >= (ctx.dropExpiry.get(dropId) ?? 0)) { removeDrop(ctx, dropId); return; }
    ctx.state.players.forEach((p, id) => {
      if (d.count <= 0 || p.sailing || Math.hypot(p.x - d.x, p.z - d.z) > PICKUP_RADIUS) return;
      const added = addToBag(p, d.itemId, d.count);
      if (added === 0) return;
      d.count -= added;
      ctx.notify(id, `${ITEM_INFO[d.itemId as ItemId].name} +${added}`);
    });
    if (d.count <= 0) removeDrop(ctx, dropId);
  });
}

function removeDrop(ctx: Ctx, dropId: string) {
  ctx.state.drops.delete(dropId);
  ctx.dropExpiry.delete(dropId);
}

export function tryDeposit(ctx: Ctx, id: string) {
  const p = ctx.state.players.get(id);
  if (!p || Math.hypot(p.x - STORAGE.x, p.z - STORAGE.z) > STORAGE_RANGE) return;
  let moved = 0;
  p.inventory.forEach((count, itemId) => {
    ctx.state.storage.set(itemId, (ctx.state.storage.get(itemId) ?? 0) + count);
    moved += count;
  });
  p.inventory.clear();
  ctx.notify(id, moved > 0 ? `창고에 재료 ${moved}개를 맡겼습니다.` : "맡길 재료가 없습니다.");
}
