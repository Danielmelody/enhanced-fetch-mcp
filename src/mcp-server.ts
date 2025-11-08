/**
 * MCP Server - Exposes sandbox management through Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SandboxManager } from './sandbox-manager.js';
import { SandboxConfig } from './types.js';

// Tool schemas
const CreateSandboxSchema = z.object({
  name: z.string().describe('Name for the sandbox'),
  image: z.string().optional().describe('Docker image to use (default: node:20-alpine)'),
  memoryLimit: z.string().optional().describe('Memory limit (e.g., 512m, 1g)'),
  cpuLimit: z.number().optional().describe('CPU limit (number of cores)'),
  timeout: z.number().optional().describe('Auto-cleanup timeout in milliseconds'),
  env: z.record(z.string()).optional().describe('Environment variables'),
  workDir: z.string().optional().describe('Working directory in container'),
});

const ExecuteCommandSchema = z.object({
  sandboxId: z.string().describe('Sandbox ID'),
  command: z.array(z.string()).describe('Command to execute as array (e.g., ["ls", "-la"])'),
});

const SandboxIdSchema = z.object({
  sandboxId: z.string().describe('Sandbox ID'),
});

export class MCPSandboxServer {
  private server: Server;
  private sandboxManager: SandboxManager;

  constructor() {
    this.sandboxManager = new SandboxManager();
    this.server = new Server(
      {
        name: 'enhanced-fetch-sandbox',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      const tools: Tool[] = [
        {
          name: 'create_sandbox',
          description: 'Create a new isolated sandbox environment with Docker',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name for the sandbox',
              },
              image: {
                type: 'string',
                description: 'Docker image to use (default: node:20-alpine)',
              },
              memoryLimit: {
                type: 'string',
                description: 'Memory limit (e.g., 512m, 1g)',
              },
              cpuLimit: {
                type: 'number',
                description: 'CPU limit (number of cores)',
              },
              timeout: {
                type: 'number',
                description: 'Auto-cleanup timeout in milliseconds',
              },
              env: {
                type: 'object',
                description: 'Environment variables',
              },
              workDir: {
                type: 'string',
                description: 'Working directory in container',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'execute_in_sandbox',
          description: 'Execute a command inside a sandbox',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: {
                type: 'string',
                description: 'Sandbox ID',
              },
              command: {
                type: 'array',
                items: { type: 'string' },
                description: 'Command to execute as array (e.g., ["ls", "-la"])',
              },
            },
            required: ['sandboxId', 'command'],
          },
        },
        {
          name: 'list_sandboxes',
          description: 'List all active sandboxes',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_sandbox',
          description: 'Get detailed information about a sandbox',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: {
                type: 'string',
                description: 'Sandbox ID',
              },
            },
            required: ['sandboxId'],
          },
        },
        {
          name: 'pause_sandbox',
          description: 'Pause a running sandbox',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: {
                type: 'string',
                description: 'Sandbox ID',
              },
            },
            required: ['sandboxId'],
          },
        },
        {
          name: 'resume_sandbox',
          description: 'Resume a paused sandbox',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: {
                type: 'string',
                description: 'Sandbox ID',
              },
            },
            required: ['sandboxId'],
          },
        },
        {
          name: 'cleanup_sandbox',
          description: 'Stop and remove a sandbox',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: {
                type: 'string',
                description: 'Sandbox ID',
              },
            },
            required: ['sandboxId'],
          },
        },
        {
          name: 'get_sandbox_stats',
          description: 'Get resource usage statistics for a sandbox',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: {
                type: 'string',
                description: 'Sandbox ID',
              },
            },
            required: ['sandboxId'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_sandbox': {
            const params = CreateSandboxSchema.parse(args);
            const config: SandboxConfig = {};
            if (params.image !== undefined) config.image = params.image;
            if (params.memoryLimit !== undefined) config.memoryLimit = params.memoryLimit;
            if (params.cpuLimit !== undefined) config.cpuLimit = params.cpuLimit;
            if (params.timeout !== undefined) config.timeout = params.timeout;
            if (params.env !== undefined) config.env = params.env;
            if (params.workDir !== undefined) config.workDir = params.workDir;
            const sandbox = await this.sandboxManager.createSandbox(params.name, config);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(sandbox, null, 2),
                },
              ],
            };
          }

          case 'execute_in_sandbox': {
            const params = ExecuteCommandSchema.parse(args);
            const result = await this.sandboxManager.executeInSandbox(
              params.sandboxId,
              params.command
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'list_sandboxes': {
            const sandboxes = this.sandboxManager.listSandboxes();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(sandboxes, null, 2),
                },
              ],
            };
          }

          case 'get_sandbox': {
            const params = SandboxIdSchema.parse(args);
            const sandbox = this.sandboxManager.getSandbox(params.sandboxId);
            if (!sandbox) {
              throw new Error(`Sandbox ${params.sandboxId} not found`);
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(sandbox, null, 2),
                },
              ],
            };
          }

          case 'pause_sandbox': {
            const params = SandboxIdSchema.parse(args);
            await this.sandboxManager.pauseSandbox(params.sandboxId);
            return {
              content: [
                {
                  type: 'text',
                  text: `Sandbox ${params.sandboxId} paused successfully`,
                },
              ],
            };
          }

          case 'resume_sandbox': {
            const params = SandboxIdSchema.parse(args);
            await this.sandboxManager.resumeSandbox(params.sandboxId);
            return {
              content: [
                {
                  type: 'text',
                  text: `Sandbox ${params.sandboxId} resumed successfully`,
                },
              ],
            };
          }

          case 'cleanup_sandbox': {
            const params = SandboxIdSchema.parse(args);
            await this.sandboxManager.cleanupSandbox(params.sandboxId);
            return {
              content: [
                {
                  type: 'text',
                  text: `Sandbox ${params.sandboxId} cleaned up successfully`,
                },
              ],
            };
          }

          case 'get_sandbox_stats': {
            const params = SandboxIdSchema.parse(args);
            const stats = await this.sandboxManager.getSandboxStats(params.sandboxId);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(stats, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    // Initialize sandbox manager
    await this.sandboxManager.initialize();

    // Setup graceful shutdown
    process.on('SIGINT', () => {
      void this.shutdown().then(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      void this.shutdown().then(() => process.exit(0));
    });

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('Enhanced Fetch MCP Sandbox Server running on stdio');
  }

  async shutdown(): Promise<void> {
    console.error('Shutting down...');
    await this.sandboxManager.shutdown();
    await this.server.close();
  }
}
