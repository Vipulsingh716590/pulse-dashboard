import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { delay, map, Observable, of } from 'rxjs';
import { WearableReading } from '../models';

/**
 * Where smartwatch data comes from. Today: a mock reading demo JSON.
 * Later: a Fitbit / Garmin / Oura / Health Connect provider that implements the same interface,
 * swapped in with `{ provide: WEARABLE_PROVIDER, useClass: FitbitProvider }`. The UI does not change.
 */
export interface WearableProvider {
  /** Human name of the connected device. */
  readonly deviceName: string;
  connect(): Observable<boolean>;
  readings(personId: string, from: string, to: string): Observable<WearableReading[]>;
}

@Injectable({ providedIn: 'root' })
export class MockWearableProvider implements WearableProvider {
  private readonly http = inject(HttpClient);
  readonly deviceName = 'Demo Watch (mock data)';

  connect(): Observable<boolean> {
    return of(true).pipe(delay(300));
  }

  readings(personId: string, from: string, to: string): Observable<WearableReading[]> {
    return this.http.get<WearableReading[]>('assets/mock-data/wearable.json').pipe(
      map((all) => all.filter((r) => r.personId === personId && r.date >= from && r.date <= to).sort((a, b) => a.date.localeCompare(b.date))),
      delay(120),
    );
  }
}

export const WEARABLE_PROVIDER = new InjectionToken<WearableProvider>('WEARABLE_PROVIDER', {
  providedIn: 'root',
  factory: () => inject(MockWearableProvider),
});
