# 浏览器沙箱方案（无 Docker）

## 🎯 概述

提供不依赖 Docker 的浏览器自动化和沙箱管理方案。

---

## 方案对比

| 方案 | 隔离级别 | 性能 | 易用性 | 跨平台 | 推荐度 |
|------|---------|------|--------|--------|--------|
| **Playwright** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ |
| **Puppeteer** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ |
| **Selenium** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ | ⭐⭐⭐ |
| **Docker + Browser** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ |

---

## 🏆 方案 1: Playwright（强烈推荐）

### 特点

- ✅ 支持 Chromium、Firefox、WebKit
- ✅ 自动下载和管理浏览器
- ✅ 多浏览器上下文（隔离）
- ✅ 无头模式和有头模式
- ✅ 截图、PDF、录制
- ✅ 网络拦截和模拟
- ✅ 完整的 API 和文档

### 安装

```bash
cd /Users/danielhu/Projects/enhanced-fetch
npm install playwright
npx playwright install  # 下载浏览器
```

### 基础实现

创建浏览器沙箱管理器：

```typescript
// src/playwright-sandbox-manager.ts
import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { EventEmitter } from 'events';

export interface BrowserSandboxConfig {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  permissions?: string[];
  geolocation?: { latitude: number; longitude: number };
  locale?: string;
  timezone?: string;
  recordVideo?: boolean;
  recordTrace?: boolean;
}

export interface SandboxInfo {
  id: string;
  name: string;
  browserType: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  createdAt: Date;
  pages: number;
}

export class PlaywrightSandboxManager extends EventEmitter {
  private sandboxes: Map<string, {
    browser: Browser;
    context: BrowserContext;
    info: SandboxInfo;
    config: BrowserSandboxConfig;
  }>;

  constructor() {
    super();
    this.sandboxes = new Map();
  }

  /**
   * 创建浏览器沙箱
   */
  async createSandbox(
    name: string,
    config: BrowserSandboxConfig = {}
  ): Promise<SandboxInfo> {
    const sandboxId = this.generateId();
    const browserType = config.browserType || 'chromium';

    const info: SandboxInfo = {
      id: sandboxId,
      name,
      browserType,
      status: 'creating',
      createdAt: new Date(),
      pages: 0
    };

    try {
      // 选择浏览器引擎
      const browserEngine =
        browserType === 'firefox' ? firefox :
        browserType === 'webkit' ? webkit :
        chromium;

      // 启动浏览器
      const browser = await browserEngine.launch({
        headless: config.headless !== false,
        timeout: config.timeout || 30000
      });

      // 创建隔离的浏览器上下文
      const contextOptions: any = {
        viewport: config.viewport || { width: 1280, height: 720 },
        userAgent: config.userAgent,
        permissions: config.permissions,
        geolocation: config.geolocation,
        locale: config.locale || 'zh-CN',
        timezoneId: config.timezone || 'Asia/Shanghai',
      };

      if (config.recordVideo) {
        contextOptions.recordVideo = {
          dir: `./recordings/${sandboxId}/`
        };
      }

      const context = await browser.newContext(contextOptions);

      // 启用追踪（可选）
      if (config.recordTrace) {
        await context.tracing.start({ screenshots: true, snapshots: true });
      }

      info.status = 'running';
      this.sandboxes.set(sandboxId, { browser, context, info, config });

      this.emit('sandbox:created', info);
      return info;

    } catch (error) {
      info.status = 'error';
      throw new Error(`Failed to create sandbox: ${(error as Error).message}`);
    }
  }

  /**
   * 在沙箱中打开新页面
   */
  async openPage(sandboxId: string, url: string): Promise<string> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    const page = await sandbox.context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    sandbox.info.pages = sandbox.context.pages().length;

    return `Page opened: ${url}`;
  }

  /**
   * 执行页面操作
   */
  async executeAction(
    sandboxId: string,
    action: {
      type: 'click' | 'type' | 'screenshot' | 'evaluate' | 'pdf';
      selector?: string;
      text?: string;
      code?: string;
      path?: string;
    }
  ): Promise<any> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    const pages = sandbox.context.pages();
    if (pages.length === 0) {
      throw new Error('No pages open in sandbox');
    }

    const page = pages[pages.length - 1]; // 使用最后一个页面

    switch (action.type) {
      case 'click':
        if (!action.selector) throw new Error('Selector required for click');
        await page.click(action.selector);
        return { success: true, action: 'click', selector: action.selector };

      case 'type':
        if (!action.selector || !action.text) {
          throw new Error('Selector and text required for type');
        }
        await page.fill(action.selector, action.text);
        return { success: true, action: 'type', selector: action.selector };

      case 'screenshot':
        const screenshotPath = action.path || `./screenshots/${sandboxId}-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        return { success: true, action: 'screenshot', path: screenshotPath };

      case 'evaluate':
        if (!action.code) throw new Error('Code required for evaluate');
        const result = await page.evaluate(action.code);
        return { success: true, action: 'evaluate', result };

      case 'pdf':
        const pdfPath = action.path || `./pdfs/${sandboxId}-${Date.now()}.pdf`;
        await page.pdf({ path: pdfPath, format: 'A4' });
        return { success: true, action: 'pdf', path: pdfPath };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * 获取页面内容
   */
  async getPageContent(sandboxId: string): Promise<{
    url: string;
    title: string;
    content: string;
  }> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    const pages = sandbox.context.pages();
    if (pages.length === 0) {
      throw new Error('No pages open in sandbox');
    }

    const page = pages[pages.length - 1];

    return {
      url: page.url(),
      title: await page.title(),
      content: await page.content()
    };
  }

  /**
   * 列出所有沙箱
   */
  listSandboxes(): SandboxInfo[] {
    return Array.from(this.sandboxes.values()).map(s => ({
      ...s.info,
      pages: s.context.pages().length
    }));
  }

  /**
   * 获取沙箱详情
   */
  getSandbox(sandboxId: string): SandboxInfo | null {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return null;

    return {
      ...sandbox.info,
      pages: sandbox.context.pages().length
    };
  }

  /**
   * 关闭沙箱
   */
  async closeSandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    // 保存追踪
    if (sandbox.config.recordTrace) {
      await sandbox.context.tracing.stop({
        path: `./traces/${sandboxId}.zip`
      });
    }

    await sandbox.context.close();
    await sandbox.browser.close();

    this.sandboxes.delete(sandboxId);
    this.emit('sandbox:closed', sandboxId);
  }

  /**
   * 关闭所有沙箱
   */
  async shutdown(): Promise<void> {
    const promises = Array.from(this.sandboxes.keys()).map(id =>
      this.closeSandbox(id).catch(console.error)
    );
    await Promise.all(promises);
  }

  private generateId(): string {
    return `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default PlaywrightSandboxManager;
```

### 使用示例

```typescript
// test-playwright-sandbox.ts
import PlaywrightSandboxManager from './src/playwright-sandbox-manager.js';

async function test() {
  const manager = new PlaywrightSandboxManager();

  try {
    console.log('🚀 创建浏览器沙箱...');

    // 1. 创建沙箱
    const sandbox = await manager.createSandbox('test-sandbox', {
      browserType: 'chromium',
      headless: false, // 显示浏览器窗口
      viewport: { width: 1920, height: 1080 }
    });
    console.log('✅ 沙箱创建:', sandbox.id);

    // 2. 打开页面
    console.log('🌐 打开网页...');
    await manager.openPage(sandbox.id, 'https://example.com');

    // 3. 截图
    console.log('📸 截图...');
    await manager.executeAction(sandbox.id, {
      type: 'screenshot',
      path: './example.png'
    });

    // 4. 执行 JavaScript
    console.log('⚡ 执行 JavaScript...');
    const result = await manager.executeAction(sandbox.id, {
      type: 'evaluate',
      code: 'document.title'
    });
    console.log('📄 页面标题:', result.result);

    // 5. 获取页面内容
    console.log('📝 获取页面内容...');
    const content = await manager.getPageContent(sandbox.id);
    console.log('🔗 URL:', content.url);
    console.log('📄 标题:', content.title);

    // 6. 列出所有沙箱
    console.log('📋 所有沙箱:');
    const sandboxes = manager.listSandboxes();
    sandboxes.forEach(s => {
      console.log(`  - ${s.name} (${s.id}): ${s.status}, ${s.pages} 个页面`);
    });

    // 7. 清理
    console.log('🧹 关闭沙箱...');
    await manager.closeSandbox(sandbox.id);

    console.log('✨ 测试完成！');

  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

test();
```

---

## 方案 2: Puppeteer（Chrome 专用）

### 安装

```bash
npm install puppeteer
```

### 简单实现

```typescript
// puppeteer-example.ts
import puppeteer from 'puppeteer';

async function example() {
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 创建页面
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // 访问网站
  await page.goto('https://example.com');

  // 截图
  await page.screenshot({ path: 'puppeteer-screenshot.png' });

  // 执行 JavaScript
  const title = await page.evaluate(() => document.title);
  console.log('页面标题:', title);

  // 点击元素
  // await page.click('button#submit');

  // 输入文本
  // await page.type('input[name="search"]', 'Hello World');

  // 等待导航
  // await page.waitForNavigation();

  // 获取页面内容
  const content = await page.content();
  console.log('HTML 长度:', content.length);

  // 关闭
  await browser.close();
}

example();
```

---

## 完整的 MCP Server 实现

将浏览器沙箱集成到 MCP Server：

```typescript
// src/browser-mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import PlaywrightSandboxManager from './playwright-sandbox-manager.js';

const CreateBrowserSchema = z.object({
  name: z.string().describe('Name for the browser sandbox'),
  browserType: z.enum(['chromium', 'firefox', 'webkit']).optional(),
  headless: z.boolean().optional(),
  viewport: z.object({
    width: z.number(),
    height: z.number()
  }).optional()
});

const OpenPageSchema = z.object({
  sandboxId: z.string(),
  url: z.string()
});

const ExecuteActionSchema = z.object({
  sandboxId: z.string(),
  type: z.enum(['click', 'type', 'screenshot', 'evaluate', 'pdf']),
  selector: z.string().optional(),
  text: z.string().optional(),
  code: z.string().optional(),
  path: z.string().optional()
});

const SandboxIdSchema = z.object({
  sandboxId: z.string()
});

export class BrowserMCPServer {
  private server: Server;
  private manager: PlaywrightSandboxManager;

  constructor() {
    this.manager = new PlaywrightSandboxManager();
    this.server = new Server(
      {
        name: 'browser-sandbox',
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
    // 列出工具
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      const tools: Tool[] = [
        {
          name: 'create_browser',
          description: 'Create a new browser sandbox',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name for the browser sandbox' },
              browserType: {
                type: 'string',
                enum: ['chromium', 'firefox', 'webkit'],
                description: 'Browser type (default: chromium)'
              },
              headless: { type: 'boolean', description: 'Run in headless mode' },
              viewport: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' }
                }
              }
            },
            required: ['name']
          }
        },
        {
          name: 'open_page',
          description: 'Open a URL in browser sandbox',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: { type: 'string', description: 'Browser sandbox ID' },
              url: { type: 'string', description: 'URL to open' }
            },
            required: ['sandboxId', 'url']
          }
        },
        {
          name: 'execute_action',
          description: 'Execute action in browser (click, type, screenshot, evaluate, pdf)',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: { type: 'string' },
              type: {
                type: 'string',
                enum: ['click', 'type', 'screenshot', 'evaluate', 'pdf']
              },
              selector: { type: 'string', description: 'CSS selector (for click/type)' },
              text: { type: 'string', description: 'Text to type' },
              code: { type: 'string', description: 'JavaScript code to evaluate' },
              path: { type: 'string', description: 'File path for screenshot/pdf' }
            },
            required: ['sandboxId', 'type']
          }
        },
        {
          name: 'get_page_content',
          description: 'Get current page content',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: { type: 'string' }
            },
            required: ['sandboxId']
          }
        },
        {
          name: 'list_browsers',
          description: 'List all browser sandboxes',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'close_browser',
          description: 'Close a browser sandbox',
          inputSchema: {
            type: 'object',
            properties: {
              sandboxId: { type: 'string' }
            },
            required: ['sandboxId']
          }
        }
      ];

      return { tools };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_browser': {
            const params = CreateBrowserSchema.parse(args);
            const sandbox = await this.manager.createSandbox(params.name, {
              browserType: params.browserType,
              headless: params.headless,
              viewport: params.viewport
            });
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(sandbox, null, 2)
              }]
            };
          }

          case 'open_page': {
            const params = OpenPageSchema.parse(args);
            const result = await this.manager.openPage(params.sandboxId, params.url);
            return {
              content: [{
                type: 'text',
                text: result
              }]
            };
          }

          case 'execute_action': {
            const params = ExecuteActionSchema.parse(args);
            const result = await this.manager.executeAction(params.sandboxId, {
              type: params.type,
              selector: params.selector,
              text: params.text,
              code: params.code,
              path: params.path
            });
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          }

          case 'get_page_content': {
            const params = SandboxIdSchema.parse(args);
            const content = await this.manager.getPageContent(params.sandboxId);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(content, null, 2)
              }]
            };
          }

          case 'list_browsers': {
            const sandboxes = this.manager.listSandboxes();
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(sandboxes, null, 2)
              }]
            };
          }

          case 'close_browser': {
            const params = SandboxIdSchema.parse(args);
            await this.manager.closeSandbox(params.sandboxId);
            return {
              content: [{
                type: 'text',
                text: `Browser ${params.sandboxId} closed successfully`
              }]
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${(error as Error).message}`
          }],
          isError: true
        };
      }
    });
  }

  async start(): Promise<void> {
    process.on('SIGINT', () => {
      void this.manager.shutdown().then(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      void this.manager.shutdown().then(() => process.exit(0));
    });

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('Browser MCP Sandbox Server running on stdio');
  }
}

// 启动
const server = new BrowserMCPServer();
void server.start();
```

---

## 快速开始

### 1. 安装依赖

```bash
cd /Users/danielhu/Projects/enhanced-fetch
npm install playwright
npx playwright install chromium  # 下载 Chromium
```

### 2. 创建测试脚本

```bash
cat > quick-browser-test.js << 'EOF'
import { chromium } from 'playwright';

async function test() {
  console.log('🚀 启动浏览器...');
  const browser = await chromium.launch({ headless: false });

  console.log('📄 创建页面...');
  const page = await browser.newPage();

  console.log('🌐 访问网站...');
  await page.goto('https://example.com');

  console.log('📸 截图...');
  await page.screenshot({ path: 'test.png' });

  console.log('📝 获取标题:', await page.title());

  console.log('🧹 关闭浏览器...');
  await browser.close();

  console.log('✨ 完成！');
}

test();
EOF

node quick-browser-test.js
```

---

## 功能对比

| 功能 | Docker + Browser | Playwright | Puppeteer |
|------|-----------------|------------|-----------|
| **安装复杂度** | 高 | 低 | 低 |
| **启动速度** | 慢 | 快 | 快 |
| **资源占用** | 高 | 中 | 中 |
| **隔离级别** | 容器级 | 进程级 | 进程级 |
| **多浏览器** | ✅ | ✅ | ❌ (仅 Chrome) |
| **跨平台** | ✅ | ✅ | ✅ |
| **维护性** | 中 | 高 | 高 |

---

## 总结

**推荐使用 Playwright**：
- ✅ 无需 Docker
- ✅ 自动管理浏览器
- ✅ 功能完整、API 友好
- ✅ 支持多种浏览器
- ✅ 开箱即用

这就是你需要的浏览器沙箱方案！🎉
