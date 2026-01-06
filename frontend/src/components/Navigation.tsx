'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Power, Circle } from 'lucide-react';

export function Navigation() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isOnline] = useState(true); // Always show as online for demo
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEmergencyStop = () => {
    alert('🚨 Emergency Stop Activated!');
    setShowEmergencyConfirm(false);
  };

  return (
    <>
      {/* Top Navigation Bar - Fixed Height, Horizontal Layout */}
      <nav className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 flex items-center justify-between px-6 shrink-0">
        
        {/* Left Section - Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center animate-spin-slow">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              MediBot Assistant
            </h1>
            <p className="text-xs text-slate-400">Autonomous Care System</p>
          </div>
        </div>

        {/* Center Section - Time Display */}
        <div className="flex flex-col items-center">
          <div className="text-2xl font-mono font-bold text-slate-100 tracking-wider">
            {currentTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Right Section - Status & Emergency */}
        <div className="flex items-center gap-4">
          {/* Online Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm">
            <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-400">
              {isOnline ? 'System Online' : 'Offline'}
            </span>
          </div>

          {/* Emergency Stop Button */}
          <button
            onClick={() => setShowEmergencyConfirm(true)}
            className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:border-red-500 transition-all duration-200 font-semibold text-sm flex items-center gap-2"
          >
            <Power className="w-4 h-4" />
            Emergency Stop
          </button>
        </div>
      </nav>

      {/* Emergency Confirmation Modal */}
      <AnimatePresence>
        {showEmergencyConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center"
            onClick={() => setShowEmergencyConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-red-500/50 p-8 rounded-2xl max-w-md w-full mx-4 shadow-2xl shadow-red-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Power className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Confirm Emergency Stop</h2>
                <p className="text-slate-400 mb-6 text-sm">
                  This will halt all robot operations immediately and notify emergency contacts.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEmergencyConfirm(false)}
                    className="flex-1 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEmergencyStop}
                    className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-semibold shadow-lg shadow-red-500/30"
                  >
                    Confirm Stop
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}