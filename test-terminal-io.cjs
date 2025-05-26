const WebSocket = require('ws');

console.log('Testing terminal I/O with WebSocket');

const ws = new WebSocket('ws://localhost:3001/terminal');

ws.on('open', function open() {
  console.log('✅ WebSocket connection opened');
  
  // Wait for container to be ready, then send commands
  setTimeout(() => {
    console.log('📤 Sending: pwd');
    ws.send('pwd\r');
  }, 3000);
  
  setTimeout(() => {
    console.log('📤 Sending: ls -la');
    ws.send('ls -la\r');
  }, 4000);
  
  setTimeout(() => {
    console.log('📤 Sending: echo "Hello World"');
    ws.send('echo "Hello World"\r');
  }, 5000);
});

ws.on('message', function message(data) {
  const message = data.toString();
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(message);
    console.log('📋 JSON message:', parsed.type, parsed);
  } catch (e) {
    // Regular terminal output
    console.log('📄 Terminal:', JSON.stringify(message));
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 Connection closed:', code, reason);
  process.exit(0);
});

// Close after 15 seconds
setTimeout(() => {
  console.log('⏰ Closing connection');
  ws.close();
}, 15000);
