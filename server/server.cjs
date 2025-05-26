const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Docker = require('dockerode');
const path = require('path');

const port = 3001;
const app = express();
const server = http.createServer(app);

// Enable CORS for the Express app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

const wss = new WebSocket.Server({ 
  server, 
  path: '/terminal'
});

const docker = new Docker();
const imageName = 'interactive-terminal-env';

// Function to build the Docker image if it doesn't exist
async function ensureDockerImage() {
  try {
    await docker.getImage(imageName).inspect();
    console.log(`✅ Docker image "${imageName}" found`);
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      console.log(`🔨 Building Docker image "${imageName}"...`);
      const tar = require('tar-fs');
      const contextPath = path.join(__dirname, '..');
      const tarStream = tar.pack(contextPath);

      try {
        await new Promise((resolve, reject) => {
          docker.buildImage(tarStream, { t: imageName, dockerfile: 'Dockerfile' }, (error, stream) => {
            if (error) return reject(error);
            
            docker.modem.followProgress(stream, (finErr, responses) => {
              if (finErr) return reject(finErr);
              console.log('✅ Docker image built successfully');
              resolve(responses);
            }, (event) => {
              if (event.stream) {
                process.stdout.write(event.stream);
              }
            });
          });
        });
        return true;
      } catch (buildError) {
        console.error('❌ Error building Docker image:', buildError.message);
        return false;
      }
    } else {
      console.error('❌ Error checking Docker image:', err.message);
      return false;
    }
  }
}


wss.on('connection', async (ws) => {
  console.log('🔌 Client connected to WebSocket');
  
  let container;
  let ptyStream;

  try {
    // Ensure Docker image exists
    const imageReady = await ensureDockerImage();
    if (!imageReady) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to prepare Docker image. Please check Docker setup.'
      }));
      ws.close();
      return;
    }

    ws.send('\r\n🔗 Initializing terminal session...\r\n');

    // Create Docker container
    container = await docker.createContainer({
      Image: imageName,
      User: 'student',
      WorkingDir: '/home/student',
      Tty: true,
      Cmd: ['/bin/bash'],
      OpenStdin: true,
      StdinOnce: false,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        AutoRemove: true,
      }
    });

    await container.start();
    console.log(`✅ Container ${container.id.substring(0, 12)} started`);

    // Attach to the container
    ptyStream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      hijack: true,
    });

    // Set initial terminal size
    try {
      await container.resize({ h: 25, w: 80 });
    } catch (e) {
      console.warn('⚠️ Initial resize failed:', e.message);
    }

    ws.send('\r\n✅ Terminal ready! Type commands below:\r\n');

    // Handle incoming messages from client
    ws.on('message', async (message) => {
      try {
        const messageString = message.toString();
        
        // Try to parse as JSON for special commands
        try {
          const parsed = JSON.parse(messageString);
          
          if (parsed.type === 'resize' && container) {
            await container.resize({ 
              h: parsed.rows || 25, 
              w: parsed.cols || 80 
            });
            return;
          }
          
          if (parsed.type === 'validation' && container) {
            const command = parsed.command;
            const exec = await container.exec({
              Cmd: ['bash', '-c', command],
              User: 'student',
              AttachStdout: true,
              AttachStderr: true,
              Tty: false,
            });

            let output = '';
            const execStream = await exec.start({ hijack: true, stdin: false });
            
            execStream.on('data', (chunk) => {
              output += chunk.toString('utf8');
            });
            
            await new Promise(resolve => execStream.on('end', resolve));
            
            const inspectResult = await exec.inspect();
            
            ws.send(JSON.stringify({
              type: 'validationResult',
              success: inspectResult.ExitCode === 0,
              output: output.replace(/\x00/g, '').trim(),
              command: command
            }));
            return;
          }
        } catch (e) {
          // Not JSON, treat as regular terminal input
        }

        // Send regular input to terminal
        if (ptyStream && container) {
          ptyStream.write(messageString);
        }
      } catch (e) {
        console.error('❌ Error processing message:', e);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Error processing command: ' + e.message
          }));        }
      }
    });

    // Handle output from container
    ptyStream.on('data', (chunk) => {
      if (ws.readyState === WebSocket.OPEN) {
        const data = chunk.toString('utf8');
        ws.send(data);
      }
    });

    ptyStream.on('end', () => {
      console.log('📤 PTY stream ended');
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('\r\n🔌 Terminal session ended\r\n');
      }
    });

    // Handle client disconnect
    ws.on('close', async () => {
      console.log('🔌 Client disconnected');
      if (container) {
        try {
          await container.stop().catch(() => {});
          console.log(`🗑️ Container ${container.id.substring(0, 12)} cleaned up`);
        } catch (err) {
          console.error('⚠️ Error cleaning up container:', err.message);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });

  } catch (err) {
    console.error('❌ Failed to start terminal session:', err.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to start terminal: ' + err.message
      }));
      ws.close();
    }
    
    if (container) {
      try {
        await container.stop().catch(() => {});
        await container.remove().catch(() => {});
      } catch (cleanupErr) {
        console.error('⚠️ Error during cleanup:', cleanupErr.message);
      }
    }
  }
});

server.listen(port, () => {
  console.log(`🚀 Server listening on ws://localhost:${port}/terminal`);
  
  // Pre-build the Docker image on startup
  ensureDockerImage().catch(err => {
    console.error('⚠️ Failed to prepare Docker image on startup:', err.message);
  });
});
