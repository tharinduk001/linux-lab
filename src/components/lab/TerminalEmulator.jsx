import React, { useEffect, useRef } from 'react';
import { Terminal as LucideTerminal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const TerminalEmulator = ({ 
  task, // Current task object, used for context if needed (e.g. prompt, though backend handles it)
  onData, // Callback to send data to parent (LabEnvironmentPage) -> (data: string) => void
  initialOutput = '', // Output received from WebSocket via LabEnvironmentPage
  isConnected, // WebSocket connection status
  // tasks and currentTaskIndex are passed from parent but not directly used here anymore
}) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastOutputLength = useRef(0); // Used to track if we should scroll to bottom

  useEffect(() => {
    if (!terminalRef.current) return;

    let termInst; // To store the Xterm instance

    if (!xtermRef.current) {
      termInst = new Terminal({
        cursorBlink: true,
        convertEol: true,
        theme: {
          background: '#0F172A', // Slightly lighter than pure black, slate-900 like
          foreground: '#E2E8F0', // Slate-200 for better readability
          cursor: '#F87171',     // Red-400 for cursor
          selectionBackground: '#64748B', // Slate-500
          selectionForeground: '#FFFFFF',
          black: '#1E293B', // Slate-800
          red: '#F87171',   // Red-400
          green: '#4ADE80', // Green-400
          yellow: '#FACC15',// Yellow-400
          blue: '#60A5FA',  // Blue-400
          magenta: '#F472B6',// Pink-400
          cyan: '#2DD4BF',  // Teal-400
          white: '#F1F5F9', // Slate-100
          brightBlack: '#64748B', // Slate-500
          brightRed: '#FB923C',   // Orange-400
          brightGreen: '#86EFAC',// Green-300
          brightYellow: '#FDE047',// Yellow-300
          brightBlue: '#93C5FD', // Blue-300
          brightMagenta: '#F0ABFC',// Fuchsia-300
          brightCyan: '#67E8F9',  // Cyan-300
          brightWhite: '#FFFFFF', // White
        },
        fontSize: 14,
        fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
        rows: 25,
        scrollback: 1000, // Increase scrollback buffer
      });

      const currentFitAddon = new FitAddon();
      
      xtermRef.current = termInst;
      fitAddonRef.current = currentFitAddon;

      termInst.loadAddon(currentFitAddon);
      termInst.open(terminalRef.current);
      
      try {
        currentFitAddon.fit();
      } catch (e) {
        // console.warn("FitAddon fit error on initial load:", e);
      }
      termInst.focus();

      termInst.onResize(({ cols, rows }) => {
        if (onData) {
          onData(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });
      if (onData) {
         onData(JSON.stringify({ type: 'resize', cols: termInst.cols, rows: termInst.rows }));
      }

      termInst.onData(data => {
        if (onData && isConnected) {
          onData(data);
        } else if (!isConnected && termInst) { // Check termInst exists
            termInst.writeln("\r\n[OFFLINE: Input not sent. Waiting for connection...]");
        }
      });
    } else {
        termInst = xtermRef.current;
        if (fitAddonRef.current) {
            try {
                fitAddonRef.current.fit();
            } catch(e) {
                // console.warn("FitAddon fit error on re-render with existing term:", e);
            }
        }
        termInst.focus();
    }
    
    if (initialOutput && initialOutput.length > lastOutputLength.current) {
        termInst.write(initialOutput.substring(lastOutputLength.current));
        lastOutputLength.current = initialOutput.length;
        termInst.scrollToBottom(); // Scroll to bottom when new output is written
    } else if (initialOutput === '' && lastOutputLength.current > 0) { 
        // Handle buffer reset (e.g. on reconnect and clear)
        termInst.clear(); // Clear terminal if initialOutput is reset
        lastOutputLength.current = 0;
    }


    const handleWindowResize = () => {
      if (fitAddonRef.current) {
        try {
            fitAddonRef.current.fit();
        } catch(e) {
            // console.warn("FitAddon fit error on window resize:", e);
        }
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      fitAddonRef.current = null; 
      lastOutputLength.current = 0; 
    };
  }, [onData, isConnected]); 

  // Effect for writing dynamic initialOutput if component isn't remounted by key
  // This mainly handles ongoing messages from WebSocket
  useEffect(() => {
    if (xtermRef.current && initialOutput && initialOutput.length > lastOutputLength.current) {
        xtermRef.current.write(initialOutput.substring(lastOutputLength.current));
        lastOutputLength.current = initialOutput.length;
        xtermRef.current.scrollToBottom();
    } else if (xtermRef.current && initialOutput === '' && lastOutputLength.current > 0) {
        // This case handles if initialOutput is explicitly cleared by parent
        xtermRef.current.clear();
        lastOutputLength.current = 0;
    }
  }, [initialOutput]);


  return (
    <Card 
      className="h-full flex flex-col bg-slate-900 border-slate-700 backdrop-blur-sm terminal-glow overflow-hidden"
    >
      <CardHeader className="bg-slate-800 p-2 border-b border-slate-700 flex flex-row items-center space-x-2 flex-shrink-0">
        <LucideTerminal className="h-5 w-5 text-sky-400" />
        <CardTitle className="text-sm font-mono text-slate-300">
          Terminal Interface (Status: {isConnected ? 
            <span className="text-green-400">Connected</span> : 
            <span className="text-red-400">Disconnected</span>
          })
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden bg-slate-900">
        <div ref={terminalRef} className="h-full w-full" />
      </CardContent>
    </Card>
  );
};

export default TerminalEmulator;
