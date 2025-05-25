import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Terminal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';


const TerminalEmulator = ({ task, onCommandSuccess, tasks, currentTaskIndex }) => {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [currentDirectory, setCurrentDirectory] = useState('/home/student');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef(null);
  const inputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      const initialMessage = task.terminalSetup?.message || `Task: ${task.title}`;
      setHistory([{ type: 'system', text: initialMessage, dir: task.terminalSetup?.initialDirectory || '/home/student' }]);
      setCurrentDirectory(task.terminalSetup?.initialDirectory || '/home/student');
    } else {
      setHistory([{ type: 'system', text: 'No active task. Terminal is idle.', dir: '/'}]);
      setCurrentDirectory('/');
    }
    setInput('');
    setIsProcessing(false);
  }, [task]);

  useEffect(() => {
    if (scrollAreaRef.current?.scrollBy) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
     if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [history]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const sendCommandToBackend = async (commandString) => {
    setIsProcessing(true);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsProcessing(false);
        
        let output = `command not found: ${commandString}`;
        let newDir = currentDirectory;
        let success = false;
        let taskCompletedByCommand = false;

        if (!task) {
          resolve({ output: "No active task. Cannot execute commands.", newDir, success: false, taskCompletedByCommand });
          return;
        }

        const args = commandString.trim().split(' ');
        const command = args[0];
        const currentTaskDefinition = tasks.find(t => t.id === task.id);

        if (command === 'clear') {
          setHistory([]);
          resolve({ output: null, newDir, success: true, taskCompletedByCommand });
          return;
        }
        if (command === 'pwd') {
          output = currentDirectory;
          success = true;
        } else if (command === 'ls') {
          if (currentDirectory === '/home/student' && task.id === 'task1') {
            output = 'documents\npictures\nDesktop';
          } else if (currentDirectory === '/home/student/documents' && task.id === 'task1') {
            const notesFileExists = tasks.find(t=>t.id ==='task1')?.completed || history.some(h => h.type === 'output' && h.text === 'File notes.txt created.');
            output = notesFileExists ? 'notes.txt' : '';
          } else if (currentDirectory === '/home/student/documents' && (task.id === 'task2' || task.id === 'task3')) {
            output = 'notes.txt';
          } else {
            output = ''; 
          }
          success = true;
        } else if (command === 'cd') {
          const targetDir = args[1];
          if (!targetDir || targetDir === '~') {
            newDir = '/home/student';
            output = `Changed directory to ${newDir}`;
          } else if (targetDir === '..') {
            newDir = currentDirectory.substring(0, currentDirectory.lastIndexOf('/')) || '/';
            if (newDir === '') newDir = '/'; // Ensure root is '/'
            output = `Changed directory to ${newDir}`;
          } else if (targetDir.startsWith('/')) { // Absolute path
            if (targetDir === '/home/student' || targetDir === '/home/student/documents') { // Mock valid absolute paths
                newDir = targetDir;
                output = `Changed directory to ${newDir}`;
            } else {
                output = `cd: no such file or directory: ${targetDir}`;
            }
          } else { // Relative path
            const newPath = (currentDirectory === '/' ? '' : currentDirectory) + '/' + targetDir;
            if (newPath === '/home/student' || newPath === '/home/student/documents') { // Mock valid relative paths
                newDir = newPath;
                output = `Changed directory to ${newDir}`;
            } else {
                output = `cd: no such file or directory: ${targetDir}`;
            }
          }
          success = true;
        } else if (command === 'touch' && args[1] === 'notes.txt' && currentDirectory === '/home/student/documents' && task.id === 'task1') {
          output = 'File notes.txt created.';
          if(currentTaskDefinition && currentTaskDefinition.validationCommand.includes('ls /home/student/documents | grep notes.txt')) {
            taskCompletedByCommand = true;
          }
          success = true;
        } else if (command === 'mkdir' && args[1] === 'notes.txt' && currentDirectory === '/home/student/documents' && task.id === 'task1') { 
          output = 'mkdir: notes.txt: Not a directory (Hint: use touch to create files)';
          success = false;
        } else if (commandString === 'cat /home/student/documents/notes.txt' && task.id === 'task3') {
          output = 'Hello, Terminal!';
          if (currentTaskDefinition && currentTaskDefinition.validationCommand.includes('cat /home/student/documents/notes.txt | grep "Hello, Terminal!"')) {
            taskCompletedByCommand = true;
          }
          success = true;
        } else if (commandString.startsWith('nano') && args[1] === 'notes.txt' && task.id === 'task3') {
          output = `Simulating nano editor for notes.txt...\n(In a real scenario, you'd edit the file. For this lab, we'll assume you added "Hello, Terminal!")\n(Type 'cat /home/student/documents/notes.txt' to verify or click 'Verify & Complete')`;
          success = true;
        } else if (commandString === 'chmod 400 notes.txt' && currentDirectory === '/home/student/documents' && task.id === 'task2') {
          output = 'Permissions for notes.txt changed.';
          if(currentTaskDefinition && currentTaskDefinition.validationCommand.includes('stat -c %a /home/student/documents/notes.txt | grep 400')) {
            taskCompletedByCommand = true;
          }
          success = true;
        }

        if (currentTaskDefinition && commandString === currentTaskDefinition.validationCommand) {
            output = currentTaskDefinition.successMessage || 'Command executed successfully and matches validation.';
            taskCompletedByCommand = true; // Ensure task completion if validation command is directly entered
            success = true;
        }
        
        resolve({ output, newDir, success, taskCompletedByCommand });
      }, 500); 
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const commandText = input;
    const newHistoryEntry = { type: 'input', text: commandText, dir: currentDirectory };
    
    setHistory(prev => [...prev, newHistoryEntry]);
    setInput(''); 

    toast({
      title: "Connecting to Lab Environment...",
      description: "Please wait while we process your command. This is a placeholder for real backend integration.",
      variant: "default",
    });

    const { output, newDir, success, taskCompletedByCommand } = await sendCommandToBackend(commandText);
    
    setCurrentDirectory(newDir);

    const outputEntries = output ? output.split('\n').map(line => ({ type: success ? 'output' : 'error', text: line, dir: newDir })) : [];
    setHistory(prev => [...prev, ...outputEntries]);

    if (taskCompletedByCommand && onCommandSuccess) {
      onCommandSuccess();
    }
  };


  return (
    <Card 
      className="h-full flex flex-col bg-black/80 border-slate-700 backdrop-blur-sm terminal-glow overflow-hidden"
      onClick={() => inputRef.current?.focus()}
    >
      <CardHeader className="bg-slate-900/50 p-2 border-b border-slate-600 flex flex-row items-center space-x-2 flex-shrink-0">
        <Terminal className="h-5 w-5 text-green-400" />
        <CardTitle className="text-sm font-mono text-slate-300">Lab Terminal (Frontend Simulation)</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full p-3 font-mono text-sm">
          {history.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={item.type === 'error' ? 'text-red-400' : 'text-green-300'}
            >
              {item.type === 'input' && (
                <div className="flex">
                  <span className="text-sky-400">{item.dir}$ </span>
                  <span className="ml-2 text-slate-200">{item.text}</span>
                </div>
              )}
              {item.type === 'output' && <span>{item.text}</span>}
              {item.type === 'error' && <span>{item.text}</span>}
              {item.type === 'system' && <span className="text-yellow-400">[SYSTEM] {item.text}</span>}
            </motion.div>
          ))}
          {isProcessing && (
            <motion.div 
              className="text-amber-400 flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </motion.div>
          )}
          <div className="h-2"></div>
        </ScrollArea>
      </CardContent>
      <form onSubmit={handleSubmit} className="p-2 border-t border-slate-600 bg-slate-900/50 flex-shrink-0">
        <div className="flex items-center">
          <span className="text-sky-400 font-mono text-sm">{currentDirectory}$</span>
          <ChevronRight className="h-4 w-4 text-sky-400 mx-1" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            className="flex-grow bg-transparent text-slate-200 focus:outline-none font-mono text-sm p-1"
            placeholder={isProcessing ? "Processing..." : "Type your command here..."}
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            disabled={!task || (task.completed && currentTaskIndex === (tasks?.length || 0) -1) || isProcessing}
          />
        </div>
      </form>
    </Card>
  );
};

export default TerminalEmulator;
