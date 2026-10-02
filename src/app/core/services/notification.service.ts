import { computed, inject, Injectable, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PulseNotification } from '../models';
import { mockNow } from '../utils/date';
import { DataService } from './data.service';
import { ViewingAsService } from './viewing-as.service';

/** The bell. Manager notifications go to 'mgr'; a developer only sees their own. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly data = inject(DataService);
  private readonly viewingAs = inject(ViewingAsService);

  private readonly source = toSignal(this.data.getNotifications(), { initialValue: [] });
  readonly all = linkedSignal(() => this.source());
  private seq = 0;

  readonly mine = computed(() =>
    this.all()
      .filter((n) => n.to === this.viewingAs.viewerId())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly unread = computed(() => this.mine().filter((n) => !n.read).length);

  push(n: Omit<PulseNotification, 'id' | 'createdAt' | 'read'>): void {
    const item: PulseNotification = { ...n, id: `n-${++this.seq}`, createdAt: mockNow(), read: false };
    this.all.update((list) => [item, ...list]);
  }

  markRead(id: string): void {
    this.all.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllRead(): void {
    const me = this.viewingAs.viewerId();
    this.all.update((list) => list.map((n) => (n.to === me ? { ...n, read: true } : n)));
  }
}
