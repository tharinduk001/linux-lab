
import { useState, useEffect, useCallback } from 'react';
import { initialTasks } from '@/data/tasks';
import { useToast } from '@/components/ui/use-toast';

const TASKS_STORAGE_KEY = 'horizonLabsTasks';

export const useTaskManager = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState(() => {
    const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    return storedTasks ? JSON.parse(storedTasks) : initialTasks;
  });
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    const firstUncompletedTaskIndex = tasks.findIndex(task => !task.completed);
    setCurrentTaskIndex(firstUncompletedTaskIndex === -1 ? tasks.length -1 : firstUncompletedTaskIndex);
  }, [tasks]);

  const activeTask = tasks[currentTaskIndex];

  const completeTask = useCallback((taskId) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, completed: true } : task
      )
    );
    toast({
      title: "Task Completed!",
      description: tasks.find(t=>t.id === taskId)?.successMessage || "Great job on completing the task!",
      variant: "default",
      duration: 3000,
    });
    
    const nextTaskIndex = tasks.findIndex(task => !task.completed);
    if (nextTaskIndex !== -1) {
      setCurrentTaskIndex(nextTaskIndex);
    } else {
       setCurrentTaskIndex(tasks.length - 1); // Stay on last task if all complete
       toast({
        title: "All Tasks Completed!",
        description: "Congratulations! You've finished all available labs.",
        variant: "default",
        duration: 5000,
      });
    }
  }, [tasks, toast]);
  
  const resetTasks = useCallback(() => {
    setTasks(initialTasks.map(task => ({ ...task, completed: false })));
    setCurrentTaskIndex(0);
    localStorage.removeItem(TASKS_STORAGE_KEY);
    toast({
      title: "Lab Reset",
      description: "All tasks have been reset to their initial state.",
      variant: "default",
      duration: 3000,
    });
  }, [toast]);

  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter(task => task.completed).length;
  const progressPercentage = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;

  return {
    tasks,
    activeTask,
    completeTask,
    resetTasks,
    currentTaskIndex,
    setCurrentTaskIndex,
    totalTasks,
    completedTasksCount,
    progressPercentage,
  };
};
  