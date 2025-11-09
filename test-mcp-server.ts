/**
 * Test MCP Server Startup and Tool Verification
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface TestResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const symbol = result.passed ? '✓' : '✗';
  console.log(`${symbol} ${result.message}`);
  if (result.details) {
    Object.entries(result.details).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }
}

async function testMCPServerStartup(): Promise<void> {
  console.log('=== Testing MCP Server Startup ===\n');

  return new Promise((resolve, reject) => {
    let serverProcess: ChildProcess | null = null;
    let output = '';
    let errorOutput = '';
    let startupTimeout: NodeJS.Timeout;

    try {
      // Start the MCP server
      serverProcess = spawn('node', ['/Users/danielhu/Projects/enhanced-fetch/dist/index.js'], {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      console.log(`Started MCP server process (PID: ${serverProcess.pid})`);

      // Set up timeout for startup
      startupTimeout = setTimeout(() => {
        logResult({
          passed: false,
          message: 'MCP Server startup timeout (10 seconds)',
          details: { timeout: '10s' }
        });
        if (serverProcess) {
          serverProcess.kill();
        }
        reject(new Error('Startup timeout'));
      }, 10000);

      // Capture stdout
      serverProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);

        // Check for successful startup indicators
        if (text.includes('MCP server started') ||
            text.includes('Enhanced Fetch MCP Server') ||
            text.includes('Server running')) {
          clearTimeout(startupTimeout);

          logResult({
            passed: true,
            message: 'MCP Server started successfully',
            details: {
              pid: serverProcess?.pid,
              startupMessage: text.trim().split('\n')[0]
            }
          });

          // Give it a moment to fully initialize
          setTimeout(() => {
            if (serverProcess) {
              serverProcess.kill();
            }
            resolve();
          }, 2000);
        }
      });

      // Capture stderr
      serverProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      // Handle process exit
      serverProcess.on('exit', (code, signal) => {
        console.log(`\nMCP server process exited (code: ${code}, signal: ${signal})`);
        clearTimeout(startupTimeout);
      });

      // Handle process errors
      serverProcess.on('error', (error) => {
        clearTimeout(startupTimeout);
        logResult({
          passed: false,
          message: 'MCP Server failed to start',
          details: { error: error.message }
        });
        reject(error);
      });

    } catch (error) {
      clearTimeout(startupTimeout);
      logResult({
        passed: false,
        message: 'Failed to spawn MCP Server process',
        details: { error: (error as Error).message }
      });
      reject(error);
    }
  });
}

async function verifyMCPTools(): Promise<void> {
  console.log('\n=== Verifying MCP Tools ===\n');

  // Read the MCP server source to verify tool definitions
  const { readFileSync } = await import('fs');
  const serverSource = readFileSync('/Users/danielhu/Projects/enhanced-fetch/dist/mcp-server.js', 'utf-8');

  // Expected tools
  const expectedTools = [
    // Docker sandbox tools (8)
    'docker_create_sandbox',
    'docker_execute_command',
    'docker_list_sandboxes',
    'docker_get_sandbox_info',
    'docker_stop_sandbox',
    'docker_remove_sandbox',
    'docker_copy_to_sandbox',
    'docker_copy_from_sandbox',

    // New web fetch and browser tools (10)
    'web_fetch',
    'web_extract_content',
    'browser_create_context',
    'browser_navigate',
    'browser_get_content',
    'browser_execute_js',
    'browser_screenshot',
    'browser_pdf',
    'browser_close_context',
    'browser_list_contexts'
  ];

  const foundTools: string[] = [];
  const missingTools: string[] = [];

  expectedTools.forEach(tool => {
    // Check if tool name appears in the source
    if (serverSource.includes(`"${tool}"`) || serverSource.includes(`'${tool}'`)) {
      foundTools.push(tool);
    } else {
      missingTools.push(tool);
    }
  });

  logResult({
    passed: missingTools.length === 0,
    message: `Tool verification: ${foundTools.length}/${expectedTools.length} tools found`,
    details: {
      expectedCount: expectedTools.length,
      foundCount: foundTools.length,
      missingCount: missingTools.length
    }
  });

  if (foundTools.length > 0) {
    console.log('\nFound tools:');
    foundTools.forEach(tool => console.log(`  ✓ ${tool}`));
  }

  if (missingTools.length > 0) {
    console.log('\nMissing tools:');
    missingTools.forEach(tool => console.log(`  ✗ ${tool}`));
  }

  // Verify Docker tools
  const dockerTools = foundTools.filter(t => t.startsWith('docker_'));
  logResult({
    passed: dockerTools.length === 8,
    message: `Docker sandbox tools: ${dockerTools.length}/8`,
    details: { count: dockerTools.length }
  });

  // Verify Web/Browser tools
  const webBrowserTools = foundTools.filter(t => t.startsWith('web_') || t.startsWith('browser_'));
  logResult({
    passed: webBrowserTools.length === 10,
    message: `Web/Browser tools: ${webBrowserTools.length}/10`,
    details: { count: webBrowserTools.length }
  });
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('MCP SERVER TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`);

  if (failedTests > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.message}`);
    });
    console.log('');
  }

  console.log('='.repeat(60));

  process.exit(failedTests === 0 ? 0 : 1);
}

async function runTests() {
  console.log('Testing Enhanced Fetch MCP Server...\n');

  try {
    await testMCPServerStartup();
  } catch (error) {
    console.error('Server startup test failed:', error);
  }

  await verifyMCPTools();
  await printSummary();
}

runTests().catch(console.error);
