// Turns swipes, taps and keys into sim commands. Commands queue up and the game loop
// drains them at the start of the next tick, so input never touches state mid-step.
import type { Command } from './sim/run';

const SWIPE_PX = 28;
const KEYS: Record<string, Command> = {
  ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump',
  ArrowDown: 'brakeOn', s: 'brakeOn',
};

export class Input {
  /** Input is ignored while menus are showing. */
  enabled = false;
  private queue: Command[] = [];
  private start: { x: number; y: number } | null = null;
  private swiped = false;
  /** A swipe down, or ↓, held: the brake stays on until the finger lifts or the key is released. */
  private braking = false;

  /** riderX returns the rider's screen x, so a tap can mean "move toward where I tapped". */
  constructor(target: HTMLElement, private riderX: () => number) {
    target.addEventListener('pointerdown', (e) => {
      try {
        target.setPointerCapture?.(e.pointerId);
      } catch {
        /* The pointer can already be gone in an iframe. The swipe still works. */
      }
      this.start = { x: e.clientX, y: e.clientY };
      this.swiped = false;
    });
    target.addEventListener('pointermove', (e) => {
      if (!this.start || this.swiped) return;
      const dx = e.clientX - this.start.x, dy = e.clientY - this.start.y;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) this.push(dx > 0 ? 'right' : 'left');
      else if (dy < -SWIPE_PX && Math.abs(dy) > Math.abs(dx)) this.push('jump');
      else if (dy > SWIPE_PX && Math.abs(dy) > Math.abs(dx)) this.brake(true);
      else return;
      this.swiped = true;
    });
    target.addEventListener('pointerup', (e) => {
      if (this.start && !this.swiped) {
        const x = e.clientX - target.getBoundingClientRect().left;
        this.push(x > this.riderX() ? 'right' : 'left');
      }
      this.start = null;
      this.brake(false);
    });
    target.addEventListener('pointercancel', () => {
      this.start = null;
      this.brake(false);
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      const cmd = KEYS[e.key];
      if (!cmd || e.repeat || !this.enabled) return;
      e.preventDefault();
      if (cmd === 'brakeOn') this.brake(true);
      else this.push(cmd);
    });
    window.addEventListener('keyup', (e) => {
      if (KEYS[e.key] === 'brakeOn') this.brake(false);
    });
    window.addEventListener('blur', () => this.brake(false));
  }

  private brake(on: boolean) {
    if (on === this.braking) return;
    if (on && !this.enabled) return;
    this.braking = on;
    // Releasing always reaches the sim, even mid-pause, so the brake can never stick on.
    if (on) this.push('brakeOn');
    else this.queue.push('brakeOff');
  }

  /** Let go of the brake, e.g. when a run pauses or resumes. */
  releaseBrake() {
    this.braking = false;
    this.queue.push('brakeOff');
  }

  private push(c: Command) {
    if (this.enabled) this.queue.push(c);
  }

  drain(): Command[] {
    const q = this.queue;
    this.queue = [];
    return q;
  }
}
