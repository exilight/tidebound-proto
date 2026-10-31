import { expect, test } from "@playwright/test";
import { huntUntilDead, joinGame, nearestMob, sailToIsland, setGoal, shot, snapshot, walkTo } from "./helpers.ts";

test("두 명이 같은 방에서 서로의 움직임과 자원 변화를 본다", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await joinGame(a);
  await joinGame(b);
  await expect.poll(async () => (await snapshot(a)).players).toBe(2);

  const before = await snapshot(a);
  await a.keyboard.down("KeyS");
  await a.waitForTimeout(800);
  await a.keyboard.up("KeyS");
  await a.waitForTimeout(300);
  const after = await snapshot(a);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1);

  const seen = await b.evaluate((id) => {
    const p = (window as any).__game.state.players.get(id);
    return { x: p.x, z: p.z };
  }, await a.evaluate(() => (window as any).__game.myId));
  expect(Math.hypot(seen.x - after.x, seen.z - after.z)).toBeLessThan(0.5);
  await shot(b, "two-players");

  // 같은 자원 상태를 공유한다: A가 캔 나무는 B 화면에서도 사라진다
  await sailToIsland(a);
  const tree = await a.evaluate(() => {
    const g = (window as any).__game, p = g.state.players.get(g.myId);
    let best: any = null;
    g.state.resources.forEach((r: any, id: string) => {
      const d = Math.hypot(r.x - p.x, r.z - p.z);
      if (r.type === "tree" && r.alive && (!best || d < best.d)) best = { id, d, x: r.x, z: r.z };
    });
    return best;
  });
  await walkTo(a, tree.x - 1, tree.z, 0.9);
  await setGoal(a, { kind: "resource", id: tree.id });
  await expect.poll(async () => (await snapshot(a)).inv.wood ?? 0, { timeout: 8_000 }).toBe(1);
  expect(await b.evaluate((id) => (window as any).__game.state.resources.get(id).alive, tree.id)).toBe(false);
  await a.context().close();
  await b.context().close();
});

test("마을에서 섬으로 가서 사냥과 채집을 하고 재료를 창고에 맡긴다", async ({ page }) => {
  await joinGame(page);
  await shot(page, "village");
  await sailToIsland(page);
  await shot(page, "island-arrive");

  // 토끼: 다가가면 도망친다
  const rabbit = (await nearestMob(page, "rabbit"))!;
  await walkTo(page, rabbit.x, rabbit.z, 7);
  await setGoal(page, { kind: "mob", id: rabbit.id });
  await expect.poll(() => page.evaluate((id) => (window as any).__game.state.mobs.get(id).state, rabbit.id), { timeout: 15_000, intervals: [100] }).toBe("flee");
  await shot(page, "rabbit-flee");
  await huntUntilDead(page, rabbit.id);

  // 전리품 줍기
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) {
    const drop = await page.evaluate(() => {
      const g = (window as any).__game;
      let d: any = null;
      g.state.drops.forEach((v: any) => { d = { x: v.x, z: v.z }; });
      return d;
    });
    if (!drop) break;
    await walkTo(page, drop.x, drop.z, 1);
    await page.waitForTimeout(200);
  }
  await expect.poll(async () => (await snapshot(page)).inv.meat ?? 0).toBeGreaterThan(0);
  await shot(page, "after-hunt");

  // 사슴도 잡을 수 있다
  const deer = (await nearestMob(page, "deer"))!;
  await walkTo(page, deer.x, deer.z, 10);
  await huntUntilDead(page, deer.id);

  // 멧돼지: 먼저 달려들어 체력을 깎는다
  const boar = (await nearestMob(page, "boar"))!;
  await walkTo(page, boar.x, boar.z, 6);
  await expect.poll(() => page.evaluate((id) => (window as any).__game.state.mobs.get(id).state, boar.id), { timeout: 10_000, intervals: [100] }).not.toBe("idle");
  await expect.poll(async () => (await snapshot(page)).hp, { timeout: 15_000 }).toBeLessThan(100);
  await shot(page, "boar-attack");
  await huntUntilDead(page, boar.id);

  // 배로 돌아가 창고에 맡긴다
  await page.waitForFunction(() => {
    const g = (window as any).__game, p = g.state.players.get(g.myId);
    if (!p.sailing && p.x > -40) g.setGoal({ kind: "dock", dock: "island" }); // 배를 클릭한 것과 같다
    return p.sailing;
  }, null, { timeout: 40_000, polling: 1000 });
  await page.waitForFunction(() => { const g = (window as any).__game; const p = g.state.players.get(g.myId); return !p.sailing && p.x < -50; }, null, { timeout: 15_000 });
  await walkTo(page, -64.8, -5.6, 0.5);
  const carried = Object.values((await snapshot(page)).inv).reduce((a, b) => a + b, 0);
  expect(carried).toBeGreaterThan(0);
  await page.evaluate(() => (window as any).__game.interact());
  await expect.poll(async () => {
    const s = await snapshot(page);
    return Object.values(s.storage).reduce((a, b) => a + b, 0);
  }).toBe(carried);
  expect(Object.keys((await snapshot(page)).inv)).toHaveLength(0);
  await shot(page, "storage");
});

test("모바일 테스트 버튼을 누르면 터치 조작으로 움직일 수 있다", async ({ page }) => {
  await joinGame(page);
  await page.click("#mobile-btn");
  await expect(page.locator("#joystick")).toBeVisible();
  await expect(page.locator("#btn-attack")).toBeVisible();
  await page.waitForTimeout(400);

  const before = await snapshot(page);
  const box = (await page.locator("#joystick").boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 50);
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await snapshot(page);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1);
  await shot(page, "mobile-sim");

  await page.click("#mobile-btn");
  await expect(page.locator("#joystick")).toBeHidden();
});
