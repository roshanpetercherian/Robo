'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Pill, Utensils, CheckCircle2, Clock } from 'lucide-react';
import { apiClient } from '@/src/lib/api';
import { ScheduleItem } from '@/src/types';

export function ActiveMedication() {
  // Demo fallback data
  const demoTask: ScheduleItem = {
    id: 1,
    time: new Date().toISOString(),
    task: 'Paracetamol',
    status: 'pending',
    notes: 'Take After Food',
    dosage: '500mg • 2 Tablets'
  };

  const [currentTask, setCurrentTask] = useState<ScheduleItem>(demoTask);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchCurrentTask = async () => {
      try {
        const schedule = await apiClient.getTodaySchedule();
        const pending = schedule.find(item => item.status === 'pending');
        if (pending) setCurrentTask(pending);
      } catch (error) {
        console.log('Using demo task data');
      }
    };

    fetchCurrentTask();
    const interval = setInterval(fetchCurrentTask, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleVoiceCommand = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceStatus('error');
      setTimeout(() => setVoiceStatus('idle'), 2000);
      return;
    }

    if (isListening) {
      setIsListening(false);
      setVoiceStatus('idle');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('listening');
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);
    };

    recognition.onend = async () => {
      setIsListening(false);
      if (transcript) {
        setVoiceStatus('processing');
        try {
          await apiClient.processVoiceCommand(transcript);
          setVoiceStatus('success');
          setTimeout(() => setVoiceStatus('idle'), 3000);
        } catch {
          setVoiceStatus('error');
          setTimeout(() => setVoiceStatus('idle'), 3000);
        }
      } else {
        setVoiceStatus('idle');
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('error');
      setTimeout(() => setVoiceStatus('idle'), 3000);
    };

    recognition.start();
  };

  const getInstructionStyle = (notes?: string) => {
    if (!notes) return { 
      bg: 'bg-slate-700/30 border-slate-600', 
      text: 'text-slate-400', 
      icon: Clock 
    };
    
    const lowerNotes = notes.toLowerCase();
    if (lowerNotes.includes('after food') || lowerNotes.includes('after eating')) {
      return { 
        bg: 'bg-emerald-500/20 border-emerald-500/50', 
        text: 'text-emerald-400', 
        icon: Utensils 
      };
    }
    if (lowerNotes.includes('before food') || lowerNotes.includes('before eating')) {
      return { 
        bg: 'bg-yellow-500/20 border-yellow-500/50', 
        text: 'text-yellow-400', 
        icon: Utensils 
      };
    }
    return { 
      bg: 'bg-blue-500/20 border-blue-500/50', 
      text: 'text-blue-400', 
      icon: Clock 
    };
  };

  const instructionStyle = getInstructionStyle(currentTask?.notes);
  const InstructionIcon = instructionStyle.icon;

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl h-full flex flex-col overflow-hidden shadow-2xl">
      
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50 shrink-0">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
          <Pill className="w-6 h-6 text-blue-400" />
          Current Dispensing Task
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {currentTask ? 'Ready to dispense medication' : 'No pending tasks'}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 overflow-y-auto">
        {currentTask ? (
          <>
            {/* Medication Visual */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
              className="relative"
            >
              <div className="w-56 h-56 rounded-full bg-gradient-to-br from-blue-600/20 via-cyan-500/20 to-emerald-500/20 border-2 border-dashed border-slate-600 flex items-center justify-center shadow-2xl">
                <Pill className="w-28 h-28 text-blue-400 animate-float" />
              </div>
              
              {/* Rotating Border Effect */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0%, rgba(59, 130, 246, 0.5) 50%, transparent 100%)',
                  filter: 'blur(8px)'
                }}
              />
            </motion.div>

            {/* Medication Info */}
            <div className="text-center space-y-3">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400"
              >
                {currentTask.task}
              </motion.h1>
              
              {currentTask.dosage && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl text-slate-400 font-medium"
                >
                  {currentTask.dosage}
                </motion.p>
              )}
            </div>

            {/* Instruction Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`${instructionStyle.bg} border ${instructionStyle.text} px-8 py-4 rounded-full font-bold text-base flex items-center gap-3 shadow-lg`}
            >
              <InstructionIcon className="w-6 h-6" />
              {currentTask.notes || 'No special instructions'}
            </motion.div>

            {/* Dispense Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => alert('💊 Dispensing medication...')}
              className="px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-bold text-lg text-white shadow-2xl shadow-blue-500/50 transition-all"
            >
              Dispense Medication Now
            </motion.button>
          </>
        ) : (
          <div className="text-center text-slate-400">
            <CheckCircle2 className="w-20 h-20 mx-auto mb-4 text-emerald-500" />
            <p className="text-2xl font-semibold">All Tasks Completed</p>
            <p className="text-sm mt-2">Great job today!</p>
          </div>
        )}
      </div>

      {/* Voice Command Footer */}
      <div className="px-6 py-5 bg-slate-800/50 border-t border-slate-700/50 shrink-0">
        <div className="flex flex-col items-center gap-4">
          
          {/* Status Messages */}
          <AnimatePresence mode="wait">
            {voiceStatus === 'listening' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full p-4 rounded-lg bg-blue-500/10 border border-blue-500/50 text-center"
              >
                <p className="text-blue-400 font-semibold mb-2 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  Listening...
                </p>
                <p className="text-slate-400 text-sm italic">
                  {transcript || 'Say: "Give Paracetamol at 2 PM after food"'}
                </p>
              </motion.div>
            )}
            
            {voiceStatus === 'processing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-yellow-400 font-semibold"
              >
                Processing command...
              </motion.div>
            )}
            
            {voiceStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-emerald-400 font-semibold flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Command scheduled!
              </motion.div>
            )}

            {voiceStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-400 font-semibold"
              >
                Voice recognition unavailable
              </motion.div>
            )}
          </AnimatePresence>

          {/* Microphone Button */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleVoiceCommand}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse-glow shadow-red-500/50'
                  : voiceStatus === 'success'
                  ? 'bg-emerald-600 shadow-emerald-500/50'
                  : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-purple-500/50'
              }`}
            >
              {isListening ? (
                <MicOff className="w-10 h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </motion.button>
            
            <p className="text-xs text-slate-500 font-medium">
              {isListening ? 'Click to stop recording' : 'Voice Commands'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}