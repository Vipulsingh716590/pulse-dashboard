import {
  afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild,
} from '@angular/core';

const FLIP_EVERY_MS = 4000;
const FLIP_MS = 1200;
const FIRST_FLIP_MS = 1200; // so the team chart doesn't wait a full cycle to appear
const RING_R = 70;
const RING_LENGTH = 2 * Math.PI * RING_R;

/**
 * A ₹2-style coin that tosses between heads (logo) and tails (contribution ring).
 * Pure CSS 3D; the toss itself is a Web Animations keyframe so it can tilt mid-air.
 */
@Component({
  selector: 'app-coin-flip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coin-flip.html',
  styleUrl: './coin-flip.scss',
  host: {
    '(mouseenter)': 'paused.set(true)',
    '(mouseleave)': 'paused.set(false)',
  },
})
export class CoinFlip {
  /** Web Team contribution, 0–100. */
  readonly value = input.required<number>();
  readonly caption = input("Web Team's contribution to MobiKwik");
  readonly logoSrc = input('assets/brand/mobikwik-logo.svg');
  /** Emits once, after the first toss lands. */
  readonly firstFlip = output<void>();

  private readonly coin = viewChild.required<ElementRef<HTMLElement>>('coin');
  private readonly floor = viewChild.required<ElementRef<HTMLElement>>('floor');

  protected readonly showingTails = signal(false);
  protected readonly paused = signal(false);
  protected readonly logoFailed = signal(false);
  /** Animated number and ring fill on the tails face. */
  protected readonly shown = signal(0);
  protected readonly ringLength = RING_LENGTH;
  protected readonly ringR = RING_R;
  protected readonly reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  private angle = 0;
  private flipping = false;
  private flips = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private countFrame = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => this.schedule(FIRST_FLIP_MS));
    destroyRef.onDestroy(() => {
      clearTimeout(this.timer);
      cancelAnimationFrame(this.countFrame);
    });
  }

  protected ringOffset(): number {
    return RING_LENGTH * (1 - this.shown() / 100);
  }

  /** Click = flip now, then carry on with the auto rhythm. */
  protected flipNow(): void {
    this.flip();
  }

  private schedule(delay = FLIP_EVERY_MS): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.paused()) this.schedule(400); // hover pauses: check again shortly
      else this.flip();
    }, delay);
  }

  private flip(): void {
    if (this.flipping) return;
    this.flipping = true;
    clearTimeout(this.timer);
    const toTails = !this.showingTails();
    const done = () => {
      this.flipping = false;
      if (this.flips++ === 0) this.firstFlip.emit();
      this.schedule();
    };

    if (this.reduced) {
      // Reduced motion: a plain cross-fade, handled by CSS on the faces.
      this.showingTails.set(toTails);
      this.landed(toTails);
      setTimeout(done, 400);
      return;
    }

    const from = this.angle;
    const to = from + 180;
    this.angle = to;
    const toss = this.coin().nativeElement.animate(
      [
        { transform: `translateY(0) rotateX(0deg) rotateY(${from}deg)` },
        { transform: `translateY(-46px) rotateX(18deg) rotateY(${from + 90}deg)`, offset: 0.5 },
        { transform: `translateY(0) rotateX(0deg) rotateY(${to}deg)` },
      ],
      { duration: FLIP_MS, easing: 'ease-in-out', fill: 'forwards' },
    );
    // The shadow on the floor shrinks and fades while the coin is in the air.
    this.floor().nativeElement.animate(
      [
        { transform: 'scale(1)', opacity: 0.55 },
        { transform: 'scale(0.55)', opacity: 0.22, offset: 0.5 },
        { transform: 'scale(1)', opacity: 0.55 },
      ],
      { duration: FLIP_MS, easing: 'ease-in-out' },
    );
    // Swap which side "counts" as up at the half-way point.
    setTimeout(() => this.showingTails.set(toTails), FLIP_MS / 2);
    toss.finished.then(() => {
      this.landed(toTails);
      done();
    });
  }

  /** When tails lands, fill the ring and count up from 0. */
  private landed(tails: boolean): void {
    cancelAnimationFrame(this.countFrame);
    if (!tails) {
      this.shown.set(0);
      return;
    }
    const target = this.value();
    if (this.reduced) {
      this.shown.set(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      this.shown.set(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) this.countFrame = requestAnimationFrame(tick);
    };
    this.countFrame = requestAnimationFrame(tick);
  }
}
