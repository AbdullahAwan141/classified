/**
 * TEMPORAL ENGINE SERVICE
 * =====================
 * Pure functions for temporal credit management, debt calculation, and protocol compliance.
 * No side effects. All calculations are deterministic and testable.
 */

import { TemporalStats, ProtocolSettings, Task, WastedLog } from '../types';

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
 * Calculate total focus minutes from a day's tasks
 */
export function calculateFocusMinutes(dayTasks: Record<number, Task>): number {
  return Object.values(dayTasks).reduce((sum, task) => {
    if (task.category === 'focus' && task.completed) {
      if (task.subtasks && task.subtasks.length > 0) {
        const subSum = task.subtasks
          .filter(s => s.completed && s.category === 'focus')
          .reduce((acc, s) => acc + (s.duration || 0), 0);
        return sum + subSum;
      }
      return sum + 60;
    }
    return sum;
  }, 0);
}

/**
 * Calculate total wasted/distracted minutes from wasted logs
 */
export function calculateWastedMinutes(wastedLogs: WastedLog[]): number {
  return wastedLogs.reduce((sum, log) => sum + parseDuration(log.timeLost), 0);
}

/**
 * Calculate maximum focus streak (consecutive high-energy focus hours with no distractions)
 */
export function calculateMaxStreak(
  dayTasks: Record<number, Task>,
  dayWastedLogs: WastedLog[]
): number {
  let maxStreak = 0;
  let currentStreak = 0;

  for (let i = 0; i < 24; i++) {
    const task = dayTasks[i];
    const hasDistractionThisHour = dayWastedLogs.some(log => {
      const match = log.loggedAt?.match(/^(\d+):/);
      return match && parseInt(match[1], 10) === i;
    });

    if (
      task.category === 'focus' &&
      task.completed &&
      task.energy === 'high' &&
      !hasDistractionThisHour
    ) {
      currentStreak += 60;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Determine if temporal debt has been cleared via earned streaks
 */
export function isDebtCleared(maxStreak: number, debtThreshold: number = 120): boolean {
  return maxStreak >= debtThreshold;
}

/**
 * Calculate how much time over the allowed waste limit
 */
export function calculateOverLimit(
  wastedMinutes: number,
  threshold: number
): number {
  return Math.max(0, wastedMinutes - threshold);
}

/**
 * Calculate active temporal debt
 */
export function calculateActiveDebt(
  isDebtCleared: boolean,
  overLimit: number
): number {
  return isDebtCleared ? 0 : overLimit;
}

/**
 * Calculate earned leisure credit from focus quota
 * Formula: focusMinutes / focusToRewardRatio = leisure minutes earned
 */
export function calculateEarnedLeisure(
  focusMinutes: number,
  focusToRewardRatioFocus: number,
  focusToRewardRatioReward: number
): number {
  if (focusToRewardRatioFocus === 0) return 0;
  const ratio = focusToRewardRatioReward / focusToRewardRatioFocus;
  return Math.floor(focusMinutes * ratio);
}

/**
 * Calculate available leisure credit (earned - wasted)
 */
export function calculateAvailableCredit(
  earnedLeisure: number,
  wastedMinutes: number
): number {
  return Math.max(0, earnedLeisure - wastedMinutes);
}

/**
 * Calculate temporal debt (deficit from waste overage)
 */
export function calculateTemporalDebt(activeDebt: number): number {
  return activeDebt;
}

/**
 * Comprehensive temporal stats calculation
 * Returns all temporal metrics in a single object
 */
export function calculateTemporalStats(
  dayTasks: Record<number, Task>,
  dayWastedLogs: WastedLog[],
  protocolSettings: ProtocolSettings
): TemporalStats {
  const focusMinutes = calculateFocusMinutes(dayTasks);
  const wastedMinutes = calculateWastedMinutes(dayWastedLogs);
  const maxStreak = calculateMaxStreak(dayTasks, dayWastedLogs);
  const debtCleared = isDebtCleared(maxStreak);
  const overLimit = calculateOverLimit(wastedMinutes, protocolSettings.wastedTimeThreshold);
  const activeDebt = calculateActiveDebt(debtCleared, overLimit);
  const earnedLeisure = calculateEarnedLeisure(
    focusMinutes,
    protocolSettings.focusToRewardRatioFocus,
    protocolSettings.focusToRewardRatioReward
  );
  const availableCredit = calculateAvailableCredit(earnedLeisure, wastedMinutes);
  const temporalDebt = calculateTemporalDebt(activeDebt);

  return {
    focusMinutes,
    wastedMinutes,
    maxStreak,
    isDebtCleared: debtCleared,
    overLimit,
    activeDebt,
    earnedLeisure,
    availableCredit,
    temporalDebt,
  };
}

/**
 * Verify if a leisure activity can be redeemed against available credit
 * Returns { allowed: boolean, remainingCredit: number, debtAfter: number }
 */
export function verifyLeisureRedemption(
  availableCredit: number,
  leisureMinutesRequested: number,
  activeDebt: number
): { allowed: boolean; remainingCredit: number; debtAfter: number } {
  if (activeDebt > 0) {
    return {
      allowed: false,
      remainingCredit: availableCredit,
      debtAfter: activeDebt,
    };
  }

  const allowed = leisureMinutesRequested <= availableCredit;
  const remaining = Math.max(0, availableCredit - leisureMinutesRequested);

  return {
    allowed,
    remainingCredit: remaining,
    debtAfter: 0,
  };
}

/**
 * Calculate if protocol has been violated
 */
export function isProtocolViolated(activeDebt: number): boolean {
  return activeDebt > 0;
}

/**
 * Generate protocol violation message
 */
export function generateProtocolViolationMessage(activeDebt: number): string {
  if (activeDebt <= 0) return '';
  return `PROTOCOL VIOLATED: -${activeDebt}m DEBT RECOVERY ACTIVE`;
}
