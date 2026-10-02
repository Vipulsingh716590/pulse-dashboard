import { Routes } from '@angular/router';

/** No login: "/" opens the Overview straight away. "Viewing as" in the top bar decides the perspective. */
export const routes: Routes = [
  { path: '', title: 'Pulse · Overview', data: { title: 'Overview' }, loadComponent: () => import('./features/overview/overview').then((m) => m.Overview) },
  { path: 'team', title: 'Pulse · Team', data: { title: 'Team' }, loadComponent: () => import('./features/team/team').then((m) => m.TeamPage) },
  { path: 'tasks', title: 'Pulse · Tasks', data: { title: 'Tasks' }, loadComponent: () => import('./features/tasks/tasks').then((m) => m.TasksPage) },
  {
    path: 'wellbeing',
    title: 'Pulse · Wellbeing',
    data: { title: 'Team wellbeing' },
    loadComponent: () => import('./features/wellbeing/wellbeing').then((m) => m.WellbeingPage),
  },
  { path: 'my-space', title: 'Pulse · My Space', data: { title: 'My Space' }, loadComponent: () => import('./features/my-space/my-space').then((m) => m.MySpace) },
  { path: '**', redirectTo: '' },
];
