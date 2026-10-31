import { DOCKS, ISLAND, LANDS, LANTERN_POSTS, STORAGE, landRadius, type Land } from "@tidebound/shared";

// 화면과 같은 방향이 되도록 45도 돌린 지도
const SCALE = 2.4, OX = 192, OY = 192;
const u = (x: number, z: number) => OX + ((x - z) * Math.SQRT1_2) * SCALE;
const v = (x: number, z: number) => OY + ((x + z) * Math.SQRT1_2) * SCALE;

export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private base = document.createElement("canvas");

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.base.width = canvas.width;
    this.base.height = canvas.height;
    const b = this.base.getContext("2d")!;
    for (const l of LANDS) this.drawLand(b, l);
    b.strokeStyle = "#a57f58";
    b.lineWidth = 4;
    b.beginPath();
    b.moveTo(u(-60, 0), v(-60, 0)); b.lineTo(u(-54, 0), v(-54, 0));
    b.moveTo(u(-38, 0), v(-38, 0)); b.lineTo(u(-28.5, 0), v(-28.5, 0));
    b.stroke();
    b.setLineDash([6, 6]);
    b.lineWidth = 2;
    b.strokeStyle = "rgba(255,255,255,.4)";
    b.beginPath();
    b.moveTo(u(DOCKS.village.boatX, 0), v(DOCKS.village.boatX, 0));
    b.lineTo(u(DOCKS.island.boatX, 0), v(DOCKS.island.boatX, 0));
    b.stroke();
    b.setLineDash([]);
    b.fillStyle = "#ffb057";
    for (const p of LANTERN_POSTS) this.dot(b, p.x, p.z, 4);
    b.fillStyle = "#e6dcc6";
    b.fillRect(u(STORAGE.x, STORAGE.z) - 5, v(STORAGE.x, STORAGE.z) - 5, 10, 10);
  }

  private drawLand(b: CanvasRenderingContext2D, l: Land) {
    b.fillStyle = l === ISLAND ? "#3f5c52" : "#6b8054";
    b.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2, r = landRadius(l, a);
      const x = l.x + Math.cos(a) * r, z = l.z + Math.sin(a) * r;
      if (i === 0) b.moveTo(u(x, z), v(x, z)); else b.lineTo(u(x, z), v(x, z));
    }
    b.fill();
  }

  private dot(c: CanvasRenderingContext2D, x: number, z: number, r: number) {
    c.beginPath();
    c.arc(u(x, z), v(x, z), r, 0, Math.PI * 2);
    c.fill();
  }

  draw(me: { x: number; z: number }, ally: { x: number; z: number } | null) {
    const c = this.ctx;
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    c.drawImage(this.base, 0, 0);
    if (ally) { c.fillStyle = "#6fd0e6"; this.dot(c, ally.x, ally.z, 7); }
    c.fillStyle = "#fff"; this.dot(c, me.x, me.z, 8);
    c.fillStyle = "#ff7a4d"; this.dot(c, me.x, me.z, 5);
  }
}
