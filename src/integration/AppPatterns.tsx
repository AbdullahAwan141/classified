/**
 * APP INTEGRATION HELPER
 * =====================
 * Shows refactored patterns for integrating new micro-services into App.tsx
 * Copy these patterns into the actual App component
 */

import { useMemo } from 'react';
import { useGlobal, useUIState, useTemporalState, useAcademicState, useAnalyticsState } from '../contexts/GlobalProvider';
import { calculateTemporalStats, calculateFocusMinutes, calculateWastedMinutes } from '../services/temporal.service';
import { calculateCategoryStats, calculateEfficiencyPercentage, CATEGORIES } from '../services/analytics.service';
import { getDayString, createEmptyDay, parseDuration, generateId } from '../utils/helpers';
import { Z_INDEX } from '../design-system/theme';
import type { Task, CategoryType } from '../types';

/**
 * PATTERN 1: Replace useLocalStorage with useGlobal
 */
export function useAppState() {
  const global = useGlobal();
  
  return {
    // Data (auto-synced to localStorage)
    trackData: global.trackData,
    setTrackData: global.setTrackData,
    wastedLogs: global.wastedLogs,
    setWastedLogs: global.setWastedLogs,
    masterTasks: global.masterTasks,
    setMasterTasks: global.setMasterTasks,
    dailyThemes: global.dailyThemes,
    setDailyThemes: global.setDailyThemes,
    academicCourses: global.academicCourses,
    setAcademicCourses: global.setAcademicCourses,
    protocolSettings: global.protocolSettings,
    setProtocolSettings: global.setProtocolSettings,

    // UI State
    ...useUIState(),

    // Settings
    currentDate: global.currentDate,
    selectedDate: global.selectedDate,
    actualHour: global.actualHour,
  };
}

/**
 * PATTERN 2: Replace inline calculations with service functions
 */
export function useTemporalMetrics(
  dateStr: string,
  state: ReturnType<typeof useAppState>
) {
  const { trackData, wastedLogs, protocolSettings } = state;
  
  const dayTasks = trackData[dateStr] || createEmptyDay();
  const dayWastedLogs = wastedLogs[dateStr] || [];

  // Use service to calculate stats - pure function, no side effects
  const temporalStats = useMemo(
    () => calculateTemporalStats(dayTasks, dayWastedLogs, protocolSettings),
    [dayTasks, dayWastedLogs, protocolSettings]
  );

  return temporalStats;
}

/**
 * PATTERN 3: Replace category calculations with analytics service
 */
export function useAnalyticsMetrics(
  dateStr: string,
  state: ReturnType<typeof useAppState>
) {
  const { trackData, wastedLogs } = state;
  
  const dayTasks = trackData[dateStr] || createEmptyDay();
  const dayWastedLogs = wastedLogs[dateStr] || [];

  const categoryStats = useMemo(
    () => calculateCategoryStats(dayTasks, dayWastedLogs),
    [dayTasks, dayWastedLogs]
  );

  const efficiency = useMemo(
    () => calculateEfficiencyPercentage(categoryStats),
    [categoryStats]
  );

  return { categoryStats, efficiency };
}

/**
 * PATTERN 4: Task management functions (extracted from App)
 */
export function createTaskManager(
  dateStr: string,
  setTrackData: (data: any) => void,
  trackData: any
) {
  const updateTask = (hour: number, field: keyof Task, value: any) => {
    setTrackData((prev: any) => {
      const newData = { ...prev };
      if (!newData[dateStr]) newData[dateStr] = createEmptyDay();
      newData[dateStr] = {
        ...newData[dateStr],
        [hour]: { ...newData[dateStr][hour], [field]: value }
      };
      return newData;
    });
  };

  const toggleSubtask = (hour: number, subtaskId: string) => {
    setTrackData((prev: any) => {
      const newData = { ...prev };
      if (!newData[dateStr]) return prev;
      const task = newData[dateStr][hour];
      newData[dateStr][hour] = {
        ...task,
        subtasks: (task.subtasks || []).map((st: any) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        )
      };
      return newData;
    });
  };

  const deleteSubtask = (hour: number, subtaskId: string) => {
    setTrackData((prev: any) => {
      const newData = { ...prev };
      if (!newData[dateStr]) return prev;
      const task = newData[dateStr][hour];
      newData[dateStr][hour] = {
        ...task,
        subtasks: (task.subtasks || []).filter((st: any) => st.id !== subtaskId)
      };
      return newData;
    });
  };

  const addSubtask = (
    hour: number,
    text: string,
    startMin: string = '0',
    endMin: string = '60',
    category: CategoryType = 'none'
  ) => {
    if (!text.trim()) return;
    setTrackData((prev: any) => {
      const newData = { ...prev };
      if (!newData[dateStr]) newData[dateStr] = createEmptyDay();
      const task = newData[dateStr][hour];

      const sMin = parseInt(startMin) || 0;
      const eMin = parseInt(endMin) || 60;
      const duration = Math.abs(eMin - sMin);

      const hStr = hour % 12 || 12;
      const nextHStr = (hour + 1) % 12 || 12;

      const displayStart = `${hStr}:${sMin.toString().padStart(2, '0')}`;
      const displayEnd = eMin === 60 ? `${nextHStr}:00` : `${hStr}:${eMin.toString().padStart(2, '0')}`;

      newData[dateStr][hour] = {
        ...task,
        subtasks: [
          ...(task.subtasks || []),
          {
            id: generateId(),
            text,
            completed: false,
            category,
            startTime: displayStart,
            endTime: displayEnd,
            duration
          }
        ]
      };
      return newData;
    });
  };

  return { updateTask, toggleSubtask, deleteSubtask, addSubtask };
}

/**
 * PATTERN 5: Wasted log management
 */
export function createWastedLogManager(
  dateStr: string,
  setWastedLogs: (logs: any) => void
) {
  const addWastedLog = (reason: string, timeLost: string) => {
    if (!reason.trim()) return;
    setWastedLogs((prev: any) => ({
      ...prev,
      [dateStr]: [
        ...(prev[dateStr] || []),
        {
          id: generateId(),
          reason,
          timeLost,
          loggedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      ]
    }));
  };

  const deleteWastedLog = (id: string) => {
    setWastedLogs((prev: any) => ({
      ...prev,
      [dateStr]: (prev[dateStr] || []).filter((log: any) => log.id !== id)
    }));
  };

  return { addWastedLog, deleteWastedLog };
}

/**
 * PATTERN 6: Master task management (now uses GlobalState)
 */
export function createMasterTaskManager(
  setMasterTasks: (tasks: any[]) => void,
  masterTasks: any[]
) {
  const addTask = (text: string, category: CategoryType = 'none') => {
    if (!text.trim()) return;
    setMasterTasks([
      ...masterTasks,
      { id: generateId(), text, completed: false, category }
    ]);
  };

  const toggleTask = (id: string) => {
    setMasterTasks(
      masterTasks.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  };

  const deleteTask = (id: string) => {
    setMasterTasks(masterTasks.filter(t => t.id !== id));
  };

  return { addTask, toggleTask, deleteTask };
}

/**
 * PATTERN 7: Z-Index Constants for modals/overlays
 */
export function getZIndexStyle(level: keyof typeof Z_INDEX) {
  return { zIndex: Z_INDEX[level] };
}

/**
 * PATTERN 8: Reactive module integration
 */
export function IntegrateModules() {
  // These imports would go in App.tsx
  // import { ProtocolAlert } from '@/modules/TemporalEngine'
  // import { AcademicYield } from '@/modules/PerformanceEngine'
  // import { MasterLedger, DailyAnalytics } from '@/modules/SystemAudit'
  
  return {
    // In JSX:
    // <ProtocolAlert activeDebt={temporalStats.activeDebt} isWastedAlertActive={isWastedAlertGlobal} />
    // <AcademicYield weeklyStudyHours={calculateWeeklyHours()} />
    // <MasterLedger />
    // <DailyAnalytics selectedDate={selectedDate} />
  };
}
