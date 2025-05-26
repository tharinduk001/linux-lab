import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './TerminalEmulator.module.css';

const TerminalEmulator = ({ isConnected, onSendCommand, outputBuffer }) => {
  const [inputValue, setInputValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [promptText] = useState('$ ');
  const terminalRef = useRef(null);
  const terminalInputRef = useRef(null);
  const isFirstRender = useRef(true);

  // Force focus on terminal whenever connection changes or component mounts
  useEffect(() => {
    if (terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  }, [isConnected]);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [outputBuffer]);

  // Set initial focus
  useEffect(() => {
    if (isFirstRender.current && terminalInputRef.current) {
      terminalInputRef.current.focus();
      isFirstRender.current = false;
    }
  }, []);

  const handleSendCommand = useCallback(() => {
    if (inputValue.trim() && isConnected) {
      onSendCommand(inputValue);
      setInputValue('');
      setCursorPosition(0);
    }
  }, [inputValue, isConnected, onSendCommand]);

  const handleKeyDown = useCallback((e) => {
    // Prevent default browser shortcuts
    if (e.key === 'Tab' || (e.ctrlKey && e.key === 'l')) {
      e.preventDefault();
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (cursorPosition > 0) {
        setCursorPosition(cursorPosition - 1);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (cursorPosition < inputValue.length) {
        setCursorPosition(cursorPosition + 1);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      setCursorPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setCursorPosition(inputValue.length);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (cursorPosition < inputValue.length) {
        setInputValue(
          inputValue.substring(0, cursorPosition) + 
          inputValue.substring(cursorPosition + 1)
        );
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (cursorPosition > 0) {
        setInputValue(
          inputValue.substring(0, cursorPosition - 1) + 
          inputValue.substring(cursorPosition)
        );
        setCursorPosition(cursorPosition - 1);
      }
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      // Send SIGINT
      if (isConnected) {
        onSendCommand('\x03');
      }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      // Clear screen - implement if needed
    } else if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
      e.preventDefault();
      // Insert character at cursor position
      setInputValue(
        inputValue.substring(0, cursorPosition) + 
        e.key + 
        inputValue.substring(cursorPosition)
      );
      setCursorPosition(cursorPosition + 1);
    }
  }, [cursorPosition, handleSendCommand, inputValue, isConnected, onSendCommand]);

  // Handle terminal clicks to focus input
  const handleTerminalClick = useCallback(() => {
    if (terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  }, []);

  return (
    <div 
      ref={terminalRef}
      className={styles.terminal} 
      onClick={handleTerminalClick}
      onFocus={() => {
        if (terminalInputRef.current) terminalInputRef.current.focus();
      }}
      tabIndex={-1}
    >
      <div className={styles.output}>
        {outputBuffer}
      </div>
      
      <div className={styles.inputLine}>
        <span className={styles.prompt}>{promptText}</span>
        <span className={styles.inputBefore}>{inputValue.substring(0, cursorPosition)}</span>
        <span className={styles.cursor}></span>
        <span className={styles.inputAfter}>{inputValue.substring(cursorPosition)}</span>
        <input
          ref={terminalInputRef}
          className={styles.hiddenInput}
          value={inputValue}
          onChange={() => {}} // Controlled input
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
      
      {!isConnected && (
        <div className={styles.disconnectedMessage}>
          Terminal disconnected. Waiting for connection...
        </div>
      )}
    </div>
  );
};

export default TerminalEmulator;