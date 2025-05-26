import { useState, useEffect, useCallback } from 'react';
import { initialTasks as tasksData } from '@/data/tasks.js';

export const useTaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  
  // Initialize tasks from data
  useEffect(() => {
    const initialTasks = tasksData.map(task => ({
      ...task,
      completed: false
    }));
    setTasks(initialTasks);
    
    // Try to load from localStorage
    const savedTasks = localStorage.getItem('linuxLabTasks');
    const savedIndex = localStorage.getItem('linuxLabCurrentTaskIndex');
    
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks);
      } catch (e) {
        console.error('Failed to parse saved tasks', e);
      }
    }
    
    if (savedIndex) {
      try {
        const parsedIndex = parseInt(savedIndex, 10);
        setCurrentTaskIndex(parsedIndex);
      } catch (e) {
        console.error('Failed to parse saved task index', e);
      }
    }
  }, []);
  
  // Save to localStorage when tasks or index change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('linuxLabTasks', JSON.stringify(tasks));
      localStorage.setItem('linuxLabCurrentTaskIndex', currentTaskIndex.toString());
    }
  }, [tasks, currentTaskIndex]);
  
  const activeTask = tasks.length > 0 ? tasks[currentTaskIndex] : null;
  
  const completeTask = useCallback((taskIndex) => {
    setTasks(prevTasks => {
      const newTasks = [...prevTasks];
      if (newTasks[taskIndex]) {
        newTasks[taskIndex] = { ...newTasks[taskIndex], completed: true };
      }
      return newTasks;
    });
    
    // Advance to next task if available
    if (taskIndex < tasks.length - 1) {
      setCurrentTaskIndex(taskIndex + 1);
    }
  }, [tasks.length]);
  
  const resetTasks = useCallback(() => {
    const resetTasks = tasksData.map(task => ({
      ...task,
      completed: false
    }));
    setTasks(resetTasks);
    setCurrentTaskIndex(0);
  }, []);
  
  // Calculate progress
  const completedTasksCount = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 
    ? (completedTasksCount / totalTasks) * 100 
    : 0;
  
  return {
    tasks,
    activeTask,
    completeTask,
    resetTasks,
    currentTaskIndex,
    setCurrentTaskIndex,
    progressPercentage,
    completedTasksCount,
    totalTasks
  };
};