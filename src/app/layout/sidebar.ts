import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationService } from '../core/services/notification.service';

export const NAV = [
  { path: '/', label: 'Overview', icon: 'space_dashboard', exact: true },
  { path: '/team', label: 'Team', icon: 'groups', exact: false },
  { path: '/tasks', label: 'Tasks', icon: 'task_alt', exact: false },
  { path: '/wellbeing', label: 'Wellbeing', icon: 'spa', exact: false },
  { path: '/my-space', label: 'My Space', icon: 'person', exact: false },
] as const;

/** Left sidebar on desktop (collapsible); a bottom navigation bar on phones. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="nav" [class.collapsed]="collapsed()" aria-label="Main">
      <div class="brand">
        <span class="mark" aria-hidden="true">P</span>
        <span class="word">Pulse</span>
      </div>
      <ul>
        @for (item of nav; track item.path) {
          <li>
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              [matTooltip]="collapsed() ? item.label : ''"
              matTooltipPosition="right"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
              <span class="label">{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>
      <button type="button" class="collapse" (click)="toggle.emit()" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
        <span class="material-symbols-outlined" aria-hidden="true">{{ collapsed() ? 'left_panel_open' : 'left_panel_close' }}</span>
        <span class="label">Collapse</span>
      </button>
    </nav>
  `,
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly notifications = inject(NotificationService);
  protected readonly nav = NAV;
  readonly collapsed = input(false);
  readonly toggle = output<void>();
}
