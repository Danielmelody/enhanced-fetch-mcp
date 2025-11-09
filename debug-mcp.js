#!/usr/bin/env node

/**
 * MCP Logger - Intercepts and logs all MCP communication
 *
 * This script wraps your MCP server and logs all JSON-RPC messages
 * exchanged between the client and server to a file.
 *
 * Usage:
 *   node debug-mcp.js
 *
 * The server's stdin/stdout are passed through transparently,
 * while all communication is logged to mcp-debug.log
 */

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create log file
const logFile = createWriteStream(join(__dirname, 'mcp-debug.log'), { flags: 'a' });

function log(direction, data) {
  const timestamp = new Date().toISOString();
  const message = `\n[${ timestamp }] ${ direction }\n${ data }\n${ '='.repeat(80) }\n`;
  logFile.write(message);

  // Also log to stderr so it doesn't interfere with stdio
  process.stderr.write(`[${ direction }] ${ data.substring(0, 100) }...\n`);
}

// Start the actual MCP server
const serverPath = join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'] // stdin, stdout, stderr
});

log('INFO', 'MCP Debug Logger started');

// Intercept stdin (client -> server)
process.stdin.on('data', (chunk) => {
  const data = chunk.toString();
  log('CLIENT -> SERVER', data);
  server.stdin.write(chunk);
});

// Intercept stdout (server -> client)
server.stdout.on('data', (chunk) => {
  const data = chunk.toString();
  log('SERVER -> CLIENT', data);
  process.stdout.write(chunk);
});

// Handle process termination
process.stdin.on('end', () => {
  server.stdin.end();
});

server.on('exit', (code) => {
  log('INFO', `MCP Server exited with code ${code}`);
  logFile.end();
  process.exit(code);
});

process.on('SIGINT', () => {
  log('INFO', 'Received SIGINT, shutting down...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  log('INFO', 'Received SIGTERM, shutting down...');
  server.kill('SIGTERM');
});
