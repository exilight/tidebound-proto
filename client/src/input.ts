// 키보드, 마우스, 터치를 "이동 방향 + 동작" 으로 정리한다.
const SQ = Math.SQRT1_2;

export class Input {
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  attackHeld = false;
  onInteract = () => {};
  onTap = (_x: number, _y: number) => {};
  onZoom = () => {};

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === "KeyE") this.onInteract();
      if (e.code === "Space" || e.code === "KeyF") { this.attackHeld = true; e.preventDefault(); }
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
      if (e.code === "Space" || e.code === "KeyF") this.attackHeld = false;
    });
    window.addEventListener("blur", () => { this.keys.clear(); this.attackHeld = false; });

    canvas.addEventListener("pointerdown", (e) => { if (e.button === 0) this.onTap(e.clientX, e.clientY); });
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); this.onZoom(); }, { passive: false });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    this.bindJoystick();
    this.bindHold("btn-attack", (down) => { this.attackHeld = down; });
    document.getElementById("btn-interact")!.addEventListener("pointerdown", (e) => { e.preventDefault(); this.onInteract(); });
  }

  private bindHold(id: string, set: (down: boolean) => void) {
    const el = document.getElementById(id)!;
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); set(true); });
    for (const ev of ["pointerup", "pointercancel"]) el.addEventListener(ev, () => set(false));
  }

  private bindJoystick() {
    const pad = document.getElementById("joystick")!, knob = document.getElementById("joy-knob")!;
    let active = -1;
    const update = (e: PointerEvent) => {
      const r = pad.getBoundingClientRect(), max = r.width / 2;
      let dx = (e.clientX - (r.left + max)) / max, dy = (e.clientY - (r.top + max)) / max;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      const dead = len < 0.15;
      this.joy.x = dead ? 0 : dx;
      this.joy.y = dead ? 0 : dy;
      knob.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
    };
    const release = () => { active = -1; this.joy.x = this.joy.y = 0; knob.style.transform = ""; };
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); active = e.pointerId; pad.setPointerCapture(e.pointerId); update(e); });
    pad.addEventListener("pointermove", (e) => { if (e.pointerId === active) update(e); });
    for (const ev of ["pointerup", "pointercancel"]) pad.addEventListener(ev, release);
  }

  /** 화면 기준 입력을 쿼터뷰 월드 방향으로 바꾼다 */
  moveDir() {
    let sx = this.joy.x, sy = this.joy.y;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) sy -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) sy += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) sx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) sx += 1;
    const len = Math.hypot(sx, sy);
    if (len > 1) { sx /= len; sy /= len; }
    return { x: (sx + sy) * SQ, z: (sy - sx) * SQ };
  }
}
