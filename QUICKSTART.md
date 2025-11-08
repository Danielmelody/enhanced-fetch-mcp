# Quick Start Guide

Get started with Enhanced Fetch MCP Sandbox in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js version (needs 18+)
node --version

# Check if Docker is running
docker ps

# If Docker isn't running, start it
# macOS: Open Docker Desktop
# Linux: sudo systemctl start docker
```

## Installation

```bash
cd /Users/danielhu/Projects/enhanced-fetch

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Step 1: Configure Claude Desktop

Edit your Claude Desktop config:

**macOS/Linux:**
```bash
# Open the config file
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```powershell
# Open the config file
notepad %APPDATA%\Claude\claude_desktop_config.json
```

### Step 2: Add the MCP Server

Add this configuration:

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

**Important:** Replace `/Users/danielhu/Projects/enhanced-fetch` with your actual project path!

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the new MCP server.

## Verify Installation

In Claude Desktop, try these commands:

### 1. Check Available Tools

```
What sandbox management tools are available?
```

You should see 8 tools:
- create_sandbox
- execute_in_sandbox
- list_sandboxes
- get_sandbox
- pause_sandbox
- resume_sandbox
- cleanup_sandbox
- get_sandbox_stats

### 2. Create Your First Sandbox

```
Create a sandbox called "test-sandbox" with Node.js 20
```

You should get a response with sandbox details including an ID like `sb_1234567890_abc123`.

### 3. Execute a Command

```
Execute "node --version" in the test-sandbox
```

You should see the Node.js version output.

### 4. List Sandboxes

```
List all active sandboxes
```

You should see your test-sandbox in the list.

### 5. Cleanup

```
Clean up the test-sandbox
```

The sandbox will be stopped and removed.

## Common Use Cases

### Use Case 1: Test Code in Isolation

```
1. Create a sandbox called "code-test"
2. Execute this command in code-test: ["node", "-e", "console.log('Hello World')"]
3. Clean up code-test
```

### Use Case 2: Run Multiple Commands

```
1. Create a sandbox called "multi-cmd" with Node.js
2. Execute ["npm", "init", "-y"] in multi-cmd
3. Execute ["npm", "install", "express"] in multi-cmd
4. Execute ["node", "-e", "const express = require('express'); console.log('Express loaded')"] in multi-cmd
5. Clean up multi-cmd
```

### Use Case 3: Resource-Limited Environment

```
Create a sandbox called "limited" with these settings:
- Memory limit: 256m
- CPU limit: 0.5
- Timeout: 60000 (1 minute)
```

### Use Case 4: Long-Running Process

```
1. Create a sandbox called "long-running" with timeout 600000 (10 minutes)
2. Execute a long-running command in it
3. If needed, pause the sandbox to save resources
4. Resume it later when needed
5. Get resource stats to monitor usage
```

## Troubleshooting

### Issue: "Cannot connect to Docker daemon"

**Solution:**
```bash
# Check Docker status
docker ps

# macOS: Open Docker Desktop
# Linux: Start Docker daemon
sudo systemctl start docker
```

### Issue: "Port already in use"

**Solution:**
This server uses stdio (not HTTP), so port conflicts shouldn't occur. If you see this error, check for other processes.

### Issue: "Image not found"

**Solution:**
```bash
# Manually pull the image
docker pull node:20-alpine

# Or specify a different image when creating sandbox
```

### Issue: "Permission denied"

**Solution:**
```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER

# Then logout and login again
```

### Issue: MCP Server Not Loading

**Solution:**
1. Check the config file path is correct
2. Verify the dist/index.js file exists
3. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\Logs\`

## Advanced Configuration

### Custom Docker Image

```json
{
  "name": "python-sandbox",
  "image": "python:3.11-alpine",
  "memoryLimit": "1g",
  "cpuLimit": 2
}
```

### Environment Variables

```json
{
  "name": "env-sandbox",
  "env": {
    "NODE_ENV": "production",
    "API_KEY": "your-api-key",
    "DEBUG": "true"
  }
}
```

### Custom Working Directory

```json
{
  "name": "custom-workdir",
  "workDir": "/app",
  "image": "node:20-alpine"
}
```

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check out the architecture diagram
- Explore the source code in `src/`
- Customize the default configurations
- Add custom Docker images
- Implement additional monitoring

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review Docker logs: `docker logs <container-id>`
3. Check MCP server output in Claude Desktop logs
4. Verify Docker is running and accessible
5. Ensure all dependencies are installed

## Performance Tips

1. **Reuse sandboxes** when possible instead of creating new ones
2. **Set appropriate timeouts** to prevent resource leaks
3. **Monitor resource usage** with `get_sandbox_stats`
4. **Clean up promptly** when done with sandboxes
5. **Use pause/resume** for long-running workflows

Enjoy automated sandbox management with MCP!
