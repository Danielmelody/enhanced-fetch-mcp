#!/usr/bin/env node

/**
 * Enhanced Fetch MCP Server - Entry point
 */

import { MCPSandboxServer } from './mcp-server.js';

async function main() {
  try {
    const server = new MCPSandboxServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

void main();
