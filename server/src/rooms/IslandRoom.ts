import { Room, type Client } from "colyseus";
import { MapSchema } from "@colyseus/schema";
import {
  EVT, MAX_CLIENTS, MAX_HP, MAX_WARMTH, MSG, SPAWN, TICK_MS, WORLD,
  type AttackPayload, type GatherPayload, type MovePayload,
} from "@tidebound/shared";
import { IslandState, Player, Resource } from "./schema/IslandState.ts";
import type { Ctx } from "../systems/context.ts";
import { setMoveInput, tryBoard, updateMovement } from "../systems/movement.ts";
import { tryDeposit, tryGather, updateDrops, updateGather } from "../systems/gather.ts";
import { tryAttack, updateCombatTimers } from "../systems/combat.ts";
import { updateWarmth } from "../systems/warmth.ts";
import { spawnMobs, updateMobs } from "../systems/mobs.ts";

export class IslandRoom extends Room {
  maxClients = MAX_CLIENTS;
  state = new IslandState();
  private ctx!: Ctx;

  onCreate() {
    this.ctx = {
      state: this.state,
      players: new Map(),
      mobs: new Map(),
      now: 0,
      dropSeq: 0,
      dropExpiry: new Map(),
      notify: (id, text) => this.clientOf(id)?.send(EVT.notice, { text }),
      broadcastHit: (e) => this.broadcast(EVT.hit, e),
      sendRespawn: (id, e) => this.clientOf(id)?.send(EVT.respawn, e),
    };

    for (const spawn of WORLD.resources) {
      const r = new Resource();
      r.type = spawn.type;
      r.x = spawn.x;
      r.z = spawn.z;
      r.alive = true;
      r.respawnAt = 0;
      this.state.resources.set(spawn.id, r);
    }
    spawnMobs(this.ctx);

    this.onMessage(MSG.move, (c, m: MovePayload) => {
      const rt = this.ctx.players.get(c.sessionId);
      if (rt) setMoveInput(rt, Number(m?.dirX), Number(m?.dirZ));
    });
    this.onMessage(MSG.gather, (c, m: GatherPayload) => tryGather(this.ctx, c.sessionId, String(m?.resourceId)));
    this.onMessage(MSG.attack, (c, m: AttackPayload) => tryAttack(this.ctx, c.sessionId, m?.targetId));
    this.onMessage(MSG.board, (c) => tryBoard(this.ctx, c.sessionId));
    this.onMessage(MSG.deposit, (c) => tryDeposit(this.ctx, c.sessionId));

    this.setSimulationInterval((ms) => this.tick(ms / 1000), TICK_MS);
  }

  private clientOf(sessionId: string) {
    return this.clients.find((c: Client) => c.sessionId === sessionId);
  }

  private tick(dt: number) {
    const ctx = this.ctx;
    ctx.now += dt;
    updateMovement(ctx, dt);
    updateGather(ctx, dt);
    updateCombatTimers(ctx, dt);
    updateMobs(ctx, dt);
    updateDrops(ctx);
    updateWarmth(ctx, dt);
  }

  onJoin(client: Client) {
    const used = new Set<number>();
    this.state.players.forEach((p) => used.add(p.colorIdx));
    const p = new Player();
    p.x = SPAWN.x + (used.size ? 1.5 : 0);
    p.z = SPAWN.z;
    p.rotY = 0;
    p.hp = MAX_HP;
    p.warmth = MAX_WARMTH;
    p.gathering = "";
    p.sailing = false;
    p.colorIdx = used.has(0) ? 1 : 0;
    p.attackSeq = 0;
    p.inventory = new MapSchema<number>();
    this.state.players.set(client.sessionId, p);
    this.ctx.players.set(client.sessionId, { dirX: 0, dirZ: 0, attackCd: 0, gatherLeft: 0, sail: null });
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.ctx.players.delete(client.sessionId);
  }
}
