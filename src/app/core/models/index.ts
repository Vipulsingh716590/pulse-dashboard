/** Data models. Field names match the mock JSON in src/assets/mock-data, so a real API can drop in later. */

export type TeamId = string;

export interface TeamStrengths {
  frontend: number;
  backend: number;
  speed: number;
  quality: number;
  collaboration: number;
  innovation: number;
}

export interface Team {
  id: TeamId;
  name: string;
  isWebTeam: boolean;
  headcount: number;
  color: string;
  strengths: TeamStrengths;
}

export interface TeamDailyMetric {
  teamId: TeamId;
  date: string;
  tasksDelivered: number;
  bugsFixed: number;
  featuresShipped: number;
  impactScore: number;
  plannedTasks: number;
  onTimeTasks: number;
}

export type SkillArea = 'frontend' | 'backend' | 'ui' | 'testing' | 'api' | 'communication';
/** 1–5 per area. */
export type SkillScores = Record<SkillArea, number>;

export const SKILL_LABELS: Record<SkillArea, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  ui: 'UI',
  testing: 'Testing',
  api: 'API',
  communication: 'Communication',
};

export type PersonRole = 'manager' | 'lead' | 'developer';

export interface Person {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  role: PersonRole;
  position: string;
  avatarColor: string;
  skills?: SkillScores;
  capacityHours?: number;
  reportsTo?: string;
}

/** A person who does delivery work (lead or developer) always has skills and capacity. */
export type Member = Person & { skills: SkillScores; capacityHours: number };

export type TaskType = 'frontend' | 'backend' | 'both';
export type TaskStatus = 'planned' | 'in-progress' | 'completed' | 'reported' | 'accepted' | 'pending';

export interface Task {
  id: string;
  title: string;
  project: string;
  type: TaskType;
  ownerId: string;
  date: string;
  estimateHours: number;
  status: TaskStatus;
  percentDone: number;
  startedAt?: string;
  completedAt?: string;
  carriedFrom?: string;
  blocked?: boolean;
  blockedReason?: string;
  reassignedFrom?: string;
}

export interface CheckIn {
  id: string;
  personId: string;
  date: string;
  feelingWell: boolean;
  temperatureF?: number;
  symptoms?: string;
  /** Only when true may the manager see temperature and symptoms. */
  shareDetails?: boolean;
  sleepHours: number;
  energy: number;
  mood: number;
  stress: number;
  focus: number;
  note?: string;
  submittedAt: string;
}

export interface FocusHour {
  hour: number;
  focus: number;
  challenge: number;
  skill: number;
  workType: 'frontend' | 'backend' | 'meeting' | 'break';
}

export interface FocusLog {
  personId: string;
  date: string;
  hours: FocusHour[];
}

export type PresenceState = 'working' | 'blocked' | 'offline';

export interface Presence {
  personId: string;
  state: PresenceState;
  note?: string;
}

/** The status every screen shows, in one color each. */
export type Status = 'working' | 'blocked' | 'resting' | 'offline' | 'attention';

export interface Who5Response {
  personId: string;
  weekStart: string;
  answers: number[];
}

export interface Reflection {
  id: string;
  personId: string;
  weekStart: string;
  wentWell: string;
  inMyControl: string;
  improve: string;
  createdAt: string;
}

export type NotificationKind = 'health' | 'reassign' | 'blocked' | 'attention' | 'message' | 'info';

export interface PulseNotification {
  id: string;
  /** 'mgr' or a person id. */
  to: string;
  kind: NotificationKind;
  personId?: string;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface Outlook {
  level: RiskLevel;
  reasons: string[];
}
