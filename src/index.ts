#!/usr/bin/env node

/**
 * Enhanced Fetch MCP Server - Entry point
 */

import { MCPSandboxServer } from './mcp-server.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for CLI arguments
const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  try {
    const packagePath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    console.error(`v${packageJson.version}`);
    process.exit(0);
  } catch (error) {
    console.error('Error reading version');
    process.exit(1);
  }
}

if (args.includes('--help') || args.includes('-h')) {
  console.error('Enhanced Fetch MCP Server');
  console.error('');
  console.error('Usage:');
  console.error('  enhanced-fetch-mcp           Start MCP server');
  console.error('  enhanced-fetch-mcp --version Show version');
  console.error('  enhanced-fetch-mcp --help    Show this help');
  console.error('');
  console.error('Configuration for Claude Code:');
  console.error('  Add to ~/.config/claude/config.json:');
  console.error('  {');
  console.error('    "mcpServers": {');
  console.error('      "enhanced-fetch": {');
  console.error('        "command": "enhanced-fetch-mcp"');
  console.error('      }');
  console.error('    }');
  console.error('  }');
  console.error('');
  console.error('Documentation: See README.md');
  process.exit(0);
}

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
