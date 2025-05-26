const WebSocket = require('ws');

console.log('Testing WebSocket connection to ws://localhost:3001/terminal');

const ws = new WebSocket('ws://localhost:3001/terminal');

ws.on('open', function open() {
  console.log('✅ WebSocket connection opened successfully');
  
  // Send a simple command after a brief delay
  setTimeout(() => {
    console.log('📤 Sending test command: ls');
    ws.send('ls\n');
  }, 3000);
  
  // Send a second command
  setTimeout(() => {
    console.log('📤 Sending second command: whoami');
    ws.send('whoami\n');
  }, 5000);
});

ws.on('message', function message(data) {
  const message = data.toString();
  console.log('📥 Received:', JSON.stringify(message));
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket connection closed:', code, reason?.toString());
  process.exit(0);
});

// Close after 15 seconds
setTimeout(() => {
  console.log('⏰ Closing connection after timeout');
  ws.close();
}, 15000);
