const WebSocket = require('ws');

console.log('Testing WebSocket connection to ws://localhost:3001/terminal');

const ws = new WebSocket('ws://localhost:3001/terminal');

ws.on('open', function open() {
  console.log('✅ WebSocket connection opened successfully');
  
  // Send a simple command after a brief delay
  setTimeout(() => {
    console.log('📤 Sending test command: ls');
    ws.send('ls\n');
  }, 2000);
  
  // Send a validation command after another delay
  setTimeout(() => {
    console.log('📤 Sending validation command');
    ws.send(JSON.stringify({
      type: 'validation',
      command: 'echo "test validation"'
    }));
  }, 4000);
});

ws.on('message', function message(data) {
  const message = data.toString();
  console.log('📥 Received:', JSON.stringify(message));
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(message);
    console.log('📋 Parsed JSON message:', parsed);
  } catch (e) {
    // Not JSON, just regular terminal output
    console.log('📄 Terminal output:', message);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket connection closed:', code, reason);
  process.exit(0);
});

// Close after 10 seconds
setTimeout(() => {
  console.log('⏰ Closing connection after timeout');
  ws.close();
}, 10000);
