# Enhanced Fetch MCP - Automated Sandbox Management

A Model Context Protocol (MCP) server that provides automated Docker-based sandbox management. All sandbox operations (create, manage, pause, resume, cleanup) are handled through MCP tools without manual intervention.

## Features

- **Automated Sandbox Lifecycle**: Create, manage, and cleanup sandboxes entirely through MCP
- **Docker-Based Isolation**: Each sandbox runs in an isolated Docker container
- **Resource Management**: Configure memory limits, CPU limits, and timeouts
- **Automatic Cleanup**: Stale sandboxes are automatically cleaned up
- **Pause/Resume Support**: Pause and resume sandboxes to save resources
- **Resource Monitoring**: Get real-time CPU and memory usage statistics
- **Event System**: Subscribe to sandbox lifecycle events

## Prerequisites

- Node.js 18 or higher
- Docker installed and running
- Docker daemon accessible (usually via `/var/run/docker.sock`)

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Or run in development mode
npm run dev
```

## MCP Configuration

Add this server to your MCP client configuration (e.g., Claude Desktop):

### For macOS/Linux

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "enhanced-fetch-sandbox": {
      "command": "node",
      "args": ["/Users/danielhu/Projects/enhanced-fetch/dist/index.js"]
    }
  }
}
```

### For Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "enhanced-fetch-sandbox": {
      "command": "node",
      "args": ["C:\\Users\\YourName\\Projects\\enhanced-fetch\\dist\\index.js"]
    }
  }
}
```

## Available MCP Tools

### 1. create_sandbox

Create a new isolated sandbox environment.

**Parameters:**
- `name` (required): Name for the sandbox
- `image` (optional): Docker image to use (default: `node:20-alpine`)
- `memoryLimit` (optional): Memory limit (e.g., `512m`, `1g`)
- `cpuLimit` (optional): CPU limit (number of cores)
- `timeout` (optional): Auto-cleanup timeout in milliseconds
- `env` (optional): Environment variables as key-value pairs
- `workDir` (optional): Working directory in container

**Example:**
```json
{
  "name": "my-sandbox",
  "image": "node:20-alpine",
  "memoryLimit": "512m",
  "cpuLimit": 1,
  "timeout": 300000,
  "env": {
    "NODE_ENV": "development"
  }
}
```

### 2. execute_in_sandbox

Execute a command inside a sandbox.

**Parameters:**
- `sandboxId` (required): Sandbox ID
- `command` (required): Command as array of strings

**Example:**
```json
{
  "sandboxId": "sb_1234567890_abc123",
  "command": ["node", "-v"]
}
```

### 3. list_sandboxes

List all active sandboxes.

**Example response:**
```json
[
  {
    "id": "sb_1234567890_abc123",
    "name": "my-sandbox",
    "status": "running",
    "containerId": "abc123def456",
    "createdAt": "2025-01-09T10:00:00.000Z",
    "config": {
      "image": "node:20-alpine",
      "memoryLimit": "512m",
      "cpuLimit": 1
    }
  }
]
```

### 4. get_sandbox

Get detailed information about a specific sandbox.

**Parameters:**
- `sandboxId` (required): Sandbox ID

### 5. pause_sandbox

Pause a running sandbox to save resources.

**Parameters:**
- `sandboxId` (required): Sandbox ID

### 6. resume_sandbox

Resume a paused sandbox.

**Parameters:**
- `sandboxId` (required): Sandbox ID

### 7. cleanup_sandbox

Stop and remove a sandbox.

**Parameters:**
- `sandboxId` (required): Sandbox ID

### 8. get_sandbox_stats

Get resource usage statistics for a sandbox.

**Parameters:**
- `sandboxId` (required): Sandbox ID

**Example response:**
```json
{
  "cpuUsage": 25.5,
  "memoryUsage": 268435456,
  "networkRx": 1024,
  "networkTx": 2048
}
```

## Usage Examples

### Through Claude Desktop

1. **Create a sandbox:**
   ```
   Create a new sandbox called "test-env" with Node.js 20
   ```

2. **Execute commands:**
   ```
   Run "npm --version" in the test-env sandbox
   ```

3. **Check status:**
   ```
   List all active sandboxes
   ```

4. **Cleanup:**
   ```
   Clean up the test-env sandbox
   ```

### Programmatic Usage

```typescript
import { MCPSandboxServer } from './mcp-server.js';

const server = new MCPSandboxServer();
await server.start();
```

## Architecture

```
┌─────────────────────────────────────────┐
│         MCP Client (Claude)             │
└────────────────┬────────────────────────┘
                 │ MCP Protocol (stdio)
┌────────────────▼────────────────────────┐
│         MCP Sandbox Server              │
│  ┌──────────────────────────────────┐   │
│  │     Tool Handlers                │   │
│  │  - create_sandbox                │   │
│  │  - execute_in_sandbox            │   │
│  │  - pause/resume/cleanup          │   │
│  └──────────┬───────────────────────┘   │
│             │                            │
│  ┌──────────▼───────────────────────┐   │
│  │    Sandbox Manager               │   │
│  │  - Lifecycle management          │   │
│  │  - Resource monitoring           │   │
│  │  - Auto-cleanup scheduler        │   │
│  └──────────┬───────────────────────┘   │
└─────────────┼──────────────────────────┘
              │
┌─────────────▼──────────────────────────┐
│         Docker Engine                   │
│  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │Container│ │Container│ │Container│   │
│  │Sandbox 1│ │Sandbox 2│ │Sandbox 3│   │
│  └────────┘  └────────┘  └────────┘   │
└────────────────────────────────────────┘
```

## Key Features Explained

### Automatic Cleanup

Sandboxes are automatically cleaned up in two scenarios:
1. When the configured timeout expires
2. During periodic cleanup checks (every 5 minutes)

### Resource Limits

Each sandbox can have:
- Memory limits (enforced by Docker)
- CPU limits (fractional cores supported)
- Network isolation (bridge mode by default)

### Event System

The sandbox manager emits events that can be monitored:
- `sandbox:created` - When a new sandbox is created
- `sandbox:paused` - When a sandbox is paused
- `sandbox:resumed` - When a sandbox is resumed
- `sandbox:cleaned` - When a sandbox is cleaned up
- `cleanup:stale` - When stale sandboxes are automatically cleaned

## Troubleshooting

### Docker Connection Issues

If you get "Cannot connect to Docker daemon" errors:

```bash
# Check if Docker is running
docker ps

# Check Docker socket permissions (Linux)
sudo chmod 666 /var/run/docker.sock

# Or add your user to docker group
sudo usermod -aG docker $USER
```

### Image Pull Issues

If images fail to pull:

```bash
# Manually pull the default image
docker pull node:20-alpine

# Check Docker Hub connectivity
docker info
```

### Permission Errors

If you get permission errors when creating containers:

```bash
# Check Docker daemon status
systemctl status docker

# Restart Docker daemon
sudo systemctl restart docker
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Watch mode for development
npm run watch
```

## License

MIT
