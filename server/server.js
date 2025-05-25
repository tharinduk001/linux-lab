// ...existing code...
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Docker = require('dockerode');
// ...existing code...

const port = 3001;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/terminal' });

const docker = new Docker(); // Defaults to /var/run/docker.sock or DOCKER_HOST
const imageName = 'interactive-terminal-env'; // Name for our custom image
const dockerfilePath = '.'; // Assuming Dockerfile is in the project root

// Function to build the Docker image
async function buildImage(ws) { // Pass WebSocket to send progress
  try {
    // console.log(`Attempting to find or build Docker image: ${imageName}`);
    await docker.getImage(imageName).inspect();
    // console.log(`Image "${imageName}" found locally.`);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(`\r\n[Server] Image "${imageName}" found locally.\r\n`);
    }
  } catch (err) {
    if (err.statusCode === 404) {
      const buildMsg = `\r\n[Server] Image "${imageName}" not found. Attempting to build...\r\nThis may take a few moments.\r\n`;
      // console.log(buildMsg);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(buildMsg);
      }
      
      const tar = require('tar-fs');
      const path = require('path');
      // Ensure context is project root where Dockerfile is located
      const contextPath = path.join(__dirname, '..'); 
      const tarStream = tar.pack(contextPath);

      try {
        await new Promise((resolve, reject) => {
          docker.buildImage(tarStream, { t: imageName, dockerfile: 'Dockerfile' }, (error, stream) => {
            if (error) return reject(error);
            docker.modem.followProgress(stream, (finErr, responses) => {
              if (finErr) {
                return reject(finErr);
              }
              // console.log('Image built successfully:', responses);
              if (ws && ws.readyState === WebSocket.OPEN) {
                 ws.send('\r\n[Server] Image built successfully.\r\n');
              }
              resolve(responses);
            }, 
            (event) => {
              // Send simplified progress to client
              if (ws && ws.readyState === WebSocket.OPEN && event.stream && !event.status) {
                 // ws.send(`[Build] ${event.stream.replace(/\n$/, '')}\r\n`);
              } else if (ws && ws.readyState === WebSocket.OPEN && event.status) {
                 // ws.send(`[Build Status] ${event.status}\r\n`);
              }
              // console.log(event.stream || event.status); 
            });
          });
        });
      } catch (buildError) {
        const errorMsg = `\r\n[Server] Error building Docker image: ${buildError.message}\r\nPlease ensure Docker is running and the Dockerfile is correctly placed.\r\n`;
        console.error(errorMsg);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(errorMsg);
        }
        throw buildError; // Propagate error to stop connection attempt
      }
    } else {
      // Other error checking for image (not 404)
      const errorMsg = `\r\n[Server] Error checking for Docker image: ${err.message}\r\n`;
      console.error(errorMsg);
       if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(errorMsg);
       }
      throw err;
    }
  }
}


wss.on('connection', async (ws) => {
  // console.log('Client connected to WebSocket');
  ws.send('\r\n[Server] WebSocket connection established. Initializing terminal session...\r\n');

  let container;

  try {
    await buildImage(ws); // Pass ws to buildImage for progress updates

    // console.log('Creating Docker container...');
    ws.send('\r\n[Server] Creating Docker container...\r\n');
    container = await docker.createContainer({
      Image: imageName,
      User: 'student',
      WorkingDir: '/home/student',
      Tty: true, // Important for interactive shell
      Cmd: ['/bin/bash', '-l'], // '-l' to simulate a login shell, sources .bashrc etc.
      OpenStdin: true,
      StdinOnce: false, // Keep stdin open
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: { 
        AutoRemove: true, // Automatically remove container when it exits
        // Example of resource limits:
        // CpuShares: 512, // Relative CPU shares (default 1024)
        // Memory: 268435456, // Memory limit in bytes (e.g., 256MB)
      }
    });

    await container.start();
    // console.log(`Container ${container.id} started`);
    ws.send(`\r\n[Server] Docker container ${container.id.substring(0,12)} started.\r\n`);

    const ptyStream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
    });

    // Initial resize to sensible defaults or based on client hint if available
    // This should ideally come from an initial client message after connection.
    // For now, using common defaults.
    try {
        await container.resize({ h: 25, w: 80 });
    } catch (e) {
        // console.warn("Initial container resize failed:", e.message);
    }


    ws.on('message', async (message) => {
      try {
        const messageString = message.toString();
        let parsedMessage;
        try {
          parsedMessage = JSON.parse(messageString);
        } catch (e) { /* Not a JSON message, treat as regular input */ }

        if (parsedMessage && parsedMessage.type === 'validation') {
          // console.log(`Received validation command: ${parsedMessage.command}`);
          if (container) {
            const command = parsedMessage.command;
            const exec = await container.exec({
              Cmd: ['bash', '-c', command],
              User: 'student',
              AttachStdout: true,
              AttachStderr: true,
              Tty: false, // No TTY for exec, we just want output
            });

            let output = '';
            const execStream = await exec.start({ hijack: true, stdin: false });
            
            // Collect output from execStream
            execStream.on('data', chunk => output += chunk.toString('utf8'));
            // Ensure all data is read before inspecting
            await new Promise(resolve => execStream.on('end', resolve));

            const inspectResult = await exec.inspect();
            const exitCode = inspectResult.ExitCode;

            // console.log(`Validation command output: ${output.trim()}`);
            // console.log(`Validation command exit code: ${exitCode}`);

            ws.send(JSON.stringify({
              type: 'validationResult',
              success: exitCode === 0,
              output: output.trim(), // Send trimmed output
              command: command
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'validationResult',
              success: false,
              output: '[Server] Container not available for validation.',
              command: parsedMessage.command
            }));
          }
        } else if (parsedMessage && parsedMessage.type === 'resize') {
          if (container && parsedMessage.cols && parsedMessage.rows) {
            try {
              await container.resize({ h: parsedMessage.rows, w: parsedMessage.cols });
              // console.log(`Resized container ${container.id} to ${parsedMessage.cols}x${parsedMessage.rows}`);
            } catch (resizeError) {
              // console.error(`Error resizing container ${container.id}:`, resizeError.message);
            }
          }
        } else if (parsedMessage && parsedMessage.type === 'control') { // New handler
          // Optional: Log the control message on the server for debugging
          // console.log(`[Server] Received control message payload: ${parsedMessage.payload}`);
          // Currently, we don't need to send anything back or do more.
        } else { // Regular terminal input
          if (ptyStream && container.id) { // Check if stream and container are still valid
            ptyStream.write(messageString); // Send raw string or buffer
          } else {
            // console.error('PTY stream or container not available for writing.');
             ws.send(JSON.stringify({type: 'error', message: '[Server] PTY stream not available. Cannot process input.'}));
          }
        }
      } catch (e) {
        console.error('[Server] Error processing message or writing to container stream:', e);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: '[Server] Error processing message: ' + e.message }));
        }
      }
    });

    ptyStream.on('data', (chunk) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk.toString('utf8'));
      }
    });
    ptyStream.on('end', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('\r\n[Server] Container PTY stream ended.\r\n');
      }
      // console.log('Container PTY stream ended');
    });

    ws.on('close', async (code, reason) => {
      // console.log(`Client disconnected. Code: ${code}, Reason: ${reason}`);
      if (container) {
        try {
          // console.log(`Attempting to stop container ${container.id}...`);
          // Container should stop automatically due to AutoRemove:true and bash exiting.
          // If not using AutoRemove, or if bash doesn't exit, explicit stop/remove is needed.
          // await container.stop().catch(e => console.error(`Error stopping container ${container.id} on close:`, e.message));
          // await container.remove().catch(e => console.error(`Error removing container ${container.id} on close:`, e.message));
          // console.log(`Container ${container.id} cleanup attempted.`);
        } catch (err) {
          // console.error(`Error during container cleanup for ${container.id}:`, err.message);
        }
      }
      container = null; // Clear container reference
    });

    ws.on('error', (error) => {
      console.error('[Server] WebSocket error:', error.message);
      // Container cleanup is usually handled by the 'close' event which follows 'error'
    });

  } catch (err) {
    const errorMsg = `[Server] Failed to start terminal session: ${err.message}\r\n`;
    console.error(errorMsg.replace(/\r\n/g, ' ')); // Log without newlines for cleaner server logs
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({type: 'error', message: errorMsg}));
      ws.close();
    }
    if (container) { // Ensure cleanup even if only partially started
      try {
        // console.log(`Cleaning up partially started container ${container.id}`);
        await container.stop().catch(e => {/*ignore*/});
        await container.remove().catch(e => {/*ignore*/});
      } catch (cleanupErr) {
        // console.error('Error during cleanup after session failure:', cleanupErr.message);
      }
    }
  }
});

server.listen(port, () => {
  // console.log(`Server with Docker terminal backend listening on ws://localhost:${port}/terminal`);
  // Build image on startup without ws object, just to have it ready or log failure.
  buildImage(null).catch(err => {
    console.error("[Server Startup] Initial image build/check failed. The server will run, but terminal sessions may fail until Docker image issue is resolved.", err.message);
  });
});
