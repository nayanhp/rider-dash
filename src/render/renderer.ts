// Pseudo-3D road renderer on Canvas 2D. Reads RunState, never changes it.
// Visual-only randomness (particles, rain) lives here and may use Math.random.
import type { RunState, SimEvent } from '../sim/run';

export interface Avatar {
  jacket: string;
  helmet: string;
  skin: string;
}

const DEFAULT_AVATAR: Avatar = { jacket: '#FF5A4E', helmet: '#FFCC2E', skin: '#E3AC7E' };
const FONT = '"Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const BUILDING_COLORS = ['#F3D9A4', '#A7D9F0', '#FFC2BD', '#C9E6B4', '#E8D2FF'];
const DRAW_DIST = 2400;

interface Particle { x: number; y: number; vx: number; vy: number; color: string; life: number }
interface Popup { x: number; y: number; text: string; color: string; life: number }

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private rain: { x: number; y: number }[] = [];
  private shake = 0;
  private lean = 0;
  private lastLx = 1;
  private sprites = new Map<string, HTMLCanvasElement>();
  avatar = DEFAULT_AVATAR;
  reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = r.width;
    this.H = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Clear transient effects between runs. */
  reset(s: RunState) {
    this.particles = [];
    this.popups = [];
    this.rain = [];
    this.shake = 0;
    this.lastLx = s.lx;
  }

  private geo() {
    const y0 = this.H * 0.3;
    const yP = this.H - Math.max(70, this.H * 0.14);
    return { y0, yP, LW: this.W * 0.27, D: 340 };
  }

  private proj(z: number, lane: number) {
    const g = this.geo();
    const s = g.D / (Math.max(-g.D * 0.9, z) + g.D);
    return { x: this.W / 2 + (lane - 1) * g.LW * s, y: g.y0 + (g.yP - g.y0) * s, s };
  }

  /** The rider's screen x, in CSS pixels. */
  riderX(s: RunState): number {
    return this.proj(0, s.lx).x;
  }

  /** Turn sim events into juice: particles, popups, screen shake. */
  onEvents(s: RunState, events: readonly SimEvent[]) {
    const g = this.geo();
    const x = this.proj(0, s.lx).x;
    const py = g.yP - 120;
    for (const e of events) {
      if (e.type === 'coin') this.burst(x, py + 40, '#FFCC2E', 4);
      else if (e.type === 'parcel') this.popup(x, py, '📦 +1', '#FF9F1A');
      else if (e.type === 'deliver') {
        const combo = e.combo > 1 ? ` ×${Math.min(3, e.combo)}` : '';
        this.popup(x, py, `Delivered ${e.parcels}!${combo}`, '#3A9A1E');
        this.popup(x, py + 34, `+${e.coins} ₹`, '#D99A00');
        this.burst(x, py + 20, '#5DD039', 20);
      } else if (e.type === 'hit') {
        this.shake = 0.3;
        this.burst(x, g.yP - 40, '#FF5A4E', 16);
        this.popup(x, py, e.lostParcel ? 'Parcel dropped!' : 'Ouch!', '#E0392E');
        navigator.vibrate?.(80);
      } else if (e.type === 'revive') {
        this.popup(x, py, 'Revived!', '#3A9A1E');
        this.burst(x, py + 20, '#5DD039', 18);
      }
    }
  }

  private burst(x: number, y: number, color: string, n: number) {
    if (this.reduceMotion) return;
    for (let i = 0; i < n; i++) {
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 280, vy: -40 - Math.random() * 160, color, life: 0.4 + Math.random() * 0.4 });
    }
  }

  private popup(x: number, y: number, text: string, color: string) {
    this.popups.push({ x, y, text, color, life: 1 });
  }

  /** Emoji are rasterised once and drawn as images: much cheaper than fillText every frame. */
  private sprite(ch: string): HTMLCanvasElement {
    let c = this.sprites.get(ch);
    if (!c) {
      const size = 128;
      c = document.createElement('canvas');
      c.width = c.height = size;
      const x = c.getContext('2d')!;
      x.font = `${size * 0.82}px ${EMOJI_FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(ch, size / 2, size * 0.56);
      this.sprites.set(ch, c);
    }
    return c;
  }

  private emoji(ch: string, x: number, y: number, size: number) {
    if (size < 2) return;
    this.ctx.drawImage(this.sprite(ch), x - size / 2, y - size / 2, size, size);
  }

  private text(t: string, x: number, y: number, size: number, color: string, stroke?: string) {
    const c = this.ctx;
    c.font = `bold ${Math.max(1, size)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (stroke) {
      c.lineWidth = Math.max(2, size / 6);
      c.strokeStyle = stroke;
      c.lineJoin = 'round';
      c.strokeText(t, x, y);
    }
    c.fillStyle = color;
    c.fillText(t, x, y);
  }

  private rr(x: number, y: number, w: number, h: number, r: number) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(x, y, w, h, Math.max(0, r));
  }

  /** dt is real seconds since the last frame; used for effects only. */
  render(s: RunState, dt: number) {
    const c = this.ctx;
    const { W, H } = this;
    const g = this.geo();
    const night = !!s.cfg.night;
    const rain = !!s.cfg.rain;

    const dLx = s.lx - this.lastLx;
    this.lastLx = s.lx;
    this.lean += ((dLx / Math.max(dt, 0.001)) * 0.05 - this.lean) * Math.min(1, dt * 20);

    c.save();
    if (this.shake > 0 && !this.reduceMotion) {
      this.shake = Math.max(0, this.shake - dt);
      const m = this.shake * 30;
      c.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // Sky and skyline
    const sky = c.createLinearGradient(0, 0, 0, g.y0);
    sky.addColorStop(0, night ? '#0E1233' : rain ? '#6F8AA6' : '#4FB3F6');
    sky.addColorStop(1, night ? '#2A2F5A' : rain ? '#A9BACB' : '#BDE7FF');
    c.fillStyle = sky;
    c.fillRect(-20, -20, W + 40, g.y0 + 22);
    if (night) {
      c.fillStyle = '#FFF6C9';
      c.beginPath();
      c.arc(W * 0.8, g.y0 * 0.35, 18, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = night ? '#1B1F45' : '#8FB9D9';
    for (let i = 0; i < 14; i++) {
      const bw = W / 12, bh = 20 + ((i * 37) % 50);
      c.fillRect(i * bw - 6, g.y0 - bh, bw - 4, bh);
    }
    c.fillStyle = night ? '#24304A' : '#7FC35E';
    c.fillRect(-20, g.y0, W + 40, H - g.y0 + 20);

    // Road surface
    const edge = (z: number, side: number) => this.proj(z, 1 + side * 1.55);
    const n1 = edge(-250, -1), n2 = edge(-250, 1), f1 = edge(6000, -1), f2 = edge(6000, 1);
    c.fillStyle = night ? '#3A3F55' : '#5B6075';
    c.beginPath();
    c.moveTo(n1.x, n1.y);
    c.lineTo(f1.x, f1.y);
    c.lineTo(f2.x, f2.y);
    c.lineTo(n2.x, n2.y);
    c.closePath();
    c.fill();

    // Kerbs and lane dashes, scrolling with distance
    const off = s.dist % 160;
    c.lineCap = 'butt';
    for (let z = DRAW_DIST - off; z > -200; z -= 160) {
      const stripe = Math.floor((z + s.dist) / 160) % 2;
      for (const side of [-1, 1]) {
        const a = edge(z, side), b = edge(z + 80, side);
        c.strokeStyle = stripe ? '#FF5A4E' : '#FFFFFF';
        c.lineWidth = Math.max(1, 9 * a.s);
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
      for (const ln of [0.5, 1.5]) {
        const a = this.proj(z, ln), b = this.proj(z + 70, ln);
        c.strokeStyle = 'rgba(255,255,255,.85)';
        c.lineWidth = Math.max(1, 6 * a.s);
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
    }

    // Roadside buildings and trees, far to near
    const bOff = s.dist % 300;
    for (let z = DRAW_DIST + 300 - bOff; z > -300; z -= 300) {
      const idx = Math.abs(Math.floor((z + s.dist) / 300));
      for (const side of [-1, 1]) {
        const p = this.proj(z, 1 + side * 2.6);
        const w = 230 * p.s, h = (150 + ((idx * 53) % 90)) * p.s;
        c.fillStyle = night ? '#2B3150' : BUILDING_COLORS[(idx + (side > 0 ? 2 : 0)) % 5];
        this.rr(p.x - w / 2, p.y - h, w, h, 6 * p.s);
        c.fill();
        c.fillStyle = night ? 'rgba(255,214,107,.85)' : 'rgba(255,255,255,.7)';
        for (let wy = p.y - h + 14 * p.s; wy < p.y - 22 * p.s; wy += 30 * p.s)
          for (let wx = p.x - w / 2 + 14 * p.s; wx < p.x + w / 2 - 20 * p.s; wx += 34 * p.s) c.fillRect(wx, wy, 14 * p.s, 14 * p.s);
        if (idx % 3 === 0) {
          const tp = this.proj(z + 120, 1 + side * 1.95);
          this.emoji('🌳', tp.x, tp.y - 40 * tp.s, 90 * tp.s);
        }
      }
    }

    // Road objects, far to near
    const objs = s.objs.filter((o) => o.z - s.dist < DRAW_DIST && (!o.done || o.kind === 'drop')).sort((a, b) => b.z - a.z);
    for (const o of objs) {
      const rz = o.z - s.dist;
      const p = this.proj(rz, o.lane);
      switch (o.kind) {
        case 'drop': {
          const a = this.proj(rz - 50, o.lane - 0.45), b = this.proj(rz - 50, o.lane + 0.45);
          const d = this.proj(rz + 50, o.lane + 0.45), e = this.proj(rz + 50, o.lane - 0.45);
          c.fillStyle = o.done ? 'rgba(93,208,57,.35)' : 'rgba(93,208,57,.9)';
          c.beginPath();
          c.moveTo(a.x, a.y);
          c.lineTo(b.x, b.y);
          c.lineTo(d.x, d.y);
          c.lineTo(e.x, e.y);
          c.closePath();
          c.fill();
          if (!o.done) {
            this.text('DROP', p.x, p.y, 34 * p.s, '#fff', '#3A9A1E');
            this.emoji('🏠', p.x, p.y - 70 * p.s, 70 * p.s);
          }
          break;
        }
        case 'coin':
          c.fillStyle = '#FFCC2E';
          c.beginPath();
          c.ellipse(p.x, p.y - 34 * p.s, 15 * p.s, 17 * p.s, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = '#D99A00';
          c.lineWidth = 3 * p.s;
          c.stroke();
          this.text('₹', p.x, p.y - 33 * p.s, 18 * p.s, '#B97800');
          break;
        case 'parcel':
          this.emoji('📦', p.x, p.y - 36 * p.s, 64 * p.s);
          break;
        case 'hole':
          c.fillStyle = '#23252F';
          c.beginPath();
          c.ellipse(p.x, p.y, 70 * p.s, 22 * p.s, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = '#7A7F92';
          c.lineWidth = 3 * p.s;
          c.stroke();
          break;
        case 'bump':
          c.fillStyle = '#FFCC2E';
          this.rr(p.x - 80 * p.s, p.y - 16 * p.s, 160 * p.s, 18 * p.s, 8 * p.s);
          c.fill();
          c.fillStyle = '#2A2F5A';
          for (let k = -3; k <= 3; k += 2) c.fillRect(p.x + k * 20 * p.s - 6 * p.s, p.y - 16 * p.s, 12 * p.s, 18 * p.s);
          break;
        default:
          c.fillStyle = 'rgba(0,0,0,.18)';
          c.beginPath();
          c.ellipse(p.x, p.y, 62 * p.s, 14 * p.s, 0, 0, Math.PI * 2);
          c.fill();
          this.emoji(o.kind === 'auto' ? '🛺' : o.kind === 'car' ? '🚗' : '🐄', p.x, p.y - 52 * p.s, 120 * p.s);
      }
    }

    this.drawRider(s, g.yP);

    if (night) {
      c.fillStyle = 'rgba(10,12,40,.25)';
      c.fillRect(-20, -20, W + 40, H + 40);
    }
    if (rain && !this.reduceMotion) this.drawRain(dt);
    this.drawEffects(dt);
    c.restore();
  }

  private drawRider(s: RunState, yP: number) {
    const c = this.ctx;
    const { jacket: J, helmet: Hc, skin: Sk } = this.avatar;
    const x = this.proj(0, s.lx).x;
    const jt = s.tuning.jumpTicks;
    const hop = s.jumpT > 0 ? Math.sin((1 - s.jumpT / jt) * Math.PI) * 70 : 0;
    const k = Math.min(1.25, this.W / 360);
    const y = yP - hop;

    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath();
    c.ellipse(x, yP + 26 * k, (46 - hop * 0.25) * k, 11 * k, 0, 0, Math.PI * 2);
    c.fill();
    // Blink while invulnerable
    if (s.invulnT > 0 && Math.floor(s.invulnT / 5) % 2) return;

    c.save();
    c.translate(x, y);
    c.rotate(Math.max(-0.25, Math.min(0.25, this.lean)));
    c.scale(k, k);
    // Scooter: rear wheel, body, tail light
    c.fillStyle = '#1E1E26';
    this.rr(-11, 2, 22, 30, 9);
    c.fill();
    c.fillStyle = '#E04A3F';
    this.rr(-30, -18, 60, 30, 12);
    c.fill();
    c.fillStyle = '#FFE08A';
    this.rr(-9, -4, 18, 8, 3);
    c.fill();
    // Handlebars and arms
    c.strokeStyle = '#1E1E26';
    c.lineWidth = 5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-40, -52);
    c.lineTo(-24, -52);
    c.moveTo(24, -52);
    c.lineTo(40, -52);
    c.stroke();
    c.strokeStyle = J;
    c.lineWidth = 11;
    c.beginPath();
    c.moveTo(-22, -70);
    c.lineTo(-36, -54);
    c.moveTo(22, -70);
    c.lineTo(36, -54);
    c.stroke();
    c.fillStyle = Sk;
    c.beginPath();
    c.arc(-38, -53, 5, 0, Math.PI * 2);
    c.arc(38, -53, 5, 0, Math.PI * 2);
    c.fill();
    // Body, delivery box with carried parcels, neck, helmet
    c.fillStyle = J;
    this.rr(-24, -84, 48, 50, 14);
    c.fill();
    c.fillStyle = '#FFCC2E';
    this.rr(-30, -104, 60, 56, 9);
    c.fill();
    c.fillStyle = '#E8AE00';
    c.fillRect(-30, -86, 60, 5);
    this.text('DS', 0, -68, 18, '#3A2A12');
    for (let i = 0; i < s.carry; i++) {
      c.fillStyle = '#B98536';
      this.rr(-24 + i * 17, -100, 14, 12, 3);
      c.fill();
    }
    c.fillStyle = Sk;
    c.fillRect(-7, -112, 14, 10);
    c.fillStyle = Hc;
    c.beginPath();
    c.arc(0, -124, 19, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.fillRect(-19, -122, 38, 5);
    c.restore();
  }

  private drawRain(dt: number) {
    const c = this.ctx;
    while (this.rain.length < 60) this.rain.push({ x: Math.random() * this.W, y: -Math.random() * this.H });
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = 1.5;
    c.beginPath();
    for (const d of this.rain) {
      d.y += 900 * dt;
      d.x -= 120 * dt;
      if (d.y > this.H) {
        d.y = -10;
        d.x = Math.random() * (this.W + 100);
      }
      c.moveTo(d.x, d.y);
      c.lineTo(d.x - 6, d.y + 16);
    }
    c.stroke();
  }

  private drawEffects(dt: number) {
    const c = this.ctx;
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      c.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      c.fillStyle = p.color;
      c.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) {
      p.life -= dt;
      p.y -= 50 * dt;
      c.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      this.text(p.text, p.x, p.y, 24, '#fff', p.color);
    }
    this.popups = this.popups.filter((p) => p.life > 0);
    c.globalAlpha = 1;
  }
}
