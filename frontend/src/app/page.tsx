'use client';

import { motion } from 'framer-motion';
import { Navigation } from '@/src/components/Navigation';
import { RobotStatus } from '@/src/components/RobotStatus';
import { ActiveMedication } from '@/src/components/ActiveMedication';
import { ScheduleTimeline } from '@/src/components/ScheduleTimeline';

export default function DashboardPage() {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      
      {/* Top Navigation */}
      <Navigation />
      
      {/* Main Dashboard Content */}
      <main className="flex-1 overflow-hidden px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          
          {/* Left Panel - Robot Status (3 columns on desktop) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
          >
            <RobotStatus />
          </motion.div>

          {/* Center Panel - Active Medication (6 columns on desktop) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-6 h-full"
          >
            <ActiveMedication />
          </motion.div>

          {/* Right Panel - Schedule Timeline (3 columns on desktop) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3 h-full"
          >
            <ScheduleTimeline />
          </motion.div>
          
        </motion.div>
      </main>
    </div>
  );
}