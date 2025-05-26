
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Circle, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import TaskInstructions from '@/components/lab/TaskInstructions'; // Import TaskInstructions

const TaskList = ({ tasks, currentTaskIndex, onTaskSelect, activeTask }) => { // Add activeTask prop
  return (
    <> {/* Use a fragment to return multiple elements */}
      <ScrollArea className="h-[40%] pr-4"> {/* Adjusted height */}
        <ul className="space-y-3">
          {tasks.map((task, index) => (
            <motion.li
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <button
                onClick={() => onTaskSelect(index)}
                disabled={index > 0 && !tasks[index-1].completed && !task.completed} /* Allow selecting completed tasks or the current/next uncompleted */
                className={cn(
                  "w-full text-left p-3 rounded-md transition-all duration-200 ease-in-out flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-primary/50",
                  index === currentTaskIndex ? "bg-primary/20 border border-primary text-primary-foreground shadow-lg" : "bg-slate-700/50 hover:bg-slate-600/70",
                  task.completed ? "text-green-400" : "text-slate-300",
                  (index > 0 && !tasks[index-1].completed && !task.completed) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                )}
              >
                {task.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : index === currentTaskIndex ? (
                  <PlayCircle className="h-5 w-5 text-sky-400 flex-shrink-0 animate-pulse" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-500 flex-shrink-0" />
                )}
                <span className="truncate flex-grow">{task.title}</span>
              </button>
            </motion.li>
          ))}
        </ul>
      </ScrollArea>
      {/* New section for TaskInstructions */}
      {activeTask && (
        <div className="mt-4 pt-4 border-t border-slate-700 flex-grow flex flex-col overflow-hidden"> {/* Ensure this div allows TaskInstructions' ScrollArea to work */}
          <TaskInstructions task={activeTask} />
        </div>
      )}
    </>
  );
};

export default TaskList;