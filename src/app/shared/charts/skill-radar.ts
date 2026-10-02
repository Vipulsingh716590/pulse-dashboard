import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ApexOptions } from 'ng-apexcharts';
import { SKILL_LABELS, SkillArea, SkillScores } from '../../core/models';
import { Chart } from './chart';

const AREAS = Object.keys(SKILL_LABELS) as SkillArea[];

/** Six-area skill radar on a 1–5 scale. */
@Component({
  selector: 'app-skill-radar',
  imports: [Chart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-chart [options]="options()" [height]="height()" />`,
})
export class SkillRadar {
  readonly skills = input.required<SkillScores>();
  readonly height = input(280);

  protected readonly options = computed<ApexOptions>(() => ({
    chart: { type: 'radar' },
    series: [{ name: 'Skill', data: AREAS.map((a) => this.skills()[a]) }],
    labels: AREAS.map((a) => SKILL_LABELS[a]),
    colors: ['#6d5dd3'],
    stroke: { width: 2 },
    fill: { opacity: 0.22 },
    markers: { size: 4 },
    yaxis: { show: false, min: 0, max: 5, tickAmount: 5 },
    plotOptions: { radar: { size: Math.round(this.height() * 0.36) } },
    tooltip: { y: { formatter: (v: number) => `${v}/5` } },
  }));
}
