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
import { FetchClient } from './fetch-client.js';
import { ContentExtractor } from './content-extractor.js';
import { BrowserSandboxManager } from './browser-sandbox-manager.js';
import {
  SandboxConfig,
  FetchOptions,
  ExtractOptions,
  BrowserContextConfig,
  NavigateOptions,
  ScreenshotOptions,
  PDFOptions,
} from './types.js';

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

// Fetch and content extraction schemas
const FetchUrlSchema = z.object({
  url: z.string().url().describe('URL to fetch'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).optional().describe('HTTP method (default: GET)'),
  headers: z.record(z.string()).optional().describe('Custom HTTP headers'),
  timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
  userAgent: z.string().optional().describe('Custom User-Agent string'),
  body: z.union([z.string(), z.record(z.unknown())]).optional().describe('Request body (string or JSON object)'),
  followRedirects: z.boolean().optional().describe('Follow HTTP redirects (default: true)'),
  maxRedirects: z.number().optional().describe('Maximum number of redirects (default: 5)'),
});

const ExtractContentSchema = z.object({
  html: z.string().describe('HTML content to extract from'),
  url: z.string().url().optional().describe('URL of the page (used for resolving relative URLs)'),
  includeMetadata: z.boolean().optional().describe('Include metadata extraction (default: true)'),
  includeLinks: z.boolean().optional().describe('Include link extraction (default: true)'),
  includeImages: z.boolean().optional().describe('Include image extraction (default: true)'),
  convertToMarkdown: z.boolean().optional().describe('Convert content to Markdown (default: true)'),
  mainContentSelector: z.string().optional().describe('CSS selector for main content area'),
  removeSelectors: z.array(z.string()).optional().describe('CSS selectors for elements to remove'),
});

const FetchAndExtractSchema = z.object({
  url: z.string().url().describe('URL to fetch and extract content from'),
  fetchOptions: z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).optional(),
    headers: z.record(z.string()).optional(),
    timeout: z.number().optional(),
    userAgent: z.string().optional(),
    body: z.union([z.string(), z.record(z.unknown())]).optional(),
    followRedirects: z.boolean().optional(),
    maxRedirects: z.number().optional(),
  }).optional().describe('Fetch options'),
  extractOptions: z.object({
    includeMetadata: z.boolean().optional(),
    includeLinks: z.boolean().optional(),
    includeImages: z.boolean().optional(),
    convertToMarkdown: z.boolean().optional(),
    mainContentSelector: z.string().optional(),
    removeSelectors: z.array(z.string()).optional(),
  }).optional().describe('Extraction options'),
});

// Browser automation schemas
const CreateBrowserContextSchema = z.object({
  browserType: z.enum(['chromium', 'firefox', 'webkit']).optional().describe('Browser type (default: chromium)'),
  headless: z.boolean().optional().describe('Run in headless mode (default: true)'),
  timeout: z.number().optional().describe('Default timeout in milliseconds (default: 30000)'),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }).optional().describe('Viewport size (default: 1280x720)'),
  userAgent: z.string().optional().describe('Custom User-Agent'),
  locale: z.string().optional().describe('Locale (e.g., en-US)'),
  timezone: z.string().optional().describe('Timezone ID (e.g., America/New_York)'),
  permissions: z.array(z.string()).optional().describe('Permissions to grant'),
  geolocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional().describe('Geolocation coordinates'),
  colorScheme: z.enum(['light', 'dark', 'no-preference']).optional().describe('Color scheme preference'),
});

const BrowserNavigateSchema = z.object({
  contextId: z.string().describe('Browser context ID'),
  url: z.string().url().describe('URL to navigate to'),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().describe('Wait until condition (default: load)'),
  timeout: z.number().optional().describe('Navigation timeout in milliseconds'),
  referer: z.string().optional().describe('Referer header'),
});

const BrowserGetContentSchema = z.object({
  contextId: z.string().describe('Browser context ID'),
  pageId: z.string().optional().describe('Page ID (uses last page if not provided)'),
});

const BrowserScreenshotSchema = z.object({
  contextId: z.string().describe('Browser context ID'),
  pageId: z.string().optional().describe('Page ID (uses last page if not provided)'),
  fullPage: z.boolean().optional().describe('Capture full scrollable page (default: false)'),
  type: z.enum(['png', 'jpeg']).optional().describe('Image type (default: png)'),
  quality: z.number().min(0).max(100).optional().describe('JPEG quality 0-100 (only for jpeg type)'),
  clip: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional().describe('Clip area to capture'),
});

const BrowserPdfSchema = z.object({
  contextId: z.string().describe('Browser context ID'),
  pageId: z.string().optional().describe('Page ID (uses last page if not provided)'),
  format: z.enum(['A4', 'Letter', 'Legal']).optional().describe('Paper format (default: A4)'),
  landscape: z.boolean().optional().describe('Landscape orientation (default: false)'),
  printBackground: z.boolean().optional().describe('Print background graphics (default: true)'),
  margin: z.object({
    top: z.string().optional(),
    right: z.string().optional(),
    bottom: z.string().optional(),
    left: z.string().optional(),
  }).optional().describe('Page margins'),
});

const BrowserExecuteJsSchema = z.object({
  contextId: z.string().describe('Browser context ID'),
  script: z.string().describe('JavaScript code to execute'),
  pageId: z.string().optional().describe('Page ID (uses last page if not provided)'),
});

const ContextIdSchema = z.object({
  contextId: z.string().describe('Browser context ID'),
});

export class MCPSandboxServer {
  private server: Server;
  private sandboxManager: SandboxManager;
  private fetchClient: FetchClient;
  private contentExtractor: ContentExtractor;
  private browserManager: BrowserSandboxManager;

  constructor() {
    this.sandboxManager = new SandboxManager();
    this.fetchClient = new FetchClient();
    this.contentExtractor = new ContentExtractor();
    this.browserManager = new BrowserSandboxManager();
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
        // Fetch and content extraction tools
        {
          name: 'fetch_url',
          description: 'Fetch content from a URL with customizable HTTP options',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to fetch',
              },
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
                description: 'HTTP method (default: GET)',
              },
              headers: {
                type: 'object',
                description: 'Custom HTTP headers',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 30000)',
              },
              userAgent: {
                type: 'string',
                description: 'Custom User-Agent string',
              },
              body: {
                description: 'Request body (string or JSON object)',
              },
              followRedirects: {
                type: 'boolean',
                description: 'Follow HTTP redirects (default: true)',
              },
              maxRedirects: {
                type: 'number',
                description: 'Maximum number of redirects (default: 5)',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'extract_content',
          description: 'Extract structured content from HTML with metadata, links, and images',
          inputSchema: {
            type: 'object',
            properties: {
              html: {
                type: 'string',
                description: 'HTML content to extract from',
              },
              url: {
                type: 'string',
                description: 'URL of the page (used for resolving relative URLs)',
              },
              includeMetadata: {
                type: 'boolean',
                description: 'Include metadata extraction (default: true)',
              },
              includeLinks: {
                type: 'boolean',
                description: 'Include link extraction (default: true)',
              },
              includeImages: {
                type: 'boolean',
                description: 'Include image extraction (default: true)',
              },
              convertToMarkdown: {
                type: 'boolean',
                description: 'Convert content to Markdown (default: true)',
              },
              mainContentSelector: {
                type: 'string',
                description: 'CSS selector for main content area',
              },
              removeSelectors: {
                type: 'array',
                items: { type: 'string' },
                description: 'CSS selectors for elements to remove',
              },
            },
            required: ['html'],
          },
        },
        {
          name: 'fetch_and_extract',
          description: 'Fetch a URL and extract structured content in one operation (combines fetch_url + extract_content)',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to fetch and extract content from',
              },
              fetchOptions: {
                type: 'object',
                properties: {
                  method: {
                    type: 'string',
                    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
                  },
                  headers: {
                    type: 'object',
                  },
                  timeout: {
                    type: 'number',
                  },
                  userAgent: {
                    type: 'string',
                  },
                  body: {},
                  followRedirects: {
                    type: 'boolean',
                  },
                  maxRedirects: {
                    type: 'number',
                  },
                },
                description: 'Fetch options',
              },
              extractOptions: {
                type: 'object',
                properties: {
                  includeMetadata: {
                    type: 'boolean',
                  },
                  includeLinks: {
                    type: 'boolean',
                  },
                  includeImages: {
                    type: 'boolean',
                  },
                  convertToMarkdown: {
                    type: 'boolean',
                  },
                  mainContentSelector: {
                    type: 'string',
                  },
                  removeSelectors: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                description: 'Extraction options',
              },
            },
            required: ['url'],
          },
        },
        // Browser automation tools
        {
          name: 'create_browser_context',
          description: 'Create a new browser automation context with Playwright (supports Chromium, Firefox, WebKit)',
          inputSchema: {
            type: 'object',
            properties: {
              browserType: {
                type: 'string',
                enum: ['chromium', 'firefox', 'webkit'],
                description: 'Browser type (default: chromium)',
              },
              headless: {
                type: 'boolean',
                description: 'Run in headless mode (default: true)',
              },
              timeout: {
                type: 'number',
                description: 'Default timeout in milliseconds (default: 30000)',
              },
              viewport: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
                description: 'Viewport size (default: 1280x720)',
              },
              userAgent: {
                type: 'string',
                description: 'Custom User-Agent',
              },
              locale: {
                type: 'string',
                description: 'Locale (e.g., en-US)',
              },
              timezone: {
                type: 'string',
                description: 'Timezone ID (e.g., America/New_York)',
              },
              permissions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Permissions to grant',
              },
              geolocation: {
                type: 'object',
                properties: {
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
                description: 'Geolocation coordinates',
              },
              colorScheme: {
                type: 'string',
                enum: ['light', 'dark', 'no-preference'],
                description: 'Color scheme preference',
              },
            },
          },
        },
        {
          name: 'browser_navigate',
          description: 'Navigate to a URL in a browser context (creates a new page)',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'Browser context ID',
              },
              url: {
                type: 'string',
                description: 'URL to navigate to',
              },
              waitUntil: {
                type: 'string',
                enum: ['load', 'domcontentloaded', 'networkidle'],
                description: 'Wait until condition (default: load)',
              },
              timeout: {
                type: 'number',
                description: 'Navigation timeout in milliseconds',
              },
              referer: {
                type: 'string',
                description: 'Referer header',
              },
            },
            required: ['contextId', 'url'],
          },
        },
        {
          name: 'browser_get_content',
          description: 'Get the rendered HTML content of a browser page (after JavaScript execution)',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'Browser context ID',
              },
              pageId: {
                type: 'string',
                description: 'Page ID (uses last page if not provided)',
              },
            },
            required: ['contextId'],
          },
        },
        {
          name: 'browser_screenshot',
          description: 'Take a screenshot of a browser page',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'Browser context ID',
              },
              pageId: {
                type: 'string',
                description: 'Page ID (uses last page if not provided)',
              },
              fullPage: {
                type: 'boolean',
                description: 'Capture full scrollable page (default: false)',
              },
              type: {
                type: 'string',
                enum: ['png', 'jpeg'],
                description: 'Image type (default: png)',
              },
              quality: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'JPEG quality 0-100 (only for jpeg type)',
              },
              clip: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
                description: 'Clip area to capture',
              },
            },
            required: ['contextId'],
          },
        },
        {
          name: 'browser_pdf',
          description: 'Generate a PDF from a browser page',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'Browser context ID',
              },
              pageId: {
                type: 'string',
                description: 'Page ID (uses last page if not provided)',
              },
              format: {
                type: 'string',
                enum: ['A4', 'Letter', 'Legal'],
                description: 'Paper format (default: A4)',
              },
              landscape: {
                type: 'boolean',
                description: 'Landscape orientation (default: false)',
              },
              printBackground: {
                type: 'boolean',
                description: 'Print background graphics (default: true)',
              },
              margin: {
                type: 'object',
                properties: {
                  top: { type: 'string' },
                  right: { type: 'string' },
                  bottom: { type: 'string' },
                  left: { type: 'string' },
                },
                description: 'Page margins',
              },
            },
            required: ['contextId'],
          },
        },
        {
          name: 'browser_execute_js',
          description: 'Execute JavaScript code in a browser page context',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'Browser context ID',
              },
              script: {
                type: 'string',
                description: 'JavaScript code to execute',
              },
              pageId: {
                type: 'string',
                description: 'Page ID (uses last page if not provided)',
              },
            },
            required: ['contextId', 'script'],
          },
        },
        {
          name: 'list_browser_contexts',
          description: 'List all active browser contexts',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'close_browser_context',
          description: 'Close a browser context and all its pages',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: {
                type: 'string',
                description: 'Browser context ID',
              },
            },
            required: ['contextId'],
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

          // Fetch and content extraction tools
          case 'fetch_url': {
            const params = FetchUrlSchema.parse(args);
            const options: FetchOptions = {};
            if (params.method !== undefined) options.method = params.method;
            if (params.headers !== undefined) options.headers = params.headers;
            if (params.timeout !== undefined) options.timeout = params.timeout;
            if (params.userAgent !== undefined) options.userAgent = params.userAgent;
            if (params.body !== undefined) options.body = params.body;
            if (params.followRedirects !== undefined) options.followRedirects = params.followRedirects;
            if (params.maxRedirects !== undefined) options.maxRedirects = params.maxRedirects;

            const response = await this.fetchClient.fetchUrl(params.url, options);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(response, null, 2),
                },
              ],
            };
          }

          case 'extract_content': {
            const params = ExtractContentSchema.parse(args);
            const options: ExtractOptions = {};
            if (params.includeMetadata !== undefined) options.includeMetadata = params.includeMetadata;
            if (params.includeLinks !== undefined) options.includeLinks = params.includeLinks;
            if (params.includeImages !== undefined) options.includeImages = params.includeImages;
            if (params.convertToMarkdown !== undefined) options.convertToMarkdown = params.convertToMarkdown;
            if (params.mainContentSelector !== undefined) options.mainContentSelector = params.mainContentSelector;
            if (params.removeSelectors !== undefined) options.removeSelectors = params.removeSelectors;

            const extracted = this.contentExtractor.extractContent(
              params.html,
              params.url,
              options
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(extracted, null, 2),
                },
              ],
            };
          }

          case 'fetch_and_extract': {
            const params = FetchAndExtractSchema.parse(args);

            // Build fetch options
            const fetchOptions: FetchOptions = {};
            if (params.fetchOptions) {
              if (params.fetchOptions.method !== undefined) fetchOptions.method = params.fetchOptions.method;
              if (params.fetchOptions.headers !== undefined) fetchOptions.headers = params.fetchOptions.headers;
              if (params.fetchOptions.timeout !== undefined) fetchOptions.timeout = params.fetchOptions.timeout;
              if (params.fetchOptions.userAgent !== undefined) fetchOptions.userAgent = params.fetchOptions.userAgent;
              if (params.fetchOptions.body !== undefined) fetchOptions.body = params.fetchOptions.body;
              if (params.fetchOptions.followRedirects !== undefined) fetchOptions.followRedirects = params.fetchOptions.followRedirects;
              if (params.fetchOptions.maxRedirects !== undefined) fetchOptions.maxRedirects = params.fetchOptions.maxRedirects;
            }

            // Build extract options
            const extractOptions: ExtractOptions = {};
            if (params.extractOptions) {
              if (params.extractOptions.includeMetadata !== undefined) extractOptions.includeMetadata = params.extractOptions.includeMetadata;
              if (params.extractOptions.includeLinks !== undefined) extractOptions.includeLinks = params.extractOptions.includeLinks;
              if (params.extractOptions.includeImages !== undefined) extractOptions.includeImages = params.extractOptions.includeImages;
              if (params.extractOptions.convertToMarkdown !== undefined) extractOptions.convertToMarkdown = params.extractOptions.convertToMarkdown;
              if (params.extractOptions.mainContentSelector !== undefined) extractOptions.mainContentSelector = params.extractOptions.mainContentSelector;
              if (params.extractOptions.removeSelectors !== undefined) extractOptions.removeSelectors = params.extractOptions.removeSelectors;
            }

            // Fetch the URL
            const fetchResponse = await this.fetchClient.fetchUrl(params.url, fetchOptions);

            // Extract content
            const extractedContent = this.contentExtractor.extractContent(
              fetchResponse.body,
              fetchResponse.finalUrl,
              extractOptions
            );

            // Return combined result
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    fetch: {
                      url: fetchResponse.url,
                      finalUrl: fetchResponse.finalUrl,
                      status: fetchResponse.status,
                      statusText: fetchResponse.statusText,
                      headers: fetchResponse.headers,
                      contentType: fetchResponse.contentType,
                      contentLength: fetchResponse.contentLength,
                      redirectCount: fetchResponse.redirectCount,
                      timings: fetchResponse.timings,
                    },
                    content: {
                      title: extractedContent.title,
                      description: extractedContent.description,
                      author: extractedContent.author,
                      publishedDate: extractedContent.publishedDate,
                      markdown: extractedContent.markdown,
                      metadata: extractedContent.metadata,
                      links: extractedContent.links,
                      images: extractedContent.images,
                      stats: extractedContent.stats,
                    },
                  }, null, 2),
                },
              ],
            };
          }

          // Browser automation tools
          case 'create_browser_context': {
            const params = CreateBrowserContextSchema.parse(args);
            const config: BrowserContextConfig = {};
            if (params.browserType !== undefined) config.browserType = params.browserType;
            if (params.headless !== undefined) config.headless = params.headless;
            if (params.timeout !== undefined) config.timeout = params.timeout;
            if (params.viewport !== undefined) config.viewport = params.viewport;
            if (params.userAgent !== undefined) config.userAgent = params.userAgent;
            if (params.locale !== undefined) config.locale = params.locale;
            if (params.timezone !== undefined) config.timezone = params.timezone;
            if (params.permissions !== undefined) config.permissions = params.permissions;
            if (params.geolocation !== undefined) config.geolocation = params.geolocation;
            if (params.colorScheme !== undefined) config.colorScheme = params.colorScheme;

            const contextId = await this.browserManager.createContext(config);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ contextId }, null, 2),
                },
              ],
            };
          }

          case 'browser_navigate': {
            const params = BrowserNavigateSchema.parse(args);
            const options: NavigateOptions = {};
            if (params.waitUntil !== undefined) options.waitUntil = params.waitUntil;
            if (params.timeout !== undefined) options.timeout = params.timeout;
            if (params.referer !== undefined) options.referer = params.referer;

            const pageId = await this.browserManager.navigate(
              params.contextId,
              params.url,
              options
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ pageId, url: params.url }, null, 2),
                },
              ],
            };
          }

          case 'browser_get_content': {
            const params = BrowserGetContentSchema.parse(args);
            const html = await this.browserManager.getPageContent(
              params.contextId,
              params.pageId
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ html, length: html.length }, null, 2),
                },
              ],
            };
          }

          case 'browser_screenshot': {
            const params = BrowserScreenshotSchema.parse(args);
            const options: ScreenshotOptions = {};
            if (params.fullPage !== undefined) options.fullPage = params.fullPage;
            if (params.type !== undefined) options.type = params.type;
            if (params.quality !== undefined) options.quality = params.quality;
            if (params.clip !== undefined) options.clip = params.clip;

            const screenshot = await this.browserManager.screenshot(
              params.contextId,
              options,
              params.pageId
            );

            // Return base64 encoded screenshot
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    screenshot: screenshot.toString('base64'),
                    type: params.type || 'png',
                    size: screenshot.length,
                  }, null, 2),
                },
              ],
            };
          }

          case 'browser_pdf': {
            const params = BrowserPdfSchema.parse(args);
            const options: PDFOptions = {};
            if (params.format !== undefined) options.format = params.format;
            if (params.landscape !== undefined) options.landscape = params.landscape;
            if (params.printBackground !== undefined) options.printBackground = params.printBackground;
            if (params.margin !== undefined) {
              // Only include margin properties that are defined
              const margin: { top?: string; right?: string; bottom?: string; left?: string } = {};
              if (params.margin.top !== undefined) margin.top = params.margin.top;
              if (params.margin.right !== undefined) margin.right = params.margin.right;
              if (params.margin.bottom !== undefined) margin.bottom = params.margin.bottom;
              if (params.margin.left !== undefined) margin.left = params.margin.left;
              options.margin = margin;
            }

            const pdf = await this.browserManager.generatePDF(
              params.contextId,
              options,
              params.pageId
            );

            // Return base64 encoded PDF
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    pdf: pdf.toString('base64'),
                    format: params.format || 'A4',
                    size: pdf.length,
                  }, null, 2),
                },
              ],
            };
          }

          case 'browser_execute_js': {
            const params = BrowserExecuteJsSchema.parse(args);
            const result = await this.browserManager.executeJavaScript(
              params.contextId,
              params.script,
              params.pageId
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

          case 'list_browser_contexts': {
            const contexts = this.browserManager.listContexts();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(contexts, null, 2),
                },
              ],
            };
          }

          case 'close_browser_context': {
            const params = ContextIdSchema.parse(args);
            await this.browserManager.closeContext(params.contextId);
            return {
              content: [
                {
                  type: 'text',
                  text: `Browser context ${params.contextId} closed successfully`,
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
    // Initialize managers
    await this.sandboxManager.initialize();
    this.browserManager.initialize();

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

    console.error('Enhanced Fetch MCP Server running on stdio');
  }

  async shutdown(): Promise<void> {
    console.error('Shutting down...');
    await this.sandboxManager.shutdown();
    await this.browserManager.shutdown();
    await this.server.close();
  }
}
