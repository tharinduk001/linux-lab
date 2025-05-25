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
  isTerminalVisible, // New prop: boolean indicating if the terminal tab is active
  // tasks and currentTaskIndex are passed from parent but not directly used here anymore
}) => {
  const terminalRef = useRef(null); // Ref for the div element to host XTerm
  const xtermRef = useRef(null); // Ref to store the XTerm.js Terminal instance
  const fitAddonRef = useRef(null); // Ref to store the FitAddon instance
  const lastOutputLength = useRef(0); // Used to track if we should scroll to bottom

  const handleWindowResize = () => {
    if (isTerminalVisible && fitAddonRef.current && terminalRef.current) { // Added terminalRef.current check here
      requestAnimationFrame(() => {
        try {
          if (fitAddonRef.current && terminalRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
            fitAddonRef.current.fit();
          } else if (terminalRef.current) { // Log only if terminalRef exists but dimensions are zero
            // console.warn("Terminal container has zero dimensions on resize. Skipping fit().",
            //    `Width: ${terminalRef.current.clientWidth}, Height: ${terminalRef.current.clientHeight}`);
          }
        } catch (e) {
          // console.warn("FitAddon fit error on window resize (rAF, dim check):", e);
        }
      });
    }
  };

  useEffect(() => {
    if (isTerminalVisible) {
      if (terminalRef.current && !xtermRef.current) { // Only initialize if visible and not already initialized
        const term = new Terminal({
          cursorBlink: true,
          convertEol: true,
          theme: {
            background: '#0F172A',
            foreground: '#E2E8F0',
            cursor: '#F87171',
            selectionBackground: '#64748B',
            selectionForeground: '#FFFFFF',
            black: '#1E293B',
            red: '#F87171',
            green: '#4ADE80',
            yellow: '#FACC15',
            blue: '#60A5FA',
            magenta: '#F472B6',
            cyan: '#2DD4BF',
            white: '#F1F5F9',
            brightBlack: '#64748B',
            brightRed: '#FB923C',
            brightGreen: '#86EFAC',
            brightYellow: '#FDE047',
            brightBlue: '#93C5FD',
            brightMagenta: '#F0ABFC',
            brightCyan: '#67E8F9',
            brightWhite: '#FFFFFF',
          },
          fontSize: 14,
          fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
          rows: 25,
          scrollback: 1000,
        });

        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        term.loadAddon(fitAddon);
        
        term.open(terminalRef.current);
        xtermRef.current = term; // Store instance

        requestAnimationFrame(() => {
          try {
            if (fitAddonRef.current && terminalRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
              fitAddonRef.current.fit();
            } else if (terminalRef.current) {
              // console.warn("Terminal container has zero dimensions on initial load. Skipping fit().",
              //  `Width: ${terminalRef.current.clientWidth}, Height: ${terminalRef.current.clientHeight}`);
            }
          } catch (e) {
            // console.warn("FitAddon fit error on initial load (rAF, dim check):", e);
          }
        });
        term.focus();

        term.onResize(({ cols, rows }) => {
          if (onData) {
            onData(JSON.stringify({ type: 'resize', cols, rows }));
          }
        });
        // Send initial size
        if (onData) {
            onData(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }

        term.onData(data => {
          if (onData && isConnected) {
            onData(data);
          } else if (!isConnected && xtermRef.current) {
            xtermRef.current.writeln("\r\n[OFFLINE: Input not sent. Waiting for connection...]");
          }
        });

        // Write any buffered initial output upon new terminal creation
        if (initialOutput && initialOutput.length > lastOutputLength.current) {
            xtermRef.current.write(initialOutput.substring(lastOutputLength.current));
            lastOutputLength.current = initialOutput.length; // Update after writing
            xtermRef.current.scrollToBottom();
        } else if (initialOutput === '' && lastOutputLength.current > 0) {
            xtermRef.current.clear();
            lastOutputLength.current = 0;
        }
      }
      
      // Add resize listener if visible and terminal exists
      window.addEventListener('resize', handleWindowResize);
    } else {
      // Terminal is not visible, ensure it's disposed if it was previously visible
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null; // Clear addon ref as well
        lastOutputLength.current = 0; // Reset buffer tracking
      }
      // Remove resize listener if not visible
      window.removeEventListener('resize', handleWindowResize);
    }

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      // Dispose on unmount if instance still exists (e.g. if unmounted while visible)
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null;
        lastOutputLength.current = 0;
      }
    };
  }, [isTerminalVisible, onData, isConnected, initialOutput]); // initialOutput added to re-evaluate if terminal created late

  // Effect for writing dynamic initialOutput if component is already visible and terminal exists
  useEffect(() => {
    if (isTerminalVisible && xtermRef.current) {
      if (initialOutput && initialOutput.length > lastOutputLength.current) {
          xtermRef.current.write(initialOutput.substring(lastOutputLength.current));
          lastOutputLength.current = initialOutput.length;
          xtermRef.current.scrollToBottom();
      } else if (initialOutput === '' && lastOutputLength.current > 0) {
          xtermRef.current.clear();
          lastOutputLength.current = 0;
      }
    }
  }, [initialOutput, isTerminalVisible]); // Re-run if initialOutput changes or visibility changes


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
        {isTerminalVisible ? (
          <div ref={terminalRef} className="h-full w-full" />
        ) : (
          <div className="p-4 text-slate-500 flex items-center justify-center h-full">
            Terminal is hidden. Switch to this tab to activate.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TerminalEmulator;
