// ============================================
// SHARED DOMAIN TYPES & INTERFACES
// ============================================

export type CategoryType = 'none' | 'focus' | 'care' | 'leisure' | 'family' | 'waste' | 'urgent' | 'prayer';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  category?: CategoryType;
  startTime?: string;
  endTime?: string;
  duration?: number;
  reminder?: boolean;
}

export interface Task {
  text: string;
  category: CategoryType;
  completed: boolean;
  subtasks: Subtask[];
  reminder?: boolean;
  energy?: 'low' | 'neutral' | 'high';
}

export interface WastedLog {
  id: string;
  reason: string;
  timeLost: string;
  loggedAt: string;
  type?: 'distraction' | 'reward';
}

export interface ScreenTimeLog {
  id: string;
  appName: string;
  duration: string;
  loggedAt: string;
}

export interface DayTemplate {
  id: string;
  name: string;
  tasks: Record<number, Task>;
}

export type TrackData = Record<string, Record<number, Task>>;

export interface CategoryInfo {
  id: CategoryType;
  color: string;
  bgClass: string;
  label: string;
  hex: string;
}

export interface DailyTheme {
  theme: CategoryType;
  text: string;
}

export interface ProtocolSettings {
  wastedTimeThreshold: number;
  focusToRewardRatioFocus: number;
  focusToRewardRatioReward: number;
}

// ============================================
// TEMPORAL ENGINE TYPES
// ============================================

export interface TemporalStats {
  wastedMinutes: number;
  maxStreak: number;
  isDebtCleared: boolean;
  overLimit: number;
  activeDebt: number;
  focusMinutes: number;
  earnedLeisure: number;
  temporalDebt: number;
  availableCredit: number;
}

// ============================================
// ANALYTICS ENGINE TYPES
// ============================================

export interface CategoryStat extends CategoryInfo {
  minutes: number;
  hoursDisplay: string;
}

// ============================================
// ACADEMIC ENGINE TYPES
// ============================================

export interface AcademicCourse {
  id: string;
  name: string;
  currentScore: number;
  targetGrade: string;
}

// ============================================
// GLOBAL APP STATE
// ============================================

export interface GlobalAppState {
  // Data
  trackData: TrackData;
  wastedLogs: Record<string, WastedLog[]>;
  screenTimeLogs: Record<string, ScreenTimeLog[]>;
  masterTasks: Array<{ id: string; text: string; completed: boolean; category?: CategoryType }>;
  dailyThemes: Record<string, DailyTheme>;
  academicCourses: AcademicCourse[];
  templates: DayTemplate[];

  // UI State
  currentDate: Date;
  selectedDate: Date;
  selectedHour: number;
  actualHour: number;
  viewDensity: 'minimal' | 'complex';
  activeAsideTab: 'hour' | 'master' | 'yield';
  alertDismissedForDebt: number;

  // Modal States
  isProtocolSettingsOpen: boolean;
  isWastedLogOpen: boolean;
  isScreenTimeOpen: boolean;
  isCompareViewOpen: boolean;
  isTemplateModalOpen: boolean;
  isMandateModalOpen: boolean;

  // Settings
  protocolSettings: ProtocolSettings;
}

export interface GlobalActions {
  // Data Updates
  setTrackData: (data: TrackData) => void;
  setWastedLogs: (logs: Record<string, WastedLog[]>) => void;
  setMasterTasks: (tasks: GlobalAppState['masterTasks']) => void;
  setDailyThemes: (themes: Record<string, DailyTheme>) => void;
  setAcademicCourses: (courses: AcademicCourse[]) => void;
  setProtocolSettings: (settings: ProtocolSettings) => void;

  // UI Updates
  setViewDensity: (density: 'minimal' | 'complex') => void;
  setSelectedHour: (hour: number) => void;
  setSelectedDate: (date: Date) => void;
  setActiveAsideTab: (tab: 'hour' | 'master' | 'yield') => void;
  setAlertDismissedForDebt: (minutes: number) => void;

  // Modal Controls
  toggleProtocolSettings: (isOpen: boolean) => void;
  toggleWastedLog: (isOpen: boolean) => void;
  toggleScreenTime: (isOpen: boolean) => void;
}
