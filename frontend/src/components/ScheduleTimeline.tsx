'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, AlertTriangle, Pill } from 'lucide-react';
import { apiClient } from '@/src/lib/api';
import { ScheduleItem } from '@/src/types';

export function ScheduleTimeline() {
  // Demo fallback schedule
  const demoSchedule: ScheduleItem[] = [
    {
      id: 1,
      time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().split('T')[0] + ' 08:00',
      task: 'Morning Vitamins',
      status: 'completed',
      notes: 'Vitamin D & B12'
    },
    {
      id: 2,
      time: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      task: 'Paracetamol',
      status: 'pending',
      notes: 'Take After Food',
      dosage: '500mg'
    },
    {
      id: 3,
      time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().split('T')[0] + ' 18:00',
      task: 'Metformin',
      status: 'pending',
      notes: 'With Dinner'
    },
    {
      id: 4,
      time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0] + ' 21:00',
      task: 'Atorvastatin',
      status: 'pending',
      notes: 'Before Sleep'
    }
  ];

  const [schedule, setSchedule] = useState<ScheduleItem[]>(demoSchedule);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await apiClient.getTodaySchedule();
        if (data && data.length > 0) {
          setSchedule(data);
        }
        setLoading(false);
      } catch (error) {
        console.log('Using demo schedule data');
        setLoading(false);
      }
    };

    fetchSchedule();
    const interval = setInterval(fetchSchedule, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString.replace(' ', 'T'));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const getItemStatus = (item: ScheduleItem) => {
    const now = new Date();
    const itemTime = new Date(item.time.replace(' ', 'T'));
    
    if (item.status === 'completed') return 'completed';
    if (item.status === 'missed') return 'missed';
    
    const diffMinutes = (itemTime.getTime() - now.getTime()) / (1000 * 60);
    if (diffMinutes < 0 && item.status === 'pending') return 'current';
    if (diffMinutes <= 30 && item.status === 'pending') return 'current';
    
    return 'future';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-500/5',
          text: 'text-emerald-400',
          opacity: 'opacity-50',
          icon: CheckCircle2,
          iconBg: 'bg-emerald-500/20',
          iconBorder: 'border-emerald-500/50',
          iconColor: 'text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-400',
          badgeText: 'Completed'
        };
      case 'current':
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          opacity: 'opacity-100',
          icon: Clock,
          iconBg: 'bg-blue-500/20',
          iconBorder: 'border-blue-500',
          iconColor: 'text-blue-400',
          badge: 'bg-blue-500/20 text-blue-400',
          badgeText: 'Ready'
        };
      case 'missed':
        return {
          border: 'border-red-500/50',
          bg: 'bg-red-500/10',
          text: 'text-red-400',
          opacity: 'opacity-70',
          icon: AlertTriangle,
          iconBg: 'bg-red-500/20',
          iconBorder: 'border-red-500/50',
          iconColor: 'text-red-400',
          badge: 'bg-red-500/20 text-red-400',
          badgeText: 'Missed'
        };
      default:
        return {
          border: 'border-slate-700',
          bg: 'bg-slate-800/20',
          text: 'text-slate-400',
          opacity: 'opacity-100',
          icon: Pill,
          iconBg: 'bg-slate-700/30',
          iconBorder: 'border-slate-600',
          iconColor: 'text-slate-400',
          badge: 'bg-slate-700/30 text-slate-400',
          badgeText: 'Upcoming'
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 h-full flex items-center justify-center shadow-xl">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-slate-400 font-medium">Loading schedule...</p>
        </div>
      </div>
    );
  }

  const completedCount = schedule.filter(item => item.status === 'completed').length;
  const pendingCount = schedule.filter(item => item.status === 'pending').length;
  const missedCount = schedule.filter(item => item.status === 'missed').length;

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl h-full flex flex-col overflow-hidden shadow-2xl">
      
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50 shrink-0">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-400" />
          Today's Schedule
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {schedule.length} tasks scheduled
        </p>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {schedule.length === 0 ? (
          <div className="text-center text-slate-500 py-16">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">No tasks scheduled</p>
            <p className="text-sm mt-2">All clear for today!</p>
          </div>
        ) : (
          schedule.map((item, index) => {
            const status = getItemStatus(item);
            const config = getStatusConfig(status);
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative ${config.opacity}`}
              >
                {/* Timeline Connector Line */}
                {index < schedule.length - 1 && (
                  <div className="absolute left-7 top-20 bottom-0 w-0.5 bg-slate-700" />
                )}

                {/* Task Card */}
                <div className={`relative border-2 ${config.border} ${config.bg} rounded-xl p-4 transition-all hover:shadow-xl ${
                  status === 'current' ? 'animate-pulse-glow' : ''
                }`}>
                  <div className="flex gap-4">
                    
                    {/* Status Icon Circle */}
                    <div className={`flex-shrink-0 w-14 h-14 rounded-full ${config.iconBg} border-2 ${config.iconBorder} flex items-center justify-center z-10`}>
                      <StatusIcon className={`w-7 h-7 ${config.iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Time */}
                      <div className={`text-sm font-bold ${config.text} mb-1`}>
                        {formatTime(item.time)}
                      </div>

                      {/* Task Name */}
                      <h3 className="text-lg font-bold text-slate-100 mb-1">
                        {item.task}
                      </h3>

                      {/* Dosage */}
                      {item.dosage && (
                        <p className="text-sm text-slate-400 mb-2">{item.dosage}</p>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <p className="text-sm text-slate-400 mb-3 flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-slate-600" />
                          {item.notes}
                        </p>
                      )}

                      {/* Status Badge */}
                      <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold ${config.badge}`}>
                        {config.badgeText}
                      </span>
                    </div>
                  </div>

                  {/* Pulse Effect for Current Task */}
                  {status === 'current' && (
                    <motion.div
                      animate={{
                        scale: [1, 1.02, 1],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 rounded-xl border-2 border-blue-400 pointer-events-none"
                    />
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      <div className="px-4 py-4 bg-slate-800/50 border-t border-slate-700/50 grid grid-cols-3 gap-3 text-center shrink-0">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <div className="text-3xl font-bold text-emerald-400">{completedCount}</div>
          <div className="text-xs text-slate-400 font-medium mt-1">Completed</div>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="text-3xl font-bold text-blue-400">{pendingCount}</div>
          <div className="text-xs text-slate-400 font-medium mt-1">Pending</div>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="text-3xl font-bold text-red-400">{missedCount}</div>
          <div className="text-xs text-slate-400 font-medium mt-1">Missed</div>
        </div>
      </div>
    </div>
  );
}