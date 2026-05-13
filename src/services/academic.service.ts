/**
 * ACADEMIC ENGINE SERVICE
 * ======================
 * Pure functions for grade calculation, academic trajectory prediction,
 * and correlation between study velocity and academic performance.
 */

import { AcademicCourse } from '../types';

/**
 * Parse grade string and return numeric value for comparison
 * A+ = 4.0, A = 3.9, B+ = 3.3, B = 3.0, etc.
 */
export function gradeToNumeric(grade: string): number {
  const gradeMap: Record<string, number> = {
    'A+': 4.0,
    'A': 3.9,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D+': 1.3,
    'D': 1.0,
    'F': 0.0,
  };
  return gradeMap[grade] || 0;
}

/**
 * Numeric value to letter grade conversion
 */
export function numericToGrade(numeric: number): string {
  if (numeric >= 3.9) return 'A+';
  if (numeric >= 3.7) return 'A';
  if (numeric >= 3.3) return 'B+';
  if (numeric >= 3.0) return 'B';
  if (numeric >= 2.7) return 'B-';
  if (numeric >= 2.3) return 'C+';
  if (numeric >= 2.0) return 'C';
  if (numeric >= 1.7) return 'C-';
  if (numeric >= 1.3) return 'D+';
  if (numeric >= 1.0) return 'D';
  return 'F';
}

/**
 * Calculate velocity multiplier needed to reach target grade
 * Baseline = 1.0x
 * A+ target = 1.2x velocity multiplier
 * A target = 1.0x velocity multiplier
 * B+ target = 0.8x velocity multiplier
 */
export function calculateVelocityMultiplier(targetGrade: string): number {
  if (targetGrade.includes('+')) return 1.2;
  if (targetGrade.startsWith('A')) return 1.0;
  if (targetGrade.startsWith('B')) return 0.8;
  return 0.6;
}

/**
 * Calculate required weekly study hours based on current score and target grade
 * Formula: baseHours * velocityMultiplier * difficultyFactor
 */
export function calculateRequiredStudyHours(
  currentScore: number,
  targetGrade: string,
  baseHours: number = 15
): number {
  const targetNumeric = gradeToNumeric(targetGrade);
  const currentNumeric = currentScore / 25; // Normalize current score to 0-4 scale

  // If already at target, minimal study needed
  if (currentNumeric >= targetNumeric) {
    return baseHours * 0.5;
  }

  const gap = targetNumeric - currentNumeric;
  const velocityMultiplier = calculateVelocityMultiplier(targetGrade);
  const difficultyFactor = 1 + gap * 0.5; // Larger gaps require more effort

  return Math.round(baseHours * velocityMultiplier * difficultyFactor * 10) / 10;
}

/**
 * Predict the trajectory of a grade based on study velocity
 * Positive velocity means the score is trending up
 */
export interface GradeTrajectory {
  currentGrade: string;
  projectedGrade: string;
  trajectory: 'improving' | 'stable' | 'declining';
  weeklyVelocity: number;
  weeksToTarget: number;
}

export function predictGradeTrajectory(
  currentScore: number,
  targetGrade: string,
  weeklyStudyHours: number,
  baselineVelocity: number = 2 // points per week with baseline effort
): GradeTrajectory {
  const targetNumeric = gradeToNumeric(targetGrade);
  const currentNumeric = currentScore / 25;
  const velocityMultiplier = calculateVelocityMultiplier(targetGrade);

  const weeklyVelocity = baselineVelocity * velocityMultiplier * (weeklyStudyHours / 15);
  const pointsNeeded = (targetNumeric - currentNumeric) * 25;
  const weeksToTarget = pointsNeeded > 0 ? Math.ceil(pointsNeeded / (weeklyVelocity * 25)) : 0;

  let trajectory: 'improving' | 'stable' | 'declining';
  if (weeklyVelocity > 2) trajectory = 'improving';
  else if (weeklyVelocity < 0.5) trajectory = 'declining';
  else trajectory = 'stable';

  return {
    currentGrade: numericToGrade(currentNumeric),
    projectedGrade: numericToGrade(Math.min(4.0, currentNumeric + weeklyVelocity * 0.5)),
    trajectory,
    weeklyVelocity: Math.round(weeklyVelocity * 100) / 100,
    weeksToTarget,
  };
}

/**
 * Analyze correlation between focus time and academic performance
 * Returns a correlation coefficient and prediction
 */
export interface FocusCorrelation {
  correlationStrength: 'strong' | 'moderate' | 'weak';
  estimatedGradeImpact: number; // grade points per 100 focus hours
  recommendation: string;
}

export function analyzeFocusCorrelation(
  currentScore: number,
  totalFocusHours: number,
  daysActive: number
): FocusCorrelation {
  if (daysActive === 0 || totalFocusHours === 0) {
    return {
      correlationStrength: 'weak',
      estimatedGradeImpact: 0,
      recommendation: 'Track focus hours to build correlation data',
    };
  }

  const avgDailyFocus = totalFocusHours / daysActive;
  const gradePerHundredFocus = currentScore / (totalFocusHours / 100 || 1);

  let correlationStrength: 'strong' | 'moderate' | 'weak';
  if (avgDailyFocus >= 6) correlationStrength = 'strong';
  else if (avgDailyFocus >= 3) correlationStrength = 'moderate';
  else correlationStrength = 'weak';

  return {
    correlationStrength,
    estimatedGradeImpact: Math.round(gradePerHundredFocus * 10) / 10,
    recommendation:
      correlationStrength === 'strong'
        ? 'Maintain current focus pace to sustain high performance'
        : correlationStrength === 'moderate'
          ? 'Increase daily focus time to unlock higher grades'
          : 'Build consistent daily focus routine to establish correlation',
  };
}

/**
 * Generate academic yield forecast based on current trajectory
 */
export interface AcademicYieldForecast {
  course: AcademicCourse;
  currentTrend: 'on-track' | 'at-risk' | 'exceeding';
  projectedFinalGrade: string;
  requiredWeeklyHours: number;
  confidenceLevel: number; // 0-100
}

export function generateYieldForecast(
  course: AcademicCourse,
  weeklyStudyHours: number
): AcademicYieldForecast {
  const trajectory = predictGradeTrajectory(course.currentScore, course.targetGrade, weeklyStudyHours);

  const targetNumeric = gradeToNumeric(course.targetGrade);
  const projectedNumeric = gradeToNumeric(trajectory.projectedGrade);
  const currentNumeric = gradeToNumeric(trajectory.currentGrade);

  let trend: 'on-track' | 'at-risk' | 'exceeding';
  if (trajectory.weeksToTarget <= 0) trend = 'exceeding';
  else if (trajectory.weeksToTarget <= 8) trend = 'on-track';
  else trend = 'at-risk';

  // Confidence based on how close we are to target and velocity stability
  const numericGap = Math.abs(targetNumeric - currentNumeric);
  const confidenceLevel = Math.max(
    20,
    Math.round(100 - numericGap * 15 - Math.max(0, trajectory.weeksToTarget - 8) * 5)
  );

  const requiredHours = calculateRequiredStudyHours(
    course.currentScore,
    course.targetGrade,
    weeklyStudyHours
  );

  return {
    course,
    currentTrend: trend,
    projectedFinalGrade: trajectory.projectedGrade,
    requiredWeeklyHours: requiredHours,
    confidenceLevel,
  };
}

/**
 * Compare multiple courses and identify priority courses
 */
export interface AcademicPriority {
  courseId: string;
  courseName: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number; // 0-100, higher = more at-risk
  recommendation: string;
}

export function prioritizeAcademicCourses(
  courses: AcademicCourse[],
  weeklyStudyHours: number
): AcademicPriority[] {
  return courses
    .map(course => {
      const trajectory = predictGradeTrajectory(course.currentScore, course.targetGrade, weeklyStudyHours);
      const targetNumeric = gradeToNumeric(course.targetGrade);
      const projectedNumeric = gradeToNumeric(trajectory.projectedGrade);

      const scoreGap = targetNumeric - projectedNumeric;
      const riskScore = Math.min(100, Math.max(0, scoreGap * 20 + Math.max(0, trajectory.weeksToTarget - 6) * 5));

      let urgency: 'critical' | 'high' | 'medium' | 'low';
      if (riskScore >= 75) urgency = 'critical';
      else if (riskScore >= 50) urgency = 'high';
      else if (riskScore >= 25) urgency = 'medium';
      else urgency = 'low';

      let recommendation = '';
      if (urgency === 'critical') {
        recommendation = `Priority: ${course.name} requires immediate focus to reach ${course.targetGrade}`;
      } else if (urgency === 'high') {
        recommendation = `Increase study time on ${course.name} to maintain target trajectory`;
      } else if (urgency === 'medium') {
        recommendation = `Continue current study plan for ${course.name}`;
      } else {
        recommendation = `${course.name} is on track, minimal intervention needed`;
      }

      return {
        courseId: course.id,
        courseName: course.name,
        urgency,
        riskScore,
        recommendation,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}
