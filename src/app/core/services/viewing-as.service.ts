import { computed, inject, Injectable, signal } from '@angular/core';
import { TeamStore } from './team-store.service';

const KEY = 'pulse-viewing-as';

/**
 * Replaces login: the top bar's "Viewing as" picks whose eyes the dashboard uses.
 * 'mgr' is the manager; any other id is a developer.
 */
@Injectable({ providedIn: 'root' })
export class ViewingAsService {
  private readonly store = inject(TeamStore);

  readonly viewerId = signal<string>(this.initial());
  readonly isManager = computed(() => this.viewerId() === 'mgr');
  readonly person = computed(() => this.store.person(this.viewerId()));
  /** Manager plus Developers A–E. */
  readonly options = computed(() => this.store.people().filter((p) => p.role !== 'lead'));

  set(id: string): void {
    this.viewerId.set(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* storage unavailable: choice lasts until reload */
    }
  }

  private initial(): string {
    try {
      return localStorage.getItem(KEY) ?? 'mgr';
    } catch {
      return 'mgr';
    }
  }
}
