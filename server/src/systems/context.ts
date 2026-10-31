import { BAG_CAPACITY, type HitEvent, type RespawnEvent } from "@tidebound/shared";
import type { IslandState, Player } from "../rooms/schema/IslandState.ts";

export interface PlayerRt {
  dirX: number;
  dirZ: number;
  attackCd: number;
  gatherLeft: number;
  sail: { fromX: number; fromZ: number; toX: number; toZ: number; landX: number; landZ: number; t: number } | null;
}

export interface MobRt {
  homeX: number;
  homeZ: number;
  headX: number;
  headZ: number;
  stateLeft: number;
  threatId: string;
  respawnLeft: number;
}

export interface Ctx {
  state: IslandState;
  players: Map<string, PlayerRt>;
  mobs: Map<string, MobRt>;
  now: number; // 방 시작 후 경과 초
  dropSeq: number;
  dropExpiry: Map<string, number>;
  notify(sessionId: string, text: string): void;
  broadcastHit(e: HitEvent): void;
  sendRespawn(sessionId: string, e: RespawnEvent): void;
}



export function bagCount(p: Player) {
  let n = 0;
  p.inventory.forEach((c) => { n += c; });
  return n;
}

/** 가방에 넣고, 실제로 들어간 개수를 돌려준다 */
export function addToBag(p: Player, itemId: string, count: number) {
  const added = Math.min(count, BAG_CAPACITY - bagCount(p));
  if (added > 0) p.inventory.set(itemId, (p.inventory.get(itemId) ?? 0) + added);
  return Math.max(0, added);
}
