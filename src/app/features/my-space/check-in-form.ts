import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { CheckIn } from '../../core/models';
import { CheckInService } from '../../core/services/check-in.service';
import { fToC, MOCK_TODAY, mockNow } from '../../core/utils/date';

/** The 1-minute daily check-in. Unwell or 100°F+ triggers the automatic health flow. */
@Component({
  selector: 'app-check-in-form',
  imports: [MatButtonModule, MatSliderModule, MatCheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './check-in-form.html',
  styleUrl: './check-in-form.scss',
})
export class CheckInForm {
  private readonly checkIns = inject(CheckInService);

  readonly personId = input.required<string>();
  readonly saved = output<{ unwell: boolean; suggestions: number }>();

  protected readonly feelingWell = signal(true);
  protected readonly temperature = signal<number | null>(null);
  protected readonly symptoms = signal('');
  protected readonly shareDetails = signal(false);
  protected readonly energy = signal(3);
  protected readonly focus = signal(3);
  protected readonly stress = signal(2);
  protected readonly note = signal('');

  protected readonly fever = computed(() => (this.temperature() ?? 0) >= 100);
  protected readonly unwell = computed(() => !this.feelingWell() || this.fever());
  protected readonly celsius = computed(() => (this.temperature() ? fToC(this.temperature()!) : null));

  /** Start from today's check-in when editing. */
  prefill(c: CheckIn | undefined): void {
    if (!c) return;
    this.feelingWell.set(c.feelingWell);
    this.temperature.set(c.temperatureF ?? null);
    this.symptoms.set(c.symptoms ?? '');
    this.shareDetails.set(!!c.shareDetails);
    this.energy.set(c.energy);
    this.focus.set(c.focus);
    this.stress.set(c.stress);
    this.note.set(c.note ?? '');
  }

  protected setTemperature(raw: string): void {
    const v = parseFloat(raw);
    this.temperature.set(Number.isFinite(v) ? v : null);
  }

  protected submit(): void {
    const id = this.personId();
    const c: CheckIn = {
      id: `c-${id}-${MOCK_TODAY}`,
      personId: id,
      date: MOCK_TODAY,
      feelingWell: this.feelingWell(),
      ...(this.temperature() ? { temperatureF: this.temperature()! } : {}),
      ...(this.unwell() && this.symptoms().trim() ? { symptoms: this.symptoms().trim() } : {}),
      shareDetails: this.unwell() && this.shareDetails(),
      energy: this.energy(),
      stress: this.stress(),
      focus: this.focus(),
      ...(this.note().trim() ? { note: this.note().trim() } : {}),
      submittedAt: mockNow(),
    };
    this.saved.emit(this.checkIns.submit(c));
  }
}
