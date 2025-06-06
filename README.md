# Linux Lab

Linux Lab is a web application that provides users with an interactive terminal environment directly in their browser. Each session is isolated within a Docker container, offering a secure and sandboxed Linux command-line experience. This tool is designed for educational purposes, development tasks, or any scenario requiring temporary access to a Linux shell without local setup.

## Key Features

- **Interactive Web Terminal:** Access a Linux shell directly within your web browser.
- **Isolated Environments:** Each user session runs in a separate Docker container for security and isolation.
- **Real-time Interaction:** Leverages WebSockets for instant communication between the browser and the server-side terminal process.
- **Customizable Environment:** The terminal environment is built from a Dockerfile, allowing for customization of installed tools and settings.
- **On-Demand Image Building:** The required Docker image for the terminal environment is automatically built if not already present on the host.
- **Responsive Terminal:** Supports terminal resizing to fit the user's browser window.
- **Command Validation:** Includes a mechanism for validating commands executed within the terminal (as seen in `server.js`).

## Tech Stack

- **Frontend:**
  - React
  - Vite
- **Backend:**
  - Node.js
  - Express.js
- **Real-time Communication:**
  - WebSockets (using the `ws` library)
- **Containerization & Orchestration:**
  - Docker (for creating isolated terminal environments)
  - Dockerode (Node.js library for interacting with the Docker API)

## Prerequisites

Before you begin, ensure you have the following software installed on your local machine:

- **Node.js:** Version `20.19.1` is recommended (specified in `.nvmrc`). Required for running the JavaScript runtime, npm (Node Package Manager), and the backend server. Download from [nodejs.org](https://nodejs.org/).
- **npm:** Comes bundled with Node.js. Used for managing project dependencies.
- **Docker:** Necessary for creating and managing the containerized terminal environments.
  - For Windows and macOS: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - For Linux: [Docker Engine](https://docs.docker.com/engine/install/)

## Local Development Setup

Follow these steps to get the Linux Lab application running on your local machine:

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd linux-lab
    ```
    *(Replace `<repository-url>` with the actual URL of this repository)*

2.  **Install Dependencies:**
    Install project dependencies for both the frontend and backend.
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    - Ensure **Docker is running** on your system. The backend server relies on Docker to create and manage terminal environments.
    - The application primarily uses the Docker environment specified in the `Dockerfile` for terminal sessions. No additional specific `.env` file for server configuration (like API keys or database URLs) is explicitly required by the provided server code. However, ensure that your Docker host configuration (e.g., `DOCKER_HOST` environment variable or the default Docker socket path like `/var/run/docker.sock` on Linux) is correctly set up so that `dockerode` can connect to your Docker daemon.

4.  **Running the Application:**
    You'll need to run the backend server and the frontend development server in separate terminals.

    *   **Start the Backend Server:**
        This server handles WebSocket connections and Docker container management.
        ```bash
        npm run start:server
        ```
        The backend server will be available at `http://localhost:3001`.

    *   **Start the Frontend Development Server:**
        This command starts the Vite development server for the React frontend.
        ```bash
        npm run dev
        ```
        The frontend will usually be accessible at `http://localhost:5173`. Vite will display the correct URL in your terminal upon startup.

    Once both servers are running, open the frontend URL in your web browser to use the application.

## Building for Production

To create a production-ready build of the frontend application, run the following command:

```bash
npm run build
```

This command invokes Vite's build process, which:
- Bundles the React application and its dependencies.
- Optimizes the assets (CSS, JavaScript, images) for performance.
- Generates static files in the `dist/` directory (by default for Vite projects).

The contents of the `dist/` directory can then be deployed to any static web hosting service or served by your backend/reverse proxy.

## Deployment

Here are two primary strategies for deploying the Linux Lab application. The choice depends on your infrastructure and operational preferences.

### 1. Dockerized Cloud Deployment (Recommended)

This approach involves containerizing the entire application (Node.js backend + static frontend assets) and deploying it to a cloud platform that supports Docker containers.

**Important Note on Dockerfiles:**
- The existing `Dockerfile` in the root of this project is for the *interactive terminal environment* that the Node.js server spawns. It is **not** for deploying the application server itself.
- You will need to create a new `Dockerfile` for the main application. This new Dockerfile will package the Node.js server and the pre-built static frontend assets from the `dist/` folder.

**Conceptual Application `Dockerfile`:**

```dockerfile
# Stage 1: Build frontend assets
FROM node:20.19.1-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Setup production environment for Node.js server
FROM node:20.19.1-alpine
WORKDIR /app
COPY package*.json ./
# Install production dependencies only
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY server ./server
# Copy the Dockerfile for the terminal environment
COPY Dockerfile ./Dockerfile

# Expose port for the server
EXPOSE 3001
CMD ["node", "server/server.js"]
```
*(Note: This Dockerfile assumes `server.js` is configured to serve static files from `../dist` or that you adjust paths accordingly. You might also need to ensure the `Dockerfile` for the terminal environment is accessible within this application container if `server.js` reads it directly, or pre-build and push the terminal image to a registry.)*

**Deployment Steps:**

1.  **Build the Application Image:**
    Use the new application `Dockerfile` (like the example above) to build your application image:
    ```bash
    docker build -t your-username/linux-lab-app .
    ```

2.  **Push to Container Registry:**
    Push the built image to a container registry:
    -   Docker Hub: `docker push your-username/linux-lab-app`
    -   Google Container Registry (GCR)
    -   Amazon Elastic Container Registry (ECR)
    -   Azure Container Registry (ACR)

3.  **Deploy to Cloud Platform:**
    Deploy the image to your chosen cloud service:
    -   **Google Cloud Run:** A fully managed serverless platform.
    -   **AWS ECS (Elastic Container Service) / EKS (Elastic Kubernetes Service):** For more complex orchestration.
    -   **Azure Container Instances / AKS (Azure Kubernetes Service):** Similar options on Azure.

    **Critical Consideration for Docker Access:** The deployed application container (running `server.js`) needs access to a Docker daemon to spawn the interactive terminal containers.
    -   This often involves mounting the host's Docker socket (e.g., `/var/run/docker.sock`) into the application container. **This has significant security implications and should be done with caution, as it gives the container root-level access to the host's Docker daemon.**
    -   Some managed services might offer more secure ways to achieve this, or you might explore Docker-in-Docker (DinD) solutions, though DinD can be complex and have its own drawbacks.
    -   Ensure the service account or permissions for your deployed container allow it to interact with the Docker API.

### 2. Manual/Traditional Deployment

This method involves setting up the frontend and backend components separately on a server or virtual machine.

1.  **Build Frontend Assets:**
    On your local machine or a build server:
    ```bash
    npm run build
    ```
    This will generate the static frontend files in the `dist/` directory.

2.  **Deploy Static Frontend Assets:**
    Upload the contents of the `dist/` directory to:
    -   A static hosting service (e.g., Netlify, Vercel, GitHub Pages).
    -   Cloud storage services configured for web hosting (e.g., AWS S3 + CloudFront, Google Cloud Storage, Azure Blob Storage).
    -   A traditional web server like Nginx or Apache on your server.

3.  **Backend Server Setup:**
    On your server/VM:
    a.  **Install Node.js and npm:** Ensure a compatible version (see `.nvmrc`) is installed.
    b.  **Install Docker:** Ensure Docker is installed, running, and the user running the Node.js application has permissions to interact with it.
    c.  **Copy Application Files:** Copy the `server/` directory, `package.json`, `package-lock.json`, and the `Dockerfile` (for the terminal environment) to your server.
    d.  **Install Dependencies:**
        ```bash
        cd /path/to/your/app
        npm install --omit=dev
        ```
    e.  **Run the Server:**
        Start the Node.js backend server (`server/server.js`). It's highly recommended to use a process manager like PM2 to keep it running:
        ```bash
        pm2 start server/server.js --name linux-lab-backend
        pm2 startup # To ensure it restarts on server reboot
        pm2 save
        ```

4.  **Set Up a Reverse Proxy (e.g., Nginx, Apache):**
    A reverse proxy is crucial for:
    -   Serving the static frontend assets (if not using a dedicated static hosting service).
    -   Proxying requests to the backend Node.js server, especially WebSocket connections.
    -   Handling SSL/TLS termination (HTTPS).
    -   Potentially load balancing if you scale.

    **Example Nginx Configuration Snippet:**
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com;

        # Redirect HTTP to HTTPS (recommended)
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL Certificates
        ssl_certificate /etc/nginx/ssl/yourdomain.com.crt;
        ssl_certificate_key /etc/nginx/ssl/yourdomain.com.key;

        # Frontend static files
        location / {
            root /var/www/html/linux-lab/dist; # Path to your deployed dist folder
            try_files $uri $uri/ /index.html;
        }

        # Backend WebSocket for the terminal
        location /terminal {
            proxy_pass http://localhost:3001; # Assuming Node.js server runs on port 3001
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Other API endpoints if any (example)
        # location /api {
        #     proxy_pass http://localhost:3001;
        #     proxy_set_header Host $host;
        #     # ... other proxy headers
        # }
    }
    ```
    Ensure your Nginx/Apache configuration is appropriate for your setup and security requirements.

## Project Structure

Here's an overview of the key directories and files in the project:

```
linux-lab/
├── server/               # Backend Node.js application (Express, WebSockets, Docker integration)
│   └── server.js         # Main backend server file
├── src/                  # Frontend React application source code
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── App.jsx           # Main React application component
│   └── main.jsx          # Frontend entry point
├── public/               # Static assets directly served by the frontend
│   └── .htaccess         # Configuration for Apache (if used for serving static files)
├── Dockerfile            # Defines the Docker image for the interactive Linux terminal environment
├── package.json          # Project metadata, dependencies, and npm scripts
├── vite.config.js        # Configuration for Vite (frontend build tool)
├── tailwind.config.js    # Configuration for Tailwind CSS
├── .nvmrc                # Specifies the Node.js version for the project
└── README.md             # This file!
```

- **`server/`**: Contains the backend Node.js application, powered by Express.js. It handles WebSocket connections for the interactive terminal and uses `dockerode` to manage Docker containers for user sessions. Key file: `server.js`.
- **`src/`**: Houses all the frontend React application code. This includes components (e.g., `components/`), potentially pages, custom hooks (e.g., `hooks/`), the main application component (`App.jsx`), and the frontend entry point (`main.jsx`).
- **`public/`**: Stores static assets that are copied directly to the build output directory without processing by Vite. This typically includes `index.html` (though Vite manages its injection), favicons, etc. The `.htaccess` file suggests potential use with Apache web server for serving these files in some setups.
- **`Dockerfile`**: This file defines the Docker image used to create the isolated Linux terminal environments for each user. *This is distinct from a Dockerfile you might create to containerize the entire application for deployment (as discussed in the Deployment section).*
- **`package.json`**: Standard Node.js manifest file. It lists project dependencies (for both frontend and backend), development dependencies, and defines `npm` scripts for common tasks like starting development servers (`npm run dev`, `npm run start:server`), building the frontend (`npm run build`), etc.
- **`vite.config.js`**: Configuration file for Vite, the build tool and development server used for the React frontend.
- **`tailwind.config.js`**: Configuration file for Tailwind CSS, a utility-first CSS framework used for styling the application.
- **`.nvmrc`**: Specifies the recommended version of Node.js (`20.19.1`) to use for this project, helping to ensure a consistent development environment.

## Contributing

Contributions are welcome! If you'd like to contribute to Linux Lab, please follow these general guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name` or `git checkout -b fix/your-bug-fix`.
3.  Make your changes and commit them with clear, descriptive messages.
4.  Push your changes to your fork.
5.  Submit a pull request to the main repository.

Please ensure your code adheres to the existing style and that any new features are well-tested.

*(Further details on development workflow, coding standards, and issue tracking can be added here by the project maintainers.)*

## License

This project is currently unlicensed.

*(Project maintainers should choose an appropriate open-source license (e.g., MIT, Apache 2.0, GPL) and add it here. A `LICENSE` file containing the full license text should also be added to the repository.)*
