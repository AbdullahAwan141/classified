/**
 * ANALYTICS ENGINE SERVICE
 * =======================
 * Pure functions for data aggregation, category statistics, and comparative analysis.
 * Powers the Master Ledger and daily analytics charts.
 */

import {
  CategoryType,
  CategoryInfo,
  CategoryStat,
  Task,
  TrackData,
  WastedLog,
} from '../types';

/**
 * Get all available categories with their styling and metadata
 */
export const CATEGORIES: CategoryInfo[] = [
  { id: 'none', color: 'bg-white/20', bgClass: 'bg-white/[0.03]', label: 'Unplanned', hex: '#64748b' },
  { id: 'focus', color: 'bg-[#cfb991]', bgClass: 'bg-[#cfb991]/10 border-[#cfb991]/30', label: 'Study/Work', hex: '#cfb991' },
  { id: 'prayer', color: 'bg-[#899ca1]', bgClass: 'bg-[#899ca1]/10 border-[#899ca1]/30', label: 'Prayer/Soul', hex: '#899ca1' },
  { id: 'family', color: 'bg-[#a38699]', bgClass: 'bg-[#a38699]/10 border-[#a38699]/30', label: 'Family/Social', hex: '#a38699' },
  { id: 'care', color: 'bg-[#738775]', bgClass: 'bg-[#738775]/10 border-[#738775]/30', label: 'Self Care', hex: '#738775' },
  { id: 'leisure', color: 'bg-[#a89d95]', bgClass: 'bg-[#a89d95]/10 border-[#a89d95]/30', label: 'Leisure', hex: '#a89d95' },
  { id: 'waste', color: 'bg-[#8B0000]', bgClass: 'bg-[#8B0000]/10 border-[#8B0000]/30', label: 'Time Wasted', hex: '#8B0000' },
  { id: 'urgent', color: 'bg-[#B06F5C]', bgClass: 'bg-[#B06F5C]/10 border-[#B06F5C]/30', label: 'Urgent', hex: '#B06F5C' },
];

/**
 * Parse duration from string format (e.g., "15m", "1h30m")
 */
export function parseDuration(durationStr: string): number {
  if (!durationStr) return 0;
  const minutes = (durationStr.match(/(\d+)m/) || [, '0'])[1];
  const hours = (durationStr.match(/(\d+)h/) || [, '0'])[1];
  return parseInt(hours) * 60 + parseInt(minutes);
}

/**
 * Calculate category statistics for a specific date
 * Returns sorted array of category stats by minutes (descending)
 */
export function calculateCategoryStats(
  dayTasks: Record<number, Task> | undefined,
  dayWastedLogs: WastedLog[] | undefined
): CategoryStat[] {
  const stats = CATEGORIES.filter(c => c.id !== 'none').map(cat => {
    let totalMinutes = 0;

    // Calculate from 24h grid tasks
    if (dayTasks) {
      Object.values(dayTasks).forEach(task => {
        // Add from completed subtasks with this category
        if (task.subtasks && task.subtasks.length > 0) {
          const subSum = task.subtasks
            .filter(s => s.completed && (s.category === cat.id || (!s.category && task.category === cat.id)))
            .reduce((sum, s) => sum + (s.duration || 0), 0);
          totalMinutes += subSum;
        } else if (task.completed && task.category === cat.id) {
          totalMinutes += 60;
        }
      });
    }

    // Add from wasted logs if category is 'waste'
    if (cat.id === 'waste' && dayWastedLogs) {
      dayWastedLogs.forEach(log => {
        totalMinutes += parseDuration(log.timeLost);
      });
    }

    return {
      ...cat,
      minutes: totalMinutes,
      hoursDisplay: (totalMinutes / 60).toFixed(1),
    };
  });

  return stats.sort((a, b) => b.minutes - a.minutes);
}

/**
 * Calculate total allocated time across all categories
 */
export function calculateTotalMinutesAllocated(categoryStats: CategoryStat[]): number {
  return categoryStats.reduce((sum, c) => sum + c.minutes, 0);
}

/**
 * Calculate efficiency percentage (focus time / total time)
 */
export function calculateEfficiencyPercentage(categoryStats: CategoryStat[]): number {
  const totalMinutes = calculateTotalMinutesAllocated(categoryStats);
  if (totalMinutes === 0) return 0;
  const focusMinutes = categoryStats.find(s => s.id === 'focus')?.minutes || 0;
  return Math.round((focusMinutes / totalMinutes) * 100);
}

/**
 * Get category info by ID
 */
export function getCategoryInfo(id: CategoryType): CategoryInfo {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
}

/**
 * Compare two days' category stats and return differences
 */
export interface CategoryComparison {
  category: CategoryInfo;
  day1Minutes: number;
  day2Minutes: number;
  difference: number;
  percentageChange: number;
}

export function compareCategoryStats(
  stats1: CategoryStat[],
  stats2: CategoryStat[]
): CategoryComparison[] {
  return CATEGORIES.filter(c => c.id !== 'none').map(cat => {
    const stat1 = stats1.find(s => s.id === cat.id);
    const stat2 = stats2.find(s => s.id === cat.id);
    const min1 = stat1?.minutes || 0;
    const min2 = stat2?.minutes || 0;
    const diff = min2 - min1;
    const percentChange = min1 === 0 ? (min2 > 0 ? 100 : 0) : Math.round((diff / min1) * 100);

    return {
      category: cat,
      day1Minutes: min1,
      day2Minutes: min2,
      difference: diff,
      percentageChange: percentChange,
    };
  });
}

/**
 * Calculate delta report for two dates
 * Shows what changed between two days
 */
export interface DeltaReport {
  date1: string;
  date2: string;
  focusDelta: number;
  wasteDelta: number;
  leisureDelta: number;
  totalDelta: number;
  improvements: string[];
  concerns: string[];
}

export function generateDeltaReport(
  date1: string,
  date2: string,
  stats1: CategoryStat[],
  stats2: CategoryStat[]
): DeltaReport {
  const comparisons = compareCategoryStats(stats1, stats2);
  const focusComp = comparisons.find(c => c.category.id === 'focus')!;
  const wasteComp = comparisons.find(c => c.category.id === 'waste')!;
  const leisureComp = comparisons.find(c => c.category.id === 'leisure')!;

  const focusDelta = focusComp.difference;
  const wasteDelta = wasteComp.difference;
  const leisureDelta = leisureComp.difference;
  const totalDelta = focusDelta + wasteDelta + leisureDelta;

  const improvements: string[] = [];
  const concerns: string[] = [];

  if (focusDelta > 0) improvements.push(`+${focusDelta}m more focus`);
  if (wasteDelta < 0) improvements.push(`${Math.abs(wasteDelta)}m less waste`);
  if (focusDelta < 0) concerns.push(`${Math.abs(focusDelta)}m less focus`);
  if (wasteDelta > 0) concerns.push(`+${wasteDelta}m more waste`);

  return {
    date1,
    date2,
    focusDelta,
    wasteDelta,
    leisureDelta,
    totalDelta,
    improvements,
    concerns,
  };
}

/**
 * Get completion stats for master tasks
 */
export interface MasterTaskStats {
  total: number;
  completed: number;
  remaining: number;
  completionPercentage: number;
}

export function calculateMasterTaskStats(
  tasks: Array<{ completed: boolean }>
): MasterTaskStats {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const remaining = total - completed;
  const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, remaining, completionPercentage };
}

/**
 * Aggregate weekly data across multiple days
 */
export function aggregateWeeklyStats(
  trackData: TrackData,
  dates: string[]
): CategoryStat[] {
  const weeklyTotals: Record<CategoryType, number> = {} as any;

  CATEGORIES.forEach(cat => {
    weeklyTotals[cat.id] = 0;
  });

  dates.forEach(dateStr => {
    const dayTasks = trackData[dateStr];
    if (dayTasks) {
      const dayStats = calculateCategoryStats(dayTasks, undefined);
      dayStats.forEach(stat => {
        weeklyTotals[stat.id] += stat.minutes;
      });
    }
  });

  return CATEGORIES.map(cat => ({
    ...cat,
    minutes: weeklyTotals[cat.id],
    hoursDisplay: (weeklyTotals[cat.id] / 60).toFixed(1),
  }))
    .filter(c => c.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}
