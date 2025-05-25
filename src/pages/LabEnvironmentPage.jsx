import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import TaskList from '@/components/lab/TaskList';
import TerminalEmulator from '@/components/lab/TerminalEmulator';
import TaskInstructions from '@/components/lab/TaskInstructions';
import { useTaskManager } from '@/hooks/useTaskManager';
import { Button } from '@/components/ui/button';
import { RotateCcw, CheckCircle } from 'lucide-react';

const LabEnvironmentPage = () => {
  const {
    tasks,
    activeTask,
    completeTask,
    resetTasks,
    currentTaskIndex,
    setCurrentTaskIndex,
    progressPercentage,
    completedTasksCount,
    totalTasks
  } = useTaskManager();

  const handleVerifyAndComplete = () => {
    if (activeTask && !activeTask.completed) {
      completeTask(activeTask.id);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="lg:w-1/3 space-y-6"
      >
        <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-sky-400">Lab Progress</CardTitle>
            <CardDescription>
              {completedTasksCount} of {totalTasks} tasks completed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="w-full h-3 bg-slate-700" />
            <Button onClick={resetTasks} variant="outline" size="sm" className="mt-4 w-full border-amber-500 text-amber-500 hover:bg-amber-500/10">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset All Tasks
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-sky-400">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={tasks}
              currentTaskIndex={currentTaskIndex}
              onTaskSelect={(index) => setCurrentTaskIndex(index)}
            />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="lg:w-2/3 flex flex-col"
      >
        <Tabs defaultValue="instructions" className="w-full flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/70 border-slate-700">
            <TabsTrigger value="instructions" className="data-[state=active]:bg-slate-700 data-[state=active]:text-sky-300">Instructions</TabsTrigger>
            <TabsTrigger value="terminal" className="data-[state=active]:bg-slate-700 data-[state=active]:text-sky-300">Terminal</TabsTrigger>
          </TabsList>
          <TabsContent value="instructions" className="flex-grow mt-0">
            <Card className="h-full bg-slate-800/70 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-6 h-full">
                {activeTask ? (
                  <TaskInstructions task={activeTask} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                     <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-semibold text-green-400">All Tasks Completed!</h2>
                    <p className="text-muted-foreground mt-2">Congratulations! You've successfully completed all labs.</p>
                    <p className="text-muted-foreground">You can reset tasks to start over.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="terminal" className="flex-grow mt-0 flex flex-col">
             <div className="flex-grow">
                <TerminalEmulator 
                    task={activeTask} 
                    onCommandSuccess={handleVerifyAndComplete} 
                    tasks={tasks} 
                    currentTaskIndex={currentTaskIndex}
                />
             </div>
            {activeTask && !activeTask.completed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 mb-2"
              >
                <Button 
                  onClick={handleVerifyAndComplete} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-lg glow-effect"
                  disabled={!activeTask || activeTask.completed}
                >
                  <CheckCircle className="mr-2 h-5 w-5" /> Verify & Complete Task
                </Button>
              </motion.div>
            )}
             {activeTask && activeTask.completed && currentTaskIndex === tasks.length - 1 && (
               <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 mb-2 text-center p-4 bg-green-900/50 border border-green-700 rounded-md"
              >
                <p className="text-lg font-semibold text-green-300">All tasks finished! Well done!</p>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default LabEnvironmentPage;