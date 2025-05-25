
import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb } from 'lucide-react';

const TaskInstructions = ({ task }) => {
  if (!task) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Select a task to see instructions, or all tasks are complete!</p>
      </div>
    );
  }

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="p-1 h-full flex flex-col"
    >
      <ScrollArea className="flex-grow pr-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <Lightbulb className="h-8 w-8 text-yellow-400 glow-effect" />
            <h1 className="text-3xl font-bold text-sky-300">{task.title}</h1>
          </div>
          
          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <h2 className="text-xl font-semibold text-slate-200 mb-2">Description</h2>
            <p className="text-slate-300 leading-relaxed">{task.description}</p>
          </div>

          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <h2 className="text-xl font-semibold text-slate-200 mb-2">Detailed Objectives</h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">{task.details}</p>
          </div>
          
          {task.terminalSetup?.message && (
            <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-700">
              <h2 className="text-xl font-semibold text-blue-300 mb-2">Terminal Tip</h2>
              <p className="text-blue-200 leading-relaxed">{task.terminalSetup.message}</p>
            </div>
          )}
          
          {task.validationCommand && (
             <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700">
              <h2 className="text-xl font-semibold text-purple-300 mb-2">Hint: Verification</h2>
              <p className="text-purple-200 leading-relaxed">The system will attempt to verify your work. For this task, it might check something like: <code className="bg-purple-800/50 px-1 py-0.5 rounded text-sm">{task.validationCommand}</code></p>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default TaskInstructions;
  