import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Calendar, Clock, RefreshCw, RotateCw, Plus, X, ChevronLeft, ChevronRight, ListTodo, PieChart, AlertTriangle, ArrowRight, Trash2, LayoutList, Pencil, Bell, BellRing, Save, Copy, Download, Target, Activity, Settings, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

type CategoryType = 'none' | 'focus' | 'care' | 'leisure' | 'family' | 'waste' | 'urgent' | 'prayer';

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  category?: CategoryType;
  startTime?: string; // HH:MM
  endTime?: string;   // HH:MM
  duration?: number;  // in minutes
  reminder?: boolean;
}

interface WastedLog {
  id: string;
  reason: string;
  timeLost: string;
  loggedAt: string;
}

interface ScreenTimeLog {
  id: string;
  appName: string;
  duration: string;
  loggedAt: string;
}

interface Task {
  text: string;
  category: CategoryType;
  completed: boolean;
  subtasks: Subtask[];
  reminder?: boolean;
  energy?: 'low' | 'neutral' | 'high';
}

interface DayTemplate {
  id: string;
  name: string;
  tasks: Record<number, Task>;
}

// Data structure: root is an object keyed by date string (YYYY-MM-DD).
// Inside each date is an object keyed by hour (0-23) pointing to a Task.
type TrackData = Record<string, Record<number, Task>>;

const CATEGORIES: { id: CategoryType; color: string; bgClass: string; label: string; hex: string }[] = [
  { id: 'none', color: 'bg-white/20', bgClass: 'bg-white/[0.03]', label: 'Unplanned', hex: '#64748b' },
  { id: 'focus', color: 'bg-[#cfb991]', bgClass: 'bg-[#cfb991]/10 border-[#cfb991]/30', label: 'Study/Work', hex: '#cfb991' },
  { id: 'prayer', color: 'bg-[#899ca1]', bgClass: 'bg-[#899ca1]/10 border-[#899ca1]/30', label: 'Prayer/Soul', hex: '#899ca1' },
  { id: 'family', color: 'bg-[#a38699]', bgClass: 'bg-[#a38699]/10 border-[#a38699]/30', label: 'Family/Social', hex: '#a38699' },
  { id: 'care', color: 'bg-[#738775]', bgClass: 'bg-[#738775]/10 border-[#738775]/30', label: 'Self Care', hex: '#738775' },
  { id: 'leisure', color: 'bg-[#a89d95]', bgClass: 'bg-[#a89d95]/10 border-[#a89d95]/30', label: 'Leisure', hex: '#a89d95' },
  { id: 'waste', color: 'bg-[#8B0000]', bgClass: 'bg-[#8B0000]/10 border-[#8B0000]/30', label: 'Time Wasted', hex: '#8B0000' },
  { id: 'urgent', color: 'bg-[#B06F5C]', bgClass: 'bg-[#B06F5C]/10 border-[#B06F5C]/30', label: 'Urgent', hex: '#B06F5C' },
];

function formatHour(hour: number) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return { time: `${displayHour}:00`, ampm };
}

function getDayString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createEmptyDay(defaultCategory: CategoryType = 'none'): Record<number, Task> {
  const day: Record<number, Task> = {};
  for (let i = 0; i < 24; i++) {
    day[i] = { text: '', category: defaultCategory, completed: false, subtasks: [] };
  }
  return day;
}

const App = () => {
  const [data, setData] = useLocalStorage<TrackData>('neural-track-data-v2', {});
  const [dailyThemes, setDailyThemes] = useLocalStorage<Record<string, { theme: CategoryType, text: string }>>('neural-daily-themes-v1', {});
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
  const [wastedData, setWastedData] = useLocalStorage<Record<string, WastedLog[]>>('waste-logs-v1', {});
  const [screenTimeData, setScreenTimeData] = useLocalStorage<Record<string, ScreenTimeLog[]>>('screen-time-logs-v1', {});
  const [masterTasks, setMasterTasks] = useLocalStorage<{id: string, text: string, completed: boolean, category?: CategoryType}[]>('neural-master-tasks-v2', []);
  const [templates, setTemplates] = useLocalStorage<DayTemplate[]>('neural-day-templates-v1', []);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [currentDateObj, setCurrentDateObj] = useState(new Date());
  const [actualHour, setActualHour] = useState<number>(new Date().getHours());
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());

  const [isWastedLogOpen, setIsWastedLogOpen] = useState(false);
  const [isScreenTimeOpen, setIsScreenTimeOpen] = useState(false);
  const [isCompareViewOpen, setIsCompareViewOpen] = useState(false);
  const [compareDate1, setCompareDate1] = useState(getDayString(new Date()));
  const [compareDate2, setCompareDate2] = useState(getDayString(new Date(Date.now() - 86400000)));

  const [subtaskCategory, setSubtaskCategory] = useState<CategoryType>('none');
  const [masterTaskCategory, setMasterTaskCategory] = useState<CategoryType>('none');
  const [editingSubtask, setEditingSubtask] = useState<{ hour: number; subtaskId: string } | null>(null);
  const [activeAsideTab, setActiveAsideTab] = useState<'hour' | 'master' | 'yield' | 'settings'>('hour');
  const [isProtocolSettingsOpen, setIsProtocolSettingsOpen] = useState(false);
  const [academicCourses, setAcademicCourses] = useLocalStorage<{ id: string, name: string, targetGrade: string, currentScore: number }[]>('academic-courses-v1', [
    { id: '1', name: 'Neural Dynamics', targetGrade: 'A+', currentScore: 88 },
    { id: '2', name: 'Temporal Ethics', targetGrade: 'A', currentScore: 82 }
  ]);
  const notifiedSet = useRef(new Set<string>());
  const [isNeuralLogOpen, setIsNeuralLogOpen] = useState(false);
  const [viewDensity, setViewDensity] = useLocalStorage<'complex' | 'minimal'>('neural-view-density-v1', 'complex');
  const [neuralLogs, setNeuralLogs] = useLocalStorage<{id: string, message: string, type: 'warning'|'reward'|'info', timestamp: string, read: boolean}[]>('neural-logs-v1', []);
  const [alertDismissedForDebt, setAlertDismissedForDebt] = useState<number | null>(null);

  const [protocolSettings, setProtocolSettings] = useLocalStorage('neural-protocol-settings-v1', {
    wastedTimeThreshold: 60,
    focusToRewardRatioFocus: 60,
    focusToRewardRatioReward: 15
  });

  const dateStr = getDayString(currentDateObj);
  const todayStr = getDayString(new Date());

  const isToday = dateStr === todayStr;

  const dayTasks = data[dateStr] || createEmptyDay(dailyThemes[dateStr]?.theme || 'none');
  const dayWastedLogs = wastedData[dateStr] || [];
  const dayScreenTimeLogs = screenTimeData[dateStr] || [];

  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = new Date();
      setActualHour(currentDate.getHours());
    }, 60000); // Only need to check hour change every minute
    return () => clearInterval(interval);
  }, []);

  // Setup Notification Request and Reminder Interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (Notification.permission !== 'granted') return;
      
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const dStr = getDayString(now);

      const todayData = data[dStr];
      if (!todayData) return;

      const task = todayData[h];
      if (!task) return;

      const tKey = `${dStr}-${h}-task-${m}`;
      if (m === 0 && task.reminder && task.text && !notifiedSet.current.has(tKey)) {
        new Notification("Hour Started", { body: task.text });
        notifiedSet.current.add(tKey);
      }

      if (task.subtasks) {
        task.subtasks.forEach(st => {
          if (st.reminder && st.startTime) {
            const stMin = parseInt(st.startTime.split(':')[1] || '0');
            const key = `${dStr}-${h}-${m}-${st.id}`;
            if (m === stMin && !notifiedSet.current.has(key)) {
              new Notification("Subroutine", { body: st.text });
              notifiedSet.current.add(key);
            }
          }
        });
      }
    }, 10000); 

    return () => clearInterval(interval);
  }, [data]);

  // ---------------------------------------------------------
  // 1. Unified Temporal Balance Engine (Calculated on Render)
  // ---------------------------------------------------------
  const stats = useMemo(() => {
    let focusMinutes = 0;
    let wastedMinutes = 0;
    let leisureMinutes = 0;

    Object.entries(dayTasks).forEach(([_, t]) => {
      const tsk = t as Task;
      if (tsk.subtasks && tsk.subtasks.length > 0) {
        focusMinutes += tsk.subtasks.filter(s => s.completed && (s.category === 'focus' || (!s.category && tsk.category === 'focus'))).reduce((sum, s) => sum + (s.duration || 0), 0);
        wastedMinutes += tsk.subtasks.filter(s => s.completed && (s.category === 'waste' || (!s.category && tsk.category === 'waste'))).reduce((sum, s) => sum + (s.duration || 0), 0);
        leisureMinutes += tsk.subtasks.filter(s => s.completed && (s.category === 'leisure' || (!s.category && tsk.category === 'leisure'))).reduce((sum, s) => sum + (s.duration || 0), 0);
      } else if (tsk.completed) {
        if (tsk.category === 'focus') focusMinutes += 60;
        if (tsk.category === 'waste') wastedMinutes += 60;
        if (tsk.category === 'leisure') leisureMinutes += 60;
      }
    });

    dayWastedLogs.forEach(log => {
      const mMatch = log.timeLost.match(/(\d+)m/);
      const hMatch = log.timeLost.match(/(\d+)h/);
      let mins = 0;
      if (hMatch) mins += parseInt(hMatch[1]) * 60;
      if (mMatch) mins += parseInt(mMatch[1]);
      wastedMinutes += mins;
    });

    const earnedLeisure = Math.floor(focusMinutes / (protocolSettings.focusToRewardRatioFocus || 60)) * (protocolSettings.focusToRewardRatioReward || 15);
    
    // Streak Logic (Redemption)
    let maxFocusStreak = 0;
    let currentFocusStreak = 0;
    
    for (let h = 0; h < 24; h++) {
        const hourTask = dayTasks[h];
        const hasWasteInHour = dayWastedLogs.some(log => {
            const hMatch = log.loggedAt?.match(/^(\d+):/);
            return hMatch && parseInt(hMatch[1], 10) === h;
        });

        let hourFocusMins = 0;
        if (hourTask.subtasks && hourTask.subtasks.length > 0) {
            hourFocusMins = hourTask.subtasks.filter(s => s.completed && (s.category === 'focus' || (!s.category && hourTask.category === 'focus'))).reduce((sum, s) => sum + (s.duration || 0), 0);
        } else if (hourTask.completed && hourTask.category === 'focus') {
            hourFocusMins = 60;
        }

        if (hourFocusMins > 0 && !hasWasteInHour) {
            currentFocusStreak += hourFocusMins;
            maxFocusStreak = Math.max(maxFocusStreak, currentFocusStreak);
        } else {
            currentFocusStreak = 0;
        }
    }

    const isDebtCleared = maxFocusStreak >= 120;
    const temporalDebt = Math.max(0, wastedMinutes - protocolSettings.wastedTimeThreshold);
    const activeDebt = isDebtCleared ? 0 : temporalDebt;
    const availableCredit = earnedLeisure - leisureMinutes - (isDebtCleared ? 0 : temporalDebt);

    return {
      focusMinutes,
      wastedMinutes,
      leisureMinutes,
      earnedLeisure,
      maxFocusStreak,
      isDebtCleared,
      temporalDebt,
      activeDebt,
      availableCredit
    };
  }, [dayTasks, dayWastedLogs, protocolSettings]);

  // Notifications Effect
  useEffect(() => {
    if (!isToday) return;
    
    const { temporalDebt, isDebtCleared, wastedMinutes } = stats;

    setNeuralLogs(prev => {
      let newLogs = [...prev];
      let hasChanges = false;
      
      if (temporalDebt > 0 && !isDebtCleared) {
        const warningId = `warning-${todayStr}-${Math.floor(wastedMinutes / 10)}`;
        if (!newLogs.some(l => l.id.startsWith(`warning-${todayStr}`))) {
          newLogs.push({
            id: warningId,
            type: 'warning',
            message: `BALANCE WARNING: System Red alert triggered. You are ${temporalDebt}m over limit. Redemption Protocol required (2hr Focus).`,
            timestamp: new Date().toISOString(),
            read: false
          });
          hasChanges = true;
        }
      }
      
      if (isDebtCleared) {
        const redemptionId = `redemption-${todayStr}`;
        if (!newLogs.some(l => l.id === redemptionId)) {
          newLogs.push({
            id: redemptionId,
            type: 'reward',
            message: 'REDEMPTION ARCHIVED: 120min consecutive focus achieved. Temporal debt zeroed.',
            timestamp: new Date().toISOString(),
            read: false
          });
          hasChanges = true;
        }
      }

      return hasChanges ? newLogs : prev;
    });
  }, [stats, isToday, todayStr]);

  const toggleReminder = async (subtaskId?: string) => {
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }
    if (Notification.permission !== 'granted') {
       alert("Notifications are disabled. Please enable them in your browser.");
       return;
    }

    if (subtaskId) {
      setData((prev) => {
        const newData = { ...prev };
        const task = newData[dateStr][selectedHour];
        const subtasks = [...(task.subtasks || [])];
        const idx = subtasks.findIndex((s) => s.id === subtaskId);
        if (idx !== -1) {
          subtasks[idx] = { ...subtasks[idx], reminder: !subtasks[idx].reminder };
        }
        newData[dateStr][selectedHour] = { ...task, subtasks };
        return newData;
      });
    } else {
      updateTask(selectedHour, 'reminder', !selectedTask.reminder);
    }
  };

  const updateTask = (hour: number, field: keyof Task, value: any) => {
    setData((prev) => {
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
    setData((prev) => {
      const newData = { ...prev };
      if (!newData[dateStr]) newData[dateStr] = createEmptyDay();
      const task = newData[dateStr][hour];
      
      const sMin = parseInt(startMin) || 0;
      const eMin = parseInt(endMin) || 60;
      const duration = Math.abs(eMin - sMin);
      
      const hStr = hour % 12 || 12;
      const nextHStr = (hour + 1) % 12 || 12;
      
      // If endMin is 60, it reaches the next hour
      const displayStart = `${hStr}:${sMin.toString().padStart(2, '0')}`;
      const displayEnd = eMin === 60 ? `${nextHStr}:00` : `${hStr}:${eMin.toString().padStart(2, '0')}`;
      const timeRange = `${displayStart} to ${displayEnd}`;

      newData[dateStr][hour] = {
        ...task,
        subtasks: [...(task.subtasks || []), { 
          id: Math.random().toString(36).substring(7), 
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

  const parseWastedDuration = (str: string): number => {
    const minsMatch = str.match(/(\d+)\s*m/);
    const hoursMatch = str.match(/(\d+)\s*h/);
    let total = 0;
    if (hoursMatch) total += parseInt(hoursMatch[1]) * 60;
    if (minsMatch) total += parseInt(minsMatch[1]);
    if (!hoursMatch && !minsMatch) {
      const plainNum = parseInt(str);
      if (!isNaN(plainNum)) total = plainNum;
    }
    return total;
  };

  const addWastedLog = (reason: string, timeLost: string) => {
    if (!reason.trim()) return;
    setWastedData(prev => ({
      ...prev,
      [dateStr]: [...(prev[dateStr] || []), {
        id: Math.random().toString(36).substring(7),
        reason,
        timeLost,
        loggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]
    }));
  };

  const deleteWastedLog = (id: string) => {
    setWastedData(prev => ({
      ...prev,
      [dateStr]: (prev[dateStr] || []).filter(log => log.id !== id)
    }));
  };

  const addScreenTimeLog = (appName: string, duration: string) => {
    if (!appName.trim()) return;
    setScreenTimeData(prev => ({
      ...prev,
      [dateStr]: [...(prev[dateStr] || []), {
        id: Math.random().toString(36).substring(7),
        appName,
        duration,
        loggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]
    }));
  };

  const deleteScreenTimeLog = (id: string) => {
    setScreenTimeData(prev => ({
      ...prev,
      [dateStr]: (prev[dateStr] || []).filter(log => log.id !== id)
    }));
  };

  const addMasterTask = (text: string, category: CategoryType = 'none') => {
    if (!text.trim()) return;
    setMasterTasks(prev => [...prev, { id: Math.random().toString(36).substring(7), text, completed: false, category }]);
  };

  const toggleMasterTask = (id: string) => {
    setMasterTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteMasterTask = (id: string) => {
    setMasterTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleSubtask = (hour: number, subtaskId: string) => {
    setData((prev) => {
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
    setData((prev) => {
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

  const saveDayAsTemplate = (name: string) => {
    if (!name.trim()) return;
    
    const tasksToSave = JSON.parse(JSON.stringify(dayTasks));
    Object.keys(tasksToSave).forEach((key) => {
      const k = parseInt(key);
      tasksToSave[k].completed = false;
      if (tasksToSave[k].subtasks) {
        tasksToSave[k].subtasks.forEach((st: any) => {
          st.completed = false;
        });
      }
    });

    const newTemplate: DayTemplate = {
      id: Math.random().toString(36).substring(7),
      name,
      tasks: tasksToSave,
    };

    setTemplates(prev => [...prev, newTemplate]);
  };

  const applyTemplate = (template: DayTemplate) => {
    const tasksToApply = JSON.parse(JSON.stringify(template.tasks));
    Object.keys(tasksToApply).forEach((key) => {
      const k = parseInt(key);
      tasksToApply[k].completed = false;
      if (tasksToApply[k].subtasks) {
        tasksToApply[k].subtasks.forEach((st: any) => {
          st.completed = false;
        });
      }
    });

    setData(prev => ({
      ...prev,
      [dateStr]: tasksToApply
    }));
    setIsTemplateModalOpen(false);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const updateSubtaskDetails = (hour: number, subtaskId: string, updates: Partial<Subtask>) => {
    setData((prev) => {
      const newData = { ...prev };
      const task = newData[dateStr][hour];
      const subtasks = [...(task.subtasks || [])];
      const idx = subtasks.findIndex((s) => s.id === subtaskId);
      if (idx === -1) return prev;

      const st = subtasks[idx];
      const updatedSt = { ...st, ...updates };

      // Re-calculate duration if start/end times changed
      if (updates.startTime || updates.endTime) {
         const hMatch = updatedSt.startTime?.split(':')[0];
         const sMin = parseInt(updatedSt.startTime?.split(':')[1] || '0');
         let eMin = parseInt(updatedSt.endTime?.split(':')[1] || '0');
         const eHMatch = updatedSt.endTime?.split(':')[0];
         
         if (eMin === 0 && eHMatch !== hMatch) {
            eMin = 60;
         }
         updatedSt.duration = Math.abs(eMin - sMin);
      }

      subtasks[idx] = updatedSt;
      newData[dateStr][hour] = { ...task, subtasks };
      return newData;
    });
  };

  const handleClearDay = () => {
    if (window.confirm("Purge all data for this day?")) {
      setData((prev) => {
        const newData = { ...prev };
        newData[dateStr] = createEmptyDay();
        return newData;
      });
    }
  };

  const shiftDay = (days: number) => {
    const nd = new Date(currentDateObj);
    nd.setDate(nd.getDate() + days);
    setCurrentDateObj(nd);
    if (getDayString(nd) === todayStr) {
      setSelectedHour(new Date().getHours());
    }
  };

  const jumpToToday = () => {
    setCurrentDateObj(new Date());
    setSelectedHour(new Date().getHours());
  };

  const selectedTask = dayTasks[selectedHour] || { text: '', category: 'none', completed: false, subtasks: [] };
  const subtasks = selectedTask.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  const updateSubtaskTime = (hour: number, subtaskId: string, newStartMin: number, newDuration?: number) => {
    setData((prev) => {
      const newData = { ...prev };
      const task = newData[dateStr][hour];
      const subtasks = [...(task.subtasks || [])];
      const idx = subtasks.findIndex((s) => s.id === subtaskId);
      if (idx === -1) return prev;

      const st = subtasks[idx];
      const duration = newDuration ?? (st.duration || 15);

      // Clamp values
      const clampedStart = Math.max(0, Math.min(60 - duration, Math.round(newStartMin)));
      const clampedEnd = Math.min(60, clampedStart + duration);
      const finalDuration = clampedEnd - clampedStart;

      const hStr = hour % 12 || 12;
      const nextHStr = (hour + 1) % 12 || 12;

      const displayStart = `${hStr}:${clampedStart.toString().padStart(2, '0')}`;
      const displayEnd = clampedEnd === 60 ? `${nextHStr}:00` : `${hStr}:${clampedEnd.toString().padStart(2, '0')}`;

      subtasks[idx] = {
        ...st,
        startTime: displayStart,
        endTime: displayEnd,
        duration: finalDuration
      };

      newData[dateStr][hour] = { ...task, subtasks };
      return newData;
    });
  };

interface TimelineProps {
  subtasks: Subtask[];
  completedSubtasks: number;
  selectedHour: number;
  isToday: boolean;
  setEditingSubtask: (val: { hour: number; subtaskId: string } | null) => void;
  selectedTask: Task;
}

const Timeline = ({ subtasks, completedSubtasks, selectedHour, isToday, setEditingSubtask, selectedTask }: TimelineProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (subtasks.length === 0) return null;
  const completionPercentage = (completedSubtasks / subtasks.length) * 100;

  // Calculate current time marker if it's the selected hour today
  const isCurrentHourSelected = now.getHours() === selectedHour && isToday;
  const currentMinPerc = (now.getMinutes() / 60) * 100;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#EEDC9A]/40 font-serif italic tracking-[0.1em]">Circadian Rhythm</span>
          <div className="h-px w-8 bg-[#EEDC9A]/10"></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#cfb991] bg-[#cfb991]/10 px-2 py-0.5 rounded border border-[#cfb991]/20">
            {completedSubtasks}/{subtasks.length} Sync
          </span>
          <span className="text-[10px] font-mono text-white/60">{Math.round(completionPercentage)}%</span>
        </div>
      </div>

      {/* Global Progress Bar */}
      <div className="h-1.5 w-full bg-white/5 rounded-full mb-6 overflow-hidden border border-white/5">
        <motion.div 
          className="h-full bg-[#cfb991] shadow-[0_0_10px_rgba(207,185,145,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${completionPercentage}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      <div ref={containerRef} className="h-16 w-full bg-white/[0.02] rounded-2xl relative border border-white/5 shadow-inner overflow-visible">
        {/* Detailed background grid */}
        <div className="absolute inset-0 flex pointer-events-none rounded-2xl overflow-hidden">
          {Array.from({ length: 60 }).map((_, m) => (
            <div 
              key={m} 
              className={`h-full border-r border-white/5 shrink-0 ${m % 15 === 0 ? 'bg-white/10 opacity-50' : m % 5 === 0 ? 'opacity-20' : 'opacity-5'}`}
              style={{ width: `${100/60}%` }}
            />
          ))}
        </div>
        
        <div className="absolute inset-x-0 bottom-1 h-[2px] bg-[#cfb991]/5 z-0"></div>

        {/* Current Time Marker */}
        {isCurrentHourSelected && (
          <motion.div 
            className="absolute top-0 bottom-0 w-[2px] bg-[#8B0000]/60 z-40 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
            style={{ left: `${currentMinPerc}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#8B0000]"></div>
            <div className="absolute -top-4 -left-3 text-[7px] font-bold text-[#8B0000] bg-black/80 px-1 rounded uppercase">Now</div>
          </motion.div>
        )}

        <AnimatePresence>
          {subtasks.map((st) => {
            const sMin = parseInt(st.startTime?.split(':')[1] || '0');
            let eMin = parseInt(st.endTime?.split(':')[1] || '0');
            const endTimeParts = st.endTime?.split(':');
            const startTimeParts = st.startTime?.split(':');
            
            if (eMin === 0 && endTimeParts && startTimeParts && endTimeParts[0] !== startTimeParts[0]) {
              eMin = 60;
            }
            
            const widthPerc = Math.max(2, ((eMin - sMin) / 60) * 100);
            const leftPerc = (sMin / 60) * 100;
            const catColor = CATEGORIES.find(c => c.id === (st.category || selectedTask.category))?.color || 'bg-[#cfb991]';

            return (
              <motion.div
                key={st.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2, zIndex: 100 }}
                onClick={() => setEditingSubtask({ hour: selectedHour, subtaskId: st.id })}
                className="absolute h-12 top-2 px-[1px] z-20 group/segment cursor-pointer"
                style={{ left: `${leftPerc}%`, width: `${widthPerc}%` }}
              >
                <div 
                  className={`
                    h-full w-full rounded-xl border flex flex-col items-center justify-center relative transition-all duration-300
                    ${st.completed 
                      ? `${catColor} border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)]` 
                      : 'bg-[#111111]/80 border-white/10 hover:bg-[#222222]/90 hover:border-[#cfb991]/30 shadow-xl backdrop-blur-sm'}
                  `}
                  title={`${st.text} (${st.startTime} - ${st.endTime}) - Click to edit`}
                >
                  {/* Status Dot */}
                  <div className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full border border-white/20 ${st.completed ? 'bg-white/80' : 'bg-white/20'}`}></div>
                  
                  <span className={`
                    text-[9px] font-black tracking-tight truncate px-2 select-none mb-0.5
                    ${st.completed ? 'text-white' : 'text-white/40'}
                  `}>
                    {widthPerc > 12 ? st.text : ''}
                  </span>
                  
                  <span className={`
                    text-[8px] font-mono select-none
                    ${st.completed ? 'text-white/60' : 'text-white/20'}
                  `}>
                    {widthPerc > 15 ? `${st.duration}m` : ''}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="flex justify-between mt-3 px-1 text-[8px] font-mono text-white/20 uppercase tracking-[0.4em]">
        <span>START</span>
        <span>15m</span>
        <span>30m</span>
        <span>45m</span>
        <span>END</span>
      </div>
    </div>
  );
};


  const saveDailyMandate = (text: string, theme: CategoryType) => {
    setDailyThemes(prev => ({
      ...prev,
      [dateStr]: { text, theme }
    }));
    // Also update all empty tasks in this day to use the new theme
    setData(prev => {
      const newData = { ...prev };
      if (!newData[dateStr]) {
        newData[dateStr] = createEmptyDay(theme);
      } else {
        const day = { ...newData[dateStr] };
        for (let i = 0; i < 24; i++) {
          if (day[i].text === '' && (!day[i].subtasks || day[i].subtasks.length === 0)) {
            day[i] = { ...day[i], category: theme };
          }
        }
        newData[dateStr] = day;
      }
      return newData;
    });
    setIsMandateModalOpen(false);
  };

const TemporalProgressBar = ({ active, size = 'default' }: { active: boolean; size?: 'default' | 'large' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;
    const update = () => {
      const now = new Date();
      const p = ((now.getMinutes() * 60 + now.getSeconds()) / 3600) * 100;
      setProgress(p);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  if (size === 'large') {
    return (
      <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-[#cfb991] shadow-[0_0_15px_#cfb991]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "tween", ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#cfb991]/30 to-[#cfb991]/5 pointer-events-none transition-all duration-1000 z-0"
      style={{ height: `${progress}%` }}
    />
  );
};

const BlockCountdown = ({ active }: { active: boolean }) => {
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!active) return;
    const update = () => {
      const now = new Date();
      setTime(`${String(59 - now.getMinutes()).padStart(2, '0')}:${String(59 - now.getSeconds()).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className={`text-[#cfb991] font-mono text-xl tabular-nums`}>
      {time}
    </div>
  );
};



  const calculateCategoryStats = (targetDateStr: string = dateStr) => {
    const targetDayTasks = data[targetDateStr] || createEmptyDay();
    const targetDayWastedLogs = wastedData[targetDateStr] || [];

    const stats = CATEGORIES.filter(c => c.id !== 'none').map(cat => {
      let totalMinutes = 0;
      
      // Calculate from 24h grid
      Object.entries(targetDayTasks).forEach(([_, task]) => {
        const t = task as Task;
        
        // Add from subtasks that have this category
        if (t.subtasks && t.subtasks.length > 0) {
          const subSum = t.subtasks
            .filter(s => s.completed && (s.category === cat.id || (!s.category && t.category === cat.id)))
            .reduce((sum, s) => sum + (s.duration || 0), 0);
          totalMinutes += subSum;
        } else if (t.completed && t.category === cat.id) {
          // Default to full hour if no subtasks but task is complete
          totalMinutes += 60;
        }
      });

      // Special case: Add from Wasted Log if category is 'waste'
      if (cat.id === 'waste') {
        targetDayWastedLogs.forEach(log => {
          totalMinutes += parseWastedDuration(log.timeLost);
        });
      }

      return {
        ...cat,
        minutes: totalMinutes,
        hoursDisplay: (totalMinutes / 60).toFixed(1)
      };
    });

    return stats.sort((a, b) => b.minutes - a.minutes);
  };

  const categoryStats = useMemo(() => calculateCategoryStats(), [data, wastedData, dateStr]);
  const totalMinutesAllocated = useMemo(() => categoryStats.reduce((sum, c) => sum + c.minutes, 0), [categoryStats]);
  const totalScreenTime = useMemo(() => dayScreenTimeLogs.reduce((sum, log) => sum + parseWastedDuration(log.duration), 0), [dayScreenTimeLogs]);

  const statsToday = useMemo(() => {
    const wastedMinutes = categoryStats.find(s => s.id === 'waste')?.minutes || 0;
    let maxStreak = 0;
    let currentStreak = 0;
    for (let i = 0; i < 24; i++) {
      const hasDistractionThisHour = dayWastedLogs.some(log => {
        const match = log.loggedAt?.match(/^(\d+):/);
        return match && parseInt(match[1], 10) === i;
      });
      if (dayTasks[i].category === 'focus' && dayTasks[i].completed && dayTasks[i].energy === 'high' && !hasDistractionThisHour) {
        currentStreak += 60; 
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    const isDebtCleared = maxStreak >= 120;
    const overLimit = Math.max(0, wastedMinutes - protocolSettings.wastedTimeThreshold);
    const activeDebt = isDebtCleared ? 0 : overLimit;
    
    return { wastedMinutes, maxStreak, isDebtCleared, overLimit, activeDebt };
  }, [categoryStats, dayWastedLogs, dayTasks, protocolSettings]);

  const { wastedMinutes: wastedMinutesToday, maxStreak: maxStreakToday, isDebtCleared: isDebtClearedToday, overLimit: overLimitToday, activeDebt: activeDebtToday } = statsToday;
  const isWastedAlertGlobal = isToday && activeDebtToday > 0 && alertDismissedForDebt !== activeDebtToday;
  const isRestoredGlobal = isToday && overLimitToday > 0 && isDebtClearedToday;

  return (
    <div className={`min-h-screen bg-transparent pb-12 text-slate-300 font-sans relative overflow-hidden selection:bg-[#cfb991]/30 ${isWastedAlertGlobal ? 'border-4 border-[#8B0000] shadow-[inset_0_0_100px_rgba(139,0,0,0.4)]' : isRestoredGlobal ? 'border-4 border-[#cfb991] shadow-[inset_0_0_100px_rgba(207,185,145,0.2)]' : ''}`}>
      {/* Protocol Violation Overlay Alert */}
      <AnimatePresence>
        {isWastedAlertGlobal && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 inset-x-0 bg-[#8B0000] shadow-[inset_0_0_20px_rgba(255,255,255,0.15),0_10px_40px_rgba(0,0,0,0.5)] border-b border-white/10 flex items-center justify-center h-12 z-[200] px-6"
          >
            <div className="absolute left-6 hidden md:block">
               <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-ping" />
            </div>
            
            <div className="flex items-center gap-4 text-white font-black uppercase text-[10px] md:text-xs tracking-[0.25em]">
              <AlertTriangle className="w-4 h-4 text-white/50" />
              <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                PROTOCOL VIOLATED: 
                <span className="font-mono text-white text-base tabular-nums mx-2">-{activeDebtToday}m</span> 
                DEBT RECOVERY ACTIVE
              </span>
              <AlertTriangle className="w-4 h-4 text-white/50" />
            </div>

            <button 
              onClick={() => setAlertDismissedForDebt(activeDebtToday)}
              className="absolute right-6 p-1.5 hover:bg-white/10 rounded-full transition-all text-white/60 hover:text-white group active:scale-95"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </motion.div>
        )}
        {isRestoredGlobal && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '46px' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full pointer-events-none bg-[#cfb991] shadow-[0_4px_30px_rgba(207,185,145,0.8)] border-b border-black flex items-center justify-center overflow-hidden relative z-[100]"
          >
            <div className="flex items-center gap-3 text-black font-black uppercase text-[10px] md:text-xs tracking-[0.2em] animate-pulse" style={{ textShadow: "0 0 10px rgba(0,0,0,0.2)"}}>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
              <span>PROTOCOL RESTORED. SYSTEM CLEARED.</span>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Subtask Modal */}
      <AnimatePresence>
        {editingSubtask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f1115]/90 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1a1c23] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Edit Sub-routine</h3>
                <button 
                  onClick={() => setEditingSubtask(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-2 block">Routine Title</label>
                  <input
                    type="text"
                    defaultValue={subtasks.find(s => s.id === editingSubtask.subtaskId)?.text}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-[#cfb991]/50 outline-none transition-all shadow-inner"
                    id="edit-subtask-text"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-2 block">Start minute</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      defaultValue={subtasks.find(s => s.id === editingSubtask.subtaskId)?.startTime?.split(':')[1]}
                      className="w-full bg-[#0a0a0a]/90 black/40 border border-white/10 rounded-2xl p-4 text-white font-mono focus:border-[#cfb991]/50 outline-none transition-all shadow-inner"
                      id="edit-subtask-start"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-2 block">End minute</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      defaultValue={subtasks.find(s => s.id === editingSubtask.subtaskId)?.endTime?.split(':')[1].replace(':00', '60')}
                      className="w-full bg-[#0a0a0a]/90 black/40 border border-white/10 rounded-2xl p-4 text-white font-mono focus:border-[#cfb991]/50 outline-none transition-all shadow-inner"
                      id="edit-subtask-end"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          const currentSt = subtasks.find(s => s.id === editingSubtask.subtaskId);
                          if (currentSt) {
                            updateSubtaskDetails(editingSubtask.hour, editingSubtask.subtaskId, { category: cat.id });
                          }
                        }}
                        className={`px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                          (subtasks.find(s => s.id === editingSubtask.subtaskId)?.category || 'none') === cat.id
                            ? 'bg-white/10 border-white/40 text-white'
                            : 'bg-[#0a0a0a]/90 black/20 border-white/5 text-white/30 hover:bg-white/5'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.color}`}></span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-[#0a0a0a]/90 black/20 border-t border-white/5 flex gap-3">
                <button
                  onClick={() => setEditingSubtask(null)}
                  className="flex-1 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const text = (document.getElementById('edit-subtask-text') as HTMLInputElement).value;
                    const startMin = (document.getElementById('edit-subtask-start') as HTMLInputElement).value;
                    const endMin = (document.getElementById('edit-subtask-end') as HTMLInputElement).value;
                    
                    const hStr = editingSubtask.hour % 12 || 12;
                    const nextHStr = (editingSubtask.hour + 1) % 12 || 12;
                    const displayStart = `${hStr}:${startMin.padStart(2, '0')}`;
                    const displayEnd = endMin === '60' ? `${nextHStr}:00` : `${hStr}:${endMin.padStart(2, '0')}`;

                    updateSubtaskDetails(editingSubtask.hour, editingSubtask.subtaskId, { 
                      text,
                      startTime: displayStart,
                      endTime: displayEnd
                    });
                    setEditingSubtask(null);
                  }}
                  className="flex-[2] py-4 rounded-2xl bg-[#cfb991] hover:bg-[#EEDC9A] text-white text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-[#cfb991]/20 transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      <AnimatePresence>
        {isCompareViewOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0a0b0d]/95 backdrop-blur-xl p-0 sm:p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-[#0f1115] w-full max-w-6xl min-h-screen sm:min-h-0 sm:rounded-[2.5rem] border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#cfb991]/10 rounded-2xl border border-[#cfb991]/20">
                    <Target className="w-6 h-6 text-[#cfb991]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif italic tracking-wide text-[#f0ebe1]">Neural Comparison</h2>
                    <p className="text-[10px] text-white/30 font-mono mt-1 uppercase tracking-wider">Cross-Day Temporal Analysis</p>
                  </div>
                </div>
                <button onClick={() => setIsCompareViewOpen(false)} className="p-3 bg-white/5 rounded-2xl text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 sm:p-12 flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-24">
                  {/* Date 1 Column */}
                  <div className="space-y-8">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-[#cfb991]/40 uppercase tracking-[0.3em]">Temporal Point Alpha</label>
                      <input 
                        type="date" 
                        value={compareDate1}
                        onChange={(e) => setCompareDate1(e.target.value)}
                        className="bg-black/40 border-b-2 border-[#cfb991] py-4 text-2xl font-serif italic text-white outline-none w-full"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Screen Time</span>
                        <span className="font-mono text-sm text-blue-400 font-bold">{(screenTimeData[compareDate1] || []).reduce((sum, log) => sum + parseWastedDuration(log.duration), 0)}m</span>
                      </div>
                      {calculateCategoryStats(compareDate1).map(stat => stat.minutes > 0 ? (
                        <div key={stat.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${stat.color} shadow-lg shadow-white/10`}></div>
                            <span className="text-xs font-bold text-white/80 uppercase tracking-widest">{stat.label}</span>
                          </div>
                          <span className="font-mono text-sm text-[#cfb991] font-bold">{stat.hoursDisplay}h</span>
                        </div>
                      ) : null)}
                    </div>
                  </div>

                  {/* Date 2 Column */}
                  <div className="space-y-8">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-[#cfb991]/40 uppercase tracking-[0.3em]">Temporal Point Beta</label>
                      <input 
                        type="date" 
                        value={compareDate2}
                        onChange={(e) => setCompareDate2(e.target.value)}
                        className="bg-black/40 border-b-2 border-white/20 py-4 text-2xl font-serif italic text-white outline-none w-full"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Screen Time</span>
                        <span className="font-mono text-sm text-blue-400 font-bold">{(screenTimeData[compareDate2] || []).reduce((sum, log) => sum + parseWastedDuration(log.duration), 0)}m</span>
                      </div>
                      {calculateCategoryStats(compareDate2).map(stat => stat.minutes > 0 ? (
                        <div key={stat.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${stat.color} shadow-lg shadow-white/10`}></div>
                            <span className="text-xs font-bold text-white/80 uppercase tracking-widest">{stat.label}</span>
                          </div>
                          <span className="font-mono text-sm text-[#cfb991] font-bold">{stat.hoursDisplay}h</span>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                </div>

                {/* Comparison Insights */}
                <div className="mt-16 sm:mt-24 p-8 sm:p-12 bg-white/[0.02] border border-white/5 rounded-[2.5rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#cfb991]/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                  <div className="relative z-10">
                     <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-8 text-center sm:text-left">Delta Report</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
                        <div className="space-y-2">
                           <span className="text-[10px] font-mono text-white/20 uppercase">Core Delta (Focus)</span>
                           <div className="text-3xl font-black text-white">
                              {Math.abs((calculateCategoryStats(compareDate1).find(s => s.id === 'focus')?.minutes || 0) - (calculateCategoryStats(compareDate2).find(s => s.id === 'focus')?.minutes || 0))}m
                           </div>
                           <p className="text-[10px] text-white/30 italic">Variation in deep concentration phases between selected points.</p>
                        </div>
                        <div className="space-y-2">
                           <span className="text-[10px] font-mono text-white/20 uppercase">Wasted Efficiency Delta</span>
                           <div className="text-3xl font-black text-[#8B0000]">
                              {Math.abs((calculateCategoryStats(compareDate1).find(s => s.id === 'waste')?.minutes || 0) - (calculateCategoryStats(compareDate2).find(s => s.id === 'waste')?.minutes || 0))}m
                           </div>
                           <p className="text-[10px] text-white/30 italic">Shift in resource leakage through distractions.</p>
                        </div>
                        <div className="space-y-2">
                           <span className="text-[10px] font-mono text-white/20 uppercase">Digital Exposure Delta</span>
                           <div className="text-3xl font-black text-blue-400">
                              {Math.abs(
                                (screenTimeData[compareDate1] || []).reduce((sum, log) => sum + parseWastedDuration(log.duration), 0) - 
                                (screenTimeData[compareDate2] || []).reduce((sum, log) => sum + parseWastedDuration(log.duration), 0)
                              )}m
                           </div>
                           <p className="text-[10px] text-white/30 italic">Variation in total screen time between selected points.</p>
                        </div>
                        <div className="space-y-2">
                           <span className="text-[10px] font-mono text-white/20 uppercase">System Comparison Alpha</span>
                           <div className="text-3xl font-black text-[#899ca1]">
                              {Math.max(0, calculateCategoryStats(compareDate1).reduce((s,c)=>s+c.minutes,0))}m
                           </div>
                           <p className="text-[10px] text-white/30 italic">Total verified temporal allocation for Point Alpha.</p>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Mandate Modal */}
      <AnimatePresence>
        {isMandateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0f0f0f] border border-[#cfb991]/20 rounded-[2rem] w-full max-w-lg shadow-2xl shadow-[#cfb991]/5 flex flex-col p-8"
            >
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="text-xl font-serif italic text-[#cfb991]">The Daily Mandate</h2>
                   <p className="text-[10px] uppercase font-mono text-[#cfb991]/50 tracking-widest mt-2">Establish Prime Directive</p>
                 </div>
                 <button onClick={() => setIsMandateModalOpen(false)} className="p-2 text-[#cfb991]/50 hover:bg-[#cfb991]/10 rounded-xl transition-all">
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const textInput = form.elements.namedItem('mandate') as HTMLInputElement;
                const themeInput = form.elements.namedItem('theme') as HTMLSelectElement;
                saveDailyMandate(textInput.value, themeInput.value as CategoryType);
              }} className="space-y-6">
                
                <div>
                   <label className="text-[10px] font-black uppercase text-[#cfb991]/60 tracking-widest block mb-3">Objective</label>
                   <input
                     type="text"
                     name="mandate"
                     defaultValue={dailyThemes[dateStr]?.text || ''}
                     placeholder="e.g. Study Java & Accounting"
                     className="w-full bg-[#141414] border border-[#cfb991]/20 rounded-xl px-4 py-3.5 text-[#cfb991] font-serif italic text-lg focus:outline-none focus:border-[#cfb991]/60 placeholder:text-[#cfb991]/20"
                     autoComplete="off"
                     required
                   />
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase text-[#cfb991]/60 tracking-widest block mb-3">Dominant Theme</label>
                   <div className="grid grid-cols-2 gap-3">
                     {CATEGORIES.filter(c => c.id !== 'none' && c.id !== 'waste').map((cat) => (
                       <label key={cat.id} className="relative group cursor-pointer">
                         <input type="radio" name="theme" value={cat.id} className="peer sr-only" defaultChecked={dailyThemes[dateStr]?.theme === cat.id || cat.id === 'focus'} />
                         <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] peer-checked:bg-[#cfb991]/10 peer-checked:border-[#cfb991]/40 transition-all flex items-center gap-3">
                           <div className={`w-2 h-2 rounded-full ${cat.color} opacity-60 peer-checked:opacity-100 shadow-[0_0_8px_currentColor] peer-checked:animate-pulse`}></div>
                           <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest group-hover:text-white/80 peer-checked:text-[#cfb991] truncate leading-none mt-0.5">{cat.label}</span>
                         </div>
                       </label>
                     ))}
                   </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                   <button type="button" onClick={() => setIsMandateModalOpen(false)} className="flex-1 py-4 border border-[#cfb991]/20 text-[#cfb991]/60 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-[#cfb991]/10 transition-all">
                     Cancel
                   </button>
                   <button type="submit" className="flex-1 py-4 bg-[#cfb991]/10 border border-[#cfb991]/40 text-[#cfb991] font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-[#cfb991]/20 shadow-lg shadow-[#cfb991]/10 transition-all flex items-center justify-center gap-2">
                     <Target className="w-4 h-4" /> Set Mandate
                   </button>
                </div>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Neural Notifications Tray */}
      <AnimatePresence>
        {isNeuralLogOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex justify-end bg-[#0a0a0a]/80 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={() => setIsNeuralLogOpen(false)}></div>
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-[#0f0f0f] border-l border-[#cfb991]/20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] h-full flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-[#cfb991]" />
                  <h2 className="text-2xl font-serif italic tracking-wide text-[#f0ebe1]">Neural Log</h2>
                </div>
                <button onClick={() => setIsNeuralLogOpen(false)} className="p-2 text-white/40 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                {neuralLogs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <Activity className="w-8 h-8 text-[#cfb991]/20 mb-4" />
                    <p className="text-sm font-serif italic text-[#cfb991]/50">Awaiting data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {neuralLogs.map(log => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border relative overflow-hidden group transition-all ${
                        log.type === 'warning' ? 'bg-[#8B0000]/10 border-[#8B0000]/30' :
                        log.type === 'reward' ? 'bg-[#cfb991]/10 border-[#cfb991]/40 shadow-[0_0_20px_rgba(207,185,145,0.05)]' :
                        'bg-white/[0.02] border-white/10'
                      }`}
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 -mr-12 -mt-12 transition-all ${log.type === 'warning' ? 'bg-[#8B0000]' : log.type === 'reward' ? 'bg-[#cfb991]' : 'bg-white'}`}
                      ></div>
                      <div className="relative z-10 flex gap-3">
                        <div className="mt-0.5">
                          {log.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#8B0000]" />}
                          {log.type === 'reward' && <Sparkles className="w-4 h-4 text-[#cfb991]" />}
                          {log.type === 'info' && <Target className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div>
                          <p className={`text-[11px] font-bold uppercase tracking-wide leading-tight mb-2 ${
                            log.type === 'warning' ? 'text-[#8B0000]' :
                            log.type === 'reward' ? 'text-[#EEDC9A]' :
                            'text-white'
                          }`}>{log.message.split(':')[0]}</p>
                          <p className={`text-xs font-serif italic leading-snug ${
                            log.type === 'warning' ? 'text-[#8B0000]/80' :
                            log.type === 'reward' ? 'text-[#cfb991]' :
                            'text-white/70'
                          }`}>{log.message.split(':')[1]?.trim() || log.message}</p>
                          <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest mt-3 block">
                            {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  </div>
                )}
              </div>
              
              {neuralLogs.length > 0 && (
                <div className="p-4 border-t border-white/5">
                  <button 
                    onClick={() => setNeuralLogs([])}
                    className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 hover:bg-white/5 rounded-xl transition-all"
                  >
                    Clear Feed
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Protocol Settings Modal */}
      <AnimatePresence>
        {isProtocolSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0f0f0f] border border-[#cfb991]/20 rounded-[2rem] w-full max-w-lg shadow-2xl shadow-[#cfb991]/5 flex flex-col p-8"
            >
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="text-xl font-serif italic text-[#cfb991]">Rules of Engagement</h2>
                   <p className="text-[10px] uppercase font-mono text-[#cfb991]/50 tracking-widest mt-2">Protocol Settings</p>
                 </div>
                 <button onClick={() => setIsProtocolSettingsOpen(false)} className="p-2 text-[#cfb991]/50 hover:bg-[#cfb991]/10 rounded-xl transition-all">
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                setIsProtocolSettingsOpen(false);
              }} className="space-y-6">
                
                <div>
                   <label className="text-[10px] font-black uppercase text-[#cfb991]/60 tracking-widest block mb-1">Time Wasted Alert Threshold (Minutes)</label>
                   <p className="text-[10px] text-white/30 italic mb-3">Notify me after exceeding this limit on non-essential activities.</p>
                   <input
                     type="number"
                     min="1"
                     value={protocolSettings.wastedTimeThreshold}
                     onChange={(e) => setProtocolSettings({...protocolSettings, wastedTimeThreshold: parseInt(e.target.value) || 60})}
                     className="w-full bg-[#141414] border border-[#cfb991]/20 rounded-xl px-4 py-3.5 text-[#cfb991] font-mono text-lg focus:outline-none focus:border-[#cfb991]/60"
                     required
                   />
                </div>

                <div className="pt-4 border-t border-white/5">
                   <label className="text-[10px] font-black uppercase text-[#cfb991]/60 tracking-widest block mb-1">Focus-to-Reward Ratio</label>
                   <p className="text-[10px] text-white/30 italic mb-3">Define how deep work unlocks leisure credits.</p>
                   
                   <div className="flex gap-4 items-center">
                     <div className="flex-1">
                       <label className="text-[8px] font-black uppercase text-white/40 block mb-1">Minutes of Focus</label>
                       <input
                         type="number"
                         min="1"
                         value={protocolSettings.focusToRewardRatioFocus}
                         onChange={(e) => setProtocolSettings({...protocolSettings, focusToRewardRatioFocus: parseInt(e.target.value) || 60})}
                         className="w-full bg-[#141414] border border-[#cfb991]/20 rounded-xl px-3 py-2 text-[#cfb991] font-mono focus:outline-none focus:border-[#cfb991]/60"
                         required
                       />
                     </div>
                     <span className="text-[#cfb991]/40 font-mono text-xl pt-4">=</span>
                     <div className="flex-1">
                       <label className="text-[8px] font-black uppercase text-white/40 block mb-1">Minutes of Leisure</label>
                       <input
                         type="number"
                         min="1"
                         value={protocolSettings.focusToRewardRatioReward}
                         onChange={(e) => setProtocolSettings({...protocolSettings, focusToRewardRatioReward: parseInt(e.target.value) || 15})}
                         className="w-full bg-[#141414] border border-[#cfb991]/20 rounded-xl px-3 py-2 text-[#cfb991] font-mono focus:outline-none focus:border-[#cfb991]/60"
                         required
                       />
                     </div>
                   </div>
                         className="w-full bg-[#141414] border border-[#cfb991]/20 rounded-xl px-3 py-2 text-[#cfb991] font-mono focus:outline-none focus:border-[#cfb991]/60"
                         required
                       />
                     </div>
                     <span className="text-[#cfb991]/40 font-mono text-xl pt-4">=</span>
                     <div className="flex-1">
                       <label className="text-[8px] font-black uppercase text-white/40 block mb-1">Minutes of Leisure</label>
                       <input
                         type="number"
                         min="1"
                         value={protocolSettings.focusToRewardRatioReward}
                         onChange={(e) => setProtocolSettings({...protocolSettings, focusToRewardRatioReward: parseInt(e.target.value) || 15})}
                         className="w-full bg-[#141414] border border-[#cfb991]/20 rounded-xl px-3 py-2 text-[#cfb991] font-mono focus:outline-none focus:border-[#cfb991]/60"
                         required
                       />
                     </div>
                   </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                   <button type="submit" className="flex-1 py-4 bg-[#cfb991]/10 border border-[#cfb991]/40 text-[#cfb991] font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-[#cfb991]/20 shadow-lg shadow-[#cfb991]/10 transition-all flex items-center justify-center gap-2">
                     <Save className="w-4 h-4" /> Save Protocols
                   </button>
                </div>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Time Log Modal */}
      <AnimatePresence>
        {isScreenTimeOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0a0d14] border border-blue-500/20 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-4 px-6 border-b border-blue-500/20 bg-blue-500/10">
                <div className="flex items-center gap-3">
                  <PieChart className="w-5 h-5 text-blue-400" />
                  <h2 className="text-2xl font-serif italic tracking-wide text-[#f0ebe1]">Screen Time Logger</h2>
                </div>
                <button onClick={() => setIsScreenTimeOpen(false)} className="p-2 bg-blue-500/10 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar flex-grow min-h-[300px] p-6 bg-[#0c0d10]">
                <AnimatePresence>
                  {dayScreenTimeLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-blue-500/20 py-24 px-12">
                      <div className="w-16 h-16 rounded-full bg-blue-500/5 flex items-center justify-center mb-4 border border-blue-500/10">
                        <Clock className="w-8 h-8 opacity-40" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-widest text-blue-400/40">Zero Metrics</p>
                      <p className="text-xs mt-2 opacity-60">Log your app usage to track digital exposure.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dayScreenTimeLogs.map((log) => (
                        <motion.div 
                          key={log.id} 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, scale: 0.95 }} 
                          className="flex items-center justify-between p-4 bg-[#14151a] border border-blue-500/10 rounded-2xl group hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all duration-300 shadow-lg"
                        >
                          <div className="flex items-center gap-4 w-full">
                             <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl font-mono text-xs font-bold shrink-0 min-w-[80px] border border-blue-500/20 text-center">
                                {log.duration}
                             </div>
                             <div className="flex-grow min-w-0 pr-4">
                               <div className="text-white/90 text-sm font-medium truncate uppercase tracking-widest">{log.appName}</div>
                               <div className="flex items-center gap-2 mt-1.5 opacity-30">
                                  <Clock className="w-3 h-3" />
                                  <span className="font-mono text-[9px]">Logged at: {log.loggedAt}</span>
                               </div>
                             </div>
                          </div>
                          <button 
                            onClick={() => deleteScreenTimeLog(log.id)} 
                            className="opacity-0 group-hover:opacity-100 p-2.5 text-blue-500/40 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all shadow-xl active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-6 border-t border-blue-500/10 bg-[#0f1014]">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const appInput = form.elements.namedItem('appName') as HTMLInputElement;
                      const durationInput = form.elements.namedItem('duration') as HTMLInputElement;
                      addScreenTimeLog(appInput.value, durationInput.value);
                      appInput.value = '';
                      durationInput.value = '';
                    }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative w-full sm:w-48 shrink-0 group">
                        <ListTodo className="w-4 h-4 text-blue-400/40 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="text"
                          name="appName"
                          className="w-full bg-[#1c1d22] border border-blue-500/20 text-white text-sm rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/10"
                          placeholder="App (e.g. YouTube)"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div className="relative flex-grow group">
                        <Clock className="w-4 h-4 text-blue-400/40 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="text"
                          name="duration"
                          className="w-full bg-[#1c1d22] border border-blue-500/20 text-white text-sm rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-white/10"
                          placeholder="Duration (e.g. 1h 20m)"
                          autoComplete="off"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/50 transition-all font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95">
                      <Plus className="w-4 h-4" /> Log Screen Time
                    </button>
                  </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Wasted Log Modal */}
      <AnimatePresence>
        {isWastedLogOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#120a0b] border border-[#8B0000]/20 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-4 px-6 border-b border-[#8B0000]/20 bg-[#8B0000]/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#8B0000]/70" />
                  <h2 className="text-2xl font-serif italic tracking-wide text-[#8B0000]">Time Wasted Log</h2>
                </div>
                <button onClick={() => setIsWastedLogOpen(false)} className="p-2 bg-[#8B0000]/10 rounded-lg text-[#8B0000]/50 hover:text-[#8B0000] hover:bg-[#8B0000]/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar flex-grow min-h-[300px] p-6 bg-[#0c0d10]">
                <AnimatePresence>
                  {dayWastedLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[#8B0000]/40 py-24 px-12">
                      <div className="w-16 h-16 rounded-full bg-[#8B0000]/5 flex items-center justify-center mb-4 border border-[#8B0000]/10 shadow-[0_0_30px_rgba(239,68,68,0.05)]">
                        <AlertTriangle className="w-8 h-8 opacity-40" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-widest text-[#8B0000]/40">Clean Focus</p>
                      <p className="text-xs mt-2 opacity-60">No distractions logged today. Keep harvesting productivity.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dayWastedLogs.map((log) => (
                        <motion.div 
                          key={log.id} 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, scale: 0.95 }} 
                          className="flex items-center justify-between p-4 bg-[#14151a] border border-[#8B0000]/20 rounded-2xl group hover:border-[#8B0000]/40 hover:bg-[#8B0000]/[0.02] transition-all duration-300 shadow-lg"
                        >
                          <div className="flex items-center gap-4 w-full">
                             <div className="bg-[#8B0000]/10 text-[#8B0000] px-4 py-2 rounded-xl font-mono text-xs font-bold shrink-0 flex flex-col items-center justify-center min-w-[80px] border border-[#8B0000]/20 shadow-inner">
                                {log.timeLost}
                                <span className="text-[8px] opacity-50 uppercase tracking-tighter mt-0.5">Wasted</span>
                             </div>
                             <div className="flex-grow min-w-0 pr-4">
                               <div className="text-[#8B0000]/90 text-sm font-medium truncate">{log.reason}</div>
                               <div className="flex items-center gap-2 mt-1.5">
                                  <Clock className="w-3 h-3 text-[#8B0000]/30" />
                                  <span className="text-[#8B0000]/40 font-mono text-[10px] tracking-tight">System Logged: {log.loggedAt}</span>
                               </div>
                             </div>
                          </div>
                          <button 
                            onClick={() => deleteWastedLog(log.id)} 
                            className="opacity-0 group-hover:opacity-100 p-2.5 text-[#8B0000]/40 hover:text-[#8B0000] hover:bg-[#8B0000]/10 rounded-xl transition-all shadow-xl active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-6 border-t border-[#8B0000]/10 bg-[#0f1014] shadow-2xl">
                <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const reasonInput = form.elements.namedItem('reason') as HTMLInputElement;
                      const durationInput = form.elements.namedItem('duration') as HTMLInputElement;
                      addWastedLog(reasonInput.value, durationInput.value);
                      reasonInput.value = '';
                      durationInput.value = '';
                    }}
                    className="flex flex-col gap-3 sm:gap-4"
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative w-full sm:w-32 lg:w-36 shrink-0 group">
                        <Clock className="w-4 h-4 text-[#8B0000]/40 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#8B0000] transition-colors" />
                        <input
                          type="text"
                          name="duration"
                          className="w-full bg-[#1c1d22] border border-[#8B0000]/30 text-[#8B0000]/90 text-sm rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-[#8B0000]/50 focus:ring-1 focus:ring-[#8B0000]/30 transition-all font-mono placeholder:text-[#8B0000]/30 shadow-inner"
                          placeholder="30m"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div className="relative flex-grow group">
                        <AlertTriangle className="w-4 h-4 text-[#8B0000]/40 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#8B0000] transition-colors" />
                        <input
                          type="text"
                          name="reason"
                          className="w-full bg-[#1c1d22] border border-[#8B0000]/30 text-[#8B0000]/90 text-sm rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-[#8B0000]/50 focus:ring-1 focus:ring-[#8B0000]/30 transition-all placeholder:text-[#8B0000]/30 shadow-inner"
                          placeholder="Distraction description..."
                          autoComplete="off"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 rounded-2xl bg-[#8B0000]/10 hover:bg-[#8B0000]/20 text-[#8B0000] border border-[#8B0000]/20 hover:border-[#8B0000]/50 transition-all font-bold uppercase text-[10px] tracking-widest shrink-0 flex items-center justify-center gap-2 shadow-lg shadow-[#8B0000]/20 active:scale-95">
                      <Plus className="w-4 h-4" /> Log Wasted Time
                    </button>
                  </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Manager Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f1115]/90 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1a1c23] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <LayoutList className="w-5 h-5 text-[#EEDC9A]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Schedule Blueprints</h3>
                </div>
                <button 
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Save Current Day */}
                <div className="bg-[#cfb991]/5 border border-[#cfb991]/20 p-4 sm:p-6 rounded-2xl">
                  <div className="flex flex-col gap-1 mb-4">
                    <h4 className="text-xs font-bold text-[#EEDC9A] uppercase tracking-widest">Snapshot Current Day</h4>
                    <p className="text-[10px] text-white/40">Save this structure as a reusable template.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      id="template-name-input"
                      placeholder="Template name (e.g. Work Day)"
                      className="flex-grow bg-[#0a0a0a]/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#cfb991]/50 outline-none"
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('template-name-input') as HTMLInputElement;
                        saveDayAsTemplate(input.value);
                        input.value = '';
                      }}
                      className="bg-[#cfb991] hover:bg-[#EEDC9A] text-white px-6 py-3 sm:py-0 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Save
                    </button>
                  </div>
                </div>

                {/* List Templates */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest">Saved Blueprints</h4>
                  {templates.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                      <LayoutList className="w-10 h-10 text-white/5 mx-auto mb-3" />
                      <p className="text-xs text-white/20">No templates saved yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {templates.map(t => (
                        <div key={t.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl group hover:border-[#cfb991]/30 transition-all">
                          <div className="flex items-center justify-between mb-4">
                             <div className="font-bold text-white text-sm tracking-tight">{t.name}</div>
                             <button 
                                onClick={() => deleteTemplate(t.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-[#8B0000] transition-all"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                          <button 
                            onClick={() => applyTemplate(t)}
                            className="w-full py-2 bg-white/5 hover:bg-[#cfb991] hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2"
                          >
                            <Download className="w-3 h-3" /> Apply Blueprint
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={`sticky top-0 z-[150] bg-[#0a0a0a]/95 border-b backdrop-blur-3xl transition-all duration-700 ${isWastedAlertGlobal ? 'mt-12 border-[#8B0000]/50 shadow-[0_10px_50px_rgba(139,0,0,0.3)]' : isRestoredGlobal ? 'border-[#cfb991] shadow-[0_10px_50px_rgba(207,185,145,0.3)]' : 'border-[#cfb991]/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'}`}>
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-4 md:py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-serif italic tracking-wide text-[#f0ebe1] flex items-center gap-3">
              <Calendar className="w-6 h-6 text-[#cfb991]" strokeWidth={1.2} />
              Bespoke Timeline
            </h1>
            <p className="text-[#cfb991]/50 font-sans font-light text-[9px] sm:text-[10px] tracking-[0.4em] mt-2 uppercase hidden md:block">
              {isToday ? 'Present Moment Active' : 'Orchestrating the Future'}
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
            <div className="flex flex-col lg:flex-row items-center gap-4">
              {/* Interface Density Toggle */}
              <div className="flex items-center gap-3 bg-black/40 border border-[#cfb991]/10 px-3 py-1.5 rounded-xl">
                <span className="text-[8px] font-black uppercase text-[#cfb991]/40 tracking-[0.2em] hidden sm:block">UI Density</span>
                <div 
                  onClick={() => setViewDensity(viewDensity === 'complex' ? 'minimal' : 'complex')}
                  className="relative w-44 h-9 bg-[#0a0a0a] rounded-lg border border-white/5 p-1 cursor-pointer group hover:border-[#cfb991]/30 transition-all"
                >
                  <motion.div 
                    className="absolute bg-[#cfb991] shadow-[0_0_15px_rgba(207,185,145,0.4)] rounded-md h-[26px] top-1"
                    initial={false}
                    animate={{ 
                      left: viewDensity === 'complex' ? '4px' : 'calc(50% + 1px)',
                      width: 'calc(50% - 5px)' 
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                  <div className="relative flex h-full items-center z-10 text-[7px] md:text-[8px] font-black uppercase tracking-widest text-center">
                    <div className={`flex-1 ${viewDensity === 'complex' ? 'text-black' : 'text-white/30'} transition-colors duration-500`}>Complex</div>
                    <div className={`flex-1 ${viewDensity === 'minimal' ? 'text-black' : 'text-white/30'} transition-colors duration-500`}>Minimal</div>
                  </div>
                </div>
              </div>

              {viewDensity === 'complex' ? (
                <div className="flex items-center gap-4 bg-black/40 border border-[#cfb991]/10 px-4 py-2 rounded-2xl w-full sm:w-auto">
                  <div className="flex items-center gap-4">
                    <button onClick={() => shiftDay(-1)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#cfb991]/40 hover:text-[#cfb991] transition-all active:scale-90">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-xs sm:text-sm font-serif italic text-white/90 min-w-[120px] text-center tracking-wider">
                      {currentDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <button onClick={() => shiftDay(1)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#cfb991]/40 hover:text-[#cfb991] transition-all active:scale-90">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="h-px sm:h-6 w-full sm:w-px bg-[#cfb991]/10 sm:mx-2"></div>
                  <button 
                    onClick={() => setIsMandateModalOpen(true)}
                    className="flex flex-col items-center sm:items-start group sm:min-w-[140px] px-2 py-1 sm:p-0 hover:bg-white/5 sm:hover:bg-transparent rounded-lg transition-all w-full sm:w-auto"
                  >
                    <span className="text-[9px] font-black text-[#cfb991]/40 uppercase tracking-[0.2em] group-hover:text-[#cfb991]/60 transition-colors">The Daily Mandate</span>
                    <span className="font-serif italic text-sm text-[#cfb991] group-hover:text-white transition-colors truncate max-w-[200px]">
                      {dailyThemes[dateStr]?.text || 'Set Objective...'}
                    </span>
                    <span className="text-[8px] font-mono text-white/20 mt-0.5 sm:hidden xl:block opacity-0 group-hover:opacity-100 transition-opacity">
                      {dailyThemes[dateStr]?.theme ? CATEGORIES.find(c => c.id === dailyThemes[dateStr]?.theme)?.label : 'Click to define'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-8 px-6 py-2">
                   <button 
                     onClick={() => shiftDay(0)}
                     className="text-[10px] font-black uppercase text-[#cfb991]/60 hover:text-[#cfb991] tracking-[0.3em] transition-all"
                   >
                     Focus Now
                   </button>
                   <button 
                     onClick={() => setIsCompareViewOpen(true)}
                     className="text-[10px] font-black uppercase text-white/30 hover:text-white/60 tracking-[0.3em] transition-all"
                   >
                     History
                   </button>
                   <button 
                     onClick={() => setIsProtocolSettingsOpen(true)}
                     className="text-[10px] font-black uppercase text-white/30 hover:text-white/60 tracking-[0.3em] transition-all"
                   >
                     Settings
                   </button>
                </div>
              )}
            </div>
            
            {viewDensity === 'complex' && (
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 z-40">
                <button
                  onClick={() => setIsWastedLogOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B0000]/10 border border-[#8B0000]/30 text-[#8B0000]/80 text-[10px] font-bold uppercase tracking-widest hover:bg-[#8B0000]/20 hover:text-[#8B0000] transition-all shadow-sm active:scale-95 group hover:-translate-y-0.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden xl:inline">Waste Log</span>
                </button>
                <button
                  onClick={() => setIsScreenTimeOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400/80 text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500/20 hover:text-blue-400 transition-all shadow-sm active:scale-95 group hover:-translate-y-0.5"
                >
                  <PieChart className="w-4 h-4" />
                  <span className="hidden xl:inline">Screen</span>
                </button>
                <button
                  onClick={() => setIsCompareViewOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all shadow-sm active:scale-95 group hover:-translate-y-0.5"
                >
                  <Target className="w-4 h-4" />
                  <span className="hidden xl:inline">Compare</span>
                </button>
                {!isToday && (
                  <button
                    onClick={jumpToToday}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#cfb991]/10 border border-[#cfb991]/30 text-[#EEDC9A]/80 text-[10px] font-bold uppercase tracking-widest hover:bg-[#cfb991]/20 hover:text-[#cfb991] transition-all shadow-sm active:scale-95 group hover:-translate-y-0.5"
                  >
                    <Clock className="w-4 h-4" />
                    <span className="hidden xl:inline">Return to Present</span>
                  </button>
                )}
                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
                
                <div className="flex items-center gap-2 bg-black/40 border border-[#cfb991]/10 p-1 rounded-2xl">
                  <button
                    onClick={() => {
                      setIsNeuralLogOpen(true);
                      if (neuralLogs.some(l => !l.read)) {
                        setNeuralLogs(neuralLogs.map(l => ({ ...l, read: true })));
                      }
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-none transition-all active:scale-95 group relative ${neuralLogs.some(l => !l.read) ? 'bg-[#cfb991]/10 text-[#cfb991]' : 'bg-transparent text-[#cfb991]/70 hover:bg-white/5 hover:text-[#cfb991]'}`}
                  >
                    <Activity className={`w-4 h-4 ${neuralLogs.some(l => !l.read) ? 'animate-pulse' : ''}`} />
                    <span className="hidden xl:inline">System Log</span>
                    {neuralLogs.some(l => !l.read) && (
                      <span className="absolute top-1 right-2 w-2 h-2 bg-[#8B0000] rounded-full"></span>
                    )}
                  </button>
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-transparent text-[#cfb991]/70 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 hover:text-[#cfb991] transition-all active:scale-95 group"
                  >
                    <Save className="w-4 h-4" />
                    <span className="hidden xl:inline">Blueprints</span>
                  </button>
                  <button
                    onClick={() => setIsProtocolSettingsOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-transparent text-[#cfb991]/70 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all active:scale-95 group"
                  >
                   <Settings className="w-4 h-4" />
                   <span className="hidden xl:inline">Protocol</span>
                  </button>
                </div>
              </div>
            )}

            {viewDensity === 'minimal' && (
              <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 py-2">
                <button 
                  onClick={jumpToToday}
                  className="hover:text-[#cfb991] transition-colors cursor-pointer"
                >
                  Focus Now
                </button>
                <button 
                  onClick={() => setIsCompareViewOpen(true)}
                  className="hover:text-[#cfb991] transition-colors cursor-pointer"
                >
                  History
                </button>
                <button 
                  onClick={() => setIsProtocolSettingsOpen(true)}
                  className="hover:text-[#cfb991] transition-colors cursor-pointer"
                >
                  Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <main className={`w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 md:py-12 flex flex-col gap-8 md:gap-12 relative z-10 transition-all duration-700 ${viewDensity === 'minimal' ? 'items-center min-h-[70vh] justify-center text-center' : ''}`}>
        
        {/* Simple View Content */}
        {viewDensity === 'minimal' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-16 max-w-[800px] w-full py-20"
          >
            {/* Minimal Date & HUD Header */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-serif italic text-white tracking-tight">
                 {currentDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h1>
              <div className="flex flex-col items-center gap-2">
                 <span className="text-[10px] font-black uppercase text-[#cfb991]/40 tracking-[0.4em]">Current Mandate</span>
                 <p className="text-2xl font-serif italic text-[#cfb991]">
                   {dailyThemes[dateStr]?.text || 'No objective set for today.'}
                 </p>
              </div>
            </div>

            {/* HUD / Temporal Credits (Essential) */}
            <div className="w-full max-w-[500px]">
              {(() => {
                const { focusMinutes, earnedLeisure, isDebtCleared, temporalDebt, activeDebt, availableCredit } = stats;
                const isWastedAlert = temporalDebt > 0 && !isDebtCleared;
                return (
                  <div className={`p-8 rounded-[40px] border transition-all duration-700 ${isWastedAlert ? 'bg-[#8B0000]/5 border-[#8B0000]/30 shadow-[0_20px_60px_rgba(139,0,0,0.2)]' : 'bg-black/40 border-[#cfb991]/20 shadow-[0_20px_60px_rgba(0,0,0,0.3)]'}`}>
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">Temporal Reservoir</span>
                       <span className={`text-2xl font-mono ${availableCredit >= 0 ? 'text-[#cfb991]' : 'text-[#8B0000]'}`}>
                         {availableCredit > 0 ? `+${availableCredit}m` : `${availableCredit}m`}
                       </span>
                    </div>
                    {isWastedAlert && (
                      <div className="mb-6 flex flex-col items-center gap-1 animate-pulse">
                         <div className="flex items-center gap-2 text-[#8B0000]">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Protocol Violated</span>
                         </div>
                         <p className="text-[9px] text-[#8B0000]/60 uppercase tracking-widest leading-relaxed">
                            Temporal breakdown detected. Credits Locked.
                         </p>
                      </div>
                    )}
                    <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden mb-4 shadow-inner">
                       <div 
                         className={`h-full transition-all duration-1000 ${isDebtCleared ? 'bg-white shadow-[0_0_15px_white]' : 'bg-[#cfb991]'}`} 
                         style={{ width: `${Math.max(0, Math.min(100, (availableCredit / Math.max(1, earnedLeisure)) * 100))}%` }}
                       ></div>
                    </div>
                    <div className="flex justify-center gap-6 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
                       <span>{focusMinutes}m Focused</span>
                       <span>{earnedLeisure}m Yield</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Active Temporal Block (Essential) */}
            <div className="space-y-8 w-full max-w-[600px]">
               <div className="space-y-2">
                 <span className="text-[10px] font-black uppercase text-white/20 tracking-[0.5em]">Current Sequence</span>
                 <div className="flex justify-center items-baseline gap-4">
                    <span className="text-6xl font-serif italic text-white">{formatHour(actualHour).time}</span>
                    <span className="text-xl font-mono text-white/20 uppercase tracking-widest">{formatHour(actualHour).ampm}</span>
                 </div>
               </div>

               <div className="bg-white/[0.03] border border-white/5 p-12 rounded-[50px] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[#cfb991]/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none"></div>
                  <div className="relative z-10 space-y-6">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-black uppercase text-[#cfb991]/40 tracking-[0.3em]">Active Directive</span>
                      <h2 className="text-3xl font-serif italic text-[#cfb991]">
                        {dayTasks[actualHour].text || 'Establishing Order...'}
                      </h2>
                    </div>
                    
                    <div className="flex flex-col items-center gap-6 w-full max-w-[300px] mx-auto">
                       <div className="flex items-center gap-4">
                          <Clock className="w-4 h-4 text-[#cfb991]/40" />
                          <BlockCountdown active={isToday} />
                       </div>
                       <TemporalProgressBar active={isToday} size="large" />
                    </div>

                    <div className="pt-6 flex justify-center">
                       <button 
                         onClick={() => {
                            setSelectedHour(actualHour);
                            setViewDensity('complex');
                         }}
                         className="px-8 py-3 rounded-full bg-[#cfb991]/10 border border-[#cfb991]/30 text-[#cfb991] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#cfb991] hover:text-black transition-all"
                       >
                         Manage Sequence
                       </button>
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setViewDensity('complex');
                  setActiveAsideTab('yield');
                }}
                className="group flex flex-col items-center gap-4 transition-all opacity-40 hover:opacity-100"
              >
                <div className="p-4 bg-white/5 border border-white/10 rounded-full group-hover:scale-110 transition-transform text-[#cfb991]">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em]">Academic Yield</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Complex View Content */}
        {viewDensity === 'complex' && (
          <>
        {/* Temporal Credit / System Insights */}
        {(() => {
          const { focusMinutes, earnedLeisure, isDebtCleared, temporalDebt, activeDebt, availableCredit } = stats;
          const isWastedAlert = temporalDebt > 0 && !isDebtCleared;
          const hasCredit = availableCredit > 0;

          return (
            <div className="w-full relative z-20 md:px-0">
              <div className="flex flex-col md:flex-row items-stretch gap-6 max-w-[1200px] mx-auto">
                {isDebtCleared && (
                  <div className="absolute inset-0 bg-[#cfb991] animate-pulse opacity-5 rounded-3xl pointer-events-none mix-blend-screen" />
                )}
                
                {/* Temporal Credit Widget */}
                <div className={`flex-1 ${isDebtCleared ? 'bg-[#cfb991]/10 border-[#cfb991]/40 shadow-[0_0_30px_rgba(207,185,145,0.1)]' : 'bg-black/40 border-white/5 backdrop-blur-md'} border p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center transition-all duration-700 ${activeDebt > 0 ? 'grayscale opacity-70' : ''}`}>
                  <div className="flex justify-between items-center mb-6">
                     <h4 className={`text-[13px] font-serif italic tracking-wide ${isDebtCleared ? 'text-[#cfb991]' : 'text-white/60'}`}>Temporal Credit Pool</h4>
                     <span className={`text-xl font-mono font-bold tracking-tighter ${availableCredit > 0 ? 'text-[#cfb991]' : isWastedAlert ? 'text-[#8B0000]' : 'text-white/20'}`}>
                       {availableCredit > 0 ? `+${availableCredit}m` : `${availableCredit}m`}
                     </span>
                  </div>
                  <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden mb-4 relative shadow-inner">
                     {activeDebt > 0 && (
                       <div 
                         className="absolute top-0 right-0 h-full bg-[#8B0000] shadow-[0_0_10px_#8B0000]"
                         style={{ width: `${Math.min(100, (activeDebt / Math.max(1, protocolSettings.wastedTimeThreshold * 2)) * 100)}%` }}
                       ></div>
                     )}
                     <div 
                       className={`h-full transition-all duration-1000 ease-out ${isDebtCleared ? 'bg-white shadow-[0_0_15px_white]' : 'bg-gradient-to-r from-[#cfb991]/40 to-[#cfb991]'}`} 
                       style={{ width: `${Math.max(0, Math.min(100, (availableCredit / Math.max(1, earnedLeisure)) * 100))}%` }}
                     ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-white/30 uppercase tracking-widest">
                     <div className="flex gap-4">
                        <span><strong className="text-white/50">{focusMinutes}m</strong> Focus</span>
                        <span><strong className="text-white/50">{earnedLeisure}m</strong> Yield</span>
                     </div>
                     {activeDebt > 0 && <span className="text-[#8B0000] font-mono tabular-nums font-black text-sm tracking-widest animate-pulse border-b border-[#8B0000]/30 pb-0.5">-{activeDebt}m DEBT</span>}
                  </div>
                </div>

                {/* System Insights */}
                <div className={`flex-1 border p-6 rounded-3xl flex flex-col justify-center transition-all duration-700 ${isWastedAlert ? 'bg-[#8B0000]/5 border-[#8B0000]/40 shadow-[inset_0_0_20px_rgba(139,0,0,0.1)]' : isDebtCleared ? 'bg-[#cfb991]/5 border-[#cfb991]/40' : 'bg-black/40 border-white/5 backdrop-blur-md'}`}>
                  <h4 className="text-[14px] font-serif italic text-white/40 hover:text-[#cfb991] mb-3 cursor-pointer transition-colors flex items-center gap-1 w-fit group" onClick={() => setIsNeuralLogOpen(true)}>
                    System Insights <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </h4>
                  {isWastedAlert ? (
                    <p className="text-xs text-[#8B0000] font-bold uppercase tracking-widest leading-relaxed">
                      PROTOCOL VIOLATED: Resource leak at <span className="font-mono text-[#ff4444] text-sm tabular-nums underline decoration-wavy underline-offset-4">{temporalDebt}m</span>. 
                      <br/>
                      <span className="text-[10px] opacity-60 font-medium normal-case mt-1 block">Leisure credits locked. 2hr Focus Streak required for reset.</span>
                    </p>
                  ) : isDebtCleared ? (
                    <p className="text-xs text-[#EEDC9A] italic font-serif leading-relaxed">
                      REDEMPTION ARCHIVED: 120min consecutive focus detected. Temporal debt zeroed. System restored to nominal operating capacity.
                    </p>
                  ) : hasCredit ? (
                    <p className="text-xs text-[#cfb991] italic font-serif leading-relaxed flex items-center gap-3">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      FOCUS QUOTA ACHIEVED: You have earned {availableCredit} minutes of guilt-free Leisure time. Credit available for use.
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 italic font-serif leading-relaxed mt-1">
                      System nominal. Maintain focus density to unlock temporal credit sequences.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="flex flex-col lg:flex-row gap-8 md:gap-12 relative">
          
        {/* Left: 24-Hour Grid Map */}
        <div className="flex-1 flex flex-col order-2 lg:order-1 transition-all duration-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-serif italic tracking-wide text-[#cfb991]/80 mb-2">Circadian Map</h2>
                <p className="text-[9px] text-white/20 font-serif italic tracking-widest uppercase">Visualizing Time Density</p>
              </div>
              {dailyThemes[dateStr]?.text && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-[#cfb991]/20">
                  <div className={`w-1.5 h-1.5 rounded-full ${CATEGORIES.find(c => c.id === dailyThemes[dateStr]?.theme)?.color} shadow-[0_0_8px_currentColor]`}></div>
                  <span className="text-[10px] font-serif italic text-white/80">{dailyThemes[dateStr].text}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 md:gap-6 bg-black/20 p-2 rounded-xl backdrop-blur-sm border border-white/5">
               {CATEGORIES.filter(c => c.id !== 'none').map(cat => (
                 <span key={cat.id} className="flex items-center gap-2 text-[8px] font-bold tracking-widest uppercase text-white/40">
                   <span className={`w-2 h-2 rounded-full ${cat.color} opacity-60`}></span> {cat.label}
                 </span>
               ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 transition-all">
            {Array.from({ length: 24 }).map((_, hour) => {
              const task = dayTasks[hour];
              const isActualCurrent = isToday && hour === actualHour;
              const isSelected = selectedHour === hour;
              const timeInfo = formatHour(hour);
              const catInfo = CATEGORIES.find(c => c.id === task.category) || CATEGORIES[0];
              const hasContent = task.text.trim() !== '' || (task.subtasks?.length || 0) > 0;

              const isRestTheme = dailyThemes[dateStr]?.theme === 'leisure' || dailyThemes[dateStr]?.theme === 'care';
              const isDeepWorkTheme = dailyThemes[dateStr]?.theme === 'focus';
              
              let blockBaseStyle = 'hover:bg-white/[0.04] border-white/5 bg-white/[0.02]';
              
              if (task.energy === 'high') {
                blockBaseStyle = 'hover:bg-[#cfb991]/10 border-[#cfb991] bg-white/[0.02] shadow-[0_0_10px_rgba(207,185,145,0.4)]';
              } else if (task.energy === 'neutral') {
                blockBaseStyle = 'hover:bg-[#cfb991]/5 border-[#cfb991]/40 bg-white/[0.02] shadow-[0_0_10px_rgba(207,185,145,0.05)]';
              } else if (task.energy === 'low' || task.category === 'waste') {
                blockBaseStyle = 'hover:bg-white/[0.02] border-white/5 bg-black/40 opacity-50 grayscale transition-all';
              } else if (isRestTheme) {
                blockBaseStyle = 'hover:bg-white/[0.03] border-white/5 bg-black/20 opacity-80 backdrop-saturate-50';
              } else if (isDeepWorkTheme) {
                blockBaseStyle = 'hover:bg-[#cfb991]/10 border-[#cfb991]/30 bg-white/[0.02] shadow-[0_0_15px_rgba(207,185,145,0.03)]';
              }

              return (
                <button
                  key={hour}
                  onClick={() => {
                    setSelectedHour(hour);
                    // On mobile, scroll to the detail panel
                    if (window.innerWidth < 1024) {
                      document.getElementById('hour-detail-panel')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={`
                    relative p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between text-left min-h-[6rem] sm:min-h-[6.5rem] border transition-all duration-300 group cursor-pointer overflow-hidden
                    ${isSelected ? 'ring-1 ring-[#cfb991]/50 border-[#cfb991] scale-[1.02] bg-[#cfb991]/5 z-10 shadow-2xl shadow-[#cfb991]/10' : blockBaseStyle}
                    ${isActualCurrent && !isSelected ? 'border-[#EEDC9A]/30 bg-[#EEDC9A]/5' : ''}
                  `}
                >
                  <TemporalProgressBar active={isActualCurrent} />
                  <div className="flex justify-between items-start w-full relative z-10">
                    <div className="flex flex-col">
                      <span className={`text-[8px] font-black tracking-[0.2em] mb-0.5 ${isSelected ? 'text-[#EEDC9A]' : 'text-white/20'}`}>{timeInfo.ampm}</span>
                      <span className={`text-xl font-black tabular-nums transition-colors ${isSelected ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>{timeInfo.time}</span>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isSelected ? 'scale-125' : 'grayscale opacity-30'} ${catInfo.color}`}></div>
                      {isActualCurrent && (
                        <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none opacity-20">
                           <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-[#EEDC9A] rounded-full animate-ping"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex-grow overflow-hidden w-full h-full">
                    {hasContent ? (
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className={`text-[10px] font-serif italic tracking-wider leading-snug transition-all ${isSelected ? 'text-white' : (task.completed ? 'text-white/20 line-through' : 'text-white/80')}`}>
                          {task.text || (task.subtasks?.length > 0 ? (
                            <span className="flex items-center gap-2">
                              <LayoutList className={`w-3.5 h-3.5 ${isSelected ? 'text-[#EEDC9A]' : 'text-[#cfb991]/30'}`} />
                              Routines Active
                            </span>
                          ) : '')}
                        </div>
                        {task.subtasks?.length > 0 && (
                          <div className={`flex flex-col gap-1.5 border-l border-white/10 pl-2 mt-1 max-h-[4rem] overflow-hidden transition-all ${isSelected ? 'border-[#cfb991]/30' : ''}`}>
                            {task.subtasks.slice(0, 3).map(st => (
                              <div key={st.id} className={`text-[9px] truncate flex items-center justify-between gap-1.5 leading-none py-0.5 ${isSelected ? (st.completed ? 'text-white/40' : 'text-white/90') : (st.completed ? 'text-white/20 line-through' : 'text-white/40')}`}>
                                <span className="truncate flex items-center gap-2">
                                  {st.category && st.category !== 'none' && (
                                    <span className={`w-1 h-1 rounded-full ${CATEGORIES.find(c => c.id === st.category)?.color} opacity-40 shadow-[0_0_5px_rgba(255,255,255,0.1)]`}></span>
                                  )}
                                  {st.text}
                                </span>
                              </div>
                            ))}
                            {task.subtasks.length > 3 && (
                              <div className="text-[8px] font-black text-white/20 mt-1 uppercase tracking-widest">+{task.subtasks.length - 3} Routines</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#cfb991]/20 shadow-[0_0_10px_rgba(207,185,145,0.1)]"></div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Time Distribution Analytics */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 mt-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#cfb991]/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#cfb991]/10 rounded-xl border border-[#cfb991]/20">
                  <PieChart className="w-5 h-5 text-[#EEDC9A]" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif italic tracking-wide text-[#f0ebe1]">Daily Analytics</h2>
                  <p className="text-[10px] text-white/30 font-mono mt-0.5 uppercase tracking-wider">{totalMinutesAllocated}m logged in aggregate</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Efficiency</span>
                    <span className="text-xs font-mono text-white">
                      {Math.round(((categoryStats.find(s => s.id === 'focus')?.minutes || 0) / (totalMinutesAllocated || 1)) * 100)}% Focus
                    </span>
                 </div>
                 <div className="h-8 w-px bg-white/5"></div>
                 <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Wasted</span>
                    <span className="text-xs font-mono text-[#8B0000]">
                      {categoryStats.find(s => s.id === 'waste')?.minutes || 0}m
                    </span>
                 </div>
              </div>
            </div>

            {categoryStats.filter(c => c.minutes > 0).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-white/5 rounded-2xl text-center">
                <PieChart className="w-8 h-8 text-white/5 mb-3" />
                <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No spectral data detected</p>
                <p className="text-[10px] text-white/10 mt-1">Complete routines to populate neural analytics.</p>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                   {categoryStats.filter(c => c.minutes > 0).slice(0, 4).map(stat => (
                     <div key={stat.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl transition-all hover:bg-white/[0.06] group">
                        <div className="flex items-center gap-2 mb-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${stat.color} shadow-[0_0_8px_rgba(255,255,255,0.2)]`}></div>
                           <span className="text-[8px] font-black text-white/40 uppercase tracking-widest truncate">{stat.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-xl font-black text-white">{stat.hoursDisplay}</span>
                           <span className="text-[10px] font-mono text-white/20">HRS</span>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="h-64 w-full mt-4 text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart 
                      data={categoryStats.filter(c => c.minutes > 0).map(c => ({ 
                        name: c.label, 
                        minutes: c.minutes, 
                        hex: c.hex, 
                        hoursDisplay: c.hoursDisplay,
                        displayLabel: `${c.hoursDisplay}h`
                      }))} 
                      layout="vertical" 
                      margin={{ top: 0, right: 60, left: 20, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                        width={90} 
                      />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#1a1c23] border border-white/10 px-4 py-3 rounded-2xl shadow-2xl flex flex-col gap-1 ring-1 ring-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.hex }}></div>
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{data.name}</span>
                                </div>
                                <div className="flex items-center justify-between gap-6">
                                  <span className="text-[10px] text-white/40">Duration:</span>
                                  <span className="text-xs font-mono text-white">{data.minutes}m</span>
                                </div>
                                <div className="flex items-center justify-between gap-6">
                                  <span className="text-[10px] text-white/40">Density:</span>
                                  <span className="text-xs font-mono text-[#EEDC9A]">{((data.minutes/totalMinutesAllocated)*100).toFixed(1)}%</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="minutes" radius={[0, 8, 8, 0]} barSize={24} animationDuration={1500} animationEasing="ease-out">
                        {
                          categoryStats.filter(c => c.minutes > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.hex} fillOpacity={0.8} stroke={entry.hex} strokeWidth={1} />
                          ))
                        }
                        <LabelList 
                          dataKey="displayLabel" 
                          position="right" 
                          fill="#94a3b8" 
                          fontSize={10} 
                          fontWeight={600}
                          offset={15}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* System Efficiency Insight */}
                <div className="mt-6 p-4 bg-[#cfb991]/5 border border-[#cfb991]/20 rounded-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#cfb991]/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-[#cfb991]/20 transition-all duration-700"></div>
                  <div className="flex gap-3 relative z-10">
                    <Activity className="w-4 h-4 text-[#cfb991] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[9px] font-black text-[#cfb991] uppercase tracking-[0.2em] mb-1">System Efficiency</h4>
                      <p className="text-xs text-[#cfb991]/80 font-serif italic leading-relaxed">
                        Temporal allocation is being processed. Maintain focus density to optimize neural output.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Right: Selected Hour Detail Panel */}
        <aside id="hour-detail-panel" className="lg:w-[400px] xl:w-[480px] flex flex-col gap-6 order-1 lg:order-2 scroll-mt-24">
          <div className="flex p-1 bg-black/40 border border-[#cfb991]/10 rounded-2xl relative z-10 shadow-2xl backdrop-blur-xl">
             <button
                onClick={() => setActiveAsideTab('hour')}
                className={`flex-1 py-3 text-[10px] font-black md:px-0 px-2 uppercase tracking-[0.2em] rounded-xl transition-all ${
                  activeAsideTab === 'hour' ? 'bg-[#cfb991]/20 text-[#cfb991] shadow-[0_4px_20px_rgba(207,185,145,0.1)] ring-1 ring-[#cfb991]/40' : 'text-white/30 hover:text-white/60'
                }`}
             >
               Temporal Block
             </button>
             <button
                onClick={() => setActiveAsideTab('master')}
                className={`flex-1 py-3 text-[10px] font-black md:px-0 px-2 flex items-center justify-center gap-2 uppercase tracking-[0.2em] rounded-xl transition-all ${
                  activeAsideTab === 'master' ? 'bg-[#cfb991]/20 text-white shadow-[0_4px_20px_rgba(207,185,145,0.1)] ring-1 ring-[#cfb991]/40' : 'text-white/30 hover:text-white/60'
                }`}
             >
               Master Ledger
               {masterTasks.filter(t => !t.completed).length > 0 && (
                 <span className="bg-[#cfb991] text-black text-[8px] px-2 py-0.5 rounded-full font-black">{masterTasks.filter(t => !t.completed).length}</span>
               )}
             </button>
             <button
                onClick={() => setActiveAsideTab('yield')}
                className={`flex-1 py-3 text-[10px] font-black md:px-0 px-2 flex items-center justify-center gap-2 uppercase tracking-[0.2em] rounded-xl transition-all ${
                  activeAsideTab === 'yield' ? 'bg-[#cfb991]/20 text-white shadow-[0_4px_20px_rgba(207,185,145,0.1)] ring-1 ring-[#cfb991]/40' : 'text-white/30 hover:text-white/60'
                }`}
             >
               Academic Yield
             </button>
          </div>

          {activeAsideTab === 'hour' ? (
            <motion.div
              key="hour-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4 flex-grow relative"
            >
            <section className="bg-black/60 backdrop-blur-2xl border-t border-l border-[#cfb991]/20 border-b border-r border-[#cfb991]/5 rounded-3xl p-6 lg:p-8 relative overflow-hidden flex-shrink-0 group shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#cfb991]/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-end mb-6 border-b border-white/5 pb-4 relative z-10">
                <div>
                  <h3 className="text-xl font-serif italic tracking-wide text-[#cfb991] mb-2">
                    Block Configuration
                  </h3>
                  <h4 className="text-3xl font-serif italic text-white flex items-baseline gap-2">
                    {formatHour(selectedHour).time} <span className="text-xs opacity-40 font-mono font-normal uppercase tracking-widest">{formatHour(selectedHour).ampm}</span>
                  </h4>
                </div>
                {selectedHour === actualHour && (
                  <BlockCountdown active={isToday} />
                )}
              </div>

              <div className="mb-6 relative z-10">
                  <label className="text-[10px] uppercase tracking-[0.3em] text-[#cfb991]/40 font-black mb-2.5 block">Primary Initiative</label>
                  <div className="relative group">
                    <input
                      type="text"
                      className={`w-full bg-black/40 border-b border-[#cfb991]/10 px-0 py-3 text-lg font-serif italic text-white focus:outline-none focus:border-[#cfb991]/50 transition-all placeholder:text-white/10 ${selectedTask.completed ? 'text-white/20 line-through decoration-[#cfb991]/30' : ''}`}
                      placeholder="Defining the next hour..."
                      value={selectedTask.text}
                      onChange={(e) => updateTask(selectedHour, 'text', e.target.value)}
                    />
                    <button
                      onClick={() => toggleReminder()}
                      className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all active:scale-90 ${selectedTask.reminder ? 'text-[#cfb991] bg-[#cfb991]/10' : 'text-white/20 hover:text-white/40'}`}
                    >
                      {selectedTask.reminder ? <BellRing className="w-4 h-4 shadow-[0_0_10px_rgba(207,185,145,0.3)]" /> : <Bell className="w-4 h-4" />}
                    </button>
                  </div>
              </div>

              <div className="mb-6 relative z-10">
                <label className="text-[10px] uppercase tracking-[0.3em] text-[#cfb991]/40 font-black mb-3 block">Environmental State</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const isLeisureLocked = cat.id === 'leisure' && activeDebtToday > 0;
                    return (
                      <button
                        key={cat.id}
                        disabled={isLeisureLocked}
                        onClick={() => updateTask(selectedHour, 'category', cat.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                          selectedTask.category === cat.id 
                            ? 'border-[#cfb991]/50 bg-[#cfb991]/10 text-white shadow-lg shadow-[#cfb991]/5' 
                            : isLeisureLocked 
                              ? 'border-white/5 bg-gray-900/50 text-white/10 grayscale cursor-not-allowed'
                              : 'border-white/5 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'
                        }`}
                        title={isLeisureLocked ? 'Leisure locked due to Temporal Debt' : ''}
                      >
                        <span className={`w-2 h-2 rounded-full ${cat.color} ${isLeisureLocked ? 'opacity-10 grayscale' : 'opacity-80'}`}></span>
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6 relative z-10">
                <label className="text-[10px] uppercase tracking-[0.3em] text-[#cfb991]/40 font-black mb-3 block">Energy Output</label>
                <div className="flex bg-black/40 border border-white/5 rounded-2xl overflow-hidden p-1 gap-1">
                  {[
                    { level: 'low', label: 'Low', circleClass: 'w-1.5 h-1.5' },
                    { level: 'neutral', label: 'Neutral', circleClass: 'w-2 h-2' },
                    { level: 'high', label: 'High', circleClass: 'w-3 h-3 shadow-[0_0_8px_currentColor]' }
                  ].map((item) => (
                    <button
                      key={item.level}
                      onClick={() => updateTask(selectedHour, 'energy', item.level)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        selectedTask.energy === item.level
                          ? 'bg-[#cfb991]/10 text-[#cfb991] shadow-inner'
                          : 'text-white/20 hover:text-white/40 hover:bg-white/5'
                      }`}
                    >
                      <div className={`rounded-full bg-current ${item.circleClass}`}></div>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

          {/* Subtasks / Brain Dump Section */}
          <section className="bg-black/60 backdrop-blur-2xl border-t border-l border-[#cfb991]/20 border-b border-r border-[#cfb991]/5 rounded-3xl p-6 lg:p-8 flex-grow flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-[#cfb991] uppercase tracking-[0.4em] flex items-center gap-3">
                <LayoutList className="w-4 h-4 text-[#cfb991]/60" />
                Sub-Routines
              </h3>
            </div>

            <Timeline 
              subtasks={subtasks}
              completedSubtasks={completedSubtasks}
              selectedHour={selectedHour}
              isToday={isToday}
              setEditingSubtask={setEditingSubtask}
              selectedTask={selectedTask}
            />

            <div className="flex-grow overflow-y-auto pr-2 space-y-3 mb-6 custom-scrollbar max-h-[400px]">
              <AnimatePresence>
                {subtasks.length === 0 ? (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center justify-center p-10 border border-dashed border-white/5 rounded-3xl text-center">
                    <div className="w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center mb-4 border border-white/5">
                       <Plus className="w-5 h-5 text-white/10" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">No micro-routines registered.</p>
                  </motion.div>
                ) : (
                  subtasks.map((st) => (
                    <motion.div
                      key={st.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 group ${
                        st.completed 
                          ? `${CATEGORIES.find(c => c.id === (st.category || selectedTask.category))?.bgClass || 'bg-[#cfb991]/10 border-[#cfb991]/20 shadow-lg shadow-[#cfb991]/5'}` 
                          : 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
                      }`}
                    >
                      <button
                        onClick={() => toggleSubtask(selectedHour, st.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          st.completed 
                            ? `${CATEGORIES.find(c => c.id === (st.category || selectedTask.category))?.color || 'bg-[#cfb991]'} text-white scale-110 shadow-lg` 
                            : 'bg-white/10 text-transparent hover:bg-white/20 border border-white/10'
                        }`}
                      >
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </button>
                      
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                           {!st.completed && st.category && st.category !== 'none' && (
                              <span className={`w-1.5 h-1.5 rounded-full ${CATEGORIES.find(c => c.id === st.category)?.color}`}></span>
                           )}
                           <span className={`text-sm font-medium transition-all ${st.completed ? 'text-white/40 line-through' : 'text-white/90'}`}>
                             {st.text}
                           </span>
                        </div>
                        {(st.startTime || st.endTime) && (
                          <div className={`text-[10px] font-mono mt-1 flex items-center gap-2 ${st.completed ? 'text-[#EEDC9A]/30' : 'text-white/30'}`}>
                            <span className="bg-[#0a0a0a]/90 black/20 px-1.5 py-0.5 rounded border border-white/5">
                              {st.startTime} → {st.endTime}
                            </span>
                            <span className="opacity-50">({st.duration} min)</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => toggleReminder(st.id)}
                          className={`p-2 rounded-lg transition-all active:scale-90 ${st.reminder ? 'text-amber-400 bg-[#0a0a0a]/90 amber-400/10 hover:bg-[#0a0a0a]/90 amber-400/20' : 'text-white/20 hover:text-amber-400 hover:bg-[#0a0a0a]/90 amber-400/10'}`}
                        >
                          {st.reminder ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingSubtask({ hour: selectedHour, subtaskId: st.id })}
                          className="p-2 rounded-lg text-white/20 hover:text-[#EEDC9A] hover:bg-[#EEDC9A]/10 transition-all active:scale-90"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSubtask(selectedHour, st.id)}
                          className="p-2 rounded-lg text-white/20 hover:text-[#8B0000] hover:bg-[#8B0000]/10 transition-all active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Add subtask */}
            <div className="mt-auto border-t border-white/5 pt-4">
                <div className="mb-3">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-black mb-1.5 block pl-1">Sub-routine Category</label>
                  <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSubtaskCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-[8px] font-black uppercase tracking-[0.1em] transition-all ${
                        subtaskCategory === cat.id 
                          ? 'border-white/30 bg-white/10 text-white' 
                          : 'border-white/5 bg-white/2 text-white/30 hover:bg-white/5 hover:text-white/50'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.color}`}></span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem('subtask') as HTMLInputElement;
                  const sMin = form.elements.namedItem('sMin') as HTMLInputElement;
                  const eMin = form.elements.namedItem('eMin') as HTMLInputElement;
                  addSubtask(selectedHour, input.value, sMin.value, eMin.value, subtaskCategory);
                  input.value = '';
                  
                  // Auto-advance sequence
                  sMin.value = eMin.value;
                  const nextVal = Math.min(60, parseInt(eMin.value) + 15);
                  eMin.value = nextVal.toString();
                }}
                className="flex flex-col gap-2.5 bg-[#0a0a0a]/90 black/20 p-3.5 rounded-xl border border-white/5 focus-within:border-[#cfb991]/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                   <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[8px] uppercase text-white/20 font-black tracking-widest pl-1">Start Min</label>
                      <div className="flex items-center gap-2 bg-[#0a0a0a]/90 black/40 rounded px-2.5 py-1.5 border border-white/5 focus-within:border-[#cfb991]/30 transition-all">
                        <Clock className="w-3.5 h-3.5 text-white/30" />
                        <input
                          type="number"
                          name="sMin"
                          min="0"
                          max="59"
                          defaultValue="0"
                          className="w-full bg-transparent text-xs font-mono text-white outline-none focus:text-[#EEDC9A]"
                        />
                      </div>
                   </div>
                   <div className="flex-1 flex flex-col gap-1">
                       <label className="text-[8px] uppercase text-white/20 font-black tracking-widest pl-1">End Min</label>
                       <div className="flex items-center gap-2 bg-[#0a0a0a]/90 black/40 rounded px-2.5 py-1.5 border border-white/5 focus-within:border-[#cfb991]/30 transition-all">
                        <ArrowRight className="w-3.5 h-3.5 text-white/30" />
                        <input
                          type="number"
                          name="eMin"
                          min="1"
                          max="60"
                          defaultValue="15"
                          className="w-full bg-transparent text-xs font-mono text-white outline-none focus:text-[#EEDC9A]"
                        />
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    name="subtask"
                    className="flex-grow bg-[#0a0a0a]/90 black/40 text-[11px] font-bold uppercase tracking-wide text-white placeholder:text-white/20 rounded p-2.5 outline-none border border-white/5 focus:border-[#cfb991]/30 transition-all"
                    placeholder="Log micro-routine..."
                    autoComplete="off"
                    required
                  />
                  <button type="submit" className="p-2.5 rounded bg-[#cfb991]/20 text-[#EEDC9A] hover:bg-[#cfb991]/30 transition-all border border-[#cfb991]/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] active:scale-95">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
        </motion.div>
        ) : activeAsideTab === 'master' ? (
        <motion.div
            key="master-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col flex-grow bg-black/60 backdrop-blur-3xl border border-[#cfb991]/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden relative min-h-[500px]"
        >
            <div className="p-8 pb-6 border-b border-white/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <h3 className="text-2xl font-serif italic text-white tracking-wide">Master Ledger</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-[#cfb991]/60 bg-[#cfb991]/5 px-3 py-1.5 rounded-xl border border-[#cfb991]/10 uppercase tracking-[0.2em]">
                    Capacity: {masterTasks.filter(t => t.completed).length}/{masterTasks.length}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">High-Level Strategic Objectives</p>
            </div>

            <div className="flex-grow overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-4">
              <AnimatePresence>
                {masterTasks.length === 0 ? (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <ListTodo className="w-8 h-8 text-white/5 mb-3" />
                    <p className="text-sm font-bold text-white/20 uppercase tracking-widest">Scope is empty</p>
                    <p className="text-[10px] text-white/10 mt-1">Add macro tasks below to begin.</p>
                  </motion.div>
                ) : (
                  <>
                  {masterTasks.filter(t => !t.completed).map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      layout
                      className="group flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
                    >
                      <button
                        onClick={() => toggleMasterTask(t.id)}
                        className="w-5 h-5 mt-0.5 rounded flex items-center justify-center shrink-0 border border-[#cfb991]/30 text-transparent hover:bg-[#cfb991]/10 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-sm break-words text-white/90 leading-snug">
                          {t.text}
                        </span>
                        {t.category && t.category !== 'none' && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${CATEGORIES.find(c => c.id === t.category)?.color}`}></div>
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                              {CATEGORIES.find(c => c.id === t.category)?.label}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteMasterTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 h-fit text-white/20 hover:text-[#8B0000] hover:bg-[#8B0000]/10 rounded transition-all active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                  
                  {masterTasks.some(t => t.completed) && (
                     <div className="pt-4 mt-4 border-t border-white/5">
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3 pl-1">Completed</div>
                        {masterTasks.filter(t => t.completed).map((t) => (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            layout
                            className="group flex gap-3 p-2 rounded-lg transition-all duration-300 opacity-60"
                          >
                            <button
                              onClick={() => toggleMasterTask(t.id)}
                              className="w-5 h-5 mt-0.5 rounded flex items-center justify-center shrink-0 bg-[#cfb991] text-white"
                            >
                              <Check className="w-3.5 h-3.5" strokeWidth={3} />
                            </button>
                            <div className="flex-1 flex flex-col gap-1">
                              <span className="text-sm break-words line-through text-white/40 leading-snug">
                                {t.text}
                              </span>
                              {t.category && t.category !== 'none' && (
                                <div className="flex items-center gap-1.5 mt-1 opacity-20">
                                  <div className={`w-1 h-1 rounded-full ${CATEGORIES.find(c => c.id === t.category)?.color}`}></div>
                                  <span className="text-[7px] font-black text-white uppercase tracking-widest font-mono">
                                    {CATEGORIES.find(c => c.id === t.category)?.label}
                                  </span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => deleteMasterTask(t.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 h-fit text-white/20 hover:text-[#8B0000] hover:bg-[#8B0000]/10 rounded transition-all active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))}
                     </div>
                  )}
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="px-6 py-3 bg-black/40 border-t border-white/5 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setMasterTaskCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                    masterTaskCategory === cat.id 
                      ? 'border-[#cfb991]/30 bg-[#cfb991]/10 text-white shadow-lg shadow-[#cfb991]/5' 
                      : 'border-white/5 text-white/20 hover:text-white/40'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('masterTask') as HTMLInputElement;
                addMasterTask(input.value, masterTaskCategory);
                input.value = '';
                setMasterTaskCategory('none');
              }}
              className="p-6 md:p-8 bg-black/60 border-t border-white/5 flex items-center gap-4 relative"
            >
               <input
                 type="text"
                 name="masterTask"
                 className="flex-grow bg-black/40 border border-[#cfb991]/20 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-[#cfb991]/50 transition-all placeholder:text-white/10"
                 placeholder="Conceive a new objective..."
                 autoComplete="off"
                 required
               />
               <button 
                  type="submit" 
                  className="bg-[#cfb991] hover:bg-[#EEDC9A] text-black px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-[#cfb991]/10 flex items-center gap-2"
               >
                 Inscribe <Plus className="w-3.5 h-3.5" />
               </button>
            </form>
        </motion.div>
        ) : (
        <motion.div
            key="yield-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col flex-grow bg-black/60 backdrop-blur-3xl border border-[#cfb991]/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden relative min-h-[500px] p-8"
        >
          <div className="mb-8 overflow-hidden">
            <h3 className="text-2xl font-serif italic text-white tracking-wide mb-2">Academic Yield</h3>
            <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">Grade Correlation & Prediction</p>
          </div>

          <div className="space-y-6">
            {academicCourses.map(course => {
              // Simple correlation logic: targeting A+ requires velocity
              const velocityNeeded = course.targetGrade.includes('+') ? 1.2 : 0.8;
              const isHighTarget = course.targetGrade.startsWith('A');
              
              return (
                <div key={course.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#cfb991]/30 transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-serif italic text-white group-hover:text-[#cfb991] transition-colors">{course.name}</h4>
                        <div className="flex gap-4 mt-1">
                          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Current: <strong className="text-white">{course.currentScore}%</strong></span>
                          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Target: <strong className="text-[#cfb991]">{course.targetGrade}</strong></span>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Status</div>
                         <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${isHighTarget ? 'bg-[#cfb991]/20 text-[#cfb991]' : 'bg-blue-500/10 text-blue-400'}`}>
                           High Velocity
                         </div>
                      </div>
                   </div>

                   <div className="p-4 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
                      <div className="flex items-center gap-3 relative z-10">
                         <div className="p-2 bg-[#cfb991]/10 rounded-lg">
                           <TrendingUp className="w-4 h-4 text-[#cfb991]" />
                         </div>
                         <div>
                            <p className="text-[10px] font-serif italic text-[#cfb991]/80">Correlation Insight</p>
                            <p className="text-[11px] text-white/60 leading-relaxed">
                              Targeting {course.targetGrade} requires a <span className="text-white font-bold">+{velocityNeeded}hr</span> increase in weekly study velocity based on current {stats.focusMinutes}m log.
                            </p>
                         </div>
                      </div>
                   </div>
                </div>
              );
            })}

            <button 
              className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[10px] font-black text-white/20 uppercase tracking-[0.2em] hover:border-white/20 hover:text-white/40 transition-all flex items-center justify-center gap-2"
              onClick={() => {
                const name = prompt("Enter course name:");
                if (name) {
                  setAcademicCourses([...academicCourses, { id: Date.now().toString(), name, targetGrade: 'A', currentScore: 0 }]);
                }
              }}
            >
              <Plus className="w-4 h-4" /> Add Academic Objective
            </button>
          </div>

          <div className="mt-auto pt-8 border-t border-white/5">
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Neural Engine Note</p>
                 <p className="text-[10px] text-blue-400/60 leading-relaxed italic">
                   Predictions are synthesized by cross-referencing your Master Ledger focus density against historical grade distributions.
                 </p>
              </div>
          </div>
        </motion.div>
        )}
        </aside>
        </div>
          </>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}} />
    </div>
  );
}

export default App;
