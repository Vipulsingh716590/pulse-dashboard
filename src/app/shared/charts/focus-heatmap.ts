import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FocusLog } from '../../core/models';
import { hourLabel, isFlowHour } from '../../core/utils/insights';

/** 9 AM – 5 PM focus strip: one cell per hour, darker = more focus, ⚡ = flow hour. */
@Component({
  selector: 'app-focus-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="strip" role="list" aria-label="Focus by hour, 9 AM to 5 PM">
      @for (c of cells(); track c.hour) {
        <div
          class="cell"
          role="listitem"
          [class.none]="c.focus === null"
          [class.meeting]="c.type === 'meeting'"
          [class.break]="c.type === 'break'"
          [style.--f]="c.focus ?? 0"
          [attr.title]="c.title"
          [attr.aria-label]="c.title"
        >
          @if (c.flow) {
            <span aria-hidden="true">⚡</span>
          }
        </div>
      }
    </div>
    <div class="axis" aria-hidden="true">
      @for (c of cells(); track c.hour) {
        <span>{{ c.label }}</span>
      }
    </div>
    <p class="legend muted">Darker = deeper focus · ⚡ flow hour · striped = meeting</p>
  `,
  styles: `
    .strip, .axis { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
    .cell {
      height: 36px; border-radius: 8px; display: grid; place-items: center; font-size: 0.8rem;
      background: color-mix(in srgb, var(--pulse-accent) calc(var(--f) * 18%), var(--pulse-surface-2));
    }
    .cell.none { background: var(--pulse-surface-2); opacity: 0.5; }
    .cell.break { background: var(--pulse-surface-2); }
    .cell.meeting {
      background-image: repeating-linear-gradient(135deg, transparent 0 5px, rgb(255 255 255 / 35%) 5px 8px);
    }
    .axis span { font-size: 0.68rem; color: var(--pulse-muted); text-align: center; }
    .legend { font-size: 0.72rem; margin: 6px 0 0; }
  `,
})
export class FocusHeatmap {
  readonly log = input<FocusLog | undefined>();

  protected readonly cells = computed(() =>
    [9, 10, 11, 12, 13, 14, 15, 16].map((hour) => {
      const h = this.log()?.hours.find((x) => x.hour === hour);
      const label = hourLabel(hour).replace(' ', '');
      if (!h) return { hour, label, focus: null, type: null, flow: false, title: `${hourLabel(hour)}: not logged yet` };
      const flow = isFlowHour(h);
      const what = h.workType === 'break' ? 'Lunch break' : h.workType === 'meeting' ? 'Meetings' : `${h.workType} work`;
      return { hour, label, focus: h.focus, type: h.workType, flow, title: `${hourLabel(hour)}: ${what}, focus ${h.focus}/5${flow ? ', flow' : ''}` };
    }),
  );
}
