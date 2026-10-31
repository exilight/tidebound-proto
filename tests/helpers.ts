import { expect, type Page } from "@playwright/test";

export const SHOTS = process.env.SHOT_DIR;

export async function joinGame(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => (window as any).__game?.state?.players?.get((window as any).__game.myId));
  await expect(page.locator("#overlay")).toBeHidden();
}

export const snapshot = (page: Page) => page.evaluate(() => {
  const g = (window as any).__game;
  const p = g.state.players.get(g.myId);
  const inv: Record<string, number> = {};
  p.inventory.forEach((v: number, k: string) => { inv[k] = v; });
  const storage: Record<string, number> = {};
  g.state.storage.forEach((v: number, k: string) => { storage[k] = v; });
  return { x: p.x, z: p.z, hp: p.hp, warmth: p.warmth, sailing: p.sailing, inv, storage, players: g.state.players.size, fps: g.fps };
});

export const setGoal = (page: Page, goal: unknown) => page.evaluate((g) => (window as any).__game.setGoal(g), goal);

/** 막혀서 목표가 풀려도 다시 찍어 가며 땅 위 지점까지 걷는다 */
export async function walkTo(page: Page, x: number, z: number, reach = 1.5) {
  for (let i = 0; i < 60; i++) {
    const s = await snapshot(page);
    if (Math.hypot(s.x - x, s.z - z) <= reach) return;
    await setGoal(page, { kind: "ground", x, z });
    await page.waitForTimeout(500);
  }
  const s = await snapshot(page);
  throw new Error(`못 도착함: 목표 ${x}, ${z} / 현재 ${s.x.toFixed(1)}, ${s.z.toFixed(1)} 체력 ${s.hp.toFixed(0)} 온기 ${s.warmth.toFixed(0)} FPS ${s.fps.toFixed(0)}`);
}

export async function sailToIsland(page: Page) {
  await walkTo(page, -55.5, 0, 2);
  await page.evaluate(() => (window as any).__game.interact());
  await page.waitForFunction(() => { const g = (window as any).__game; return g.state.players.get(g.myId).sailing; }, null, { timeout: 8_000 });
  await page.waitForFunction(() => { const g = (window as any).__game; const p = g.state.players.get(g.myId); return !p.sailing && p.x > -40; }, null, { timeout: 15_000 });
}

export const nearestMob = (page: Page, type: string) => page.evaluate((t) => {
  const g = (window as any).__game;
  const p = g.state.players.get(g.myId);
  let best: any = null;
  g.state.mobs.forEach((m: any, id: string) => {
    if (m.type !== t || !m.alive) return;
    const d = Math.hypot(m.x - p.x, m.z - p.z);
    if (!best || d < best.d) best = { id, d, x: m.x, z: m.z, state: m.state, hp: m.hp };
  });
  return best as { id: string; d: number; x: number; z: number; state: string; hp: number } | null;
}, type);

export async function huntUntilDead(page: Page, id: string, limitMs = 90_000) {
  const end = Date.now() + limitMs;
  while (Date.now() < end) {
    const alive = await page.evaluate((mobId) => {
      const g = (window as any).__game;
      const m = g.state.mobs.get(mobId);
      if (m?.alive) g.setGoal({ kind: "mob", id: mobId });
      return !!m?.alive;
    }, id);
    if (!alive) return;
    await page.waitForTimeout(250);
  }
  const s = await snapshot(page);
  throw new Error(`${id} 사냥 실패: 현재 ${s.x.toFixed(1)}, ${s.z.toFixed(1)} 체력 ${s.hp.toFixed(0)} FPS ${s.fps.toFixed(0)} 표적 ${JSON.stringify(await nearestMob(page, "boar"))}`);
}

export const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
