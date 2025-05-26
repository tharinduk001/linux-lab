import { useState, useRef, useEffect, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import TaskList from "@/components/lab/TaskList";
import XTermTerminal from "@/components/lab/XTermTerminal";
// Removed unused import of TaskInstructions
import { useTaskManager } from "@/hooks/useTaskManager";
import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
// Removed Tabs, TabsContent, TabsList, TabsTrigger imports
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
  // Removed activeTab state

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
          activeTask={activeTask} // Pass activeTask
        />
      </motion.div>

      <motion.div
        className="w-full lg:flex-grow flex flex-col bg-card rounded-lg shadow-md p-4" // Applied styles from TabsContent
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
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

            {/* Verify Task Button and Completed Status START */}
            {activeTask && !activeTask.completed && (
              <Button
                onClick={verifyTask}
                disabled={
                  isVerifyingTask || wsConnectionStatus !== "Connected"
                }
                size="sm" // Match size with other buttons in this row
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
              <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-sm flex items-center h-9"> {/* Adjusted to match button height with h-9 (size sm for button) */}
                <CheckCircle className="h-4 w-4 mr-1" />
                Completed
              </span>
            )}
            {/* Verify Task Button and Completed Status END */}
          </div>
        </div>{" "}
        {/* This div now needs to be flex-grow to fill the space in the flex-col parent */}
        <div className="rounded border flex-grow"> {/* Added flex-grow, removed h-[calc(100%-3rem)] */}
          <XTermTerminal
            key={terminalKey}
            isConnected={wsConnectionStatus === "Connected"}
            onSendCommand={sendCommand}
            outputBuffer={terminalOutputBuffer}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default LabEnvironmentPage;
