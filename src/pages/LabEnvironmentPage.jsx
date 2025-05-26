import { useState, useRef, useEffect, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import TaskList from "@/components/lab/TaskList";
import XTermTerminal from "@/components/lab/XTermTerminal";
import TaskInstructions from "@/components/lab/TaskInstructions";
import { useTaskManager } from "@/hooks/useTaskManager";
import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

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
    totalTasks,
  } = useTaskManager();

  const { toast } = useToast();
  const wsRef = useRef(null);
  const [terminalKey, setTerminalKey] = useState(0); // Used to force TerminalEmulator re-mount
  const [terminalOutputBuffer, setTerminalOutputBuffer] = useState("");
  const [isVerifyingTask, setIsVerifyingTask] = useState(false);
  const [wsConnectionStatus, setWsConnectionStatus] = useState("Connecting...");
  const [activeTab, setActiveTab] = useState("instructions");

  const connectWebSocket = useCallback(() => {
    setWsConnectionStatus("Connecting...");
    setTerminalOutputBuffer(""); // Clear buffer on new connection attempt

    // Ensure previous connection is closed before creating a new one
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }

    wsRef.current = new WebSocket("ws://localhost:3001/terminal");

    wsRef.current.onopen = () => {
      setWsConnectionStatus("Connected");
      setTerminalOutputBuffer((prev) => prev + "\r\n[WebSocket Connected]\r\n");
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
        if (parsedMessage.type === "validationResult") {
          setTerminalOutputBuffer(
            (prev) =>
              prev +
              `\r\n[Validation] Command: ${parsedMessage.command}\r\n[Validation] Output: ${parsedMessage.output}\r\n[Validation] Success: ${parsedMessage.success}\r\n`
          );
          setIsVerifyingTask(false); // Stop loading on verify button
          if (parsedMessage.success) {
            if (activeTask && !activeTask.completed) {
              completeTask(currentTaskIndex);
              toast({
                title: "Task Completed!",
                description: `You've successfully completed: ${activeTask.title}`,
                variant: "success",
              });
            }
          } else {
            toast({
              title: "Task Not Completed",
              description: "The validation check failed. Try again.",
              variant: "destructive",
            });
          }
        } else if (parsedMessage.type === "terminalOutput") {
          setTerminalOutputBuffer((prev) => prev + parsedMessage.data);
        }
      } catch (e) {
        // Direct output, not JSON
        setTerminalOutputBuffer((prev) => prev + messageData);
      }
    };

    wsRef.current.onerror = () => {
      setWsConnectionStatus("Error");
      setTerminalOutputBuffer(
        (prev) => prev + "\r\n[WebSocket Connection Error]\r\n"
      );
      toast({
        title: "Connection Error",
        description:
          "Failed to connect to terminal server. Please check if it's running.",
        variant: "destructive",
      });
    };

    wsRef.current.onclose = () => {
      setWsConnectionStatus("Disconnected");
      setTerminalOutputBuffer(
        (prev) => prev + "\r\n[WebSocket Disconnected]\r\n"
      );
    };
  }, [activeTask, completeTask, currentTaskIndex, toast]);

  // Properly manage WebSocket connection
  useEffect(() => {
    connectWebSocket();

    // Cleanup function to close WebSocket when component unmounts
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);
  const sendCommand = useCallback((command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Check if it's a JSON message (like resize) or raw terminal input
      try {
        const parsed = JSON.parse(command);
        // It's a JSON message, send as is
        wsRef.current.send(command);
        return true;
      } catch (e) {
        // It's raw terminal input, send directly
        wsRef.current.send(command);
        return true;
      }
    }
    return false;
  }, []);

  const sendInitialMessages = useCallback((task) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Send task context if task is active
      if (task) {
        wsRef.current.send(
          JSON.stringify({
            type: "setTaskContext",
            taskId: task.id,
            validation: task.validation,
          })
        );
      } else {
        wsRef.current.send(
          JSON.stringify({
            type: "setTaskContext",
            taskId: null,
            validation: null,
          })
        );
      }
      return true;
    }
    return false;
  }, []);

  const resetTerminal = useCallback(() => {
    // Only increment terminal key when we want to force a remount
    setTerminalKey((prev) => prev + 1);
    // Reestablish connection
    connectWebSocket();
  }, [connectWebSocket]);
  const verifyTask = useCallback(() => {
    if (!activeTask || !activeTask.validationCommand) return;

    setIsVerifyingTask(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "validation",
          command: activeTask.validationCommand,
        })
      );
      setTerminalOutputBuffer((prev) => prev + "\r\n[Validating task...]\r\n");
    } else {
      setIsVerifyingTask(false);
      toast({
        title: "Connection Error",
        description: "No connection to terminal server. Please reconnect.",
        variant: "destructive",
      });
    }
  }, [activeTask, toast]);

  // Update task context when active task changes
  useEffect(() => {
    if (wsConnectionStatus === "Connected" && activeTask) {
      sendInitialMessages(activeTask);
    }
  }, [activeTask, sendInitialMessages, wsConnectionStatus]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <motion.div
        className="w-full lg:w-1/4 bg-card rounded-lg shadow-md p-4 flex flex-col"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Linux Lab Tasks</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={resetTasks}
            title="Reset all tasks"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
        <div className="mb-4">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground mt-1">
            {completedTasksCount} of {totalTasks} tasks completed
          </p>
        </div>{" "}
        <TaskList
          tasks={tasks}
          currentTaskIndex={currentTaskIndex}
          onTaskSelect={setCurrentTaskIndex}
        />
      </motion.div>

      <motion.div
        className="w-full lg:w-2/4 flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs
          defaultValue="instructions"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
            <TabsTrigger value="terminal">Terminal</TabsTrigger>
          </TabsList>
          <TabsContent
            value="instructions"
            className="bg-card rounded-lg shadow-md p-4 h-[calc(100vh-13rem)]"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {activeTask ? activeTask.title : "No Task Selected"}
              </h2>
              {activeTask && !activeTask.completed && (
                <Button
                  onClick={verifyTask}
                  disabled={
                    isVerifyingTask || wsConnectionStatus !== "Connected"
                  }
                >
                  {isVerifyingTask ? (
                    <>
                      <span className="mr-2">Verifying...</span>
                      <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Task
                    </>
                  )}
                </Button>
              )}
              {activeTask && activeTask.completed && (
                <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-sm flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Completed
                </span>
              )}
            </div>
            <TaskInstructions task={activeTask} />
          </TabsContent>
          <TabsContent
            value="terminal"
            className="bg-card rounded-lg shadow-md p-4 h-[calc(100vh-13rem)]"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h2 className="text-xl font-bold mr-3">Linux Terminal</h2>
                <div className="flex items-center">
                  <div
                    className={`h-3 w-3 rounded-full mr-2 ${
                      wsConnectionStatus === "Connected"
                        ? "bg-green-500"
                        : wsConnectionStatus === "Connecting..."
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {wsConnectionStatus}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {wsConnectionStatus !== "Connected" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={connectWebSocket}
                  >
                    Reconnect
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetTerminal}
                  title="Reset terminal"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>{" "}
            <div className="h-[calc(100%-3rem)] rounded border">
              <XTermTerminal
                key={terminalKey}
                isConnected={wsConnectionStatus === "Connected"}
                onSendCommand={sendCommand}
                outputBuffer={terminalOutputBuffer}
              />
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default LabEnvironmentPage;
