import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable, shareReplay } from 'rxjs';
import {
  CheckIn, FocusLog, Person, Presence, PulseNotification, Reflection, Task, Team, TeamDailyMetric, Who5Response,
} from '../models';

const BASE = 'assets/mock-data/';

/**
 * The only place that knows where data comes from. Today it reads mock JSON;
 * point these methods at real endpoints later and nothing else has to change.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<unknown>>();

  private load<T>(file: string): Observable<T> {
    if (!this.cache.has(file)) {
      // A small delay keeps loading states honest, like a real network call.
      this.cache.set(file, this.http.get<T>(BASE + file).pipe(delay(80), shareReplay(1)));
    }
    return this.cache.get(file) as Observable<T>;
  }

  getTeams = () => this.load<Team[]>('teams.json');
  getTeamMetrics = () => this.load<TeamDailyMetric[]>('team-metrics.json');
  getPeople = () => this.load<Person[]>('people.json');
  getTasks = () => this.load<Task[]>('tasks.json');
  getCheckIns = () => this.load<CheckIn[]>('check-ins.json');
  getFocusLogs = () => this.load<FocusLog[]>('focus-logs.json');
  getPresence = () => this.load<Presence[]>('presence.json');
  getWho5 = () => this.load<Who5Response[]>('who5.json');
  getReflections = () => this.load<Reflection[]>('reflections.json');
  getNotifications = () => this.load<PulseNotification[]>('notifications.json');
}
