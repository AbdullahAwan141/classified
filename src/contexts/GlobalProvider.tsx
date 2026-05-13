/**
 * GLOBAL PROVIDER & CONTEXT
 * ========================
 * Central state management for the entire application.
 * All modules communicate through this single source of truth.
 * Implements reactive updates: changes propagate immediately to all subscribers.
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  GlobalAppState,
  GlobalActions,
  TrackData,
  WastedLog,
  ScreenTimeLog,
  DayTemplate,
  DailyTheme,
  AcademicCourse,
  ProtocolSettings,
} from '../types';

/**
 * Create the global context
 */
const GlobalContext = createContext<(GlobalAppState & GlobalActions) | undefined>(undefined);

/**
 * Action types for the reducer
 */
type GlobalAction =
  | { type: 'SET_TRACK_DATA'; payload: TrackData }
  | { type: 'UPDATE_TASK'; payload: { dateStr: string; hour: number; updates: Partial<any> } }
  | { type: 'SET_WASTED_LOGS'; payload: Record<string, WastedLog[]> }
  | { type: 'ADD_WASTED_LOG'; payload: { dateStr: string; log: WastedLog } }
  | { type: 'SET_MASTER_TASKS'; payload: Array<{ id: string; text: string; completed: boolean; category?: any }> }
  | { type: 'TOGGLE_MASTER_TASK'; payload: string }
  | { type: 'SET_DAILY_THEMES'; payload: Record<string, DailyTheme> }
  | { type: 'SET_ACADEMIC_COURSES'; payload: AcademicCourse[] }
  | { type: 'SET_VIEW_DENSITY'; payload: 'minimal' | 'complex' }
  | { type: 'SET_SELECTED_HOUR'; payload: number }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'SET_CURRENT_DATE'; payload: Date }
  | { type: 'SET_ACTIVE_ASIDE_TAB'; payload: 'hour' | 'master' | 'yield' }
  | { type: 'SET_ALERT_DISMISSED_FOR_DEBT'; payload: number }
  | { type: 'TOGGLE_PROTOCOL_SETTINGS'; payload: boolean }
  | { type: 'TOGGLE_WASTED_LOG'; payload: boolean }
  | { type: 'TOGGLE_SCREEN_TIME'; payload: boolean }
  | { type: 'SET_PROTOCOL_SETTINGS'; payload: ProtocolSettings };

/**
 * Initial state
 */
function createInitialState(): GlobalAppState {
  return {
    // Data
    trackData: {},
    wastedLogs: {},
    screenTimeLogs: {},
    masterTasks: [],
    dailyThemes: {},
    academicCourses: [],
    templates: [],

    // UI State
    currentDate: new Date(),
    selectedDate: new Date(),
    selectedHour: new Date().getHours(),
    actualHour: new Date().getHours(),
    viewDensity: 'minimal',
    activeAsideTab: 'hour',
    alertDismissedForDebt: 0,

    // Modal States
    isProtocolSettingsOpen: false,
    isWastedLogOpen: false,
    isScreenTimeOpen: false,
    isCompareViewOpen: false,
    isTemplateModalOpen: false,
    isMandateModalOpen: false,

    // Settings
    protocolSettings: {
      wastedTimeThreshold: 60,
      focusToRewardRatioFocus: 60,
      focusToRewardRatioReward: 15,
    },
  };
}

/**
 * Reducer function for state updates
 * All state changes go through here for consistency
 */
function globalReducer(state: GlobalAppState, action: GlobalAction): GlobalAppState {
  switch (action.type) {
    case 'SET_TRACK_DATA':
      return { ...state, trackData: action.payload };

    case 'UPDATE_TASK': {
      const { dateStr, hour, updates } = action.payload;
      const newTrackData = { ...state.trackData };
      if (!newTrackData[dateStr]) {
        newTrackData[dateStr] = {};
      }
      newTrackData[dateStr][hour] = {
        ...newTrackData[dateStr][hour],
        ...updates,
      };
      return { ...state, trackData: newTrackData };
    }

    case 'SET_WASTED_LOGS':
      return { ...state, wastedLogs: action.payload };

    case 'ADD_WASTED_LOG': {
      const { dateStr, log } = action.payload;
      const newWastedLogs = { ...state.wastedLogs };
      if (!newWastedLogs[dateStr]) {
        newWastedLogs[dateStr] = [];
      }
      newWastedLogs[dateStr] = [...newWastedLogs[dateStr], log];
      return { ...state, wastedLogs: newWastedLogs };
    }

    case 'SET_MASTER_TASKS':
      return { ...state, masterTasks: action.payload };

    case 'TOGGLE_MASTER_TASK': {
      const taskId = action.payload;
      const newTasks = state.masterTasks.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      return { ...state, masterTasks: newTasks };
    }

    case 'SET_DAILY_THEMES':
      return { ...state, dailyThemes: action.payload };

    case 'SET_ACADEMIC_COURSES':
      return { ...state, academicCourses: action.payload };

    case 'SET_VIEW_DENSITY':
      return { ...state, viewDensity: action.payload };

    case 'SET_SELECTED_HOUR':
      return { ...state, selectedHour: action.payload };

    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };

    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.payload };

    case 'SET_ACTIVE_ASIDE_TAB':
      return { ...state, activeAsideTab: action.payload };

    case 'SET_ALERT_DISMISSED_FOR_DEBT':
      return { ...state, alertDismissedForDebt: action.payload };

    case 'TOGGLE_PROTOCOL_SETTINGS':
      return { ...state, isProtocolSettingsOpen: action.payload };

    case 'TOGGLE_WASTED_LOG':
      return { ...state, isWastedLogOpen: action.payload };

    case 'TOGGLE_SCREEN_TIME':
      return { ...state, isScreenTimeOpen: action.payload };

    case 'SET_PROTOCOL_SETTINGS':
      return { ...state, protocolSettings: action.payload };

    default:
      return state;
  }
}

/**
 * GlobalProvider Component
 * Wraps the app and provides state + actions to all components
 */
export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, createInitialState());

  // Load persisted data from localStorage
  const [trackData, setTrackData] = useLocalStorage<TrackData>('neural-track-data-v2', {});
  const [wastedLogs, setWastedLogs] = useLocalStorage<Record<string, WastedLog[]>>('waste-logs-v1', {});
  const [masterTasks, setMasterTasks] = useLocalStorage<any[]>('neural-master-tasks-v2', []);
  const [dailyThemes, setDailyThemes] = useLocalStorage<Record<string, DailyTheme>>('neural-daily-themes-v1', {});
  const [academicCourses, setAcademicCourses] = useLocalStorage<AcademicCourse[]>('neural-academic-courses-v1', []);
  const [protocolSettings, setProtocolSettingsStorage] = useLocalStorage<ProtocolSettings>(
    'neural-protocol-settings-v1',
    {
      wastedTimeThreshold: 60,
      focusToRewardRatioFocus: 60,
      focusToRewardRatioReward: 15,
    }
  );

  // Sync Redux state with localStorage
  const syncedState = useMemo(
    () => ({
      ...state,
      trackData,
      wastedLogs,
      masterTasks,
      dailyThemes,
      academicCourses,
      protocolSettings,
    }),
    [state, trackData, wastedLogs, masterTasks, dailyThemes, academicCourses, protocolSettings]
  );

  // Action creators - support both direct values and callbacks
  const actions: GlobalActions = useMemo(
    () => ({
      setTrackData: (data: any) => {
        const newData = typeof data === 'function' ? data(state.trackData) : data;
        setTrackData(newData);
        dispatch({ type: 'SET_TRACK_DATA', payload: newData });
      },

      setWastedLogs: (logs: any) => {
        const newLogs = typeof logs === 'function' ? logs(state.wastedLogs) : logs;
        setWastedLogs(newLogs);
        dispatch({ type: 'SET_WASTED_LOGS', payload: newLogs });
      },

      setMasterTasks: (tasks: any) => {
        const newTasks = typeof tasks === 'function' ? tasks(state.masterTasks) : tasks;
        setMasterTasks(newTasks);
        dispatch({ type: 'SET_MASTER_TASKS', payload: newTasks });
      },

      setDailyThemes: (themes: any) => {
        const newThemes = typeof themes === 'function' ? themes(state.dailyThemes) : themes;
        setDailyThemes(newThemes);
        dispatch({ type: 'SET_DAILY_THEMES', payload: newThemes });
      },

      setAcademicCourses: (courses: any) => {
        const newCourses = typeof courses === 'function' ? courses(state.academicCourses) : courses;
        setAcademicCourses(newCourses);
        dispatch({ type: 'SET_ACADEMIC_COURSES', payload: newCourses });
      },

      setProtocolSettings: (settings: ProtocolSettings) => {
        setProtocolSettingsStorage(settings);
        dispatch({ type: 'SET_PROTOCOL_SETTINGS', payload: settings });
      },

      setViewDensity: (density: 'minimal' | 'complex') => {
        dispatch({ type: 'SET_VIEW_DENSITY', payload: density });
      },

      setSelectedHour: (hour: number) => {
        dispatch({ type: 'SET_SELECTED_HOUR', payload: hour });
      },

      setSelectedDate: (date: Date) => {
        dispatch({ type: 'SET_SELECTED_DATE', payload: date });
      },

      setCurrentDate: (date: Date) => {
        dispatch({ type: 'SET_CURRENT_DATE', payload: date });
      },

      setActiveAsideTab: (tab: 'hour' | 'master' | 'yield') => {
        dispatch({ type: 'SET_ACTIVE_ASIDE_TAB', payload: tab });
      },

      setAlertDismissedForDebt: (minutes: number) => {
        dispatch({ type: 'SET_ALERT_DISMISSED_FOR_DEBT', payload: minutes });
      },

      toggleProtocolSettings: (isOpen: boolean) => {
        dispatch({ type: 'TOGGLE_PROTOCOL_SETTINGS', payload: isOpen });
      },

      toggleWastedLog: (isOpen: boolean) => {
        dispatch({ type: 'TOGGLE_WASTED_LOG', payload: isOpen });
      },

      toggleScreenTime: (isOpen: boolean) => {
        dispatch({ type: 'TOGGLE_SCREEN_TIME', payload: isOpen });
      },
    }),
    [setTrackData, setWastedLogs, setMasterTasks, setDailyThemes, setAcademicCourses, setProtocolSettingsStorage]
  );

  return (
    <GlobalContext.Provider value={{ ...syncedState, ...actions }}>
      {children}
    </GlobalContext.Provider>
  );
};

/**
 * Custom hook to use the global context
 * Returns both state and action creators
 */
export const useGlobal = (): GlobalAppState & GlobalActions => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within GlobalProvider');
  }
  return context;
};

/**
 * Specialized hooks for specific state slices
 * Promotes better encapsulation and clarity
 */

export const useTemporalState = () => {
  const { trackData, wastedLogs, protocolSettings, selectedDate } = useGlobal();
  return { trackData, wastedLogs, protocolSettings, selectedDate };
};

export const useAcademicState = () => {
  const { academicCourses, setAcademicCourses } = useGlobal();
  return { academicCourses, setAcademicCourses };
};

export const useAnalyticsState = () => {
  const { trackData, wastedLogs, masterTasks } = useGlobal();
  return { trackData, wastedLogs, masterTasks };
};

export const useUIState = () => {
  const {
    viewDensity,
    setViewDensity,
    selectedHour,
    setSelectedHour,
    activeAsideTab,
    setActiveAsideTab,
    alertDismissedForDebt,
    setAlertDismissedForDebt,
  } = useGlobal();
  return {
    viewDensity,
    setViewDensity,
    selectedHour,
    setSelectedHour,
    activeAsideTab,
    setActiveAsideTab,
    alertDismissedForDebt,
    setAlertDismissedForDebt,
  };
};

export const useModalState = () => {
  const {
    isProtocolSettingsOpen,
    toggleProtocolSettings,
    isWastedLogOpen,
    toggleWastedLog,
    isScreenTimeOpen,
    toggleScreenTime,
  } = useGlobal();
  return {
    isProtocolSettingsOpen,
    toggleProtocolSettings,
    isWastedLogOpen,
    toggleWastedLog,
    isScreenTimeOpen,
    toggleScreenTime,
  };
};
