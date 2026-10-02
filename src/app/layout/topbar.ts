import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { NotificationKind, PulseNotification } from '../core/models';
import { DateRange, FilterService } from '../core/services/filter.service';
import { NotificationService } from '../core/services/notification.service';
import { ThemeService } from '../core/services/theme.service';
import { ViewingAsService } from '../core/services/viewing-as.service';
import { formatTime } from '../core/utils/date';

const KIND_ICON: Record<NotificationKind, string> = {
  health: 'favorite',
  reassign: 'swap_horiz',
  blocked: 'block',
  attention: 'priority_high',
  message: 'chat',
  info: 'info',
};

@Component({
  selector: 'app-topbar',
  imports: [MatButtonModule, MatButtonToggleModule, MatBadgeModule, MatMenuModule, MatSelectModule, MatTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  private readonly router = inject(Router);
  protected readonly filter = inject(FilterService);
  protected readonly notifications = inject(NotificationService);
  protected readonly theme = inject(ThemeService);
  protected readonly viewingAs = inject(ViewingAsService);

  readonly title = input('');
  protected readonly logoFailed = signal(false);
  protected readonly kindIcon = KIND_ICON;
  protected readonly time = formatTime;
  /** Miller's 7±2: the bell shows the latest 7. */
  protected readonly limit = 7;

  protected setRange(range: DateRange): void {
    this.filter.range.set(range);
  }

  protected switchViewer(id: string): void {
    this.viewingAs.set(id);
    if (id !== 'mgr') this.router.navigateByUrl('/my-space');
    else if (this.router.url.startsWith('/my-space')) this.router.navigateByUrl('/team');
  }

  protected openNotification(n: PulseNotification): void {
    this.notifications.markRead(n.id);
    if (n.link) this.router.navigateByUrl(n.link);
  }
}
