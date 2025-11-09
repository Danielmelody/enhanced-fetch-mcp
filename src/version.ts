#!/usr/bin/env node

/**
 * Enhanced Fetch MCP - Version check
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const packagePath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

  console.error(`Enhanced Fetch MCP Server v${packageJson.version}`);
  console.error(`Node.js ${process.version}`);
  console.error('');
  console.error('Usage:');
  console.error('  enhanced-fetch-mcp           Start MCP server');
  console.error('  enhanced-fetch-mcp --version Show version');
  console.error('  enhanced-fetch-mcp --help    Show this help');
  console.error('');
  console.error('Configuration:');
  console.error('  Add to ~/.config/claude/config.json:');
  console.error('  {');
  console.error('    "mcpServers": {');
  console.error('      "enhanced-fetch": {');
  console.error('        "command": "enhanced-fetch-mcp"');
  console.error('      }');
  console.error('    }');
  console.error('  }');
} catch (error) {
  console.error('Error reading package.json:', error);
  process.exit(1);
}
