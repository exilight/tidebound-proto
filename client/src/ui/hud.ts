import { BAG_CAPACITY, GATHER_TIME, ITEM_IDS, ITEM_INFO, MAX_HP, MAX_WARMTH } from "@tidebound/shared";
import type { MapLike, PlayerState } from "../net.ts";

const $ = (id: string) => document.getElementById(id)!;
const count = (m: MapLike<number>, k: string) => m.get(k) ?? 0;

export class Hud {
  private lastBag = "";
  private lastStorage = "";
  private lastGoal = "";
  private lastPrompt = "";
  private gatherStart = 0;
  private wasGathering = false;

  constructor() {
    $("bag-slots").innerHTML = ITEM_IDS.map((id) => `<div class="slot empty" id="slot-${id}" title="${ITEM_INFO[id].name}">${ITEM_INFO[id].icon}<span></span></div>`).join("");
  }

  update(p: PlayerState, storage: MapLike<number>, zone: string) {
    $("hp-fill").style.width = `${(p.hp / MAX_HP) * 100}%`;
    $("hp-text").textContent = String(Math.ceil(p.hp));
    $("warmth-fill").style.width = `${(p.warmth / MAX_WARMTH) * 100}%`;
    $("warmth-text").textContent = String(Math.ceil(p.warmth));
    $("warmth-fill").parentElement!.classList.toggle("low", p.warmth < 30);
    if ($("zone").textContent !== zone) $("zone").textContent = zone;

    let used = 0;
    const bagKey = ITEM_IDS.map((id) => { const n = count(p.inventory, id); used += n; return n; }).join();
    if (bagKey !== this.lastBag) {
      this.lastBag = bagKey;
      for (const id of ITEM_IDS) {
        const n = count(p.inventory, id), el = $(`slot-${id}`);
        el.classList.toggle("empty", n === 0);
        el.querySelector("span")!.textContent = n ? String(n) : "";
      }
      $("bag-title").textContent = `가방 ${used} / ${BAG_CAPACITY}`;
    }

    const storeKey = ITEM_IDS.map((id) => count(storage, id)).join();
    if (storeKey !== this.lastStorage) {
      this.lastStorage = storeKey;
      const rows = ITEM_IDS.filter((id) => count(storage, id) > 0).map((id) => `${ITEM_INFO[id].icon} ${count(storage, id)}`);
      $("storage").innerHTML = `<b>마을 창고</b><br>${rows.length ? rows.join(" &nbsp;") : "아직 비어 있음"}`;
    }

    const goal = zone.startsWith("등대고개")
      ? (used > 0 ? "창고에 재료를 맡기세요. 맡긴 재료는 잃지 않습니다." : "부두의 배를 타고 안개섬으로 떠나세요.")
      : used >= BAG_CAPACITY ? "가방이 가득 찼습니다. 마을로 돌아가세요."
      : p.warmth < 30 ? "온기가 떨어집니다. 호박등이나 마을로 돌아가세요."
      : "사냥하고 채집한 뒤 배로 돌아가세요.";
    if (goal !== this.lastGoal) { this.lastGoal = goal; $("goal").textContent = goal; }

    const gathering = !!p.gathering;
    if (gathering && !this.wasGathering) this.gatherStart = performance.now();
    this.wasGathering = gathering;
    $("gather-bar").style.display = gathering ? "block" : "none";
    if (gathering) $("gather-fill").style.width = `${Math.min(100, (performance.now() - this.gatherStart) / (GATHER_TIME * 10))}%`;
  }

  setPrompt(label: string | null) {
    const key = label ?? "";
    if (key === this.lastPrompt) return;
    this.lastPrompt = key;
    $("prompt").style.display = label ? "block" : "none";
    $("prompt").textContent = label ? `E  ${label}` : "";
    const btn = $("btn-interact");
    btn.textContent = label ?? "상호작용";
    btn.classList.toggle("ready", !!label);
  }

  notice(text: string) {
    const el = document.createElement("div");
    el.textContent = text;
    $("notices").append(el);
    setTimeout(() => el.remove(), 2600);
    while ($("notices").childElementCount > 4) $("notices").firstElementChild!.remove();
  }

  flashFade() {
    $("fade").classList.add("on");
    setTimeout(() => $("fade").classList.remove("on"), 700);
  }

  overlay(text: string | null) {
    $("overlay").classList.toggle("hidden", text === null);
    if (text) $("overlay").textContent = text;
  }
}

/** 데미지 숫자. 월드 위치를 매 프레임 화면으로 옮긴다. */
export class Floaters {
  private list: { el: HTMLElement; x: number; y: number; z: number; age: number }[] = [];

  add(x: number, y: number, z: number, text: string, cls: string) {
    const el = document.createElement("div");
    el.className = `floater ${cls}`;
    el.textContent = text;
    $("floaters").append(el);
    this.list.push({ el, x, y, z, age: 0 });
  }

  update(dt: number, project: (x: number, y: number, z: number) => { x: number; y: number }) {
    this.list = this.list.filter((f) => {
      f.age += dt;
      if (f.age > 0.8) { f.el.remove(); return false; }
      const s = project(f.x, f.y + f.age * 2.2, f.z);
      f.el.style.left = `${s.x}px`;
      f.el.style.top = `${s.y}px`;
      f.el.style.opacity = String(1 - f.age / 0.8);
      return true;
    });
  }
}
