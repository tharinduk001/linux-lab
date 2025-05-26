const WebSocket = require('ws');

console.log('Testing WebSocket connection to ws://localhost:3001/terminal');

const ws = new WebSocket('ws://localhost:3001/terminal');

ws.on('open', function open() {
    console.log('✅ WebSocket connection opened successfully');
    console.log('Sending test message...');
    ws.send('echo "Hello World"');
});

ws.on('message', function message(data) {
    console.log('📥 Received:', data.toString());
});

ws.on('error', function error(err) {
    console.log('❌ WebSocket error:', err);
});

ws.on('close', function close(code, reason) {
    console.log('🔌 WebSocket closed. Code:', code, 'Reason:', reason.toString());
});

// Keep the script running for a few seconds
setTimeout(() => {
    console.log('Closing connection...');
    ws.close();
}, 5000);
