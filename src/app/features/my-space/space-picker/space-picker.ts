import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TeamStore } from '../../../core/services/team-store.service';
import { ViewingAsService } from '../../../core/services/viewing-as.service';
import { StatusDot } from '../../../shared/status-dot/status-dot';

/** Shown when nobody's own space is open: every developer card is locked behind that developer's PIN. */
@Component({
  selector: 'app-space-picker',
  imports: [MatButtonModule, StatusDot],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './space-picker.html',
  styleUrl: './space-picker.scss',
})
export class SpacePicker {
  protected readonly store = inject(TeamStore);
  private readonly viewingAs = inject(ViewingAsService);

  // ---- lock: a space opens only for its own developer (mock PIN, no real login) ----
  /** Demo PINs: A = 1111, B = 2222 … E = 5555. */
  private readonly pins: Record<string, string> = { a: '1111', b: '2222', c: '3333', d: '4444', e: '5555' };
  protected readonly unlocking = computed(() => this.store.member(this.unlockId()));
  protected readonly unlockId = signal<string | null>(null);
  protected readonly pin = signal('');
  protected readonly pinError = signal(false);
  protected demoPin(id: string): string {
    return this.pins[id] ?? '';
  }
  protected askPin(id: string): void {
    this.unlockId.set(id);
    this.pin.set('');
    this.pinError.set(false);
  }
  protected setPin(value: string): void {
    this.pin.set(value.replace(/\D/g, '').slice(0, 4));
    this.pinError.set(false);
  }
  protected unlock(): void {
    const id = this.unlockId();
    if (!id) return;
    if (this.pin() === this.pins[id]) {
      this.unlockId.set(null);
      this.viewingAs.set(id);
    } else {
      this.pinError.set(true);
      this.pin.set('');
    }
  }
}
