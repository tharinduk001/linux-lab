// Test script to verify WebSocket and terminal functionality
const WebSocket = require('ws');

console.log('🧪 Testing WebSocket Terminal Connection...');

const ws = new WebSocket('ws://localhost:3001/terminal');

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  
  // Test basic command
  setTimeout(() => {
    console.log('📤 Sending: echo "Hello World"');
    ws.send('echo "Hello World"\n');
  }, 2000);
  
  // Test directory listing
  setTimeout(() => {
    console.log('📤 Sending: ls -la');
    ws.send('ls -la\n');
  }, 4000);
  
  // Test resize command
  setTimeout(() => {
    console.log('📤 Sending resize command');
    ws.send(JSON.stringify({
      type: 'resize',
      rows: 30,
      cols: 100
    }));
  }, 6000);
  
  // Test validation command
  setTimeout(() => {
    console.log('📤 Testing validation: pwd');
    ws.send(JSON.stringify({
      type: 'validation',
      command: 'pwd'
    }));
  }, 8000);
  
  // Close after tests
  setTimeout(() => {
    console.log('🔚 Closing connection');
    ws.close();
  }, 10000);
});

ws.on('message', (data) => {
  const message = data.toString();
  try {
    const parsed = JSON.parse(message);
    console.log('📥 JSON Response:', parsed);
  } catch (e) {
    // Raw terminal output
    process.stdout.write('📥 Terminal: ' + message);
  }
});

ws.on('close', () => {
  console.log('❌ WebSocket disconnected');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});
