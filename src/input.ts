// Turns swipes, taps and keys into sim commands. Commands queue up and the game loop
// drains them at the start of the next tick, so input never touches state mid-step.
import type { Command } from './sim/run';

const SWIPE_PX = 28;
const KEYS: Record<string, Command> = {
  ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump',
};

export class Input {
  /** Input is ignored while menus are showing. */
  enabled = false;
  private queue: Command[] = [];
  private start: { x: number; y: number } | null = null;
  private swiped = false;

  /** riderX returns the rider's screen x, so a tap can mean "move toward where I tapped". */
  constructor(target: HTMLElement, private riderX: () => number) {
    target.addEventListener('pointerdown', (e) => {
      target.setPointerCapture?.(e.pointerId);
      this.start = { x: e.clientX, y: e.clientY };
      this.swiped = false;
    });
    target.addEventListener('pointermove', (e) => {
      if (!this.start || this.swiped) return;
      const dx = e.clientX - this.start.x, dy = e.clientY - this.start.y;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) this.push(dx > 0 ? 'right' : 'left');
      else if (dy < -SWIPE_PX && Math.abs(dy) > Math.abs(dx)) this.push('jump');
      else return;
      this.swiped = true;
    });
    target.addEventListener('pointerup', (e) => {
      if (this.start && !this.swiped) {
        const x = e.clientX - target.getBoundingClientRect().left;
        this.push(x > this.riderX() ? 'right' : 'left');
      }
      this.start = null;
    });
    target.addEventListener('pointercancel', () => (this.start = null));
    window.addEventListener('keydown', (e) => {
      const cmd = KEYS[e.key];
      if (!cmd || e.repeat || !this.enabled) return;
      e.preventDefault();
      this.push(cmd);
    });
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
