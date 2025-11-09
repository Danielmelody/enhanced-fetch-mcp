/**
 * Browser Sandbox Manager - Playwright browser automation module
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { EventEmitter } from 'events';
import {
  BrowserContextConfig,
  NavigateOptions,
  BrowserContextInfo,
  BrowserPageInfo,
  ScreenshotOptions,
  PDFOptions,
  JavaScriptResult,
  BrowserError,
  BrowserErrorCode,
} from './types.js';
import { Logger } from './logger.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  browserType: 'chromium' as const,
  headless: true,
  timeout: 30000, // 30 seconds
  viewport: {
    width: 1280,
    height: 720,
  },
  contextMaxAge: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
};

/**
 * Internal context data structure
 */
interface ManagedContext {
  id: string;
  browserType: 'chromium' | 'firefox' | 'webkit';
  context: BrowserContext;
  pages: Map<string, Page>;
  createdAt: Date;
  lastAccessedAt: Date;
  config: BrowserContextConfig;
  status: 'active' | 'closed';
}

/**
 * BrowserSandboxManager class - Manages Playwright browser automation
 */
export class BrowserSandboxManager extends EventEmitter {
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, ManagedContext> = new Map();
  private logger: Logger;
  private cleanupTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('browser-sandbox');
  }

  /**
   * Initialize browser manager
   */
  initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('Browser manager already initialized');
      return;
    }

    this.logger.info('Initializing browser sandbox manager');

    try {
      // Start cleanup scheduler
      this.startCleanupScheduler();

      this.isInitialized = true;
      this.logger.info('Browser sandbox manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize browser sandbox manager', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BrowserError(
        'Failed to initialize browser sandbox manager',
        BrowserErrorCode.BROWSER_LAUNCH_FAILED,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Shutdown browser manager and clean up all resources
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down browser sandbox manager');

    // Stop cleanup scheduler
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      delete this.cleanupTimer;
    }

    // Close all contexts
    const contextIds = Array.from(this.contexts.keys());
    for (const contextId of contextIds) {
      try {
        await this.closeContext(contextId);
      } catch (error) {
        this.logger.warn('Error closing context during shutdown', {
          contextId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Close all browsers
    for (const [browserType, browser] of this.browsers.entries()) {
      try {
        await browser.close();
        this.logger.debug('Browser closed', { browserType });
      } catch (error) {
        this.logger.warn('Error closing browser during shutdown', {
          browserType,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.browsers.clear();
    this.isInitialized = false;
    this.logger.info('Browser sandbox manager shutdown complete');
  }

  /**
   * Get or create a browser instance for the specified type
   */
  private async getBrowser(browserType: 'chromium' | 'firefox' | 'webkit'): Promise<Browser> {
    // Return existing browser if available
    const existingBrowser = this.browsers.get(browserType);
    if (existingBrowser && existingBrowser.isConnected()) {
      return existingBrowser;
    }

    // Launch new browser
    this.logger.info('Launching browser', { browserType });

    try {
      let browser: Browser;

      switch (browserType) {
        case 'chromium':
          browser = await chromium.launch({ headless: DEFAULT_CONFIG.headless });
          break;
        case 'firefox':
          browser = await firefox.launch({ headless: DEFAULT_CONFIG.headless });
          break;
        case 'webkit':
          browser = await webkit.launch({ headless: DEFAULT_CONFIG.headless });
          break;
        default: {
          const exhaustiveCheck: never = browserType;
          throw new Error(`Unsupported browser type: ${String(exhaustiveCheck)}`);
        }
      }

      this.browsers.set(browserType, browser);
      this.logger.info('Browser launched successfully', { browserType });

      return browser;
    } catch (error) {
      this.logger.error('Failed to launch browser', {
        browserType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BrowserError(
        `Failed to launch ${browserType} browser`,
        BrowserErrorCode.BROWSER_LAUNCH_FAILED,
        { browserType },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a new browser context
   */
  async createContext(config: BrowserContextConfig = {}): Promise<string> {
    if (!this.isInitialized) {
      this.initialize();
    }

    const browserType = config.browserType || DEFAULT_CONFIG.browserType;
    const contextId = this.generateContextId();

    this.logger.info('Creating browser context', { contextId, browserType, config });

    try {
      // Get browser instance
      const browser = await this.getBrowser(browserType);

      // Build context options
      const contextOptions: Parameters<Browser['newContext']>[0] = {
        viewport: config.viewport || DEFAULT_CONFIG.viewport,
      };

      // Add optional properties only if they exist
      if (config.userAgent) {
        contextOptions.userAgent = config.userAgent;
      }
      if (config.locale) {
        contextOptions.locale = config.locale;
      }
      if (config.timezone) {
        contextOptions.timezoneId = config.timezone;
      }
      if (config.permissions) {
        contextOptions.permissions = config.permissions;
      }
      if (config.geolocation) {
        contextOptions.geolocation = config.geolocation;
      }
      if (config.colorScheme) {
        contextOptions.colorScheme = config.colorScheme;
      }
      if (config.deviceScaleFactor) {
        contextOptions.deviceScaleFactor = config.deviceScaleFactor;
      }

      // Create browser context
      const context = await browser.newContext(contextOptions);

      // Set default timeout
      context.setDefaultTimeout(config.timeout || DEFAULT_CONFIG.timeout);

      // Create managed context
      const managedContext: ManagedContext = {
        id: contextId,
        browserType,
        context,
        pages: new Map(),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        config,
        status: 'active',
      };

      this.contexts.set(contextId, managedContext);

      this.logger.info('Browser context created successfully', { contextId, browserType });
      this.emit('context:created', { contextId, config });

      return contextId;
    } catch (error) {
      this.logger.error('Failed to create browser context', {
        contextId,
        browserType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BrowserError(
        'Failed to create browser context',
        BrowserErrorCode.CONTEXT_CREATION_FAILED,
        { contextId, browserType },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Close a browser context
   */
  async closeContext(contextId: string): Promise<void> {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) {
      throw new BrowserError(
        `Context not found: ${contextId}`,
        BrowserErrorCode.CONTEXT_NOT_FOUND,
        { contextId }
      );
    }

    this.logger.info('Closing browser context', { contextId });

    try {
      // Close all pages
      for (const [pageId, page] of managedContext.pages.entries()) {
        try {
          await page.close();
          this.logger.debug('Page closed', { contextId, pageId });
        } catch (error) {
          this.logger.warn('Error closing page', {
            contextId,
            pageId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Close context
      await managedContext.context.close();
      managedContext.status = 'closed';

      // Remove from map
      this.contexts.delete(contextId);

      this.logger.info('Browser context closed successfully', { contextId });
      this.emit('context:closed', { contextId });
    } catch (error) {
      this.logger.error('Failed to close browser context', {
        contextId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BrowserError(
        `Failed to close browser context: ${contextId}`,
        BrowserErrorCode.CONTEXT_NOT_FOUND,
        { contextId },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * List all contexts
   */
  listContexts(): BrowserContextInfo[] {
    const contexts: BrowserContextInfo[] = [];

    for (const managedContext of this.contexts.values()) {
      contexts.push({
        id: managedContext.id,
        browserType: managedContext.browserType,
        createdAt: managedContext.createdAt,
        pageCount: managedContext.pages.size,
        status: managedContext.status,
      });
    }

    return contexts;
  }

  /**
   * Get context information
   */
  getContext(contextId: string): BrowserContextInfo | undefined {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) {
      return undefined;
    }

    return {
      id: managedContext.id,
      browserType: managedContext.browserType,
      createdAt: managedContext.createdAt,
      pageCount: managedContext.pages.size,
      status: managedContext.status,
    };
  }

  /**
   * Navigate to a URL in the context
   */
  async navigate(contextId: string, url: string, options: NavigateOptions = {}): Promise<string> {
    const managedContext = this.getManagedContext(contextId);
    const pageId = this.generatePageId();

    this.logger.info('Navigating to URL', { contextId, pageId, url, options });

    const startTime = Date.now();

    try {
      // Create new page
      const page = await managedContext.context.newPage();

      // Set referer if provided
      if (options.referer) {
        await page.setExtraHTTPHeaders({
          referer: options.referer,
        });
      }

      // Update last accessed time
      managedContext.lastAccessedAt = new Date();

      this.emit('navigation:start', { contextId, pageId, url });

      // Navigate to URL
      const waitUntil = options.waitUntil || 'load';
      const timeout = options.timeout || managedContext.config.timeout || DEFAULT_CONFIG.timeout;

      await page.goto(url, {
        waitUntil,
        timeout,
      });

      // Store page
      managedContext.pages.set(pageId, page);

      const duration = Date.now() - startTime;

      this.logger.info('Navigation completed successfully', {
        contextId,
        pageId,
        url,
        duration,
      });

      this.emit('navigation:complete', { contextId, pageId, url, duration });
      this.emit('page:created', { contextId, pageId, url });

      return pageId;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Navigation failed', {
        contextId,
        pageId,
        url,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      // Determine error code based on error message
      let errorCode = BrowserErrorCode.NAVIGATION_FAILED;
      if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
        errorCode = BrowserErrorCode.NAVIGATION_TIMEOUT;
      }

      throw new BrowserError(
        `Failed to navigate to ${url}`,
        errorCode,
        { contextId, pageId, url, duration },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get page content (rendered HTML)
   */
  async getPageContent(contextId: string, pageId?: string): Promise<string> {
    const page = this.getPage(contextId, pageId);
    const managedContext = this.getManagedContext(contextId);

    this.logger.debug('Getting page content', { contextId, pageId: pageId || 'default' });

    try {
      // Update last accessed time
      managedContext.lastAccessedAt = new Date();

      const content = await page.content();

      this.logger.debug('Page content retrieved successfully', {
        contextId,
        pageId: pageId || 'default',
        contentLength: content.length,
      });

      return content;
    } catch (error) {
      this.logger.error('Failed to get page content', {
        contextId,
        pageId: pageId || 'default',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new BrowserError(
        'Failed to get page content',
        BrowserErrorCode.PAGE_NOT_FOUND,
        { contextId, pageId },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(
    contextId: string,
    options: ScreenshotOptions = {},
    pageId?: string
  ): Promise<Buffer> {
    const page = this.getPage(contextId, pageId);
    const managedContext = this.getManagedContext(contextId);

    this.logger.info('Taking screenshot', { contextId, pageId: pageId || 'default', options });

    try {
      // Update last accessed time
      managedContext.lastAccessedAt = new Date();

      // Build screenshot options
      const screenshotOptions: Parameters<Page['screenshot']>[0] = {
        fullPage: options.fullPage ?? false,
      };

      // Add optional properties only if they exist
      if (options.path) {
        screenshotOptions.path = options.path;
      }
      if (options.clip) {
        screenshotOptions.clip = options.clip;
      }
      if (options.type) {
        screenshotOptions.type = options.type;
      }
      if (options.quality !== undefined) {
        screenshotOptions.quality = options.quality;
      }

      const screenshot = await page.screenshot(screenshotOptions);

      this.logger.info('Screenshot taken successfully', {
        contextId,
        pageId: pageId || 'default',
        size: screenshot.length,
      });

      return screenshot;
    } catch (error) {
      this.logger.error('Failed to take screenshot', {
        contextId,
        pageId: pageId || 'default',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new BrowserError(
        'Failed to take screenshot',
        BrowserErrorCode.SCREENSHOT_FAILED,
        { contextId, pageId },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate PDF
   */
  async generatePDF(
    contextId: string,
    options: PDFOptions = {},
    pageId?: string
  ): Promise<Buffer> {
    const page = this.getPage(contextId, pageId);
    const managedContext = this.getManagedContext(contextId);

    this.logger.info('Generating PDF', { contextId, pageId: pageId || 'default', options });

    try {
      // Update last accessed time
      managedContext.lastAccessedAt = new Date();

      // Build PDF options
      const pdfOptions: Parameters<Page['pdf']>[0] = {
        printBackground: options.printBackground ?? true,
      };

      // Add optional properties only if they exist
      if (options.path) {
        pdfOptions.path = options.path;
      }
      if (options.format) {
        pdfOptions.format = options.format;
      }
      if (options.landscape !== undefined) {
        pdfOptions.landscape = options.landscape;
      }
      if (options.margin) {
        pdfOptions.margin = options.margin;
      }

      const pdf = await page.pdf(pdfOptions);

      this.logger.info('PDF generated successfully', {
        contextId,
        pageId: pageId || 'default',
        size: pdf.length,
      });

      return pdf;
    } catch (error) {
      this.logger.error('Failed to generate PDF', {
        contextId,
        pageId: pageId || 'default',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new BrowserError(
        'Failed to generate PDF',
        BrowserErrorCode.PDF_GENERATION_FAILED,
        { contextId, pageId },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Execute JavaScript in page context
   */
  async executeJavaScript(
    contextId: string,
    script: string,
    pageId?: string
  ): Promise<JavaScriptResult> {
    const page = this.getPage(contextId, pageId);
    const managedContext = this.getManagedContext(contextId);

    this.logger.info('Executing JavaScript', {
      contextId,
      pageId: pageId || 'default',
      scriptLength: script.length,
    });

    try {
      // Update last accessed time
      managedContext.lastAccessedAt = new Date();

      const result = await page.evaluate(script);

      this.logger.info('JavaScript executed successfully', {
        contextId,
        pageId: pageId || 'default',
      });

      return {
        success: true,
        result,
      };
    } catch (error) {
      this.logger.error('JavaScript execution failed', {
        contextId,
        pageId: pageId || 'default',
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all pages in a context
   */
  listPages(contextId: string): BrowserPageInfo[] {
    const managedContext = this.getManagedContext(contextId);
    const pages: BrowserPageInfo[] = [];

    for (const [pageId, page] of managedContext.pages.entries()) {
      pages.push({
        id: pageId,
        contextId,
        url: page.url(),
        title: '', // Title will be fetched asynchronously if needed
        createdAt: managedContext.createdAt, // Using context creation time as approximation
      });
    }

    return pages;
  }

  /**
   * Close a specific page
   */
  async closePage(contextId: string, pageId: string): Promise<void> {
    const managedContext = this.getManagedContext(contextId);
    const page = managedContext.pages.get(pageId);

    if (!page) {
      throw new BrowserError(
        `Page not found: ${pageId}`,
        BrowserErrorCode.PAGE_NOT_FOUND,
        { contextId, pageId }
      );
    }

    this.logger.info('Closing page', { contextId, pageId });

    try {
      await page.close();
      managedContext.pages.delete(pageId);

      this.logger.info('Page closed successfully', { contextId, pageId });
      this.emit('page:closed', { contextId, pageId });
    } catch (error) {
      this.logger.error('Failed to close page', {
        contextId,
        pageId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new BrowserError(
        `Failed to close page: ${pageId}`,
        BrowserErrorCode.PAGE_NOT_FOUND,
        { contextId, pageId },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get managed context (throws if not found)
   */
  private getManagedContext(contextId: string): ManagedContext {
    const managedContext = this.contexts.get(contextId);
    if (!managedContext) {
      throw new BrowserError(
        `Context not found: ${contextId}`,
        BrowserErrorCode.CONTEXT_NOT_FOUND,
        { contextId }
      );
    }

    if (managedContext.status !== 'active') {
      throw new BrowserError(
        `Context is not active: ${contextId}`,
        BrowserErrorCode.CONTEXT_NOT_FOUND,
        { contextId, status: managedContext.status }
      );
    }

    return managedContext;
  }

  /**
   * Get page (throws if not found)
   */
  private getPage(contextId: string, pageId?: string): Page {
    const managedContext = this.getManagedContext(contextId);

    // If no pageId provided, use the first/last page
    if (!pageId) {
      const pages = Array.from(managedContext.pages.values());
      if (pages.length === 0) {
        throw new BrowserError(
          `No pages found in context: ${contextId}`,
          BrowserErrorCode.PAGE_NOT_FOUND,
          { contextId }
        );
      }
      const lastPage = pages[pages.length - 1];
      if (!lastPage) {
        throw new BrowserError(
          `Failed to retrieve page from context: ${contextId}`,
          BrowserErrorCode.PAGE_NOT_FOUND,
          { contextId }
        );
      }
      return lastPage; // Return the most recently created page
    }

    const page = managedContext.pages.get(pageId);
    if (!page) {
      throw new BrowserError(
        `Page not found: ${pageId}`,
        BrowserErrorCode.PAGE_NOT_FOUND,
        { contextId, pageId }
      );
    }

    return page;
  }

  /**
   * Start cleanup scheduler for stale contexts
   */
  private startCleanupScheduler(): void {
    this.logger.info('Starting cleanup scheduler', {
      interval: DEFAULT_CONFIG.cleanupInterval,
    });

    this.cleanupTimer = setInterval(() => {
      void this.cleanupStaleContexts();
    }, DEFAULT_CONFIG.cleanupInterval);

    // Prevent the timer from keeping the process alive
    this.cleanupTimer.unref();
  }

  /**
   * Clean up stale contexts (contexts that haven't been accessed recently)
   */
  private async cleanupStaleContexts(): Promise<void> {
    const now = Date.now();
    const closedContextIds: string[] = [];

    for (const [contextId, managedContext] of this.contexts.entries()) {
      const age = now - managedContext.lastAccessedAt.getTime();

      if (age > DEFAULT_CONFIG.contextMaxAge) {
        this.logger.info('Cleaning up stale context', {
          contextId,
          age,
          maxAge: DEFAULT_CONFIG.contextMaxAge,
        });

        try {
          await this.closeContext(contextId);
          closedContextIds.push(contextId);
        } catch (error) {
          this.logger.warn('Failed to cleanup stale context', {
            contextId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (closedContextIds.length > 0) {
      this.logger.info('Stale contexts cleaned up', {
        count: closedContextIds.length,
        contextIds: closedContextIds,
      });
      this.emit('cleanup:stale', { closedContextIds });
    }
  }

  /**
   * Generate unique context ID
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique page ID
   */
  private generatePageId(): string {
    return `page_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
