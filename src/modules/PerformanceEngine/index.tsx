/**
 * PERFORMANCE ENGINE - ACADEMIC YIELD
 * ==================================
 * Grade calculator, trajectory prediction, and academic performance insights.
 * Reactive to changes in focus time and study velocity from TemporalEngine.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Plus } from 'lucide-react';
import { useGlobal } from '../../contexts/GlobalProvider';
import { generateYieldForecast, prioritizeAcademicCourses } from '../../services/academic.service';
import { AcademicCourse } from '../../types';

interface AcademicYieldProps {
  weeklyStudyHours: number;
}

export const AcademicYield: React.FC<AcademicYieldProps> = ({ weeklyStudyHours }) => {
  const { academicCourses, setAcademicCourses } = useGlobal();

  // Generate yield forecasts for all courses
  const forecasts = useMemo(
    () => academicCourses.map(course => generateYieldForecast(course, weeklyStudyHours)),
    [academicCourses, weeklyStudyHours]
  );

  // Prioritize courses by urgency
  const priorities = useMemo(
    () => prioritizeAcademicCourses(academicCourses, weeklyStudyHours),
    [academicCourses, weeklyStudyHours]
  );

  const addCourse = () => {
    const courseName = prompt('Enter course name:');
    if (courseName) {
      const newCourse: AcademicCourse = {
        id: Date.now().toString(),
        name: courseName,
        currentScore: 85,
        targetGrade: 'A',
      };
      setAcademicCourses([...academicCourses, newCourse]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-[#cfb991]" />
        <div>
          <h2 className="text-2xl font-serif italic text-white">Academic Yield</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Grade Correlation & Prediction</p>
        </div>
      </div>

      {/* Courses */}
      <AnimatePresence>
        {academicCourses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <TrendingUp className="w-8 h-8 text-white/10 mb-3" />
            <p className="text-sm font-bold text-white/20 uppercase">No courses added</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {forecasts.map(forecast => {
              const priority = priorities.find(p => p.courseId === forecast.course.id);
              const urgencyColors: Record<string, string> = {
                critical: 'bg-[#8B0000]/20 border-[#8B0000]/40',
                high: 'bg-[#B06F5C]/20 border-[#B06F5C]/40',
                medium: 'bg-[#cfb991]/20 border-[#cfb991]/40',
                low: 'bg-[#738775]/20 border-[#738775]/40',
              };

              return (
                <motion.div
                  key={forecast.course.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-2xl border transition-all ${urgencyColors[priority?.urgency || 'low']}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-serif italic text-white">{forecast.course.name}</h3>
                      <div className="flex gap-4 mt-2 text-xs font-mono text-white/60">
                        <span>Current: <strong className="text-white">{forecast.course.currentScore}%</strong></span>
                        <span>Target: <strong className="text-[#cfb991]">{forecast.course.targetGrade}</strong></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-white/40 uppercase mb-1">Status</p>
                      <div className={`px-2 py-1 rounded text-xs font-black uppercase ${
                        forecast.currentTrend === 'on-track'
                          ? 'bg-[#738775]/20 text-[#738775]'
                          : forecast.currentTrend === 'exceeding'
                            ? 'bg-[#cfb991]/20 text-[#cfb991]'
                            : 'bg-[#8B0000]/20 text-[#8B0000]'
                      }`}>
                        {forecast.currentTrend.replace('-', ' ')}
                      </div>
                    </div>
                  </div>

                  {/* Insight Box */}
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <p className="text-xs font-serif italic text-[#cfb991]/80 mb-1">Correlation Insight</p>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Targeting {forecast.course.targetGrade} requires <strong>+{forecast.requiredWeeklyHours}h/week</strong> study based on
                      current trajectory. Confidence: {forecast.confidenceLevel}%
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Add Course Button */}
      <button
        onClick={addCourse}
        className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-xs font-black text-white/40 uppercase tracking-widest hover:border-white/30 hover:text-white/60 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Academic Objective
      </button>

      {/* Recommendations */}
      {priorities.length > 0 && (
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <p className="text-xs font-black text-blue-400 uppercase mb-2">Priority Courses</p>
          <div className="space-y-2">
            {priorities.slice(0, 3).map(priority => (
              <p key={priority.courseId} className="text-xs text-blue-400/70 italic">
                {priority.recommendation}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicYield;
