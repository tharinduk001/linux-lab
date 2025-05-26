import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
// Optional: import { WebLinksAddon } from 'xterm-addon-web-links';
// Optional: import { Unicode11Addon } from 'xterm-addon-unicode11';
import 'xterm/css/xterm.css';

const XTermTerminal = ({ isConnected, onSendCommand, outputBuffer }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  // Initialize terminal
  useEffect(() => {
    if (terminalRef.current && !xtermRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        rows: 20, // Default rows, FitAddon will adjust
        theme: { // A basic dark theme
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          selectionBackground: '#555555',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        }
      });

      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      term.loadAddon(fitAddon);
      // Optional: term.loadAddon(new WebLinksAddon());
      // Optional: term.loadAddon(new Unicode11Addon());
      // term.unicode.activeVersion = '11';


      term.open(terminalRef.current);
      fitAddon.fit();

      term.onData(data => {
        if (isConnected && onSendCommand) {
          onSendCommand(data); // Send raw input data
        }
      });
      
      // Example: send resize message if your backend supports it
      // term.onResize(({ cols, rows }) => {
      //   if (isConnected && onSendCommand) {
      //     onSendCommand(JSON.stringify({ type: 'resize', cols, rows }));
      //   }
      // });

      xtermRef.current = term;
    }

    return () => {
      // Optional: If you need to dispose the terminal on component unmount in some cases
      // This might conflict with the terminalKey remount logic in LabEnvironmentPage
      // if (xtermRef.current) {
      //   xtermRef.current.dispose();
      //   xtermRef.current = null;
      // }
    };
  }, [isConnected, onSendCommand]); // terminalRef should ensure it only runs once after mount

  // Handle resizing
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current.parentElement); // Observe parent for size changes
    }
    return () => resizeObserver.disconnect();
  }, []);

  // Write outputBuffer to terminal
  useEffect(() => {
    if (xtermRef.current && outputBuffer) {
      // Check if the last character in outputBuffer is already a newline
      // xterm.js write expects individual lines or complete escape sequences.
      // Simple concatenation might break some sequences if buffer splits them.
      // However, for typical output streams, direct write is often fine.
      xtermRef.current.write(outputBuffer);
    }
  }, [outputBuffer]);
  
  // Clear terminal when outputBuffer is empty (e.g. after reset)
   useEffect(() => {
    if (xtermRef.current && outputBuffer === "") {
      xtermRef.current.clear();
    }
  }, [outputBuffer]);


  // Focus terminal when connected
  useEffect(() => {
    if (isConnected && xtermRef.current) {
      xtermRef.current.focus();
    }
  }, [isConnected]);

  return <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />;
};

export default XTermTerminal;
