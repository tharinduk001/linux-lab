import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { useToast } from "@/components/ui/use-toast";


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
  
  const { toast } = useToast();
  const wsRef = useRef(null);
  const [terminalKey, setTerminalKey] = useState(0); // Used to force TerminalEmulator re-mount
  const [isWsConnected, setIsWsConnected] = useState(false);
  // terminalOutputBuffer stores messages received from WS for TerminalEmulator
  const [terminalOutputBuffer, setTerminalOutputBuffer] = useState('');
  const [isVerifyingTask, setIsVerifyingTask] = useState(false); // For loading state on verify button
  const [wsConnectionStatus, setWsConnectionStatus] = useState('Connecting...'); // 'Connecting...', 'Connected', 'Disconnected', 'Error'


  const connectWebSocket = useCallback(() => {
    // console.log('Attempting to connect WebSocket...');
    setWsConnectionStatus('Connecting...');
    setTerminalOutputBuffer(''); // Clear buffer on new connection attempt
    
    // Ensure previous connection is closed before creating a new one
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
    }

    wsRef.current = new WebSocket('ws://localhost:3001/terminal');
    // setIsWsConnected(false); // This is now handled by wsConnectionStatus

    wsRef.current.onopen = () => {
      // console.log('WebSocket connected from LabEnvironmentPage');
      // setIsWsConnected(true);
      setWsConnectionStatus('Connected');
      setTerminalOutputBuffer(prev => prev + '\r\n[WebSocket Connected]\r\n');
      if (activeTask) {
          sendInitialMessages(activeTask);
      } else {
            sendInitialMessages(null); // Send idle messages
      }
    };

    wsRef.current.onmessage = (event) => {
        const messageData = event.data.toString();
        try {
          const parsedMessage = JSON.parse(messageData);
          if (parsedMessage.type === 'validationResult') {
            setTerminalOutputBuffer(prev => prev + `\r\n[Validation] Command: ${parsedMessage.command}\r\n[Validation] Output: ${parsedMessage.output}\r\n[Validation] Success: ${parsedMessage.success}\r\n`);
            setIsVerifyingTask(false); // Stop loading on verify button
            if (parsedMessage.success) {
              if (activeTask && !activeTask.completed) {
                completeTask(activeTask.id); // This is from useTaskManager
                toast({
                  title: "Task Validated!",
                  description: `"${activeTask.title}" successfully validated and marked complete.`,
                  variant: "success",
                });
              }
            } else {
              toast({
                title: "Validation Failed",
                description: `Command: ${parsedMessage.command}\nOutput: ${parsedMessage.output}`, // Make sure output is concise for toast
                variant: "destructive",
                duration: 9000, // Longer duration for errors with output
              });
            }
            // The backend should ideally send back the prompt after validation.
            // If not, we might need to manually add a prompt here or have TerminalEmulator do it.
            // For now, relying on backend to send complete output including new prompt.
            // if (activeTask) {
            //     setTerminalOutputBuffer(prev => prev + `\r\n${activeTask.terminalSetup?.initialDirectory || '/home/student'}$ `);
            // } else {
            //     setTerminalOutputBuffer(prev => prev + `\r\n/$ `);
            // }

          } else if (parsedMessage.type === 'error') { // Server-side error messages
            setTerminalOutputBuffer(prev => prev + `\r\n[SERVER_ERROR] ${parsedMessage.message}\r\n`);
             toast({
                title: "Server Error",
                description: parsedMessage.message,
                variant: "destructive",
            });
          } else {
            // Regular PTY output
            setTerminalOutputBuffer(prev => prev + messageData);
          }
        } catch (e) {
          // Not a JSON message, treat as direct terminal output from container
          setTerminalOutputBuffer(prev => prev + messageData);
        }
      };

      wsRef.current.onerror = (errorEvent) => {
        console.error('WebSocket error in LabEnvironmentPage:', errorEvent);
        setTerminalOutputBuffer(prev => prev + '\r\n[WebSocket Error - Connection failed. Please try reconnecting.]\r\n');
        // setIsWsConnected(false);
        setWsConnectionStatus('Error');
        toast({
            title: "WebSocket Error",
            description: "Connection to the terminal server failed. Please try reconnecting.",
            variant: "destructive",
        });
      };

      wsRef.current.onclose = (event) => {
        // console.log('WebSocket disconnected from LabEnvironmentPage. Code:', event.code, 'Reason:', event.reason);
        if (event.wasClean) {
            setTerminalOutputBuffer(prev => prev + '\r\n[WebSocket Disconnected]\r\n');
        } else {
            setTerminalOutputBuffer(prev => prev + '\r\n[WebSocket Connection Lost - Please try reconnecting.]\r\n');
        }
        // setIsWsConnected(false);
        setWsConnectionStatus('Disconnected');
         toast({
            title: "WebSocket Disconnected",
            description: "Connection to the terminal server was closed.",
            variant: "warning",
        });
      };
    // }, [activeTask, sendInitialMessages]); // Added sendInitialMessages
    // }, [activeTask, sendInitialMessages, toast]);
  }, [activeTask, completeTask, toast]); // Dependencies for connectWebSocket and its internal logic

  useEffect(() => {
    connectWebSocket(); // Initial connection attempt
    setTerminalKey(prevKey => prevKey + 1); // Force re-mount TerminalEmulator when activeTask changes

    return () => {
      if (wsRef.current) {
        // console.log('Closing WebSocket connection from LabEnvironmentPage cleanup.');
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      // setIsWsConnected(false);
      setWsConnectionStatus('Disconnected');
    };
  }, [activeTask, connectWebSocket]); // connectWebSocket is now memoized with useCallback


  // useCallback for sendInitialMessages to stabilize its reference if used in useEffect deps
  const sendInitialMessages = useCallback((taskForSetup) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          if (taskForSetup && taskForSetup.terminalSetup) { // Ensure taskForSetup and terminalSetup are defined
            const initialMessage = taskForSetup.terminalSetup.message || `Task: ${taskForSetup.title}`;
            wsRef.current.send(JSON.stringify({ type: 'control', payload: `[SYSTEM_INIT] ${initialMessage}`}));
          } else if (taskForSetup) { // Case where terminalSetup might be missing for a valid task
             wsRef.current.send(JSON.stringify({ type: 'control', payload: `[SYSTEM_INIT] Task: ${taskForSetup.title}`}));
          } else { // No active task
             wsRef.current.send(JSON.stringify({ type: 'control', payload: '[SYSTEM_INIT] No active task. Terminal is idle.'}));
          }
      }
  }, []); // Empty dependency array as it doesn't depend on props/state from this component's scope directly


  const handleTerminalInput = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    } else {
      setTerminalOutputBuffer(prev => prev + '\r\n[Offline: Input not sent. WebSocket not connected.]\r\n');
      // Optionally, trigger a reconnect attempt here if desired and not already in progress
      // if (wsConnectionStatus !== 'Connecting...') {
      //   connectWebSocket();
      // }
    }
  }, [/* wsConnectionStatus, connectWebSocket */]); // Dependencies for handleTerminalInput


  const handleVerifyAndComplete = () => {
    if (activeTask && !activeTask.completed) {
      if (wsConnectionStatus !== 'Connected') {
        toast({
          title: "Connection Error",
          description: "WebSocket is not connected. Cannot verify task.",
          variant: "destructive",
        });
        return;
      }
      setIsVerifyingTask(true); // Start loading on verify button
      const validationCommand = activeTask.validationCommand;
      if (!validationCommand) {
        toast({
          title: "No Validation Command",
          description: `Task "${activeTask.title}" does not have an automated validation command. Completing manually.`,
          variant: "warning",
        });
        completeTask(activeTask.id); 
        setIsVerifyingTask(false);
        return;
      }
      
      wsRef.current.send(JSON.stringify({
        type: 'validation',
        command: validationCommand
      }));
      
      // Toast for verification sent is now less prominent, actual result toast is more important
      // toast({
      //   title: "Verification Sent",
      //   description: `Executing: ${validationCommand}`,
      // });
    }
  };

  const ReconnectButton = () => (
    <Button onClick={connectWebSocket} variant="destructive" size="sm" className="mb-2 ml-auto block">
        Reconnect Terminal
    </Button>
  );

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
            <div className="text-xs text-slate-400 mb-1 text-right pr-2">
                WebSocket: <span className={
                    wsConnectionStatus === 'Connected' ? 'text-green-400' : 
                    wsConnectionStatus === 'Connecting...' ? 'text-yellow-400' : 'text-red-400'
                }>{wsConnectionStatus}</span>
                {wsConnectionStatus === 'Disconnected' || wsConnectionStatus === 'Error' ? <ReconnectButton /> : null}
            </div>
             <div className="flex-grow">
                <TerminalEmulator 
                    key={terminalKey} // Force re-mount on task change
                    task={activeTask} 
                    onData={handleTerminalInput} 
                    initialOutput={terminalOutputBuffer} 
                    isConnected={wsConnectionStatus === 'Connected'} 
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
                  disabled={!activeTask || activeTask.completed || wsConnectionStatus !== 'Connected' || isVerifyingTask}
                >
                  {isVerifyingTask ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    <><CheckCircle className="mr-2 h-5 w-5" /> Verify & Complete Task</>
                  )}
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