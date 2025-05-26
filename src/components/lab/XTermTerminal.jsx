import { useRef, useEffect } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

const TerminalEmulator = ({ isConnected, onSendCommand, outputBuffer }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastOutputBufferRef = useRef("");

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    // Create xterm instance
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: "#1a1a1a",
        foreground: "#ffffff",
        cursor: "#ffffff",
        selection: "#3d3d3d",
      },
      allowTransparency: true,
      cols: 80,
      rows: 25,
    });

    // Create fit addon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // Open terminal in the DOM element
    terminal.open(terminalRef.current);

    // Fit to container
    fitAddon.fit();

    // Handle user input
    terminal.onData((data) => {
      if (isConnected && onSendCommand) {
        onSendCommand(data);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddon && terminal) {
        fitAddon.fit();
        if (isConnected && onSendCommand) {
          // Send resize info to server
          onSendCommand(
            JSON.stringify({
              type: "resize",
              cols: terminal.cols,
              rows: terminal.rows,
            })
          );
        }
      }
    };

    // Set up resize observer
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initial fit
    setTimeout(handleResize, 100);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Handle output buffer changes
  useEffect(() => {
    if (
      xtermRef.current &&
      outputBuffer &&
      outputBuffer !== lastOutputBufferRef.current
    ) {
      // Only write the new data, not the entire buffer
      const newData = outputBuffer.slice(lastOutputBufferRef.current.length);
      if (newData) {
        xtermRef.current.write(newData);
      }
      lastOutputBufferRef.current = outputBuffer;
    }
  }, [outputBuffer]);

  // Handle connection status changes
  useEffect(() => {
    if (xtermRef.current) {
      if (!isConnected) {
        xtermRef.current.write(
          "\r\n\x1b[31mTerminal disconnected. Waiting for connection...\x1b[0m\r\n"
        );
      }
    }
  }, [isConnected]);

  return (
    <div
      ref={terminalRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1a1a",
      }}
    />
  );
};

export default TerminalEmulator;
