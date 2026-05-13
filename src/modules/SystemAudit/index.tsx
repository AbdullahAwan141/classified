/**
 * SYSTEM AUDIT - MASTER LEDGER & ANALYTICS
 * ========================================
 * Displays master tasks, category statistics, and daily analytics.
 * Reactive updates from other engines are reflected immediately.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Trash2, Plus, ListTodo, BarChart as ChartIcon } from 'lucide-react';
import { useGlobal } from '../../contexts/GlobalProvider';
import { calculateCategoryStats, calculateTotalMinutesAllocated, calculateEfficiencyPercentage } from '../../services/analytics.service';
import { getDayString } from '../../utils/helpers';

interface MasterLedgerProps {
  onTaskAdded?: () => void;
}

export const MasterLedger: React.FC<MasterLedgerProps> = ({ onTaskAdded }) => {
  const { masterTasks, setMasterTasks } = useGlobal();

  const toggleTask = (taskId: string) => {
    const updated = masterTasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setMasterTasks(updated);
  };

  const deleteTask = (taskId: string) => {
    setMasterTasks(masterTasks.filter(t => t.id !== taskId));
  };

  const completedCount = masterTasks.filter(t => t.completed).length;
  const totalCount = masterTasks.length;
  const completionPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ListTodo className="w-6 h-6 text-[#cfb991]" />
          <div>
            <h2 className="text-2xl font-serif italic text-white">Master Ledger</h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Strategic Objectives</p>
          </div>
        </div>
        <div className="bg-[#cfb991]/5 border border-[#cfb991]/20 px-4 py-2 rounded-xl text-sm font-mono text-[#cfb991]">
          {completedCount}/{totalCount} ({completionPercentage}%)
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <AnimatePresence>
          {totalCount === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
              <ListTodo className="w-8 h-8 text-white/10 mb-3" />
              <p className="text-sm font-bold text-white/20 uppercase">No objectives set</p>
            </motion.div>
          ) : (
            <>
              {/* Incomplete Tasks */}
              {masterTasks
                .filter(t => !t.completed)
                .map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="group flex gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="w-5 h-5 mt-1 rounded flex items-center justify-center border border-[#cfb991]/30 text-transparent hover:bg-[#cfb991]/10 transition-colors flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 break-words">{task.text}</p>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-[#8B0000] hover:bg-[#8B0000]/10 rounded transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}

              {/* Completed Tasks */}
              {masterTasks.some(t => t.completed) && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs font-bold text-white/30 uppercase mb-3">Completed</p>
                  {masterTasks
                    .filter(t => t.completed)
                    .map(task => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3 p-3 rounded-lg opacity-60"
                      >
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="w-5 h-5 mt-0.5 rounded flex items-center justify-center bg-[#cfb991] text-white flex-shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <p className="text-sm text-white/40 line-through">{task.text}</p>
                      </motion.div>
                    ))}
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface DailyAnalyticsProps {
  selectedDate: Date;
}

export const DailyAnalytics: React.FC<DailyAnalyticsProps> = ({ selectedDate }) => {
  const { trackData, wastedLogs } = useGlobal();
  const dateStr = getDayString(selectedDate);

  const dayTasks = trackData[dateStr];
  const dayWastedLogs = wastedLogs[dateStr] || [];

  const categoryStats = useMemo(
    () => calculateCategoryStats(dayTasks, dayWastedLogs),
    [dayTasks, dayWastedLogs]
  );

  const totalMinutes = useMemo(
    () => calculateTotalMinutesAllocated(categoryStats),
    [categoryStats]
  );

  const efficiency = useMemo(
    () => calculateEfficiencyPercentage(categoryStats),
    [categoryStats]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ChartIcon className="w-6 h-6 text-[#cfb991]" />
        <div>
          <h2 className="text-2xl font-serif italic text-white">Daily Analytics</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">{dateStr}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
          <p className="text-xs font-black text-white/40 uppercase mb-2">Total Time</p>
          <p className="text-2xl font-bold text-white">{Math.round(totalMinutes / 60)}h</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
          <p className="text-xs font-black text-white/40 uppercase mb-2">Focus %</p>
          <p className="text-2xl font-bold text-[#cfb991]">{efficiency}%</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-white/30 uppercase">Category Breakdown</p>
        {categoryStats.filter(c => c.minutes > 0).map(stat => (
          <div key={stat.id} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${stat.color}`} />
            <span className="text-sm text-white/60 flex-1">{stat.label}</span>
            <span className="text-sm font-mono text-white">{stat.hoursDisplay}h</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasterLedger;
