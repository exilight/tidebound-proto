// 렌더링 없이 서버에 붙어 사냥 난이도를 재는 봇. 사용법: npx tsx tests/tools/hunt-bot.mts (서버 실행 중일 때)
import { Client } from "@colyseus/sdk";
import { ATTACK_RANGE, MOB_STATS, MSG, ROOM_NAME, SERVER_PORT, type MobType } from "@tidebound/shared";

const room: any = await new Client(`http://localhost:${SERVER_PORT}`).joinOrCreate(ROOM_NAME);
for (const ev of ["notice", "hit", "respawn"]) room.onMessage(ev, () => {});
await new Promise((r) => setTimeout(r, 300));
const me = () => room.state.players.get(room.sessionId);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function go(x: number, z: number, reach: number) {
  while (Math.hypot(me().x - x, me().z - z) > reach) {
    const dx = x - me().x, dz = z - me().z, d = Math.hypot(dx, dz);
    room.send(MSG.move, { dirX: dx / d, dirZ: dz / d });
    await sleep(50);
  }
  room.send(MSG.move, { dirX: 0, dirZ: 0 });
}

await go(-55.5, 0, 2);
room.send(MSG.board);
await sleep(200);
while (me().sailing) await sleep(100);
await go(-29, 0, 1);

async function hunt(type: MobType) {
  let id = "", best = Infinity;
  room.state.mobs.forEach((m: any, k: string) => {
    const d = Math.hypot(m.x - me().x, m.z - me().z);
    if (m.type === type && m.alive && d < best) { best = d; id = k; }
  });
  const m = room.state.mobs.get(id), start = Date.now(), hp0 = me().hp;
  let lastAttack = 0, peak = 0;
  while (m.alive && Date.now() - start < 60_000) {
    const dx = m.x - me().x, dz = m.z - me().z, d = Math.hypot(dx, dz);
    peak = Math.max(peak, d);
    if (d <= ATTACK_RANGE + MOB_STATS[type].radius - 0.4) {
      room.send(MSG.move, { dirX: 0, dirZ: 0 });
      if (Date.now() - lastAttack > 530) { room.send(MSG.attack, { targetId: id }); lastAttack = Date.now(); }
    } else room.send(MSG.move, { dirX: dx / d, dirZ: dz / d });
    await sleep(50);
  }
  room.send(MSG.move, { dirX: 0, dirZ: 0 });
  console.log(`${type}: ${m.alive ? "실패" : "처치"} ${((Date.now() - start) / 1000).toFixed(1)}초, 출발거리 ${best.toFixed(0)}m, 체력 ${hp0.toFixed(0)}→${me().hp.toFixed(0)}, 온기 ${me().warmth.toFixed(0)}, 상태 ${m.state}, 위치 ${m.x.toFixed(1)},${m.z.toFixed(1)}`);
}

for (const t of ["rabbit", "rabbit", "deer", "deer", "boar", "boar"] as MobType[]) await hunt(t);
await room.leave();
process.exit(0);
