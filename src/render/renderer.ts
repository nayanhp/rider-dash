// Pseudo-3D road renderer on Canvas 2D. Reads RunState, never changes it.
// Visual-only randomness (particles, rain) lives here and may use Math.random.
import type { RunState, SimEvent } from '../sim/run';
import { drawSprite, SPRITES, type SpriteId } from './art';
import type { PowerKind } from '../sim/config';

const POWER_RING: Record<PowerKind, string> = {
  magnet: '#FF5A4E', net: '#2F8CFF', helmet: '#D99A00', nitro: '#2F8CFF', double: '#D99A00', heart: '#FF5A4E',
};
const POWER_NAMES: Record<PowerKind, string> = {
  magnet: 'Magnet!', net: 'Parcel net!', helmet: 'Helmet on!', nitro: 'Nitro!', double: '2× coins!', heart: '+1 heart!',
};
import { drawAvatarPose, drawRival, RIDER_DRAW, type RiderPose } from './riderArt';

const FONT = '"Lilita One","Baloo 2",system-ui,sans-serif';
const BUILDING_COLORS = ['#F3D9A4', '#A7D9F0', '#FFC2BD', '#C9E6B4', '#E8D2FF'];
const DRAW_DIST = 2400;
/** Far skyline height, as a fraction of the stage. */
const SKYLINE_H = 0.09;

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
  private flash = 0;
  private lean = 0;
  private lastLx = 1;
  reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = true;
  }

  /**
   * Match the canvas to its on-screen size. Setting canvas.width wipes it to black, and resize
   * callbacks run after this frame's draw, so only touch it when the size really changed.
   * Returns true when it did, so the caller can redraw before the frame is shown.
   */
  resize(): boolean {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr);
    const h = Math.round(r.height * dpr);
    this.W = r.width;
    this.H = r.height;
    if (this.canvas.width === w && this.canvas.height === h) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  /** Clear transient effects between runs. */
  reset(s: RunState) {
    this.particles = [];
    this.popups = [];
    this.rain = [];
    this.shake = 0;
    this.flash = 0;
    this.lean = 0;
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
      if (e.type === 'coin') this.burst(x, py + 40, '#FFCC2E', 6);
      else if (e.type === 'parcel') this.popup(x, py, 'Parcel +1', '#D99A00');
      else if (e.type === 'deliver') {
        const combo = e.combo > 1 ? ` ×${Math.min(3, e.combo)}` : '';
        this.popup(x, py, `Delivered ${e.parcels}!${combo}`, '#3A9A1E');
        this.popup(x, py + 34, `+${e.coins} ₹`, '#D99A00');
        this.burst(x, py + 20, '#5DD039', 20);
        if (!this.reduceMotion) navigator.vibrate?.(20);
      } else if (e.type === 'hit') {
        if (!this.reduceMotion) {
          this.shake = 0.3;
          this.flash = 0.18;
          navigator.vibrate?.(80);
        }
        this.burst(x, g.yP - 40, '#FF5A4E', 16);
        const what = e.kind === 'dog' ? 'The dog caught you!' : e.lostParcel ? 'Parcel dropped!' : 'Ouch!';
        this.popup(x, py, what, '#C23A30');
      } else if (e.type === 'bump') {
        if (!this.reduceMotion) {
          this.shake = Math.max(this.shake, 0.15);
          navigator.vibrate?.(30);
        }
        this.popup(x, py, e.kind === 'hole' ? 'Pothole! Slowed down' : 'Speed breaker! Slowed down', '#D97A00');
      } else if (e.type === 'dog') {
        if (e.phase === 'start') this.popup(x, py - 30, 'Dog chasing! Keep your speed up', '#C23A30');
        else this.popup(x, py - 30, 'Lost the dog!', '#3A9A1E');
      } else if (e.type === 'power') {
        this.popup(x, py - 10, POWER_NAMES[e.kind], POWER_RING[e.kind]);
        this.burst(x, py + 10, POWER_RING[e.kind], 14);
      } else if (e.type === 'shield') {
        this.popup(x, py, 'Helmet saved you!', '#D99A00');
        this.burst(x, g.yP - 60, '#FFCC2E', 18);
      } else if (e.type === 'splash') {
        this.popup(x, py, 'Splash! Steering is slippery', '#2F8CFF');
        this.burst(x, g.yP - 20, '#4FB3F6', 14);
      } else if (e.type === 'stolen') {
        this.popup(x, py, 'A monkey grabbed a parcel!', '#C23A30');
      } else if (e.type === 'tip') {
        this.popup(x, py + 64, `Hot food tip +${e.coins} ₹`, '#D97A00');
      } else if (e.type === 'cold') {
        this.popup(x, py - 30, 'The food went cold', '#6F7FA0');
      } else if (e.type === 'thief') {
        const msg = {
          arrive: ['Parcel thief! Swipe into them', '#C23A30'],
          shove: ['Shoved off! +coins', '#3A9A1E'],
          steal: ['Stolen! It fell up ahead', '#C23A30'],
          dodge: ['Dodged the thief', '#3A9A1E'],
          outran: ['Left the thief behind', '#2F8CFF'],
        }[e.phase];
        this.popup(x, py - 30, msg[0], msg[1]);
        if (e.phase === 'shove') this.burst(x, py + 20, '#FFCC2E', 12);
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

  private text(t: string, x: number, y: number, size: number, color: string, stroke?: string) {
    const c = this.ctx;
    c.font = `400 ${Math.max(1, size)}px ${FONT}`;
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

  private laneWidth(s: number) {
    return this.geo().LW * s;
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

    // Sky. The only gradient in the picture.
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

    const skyH = H * SKYLINE_H;
    const skyW = skyH * (SPRITES.skyline.vbW / SPRITES.skyline.vbH);
    if (skyW >= 1) {
      // Each city shows its own landmark, centred behind the road. Endless uses Bengaluru.
      const cityId = s.cfg.cityId ?? 'bengaluru';
      const skyId = (`skyline-${cityId}` in SPRITES ? `skyline-${cityId}` : 'skyline') as SpriteId;
      let x0 = W / 2 - skyW / 2;
      while (x0 > 0) x0 -= skyW;
      for (let x = x0; x < W; x += skyW) drawSprite(c, skyId, x, g.y0, skyW);
      if (night) {
        c.fillStyle = 'rgba(27,31,69,.55)';
        c.fillRect(-20, g.y0 - skyH, W + 40, skyH + 2);
      }
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
          drawSprite(c, 'tree', tp.x, tp.y, SPRITES.tree.draw * this.laneWidth(tp.s));
        }
      }
    }

    // Kolkata: tram rails along the rail lane.
    if (s.cfg.tramLane !== undefined) {
      c.strokeStyle = night ? 'rgba(200,210,230,.55)' : 'rgba(42,47,90,.45)';
      for (const off of [-0.18, 0.18]) {
        const a = this.proj(-200, s.cfg.tramLane + off), b = this.proj(DRAW_DIST, s.cfg.tramLane + off);
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
    }

    // Road objects, far to near
    const objs = s.objs.filter((o) => o.z - s.dist < DRAW_DIST && (!o.done || o.kind === 'drop')).sort((a, b) => b.z - a.z);
    for (const o of objs) {
      const rz = o.z - s.dist;
      const p = this.proj(rz, o.lx);
      const lw = this.laneWidth(p.s);
      switch (o.kind) {
        case 'drop': {
          c.save();
          if (o.done) c.globalAlpha = 0.35;
          const padW = SPRITES.drop.draw * lw;
          drawSprite(c, 'drop', p.x, p.y, padW);
          c.restore();
          if (!o.done) {
            drawSprite(c, 'house', p.x, p.y - 40 * p.s, SPRITES.house.draw * lw);
            // The pad art already has an arrow. The word sits in the green above it.
            this.text('DROP', p.x, p.y - padW * 0.16, 28 * p.s, '#FFFAF0', '#3A9A1E');
          }
          break;
        }
        case 'coin': {
          const bob = this.reduceMotion ? 0 : Math.sin((s.dist + o.z) * 0.08) * 5 * p.s;
          drawSprite(c, 'coin', p.x, p.y - 34 * p.s + bob, SPRITES.coin.draw * lw);
          break;
        }
        case 'parcel':
          if (o.hot) this.steam(p.x, p.y - 36 * p.s - SPRITES.parcel.draw * lw * 0.55, lw, s.tick);
          drawSprite(c, 'parcel', p.x, p.y - 36 * p.s, SPRITES.parcel.draw * lw);
          break;
        case 'puddle':
        case 'barrier':
        case 'monkey':
        case 'tram':
          drawSprite(c, o.kind, p.x, p.y, SPRITES[o.kind].draw * lw);
          break;
        case 'hole':
          drawSprite(c, 'hole', p.x, p.y, SPRITES.hole.draw * lw);
          break;
        case 'bump':
          drawSprite(c, 'bump', p.x, p.y, SPRITES.bump.draw * lw);
          break;
        case 'power': {
          if (!o.power) break;
          const r = lw * 0.32;
          const cy = p.y - lw * 0.4 + (this.reduceMotion ? 0 : Math.sin(s.tick * 0.12 + o.id) * 4 * p.s);
          const pulse = this.reduceMotion ? 1 : 1 + Math.sin(s.tick * 0.2) * 0.06;
          c.save();
          c.fillStyle = 'rgba(255,250,240,0.92)';
          c.strokeStyle = POWER_RING[o.power];
          c.lineWidth = Math.max(2, r * 0.16);
          c.beginPath();
          c.arc(p.x, cy, r * pulse, 0, Math.PI * 2);
          c.fill();
          c.stroke();
          c.restore();
          drawSprite(c, o.power, p.x, cy, SPRITES[o.power].draw * lw);
          break;
        }
        case 'walker':
          drawSprite(c, 'walker', p.x, p.y, SPRITES.walker.draw * lw);
          break;
        case 'scooter':
          drawSprite(c, 'scooter', p.x, p.y, SPRITES.scooter.draw * lw);
          break;
        default: {
          const id: SpriteId = o.kind === 'auto' || o.kind === 'autoSwerve' ? 'auto' : o.kind === 'car' ? 'car' : 'cow';
          drawSprite(c, id, p.x, p.y, SPRITES[id].draw * lw);
        }
      }
      // An indicator flashes before a swerve or a drift.
      if (o.move && (o.move.phase === 'warn' || o.move.phase === 'move') && o.kind !== 'walker') {
        this.indicator(p.x, p.y - 0.95 * lw, Math.sign(o.move.to - o.lx), lw, s.tick);
      }
    }

    if (s.cfg.fog) this.drawFog(g.y0, g.yP);
    this.drawRider(s, g.yP);
    if (s.braking) this.drawBrakeLight(s, g.yP);
    if (s.powers.nitro) this.drawNitro(s, g.yP);
    if (s.dog) this.drawDog(s, g.yP);
    if (s.thief) this.drawThief(s);

    if (night) {
      c.fillStyle = 'rgba(10,12,40,.25)';
      c.fillRect(-20, -20, W + 40, H + 40);
    }
    if (rain && !this.reduceMotion) this.drawRain(dt);
    this.drawEffects(dt);
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt);
      c.fillStyle = `rgba(255,90,78,${Math.min(0.45, this.flash * 2)})`;
      c.fillRect(-20, -20, W + 40, H + 40);
    }
    c.restore();
  }

  /** The rival rider beside you. While it lines up its lunge, a red "!" flashes over it. */
  private drawThief(s: RunState) {
    const th = s.thief;
    if (!th) return;
    const p = this.proj(th.offset, th.lane);
    const drawW = RIDER_DRAW * this.geo().LW * p.s;
    drawRival(this.ctx, p.x, p.y, drawW);
    if (th.phase === 'alongside' && (this.reduceMotion || Math.floor(s.tick / 6) % 2 === 0)) {
      this.text('!', p.x, p.y - drawW * 1.35, drawW * 0.45, '#FFFAF0', '#C23A30');
    }
  }

  /** Hot food: three wavy steam lines. */
  private steam(x: number, y: number, lw: number, tick: number) {
    const c = this.ctx;
    const h = lw * 0.28;
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = Math.max(1.5, lw * 0.025);
    c.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const sx = x + i * lw * 0.09;
      const wob = this.reduceMotion ? 0 : Math.sin(tick * 0.2 + i) * lw * 0.02;
      c.beginPath();
      c.moveTo(sx, y);
      c.quadraticCurveTo(sx + lw * 0.04 + wob, y - h / 2, sx - wob, y - h);
      c.stroke();
    }
    c.restore();
  }

  /** Delhi fog: the far road fades into white; the near road stays clear. */
  private drawFog(y0: number, yP: number) {
    const c = this.ctx;
    const clear = y0 + (yP - y0) * 0.42;
    const g = c.createLinearGradient(0, y0 - 40, 0, clear);
    g.addColorStop(0, 'rgba(236,240,245,0.97)');
    g.addColorStop(0.75, 'rgba(236,240,245,0.85)');
    g.addColorStop(1, 'rgba(236,240,245,0)');
    c.fillStyle = g;
    c.fillRect(-20, y0 - 40, this.W + 40, clear - y0 + 40);
  }

  /** Blue exhaust flare and speed streaks while nitro runs. */
  private drawNitro(s: RunState, yP: number) {
    const c = this.ctx;
    const x = this.proj(0, s.lx).x;
    const lw = this.laneWidth(1);
    const y = yP - lw * 0.05;
    const g = c.createRadialGradient(x, y, 0, x, y, lw * 0.45);
    g.addColorStop(0, 'rgba(79,179,246,0.8)');
    g.addColorStop(1, 'rgba(79,179,246,0)');
    c.fillStyle = g;
    c.fillRect(x - lw * 0.45, y - lw * 0.45, lw * 0.9, lw * 0.9);
    if (this.reduceMotion) return;
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const sx = ((i * 97 + s.tick * 23) % this.W);
      const sy = this.H * 0.45 + ((i * 131 + s.tick * 41) % (this.H * 0.5));
      c.moveTo(sx, sy);
      c.lineTo(sx, sy + 40);
    }
    c.stroke();
  }

  /** Red glow at the tail light while the brake is held. */
  private drawBrakeLight(s: RunState, yP: number) {
    const c = this.ctx;
    const x = this.proj(0, s.lx).x;
    const lw = this.laneWidth(1);
    const y = yP - lw * 0.22;
    const g = c.createRadialGradient(x, y, 0, x, y, lw * 0.3);
    g.addColorStop(0, 'rgba(255,70,60,0.85)');
    g.addColorStop(1, 'rgba(255,70,60,0)');
    c.fillStyle = g;
    c.fillRect(x - lw * 0.3, y - lw * 0.3, lw * 0.6, lw * 0.6);
  }

  /** A flashing orange arrow pointing the way a vehicle is about to move. */
  private indicator(x: number, y: number, dir: number, lw: number, tick: number) {
    if (dir === 0 || Math.floor(tick / 8) % 2) return;
    const c = this.ctx;
    const r = Math.max(6, lw * 0.14);
    c.save();
    c.translate(x + dir * lw * 0.32, y);
    c.scale(dir, 1);
    c.fillStyle = '#FF9F1A';
    c.strokeStyle = '#2A2F5A';
    c.lineWidth = Math.max(1.5, r * 0.25);
    c.beginPath();
    c.moveTo(-r, -r * 0.7);
    c.lineTo(r, 0);
    c.lineTo(-r, r * 0.7);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  /** The chasing dog, at the bottom of the screen behind the rider. Closer means bigger and higher. */
  private drawDog(s: RunState, yP: number) {
    const d = s.dog;
    if (!d) return;
    const close = 1 - Math.max(0, Math.min(1, d.gap / s.tuning.dogStartGap));
    const lw = this.laneWidth(1);
    const x = this.proj(0, s.lx).x - lw * 0.55;
    const bounce = this.reduceMotion ? 0 : Math.abs(Math.sin(s.tick * 0.35)) * 6;
    const y = this.H + 10 - close * (this.H - yP + 30) - bounce;
    drawSprite(this.ctx, 'dog', x, y, SPRITES.dog.draw * lw * (0.8 + close * 0.4));
  }

  private drawRider(s: RunState, yP: number) {
    const c = this.ctx;
    const x = this.proj(0, s.lx).x;
    const jt = s.tuning.jumpTicks;
    const hop = s.jumpT > 0 ? Math.sin((1 - s.jumpT / jt) * Math.PI) * 70 : 0;
    const drawW = RIDER_DRAW * this.geo().LW;
    const y = yP - hop * (drawW / 96);

    c.fillStyle = 'rgba(42,47,90,.22)';
    c.beginPath();
    c.ellipse(x, yP + 6, Math.max(10, drawW * 0.28 - hop * 0.12), Math.max(4, drawW * 0.055), 0, 0, Math.PI * 2);
    c.fill();
    // Blink while invulnerable
    if (s.invulnT > 0 && Math.floor(s.invulnT / 5) % 2) return;

    const pose: RiderPose = this.lean < -0.08 ? 'left' : this.lean > 0.08 ? 'right' : 'back';
    drawAvatarPose(c, pose, x, y, drawW);
  }

  private drawRain(dt: number) {
    const c = this.ctx;
    while (this.rain.length < 60) this.rain.push({ x: Math.random() * this.W, y: -Math.random() * this.H });
    c.strokeStyle = 'rgba(255,250,240,.55)';
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
      this.text(p.text, p.x, p.y, 24, '#FFFAF0', p.color);
    }
    this.popups = this.popups.filter((p) => p.life > 0);
    c.globalAlpha = 1;
  }
}
