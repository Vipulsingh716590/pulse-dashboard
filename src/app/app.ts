import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { Shell } from './layout/shell';

@Component({
  selector: 'app-root',
  imports: [Shell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-shell />`,
})
export class App {
  // Created up front so the saved light/dark choice applies before the first paint.
  protected readonly theme = inject(ThemeService);
}
