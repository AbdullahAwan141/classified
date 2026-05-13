import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Calendar, Clock, RefreshCw, RotateCw, Plus, X, ChevronLeft, ChevronRight, ListTodo, PieChart, AlertTriangle, ArrowRight, Trash2, LayoutList, Pencil, Bell, BellRing, Save, Copy, Download, Target, Activity, Settings, TrendingUp, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

// NEW IMPORTS: Global Provider and Services
import { GlobalProvider, useGlobal, useUIState, useModalState } from './contexts/GlobalProvider';
import { calculateTemporalStats } from './services/temporal.service';
import { calculateCategoryStats, CATEGORIES } from './services/analytics.service';
import { Z_INDEX } from './design-system/theme';
import { getDayString, createEmptyDay, generateId, formatHour } from './utils/helpers';
import type { CategoryType, Task, Subtask } from './types';

// Import modules
import { ProtocolAlert } from './modules/TemporalEngine';

/**
 * REFACTORED APP STRUCTURE
 * ========================
 * App wraps AppContent in GlobalProvider
 * AppContent uses all global state via useGlobal() hook
 * All state is now managed centrally by GlobalProvider
 * Services handle all calculations
 */

const App = () => {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
};

const AppContent = () => {
  // Get all global state and actions
  const global = useGlobal();
  const { viewDensity, setViewDensity, selectedHour, setSelectedHour, activeAsideTab, setActiveAsideTab } = useUIState();
  
  // Destructure needed state
  const {
    trackData,
    setTrackData,
    wastedLogs,
    setWastedLogs,
    masterTasks,
    setMasterTasks,
    dailyThemes,
    setDailyThemes,
    academicCourses,
    setAcademicCourses,
    protocolSettings,
    setProtocolSettings,
  } = global;

  // Local UI state
  const currentDateObj = global.currentDate;
  const actualHour = global.actualHour;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
  const [isCompareViewOpen, setIsCompareViewOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isEditingSubtask, setIsEditingSubtask] = useState<{ hour: number; subtaskId: string } | null>(null);
  const [compareDate1, setCompareDate1] = useState(getDayString(new Date()));
  const [compareDate2, setCompareDate2] = useState(getDayString(new Date(Date.now() - 86400000)));
  const [subtaskCategory, setSubtaskCategory] = useState<CategoryType>('none');
  const [masterTaskCategory, setMasterTaskCategory] = useState<CategoryType>('none');
  const [dayTemplates, setDayTemplates] = useState<any[]>([]);
  const notifiedSet = useRef(new Set<string>());

  const dateStr = getDayString(currentDateObj);
  const todayStr = getDayString(new Date());
  const isToday = dateStr === todayStr;

  // Get day data from global state
  const dayTasks = trackData[dateStr] || createEmptyDay('none');
  const dayWastedLogs = wastedLogs[dateStr] || [];

  // Use service to calculate all temporal stats
  const temporalStats = useMemo(
    () => calculateTemporalStats(dayTasks, dayWastedLogs, protocolSettings),
    [dayTasks, dayWastedLogs, protocolSettings]
  );

  // Use service to calculate category stats
  const categoryStats = useMemo(
    () => calculateCategoryStats(dayTasks, dayWastedLogs),
    [dayTasks, dayWastedLogs]
  );

  const totalMinutesAllocated = useMemo(
    () => categoryStats.reduce((sum, c) => sum + c.minutes, 0),
    [categoryStats]
  );

  const { activeDebt, wastedMinutes, maxStreak, isDebtCleared, earnedLeisure } = temporalStats;
  const isWastedAlertGlobal = isToday && activeDebt > 0;

  // Reminder notifications effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (Notification.permission !== 'granted') return;
      
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const dStr = getDayString(now);

      const todayData = trackData[dStr];
      if (!todayData) return;

      const task = todayData[h];
      if (!task) return;

      const tKey = `${dStr}-${h}-task-${m}`;
      if (m === 0 && task.reminder && task.text && !notifiedSet.current.has(tKey)) {
        new Notification("Hour Started", { body: task.text });
        notifiedSet.current.add(tKey);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [trackData]);

  // Task management functions
  const updateTask = (hour: number, field: keyof Task, value: any) => {
    setTrackData((prev) => {
      const newData = { ...prev };
      if (!newData[dateStr]) newData[dateStr] = createEmptyDay();
      newData[dateStr] = {
        ...newData[dateStr],
        [hour]: { ...newData[dateStr][hour], [field]: value }
      };
      return newData;
    });
  };

  const addSubtask = (hour: number, text: string, startMin: string = '0', endMin: string = '60', category: CategoryType = 'none') => {
    if (!text.trim()) return;
    setTrackData((prev) => {
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
        subtasks: [...(task.subtasks || []), { 
          id: generateId(), 
          text, 
          completed: false, 
          category,
          startTime: displayStart,
          endTime: displayEnd,
          duration 
        }]
      };
      return newData;
    });
  };

  const toggleSubtask = (hour: number, subtaskId: string) => {
    setTrackData((prev) => {
      const newData = { ...prev };
      if (!newData[dateStr]) return prev;
      const task = newData[dateStr][hour];
      newData[dateStr][hour] = {
        ...task,
        subtasks: (task.subtasks || []).map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st)
      };
      return newData;
    });
  };

  const deleteSubtask = (hour: number, subtaskId: string) => {
    setTrackData((prev) => {
      const newData = { ...prev };
      if (!newData[dateStr]) return prev;
      const task = newData[dateStr][hour];
      newData[dateStr][hour] = {
        ...task,
        subtasks: (task.subtasks || []).filter(st => st.id !== subtaskId)
      };
      return newData;
    });
  };

  // Master task management
  const addMasterTask = (text: string, category: CategoryType = 'none') => {
    if (!text.trim()) return;
    setMasterTasks(prev => [...prev, { id: generateId(), text, completed: false, category }]);
  };

  const toggleMasterTask = (id: string) => {
    setMasterTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteMasterTask = (id: string) => {
    setMasterTasks(prev => prev.filter(t => t.id !== id));
  };

  // Wasted log management
  const addWastedLog = (reason: string, timeLost: string) => {
    if (!reason.trim()) return;
    setWastedLogs(prev => ({
      ...prev,
      [dateStr]: [...(prev[dateStr] || []), {
        id: generateId(),
        reason,
        timeLost,
        loggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]
    }));
  };

  const deleteWastedLog = (id: string) => {
    setWastedLogs(prev => ({
      ...prev,
      [dateStr]: (prev[dateStr] || []).filter(log => log.id !== id)
    }));
  };

  const shiftDay = (days: number) => {
    const nd = new Date(currentDateObj);
    nd.setDate(nd.getDate() + days);
    // Update global current date
    global.setCurrentDate(nd);
    setSelectedTask(dayTasks[actualHour] || null);
  };

  const jumpToToday = () => {
    global.setCurrentDate(new Date());
    setSelectedHour(new Date().getHours());
  };

  const saveDayAsTemplate = (name: string) => {
    if (!name.trim()) return;
    const tasksToSave = JSON.parse(JSON.stringify(dayTasks));
    const newTemplate = {
      id: generateId(),
      name,
      tasks: tasksToSave,
    };
    setDayTemplates(prev => [...prev, newTemplate]);
  };

  const deleteTemplate = (id: string) => {
    setDayTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Compute selected task details
  useEffect(() => {
    setSelectedTask(dayTasks[selectedHour] || { text: '', category: 'none', completed: false, subtasks: [] });
  }, [selectedHour, dayTasks]);

  const subtasks = selectedTask?.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  return (
    <div className={`min-h-screen bg-transparent pb-12 text-slate-300 font-sans relative overflow-hidden selection:bg-[#cfb991]/30`}>
      {/* Protocol Violation Alert - Uses Module */}
      <ProtocolAlert activeDebt={activeDebt} isWastedAlertActive={isWastedAlertGlobal} />

      {/* Header - Simplified */}
      <header className={`sticky top-0 z-[150] bg-[#0a0a0a]/95 border-b backdrop-blur-3xl transition-all duration-700 ${isWastedAlertGlobal ? 'mt-12 border-[#8B0000]/50 shadow-[0_10px_50px_rgba(139,0,0,0.3)]' : 'border-[#cfb991]/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'}`}>
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-4 md:py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-serif italic tracking-wide text-[#f0ebe1] flex items-center gap-3">
              <Calendar className="w-6 h-6 text-[#cfb991]" strokeWidth={1.2} />
              Bespoke Timeline
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 z-40">
            <button
              onClick={() => setViewDensity(viewDensity === 'complex' ? 'minimal' : 'complex')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all shadow-sm active:scale-95"
            >
              <Settings className="w-4 h-4" />
              {viewDensity === 'complex' ? 'Minimal' : 'Complex'}
            </button>
            <button
              onClick={() => jumpToToday()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#cfb991]/10 border border-[#cfb991]/30 text-[#EEDC9A]/80 text-[10px] font-bold uppercase tracking-widest hover:bg-[#cfb991]/20 hover:text-[#cfb991] transition-all shadow-sm active:scale-95"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden xl:inline">Present</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 md:py-12 flex flex-col gap-8 md:gap-12`}>
        
        {/* Temporal Credit Widget */}
        <div className="flex flex-col md:flex-row gap-6 max-w-[1200px]">
          <div className={`flex-1 bg-black/40 border-white/5 backdrop-blur-md border p-6 rounded-3xl`}>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[13px] font-serif italic tracking-wide text-white/60">Temporal Credit Pool</h4>
              <span className={`text-xl font-mono font-bold tracking-tighter ${temporalStats.availableCredit > 0 ? 'text-[#cfb991]' : 'text-white/20'}`}>
                {temporalStats.availableCredit > 0 ? `+${temporalStats.availableCredit}m` : `${temporalStats.availableCredit}m`}
              </span>
            </div>
            <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden mb-4 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-[#cfb991]/40 to-[#cfb991]"
                style={{ width: `${Math.max(0, Math.min(100, (temporalStats.availableCredit / Math.max(1, earnedLeisure)) * 100))}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-white/30 uppercase tracking-widest">
              <div className="flex gap-4">
                <span><strong className="text-white/50">{temporalStats.focusMinutes}m</strong> Focus</span>
                <span><strong className="text-white/50">{earnedLeisure}m</strong> Yield</span>
              </div>
              {activeDebt > 0 && <span className="text-[#8B0000] font-mono tabular-nums font-black text-sm tracking-widest animate-pulse border-b border-[#8B0000]/30 pb-0.5">-{activeDebt}m DEBT</span>}
            </div>
          </div>
        </div>

        {/* 24-Hour Grid - Simplified Version */}
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-serif italic tracking-wide text-[#cfb991]/80">Circadian Map</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => shiftDay(-1)} className="p-2 hover:bg-white/5 rounded-lg text-[#cfb991]/40 hover:text-[#cfb991] transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-serif italic text-white/80 min-w-[120px] text-center">
                {currentDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <button onClick={() => shiftDay(1)} className="p-2 hover:bg-white/5 rounded-lg text-[#cfb991]/40 hover:text-[#cfb991] transition-all">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 24 }).map((_, hour) => {
              const task = dayTasks[hour];
              const isActualCurrent = isToday && hour === actualHour;
              const isSelected = selectedHour === hour;
              const catInfo = CATEGORIES.find(c => c.id === task.category) || CATEGORIES[0];
              const hasContent = task.text.trim() !== '' || (task.subtasks?.length || 0) > 0;

              return (
                <button
                  key={hour}
                  onClick={() => setSelectedHour(hour)}
                  className={`
                    relative p-3 rounded-2xl flex flex-col justify-between text-left min-h-[6rem] border transition-all duration-300 group cursor-pointer overflow-hidden
                    ${isSelected ? 'ring-1 ring-[#cfb991]/50 border-[#cfb991] scale-[1.02] bg-[#cfb991]/5 z-10 shadow-2xl' : 'hover:bg-white/[0.04] border-white/5 bg-white/[0.02]'}
                    ${isActualCurrent && !isSelected ? 'border-[#EEDC9A]/30 bg-[#EEDC9A]/5' : ''}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black tracking-[0.2em] mb-0.5 text-white/20">{hour >= 12 ? 'PM' : 'AM'}</span>
                      <span className="text-xl font-black tabular-nums text-white/50">{formatHour(hour).time}</span>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${catInfo.color}`}></div>
                  </div>
                  
                  {hasContent && (
                    <div className="text-[9px] font-serif italic text-white/60 line-clamp-2">
                      {task.text}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Analytics Chart */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-2xl font-serif italic tracking-wide text-[#f0ebe1] mb-6 flex items-center gap-3">
            <PieChart className="w-5 h-5 text-[#EEDC9A]" />
            Daily Analytics
          </h2>

          {categoryStats.filter(c => c.minutes > 0).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-white/5 rounded-2xl text-center">
              <PieChart className="w-8 h-8 text-white/5 mb-3" />
              <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No data</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={categoryStats.filter(c => c.minutes > 0).map(c => ({ 
                    name: c.label, 
                    minutes: c.minutes, 
                    hex: c.hex 
                  }))} 
                  layout="vertical"
                  margin={{ top: 0, right: 60, left: 90, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={85} />
                  <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                  <Bar dataKey="minutes" radius={[0, 8, 8, 0]} barSize={24}>
                    {categoryStats.filter(c => c.minutes > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hex} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default App;
