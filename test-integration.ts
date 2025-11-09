/**
 * Comprehensive Integration Tests for Enhanced Fetch MCP
 * Tests all new features: FetchClient, ContentExtractor, and BrowserSandboxManager
 */

import { FetchClient } from './dist/fetch-client.js';
import { ContentExtractor } from './dist/content-extractor.js';
import { BrowserSandboxManager } from './dist/browser-sandbox-manager.js';
import { Logger } from './dist/logger.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];
let totalTests = 0;
let passedTests = 0;

function logTest(name: string, passed: boolean, error?: string, details?: Record<string, unknown>) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✓ ${name}`);
  } else {
    console.error(`✗ ${name}`);
    if (error) console.error(`  Error: ${error}`);
  }

  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  results.push({ name, passed, error, details });
}

async function testFetchClient() {
  console.log('\n=== Test Suite 1: FetchClient ===\n');
  const logger = new Logger('test-fetch-client');
  const fetchClient = new FetchClient(logger);

  // Test 1: Basic GET request
  try {
    const response = await fetchClient.get('https://example.com');
    logTest('FetchClient: Basic GET request',
      response.status === 200 && response.body.length > 0,
      undefined,
      {
        status: response.status,
        contentLength: response.body.length,
        finalUrl: response.finalUrl
      }
    );
  } catch (error) {
    logTest('FetchClient: Basic GET request', false, (error as Error).message);
  }

  // Test 2: GET with custom headers
  try {
    const response = await fetchClient.get('https://httpbin.org/headers', {
      headers: { 'X-Custom-Header': 'test-value' }
    });
    logTest('FetchClient: GET with custom headers',
      response.status === 200,
      undefined,
      { status: response.status }
    );
  } catch (error) {
    logTest('FetchClient: GET with custom headers', false, (error as Error).message);
  }

  // Test 3: POST request
  try {
    const response = await fetchClient.post('https://httpbin.org/post', {
      body: JSON.stringify({ test: 'data' }),
      headers: { 'Content-Type': 'application/json' }
    });
    logTest('FetchClient: POST request',
      response.status === 200,
      undefined,
      { status: response.status }
    );
  } catch (error) {
    logTest('FetchClient: POST request', false, (error as Error).message);
  }

  // Test 4: Request with timeout
  try {
    const response = await fetchClient.get('https://example.com', {
      timeout: 5000
    });
    logTest('FetchClient: Request with timeout',
      response.status === 200,
      undefined,
      { status: response.status }
    );
  } catch (error) {
    logTest('FetchClient: Request with timeout', false, (error as Error).message);
  }

  // Test 5: Follow redirects
  try {
    const response = await fetchClient.get('https://httpbin.org/redirect/1', {
      followRedirects: true
    });
    logTest('FetchClient: Follow redirects',
      response.status === 200 && response.redirectCount > 0,
      undefined,
      {
        status: response.status,
        redirectCount: response.redirectCount,
        finalUrl: response.finalUrl
      }
    );
  } catch (error) {
    logTest('FetchClient: Follow redirects', false, (error as Error).message);
  }
}

async function testContentExtractor() {
  console.log('\n=== Test Suite 2: ContentExtractor ===\n');
  const logger = new Logger('test-content-extractor');
  const extractor = new ContentExtractor(logger);
  const fetchClient = new FetchClient(logger);

  // Test 1: Extract content from HTML
  try {
    const response = await fetchClient.get('https://example.com');
    const content = await extractor.extractContent(response.body, response.finalUrl);
    logTest('ContentExtractor: Basic extraction',
      content.title.length > 0 && content.stats.wordCount > 0,
      undefined,
      {
        title: content.title,
        wordCount: content.stats.wordCount,
        hasText: !!content.text
      }
    );
  } catch (error) {
    logTest('ContentExtractor: Basic extraction', false, (error as Error).message);
  }

  // Test 2: Extract with metadata
  try {
    const response = await fetchClient.get('https://example.com');
    const content = await extractor.extractContent(response.body, response.finalUrl, {
      includeMetadata: true
    });
    logTest('ContentExtractor: Extract with metadata',
      !!content.metadata,
      undefined,
      { hasMetadata: !!content.metadata }
    );
  } catch (error) {
    logTest('ContentExtractor: Extract with metadata', false, (error as Error).message);
  }

  // Test 3: Extract with links
  try {
    const response = await fetchClient.get('https://example.com');
    const content = await extractor.extractContent(response.body, response.finalUrl, {
      includeLinks: true
    });
    logTest('ContentExtractor: Extract with links',
      Array.isArray(content.links),
      undefined,
      { linkCount: content.links?.length || 0 }
    );
  } catch (error) {
    logTest('ContentExtractor: Extract with links', false, (error as Error).message);
  }

  // Test 4: Extract with images
  try {
    const response = await fetchClient.get('https://example.com');
    const content = await extractor.extractContent(response.body, response.finalUrl, {
      includeImages: true
    });
    logTest('ContentExtractor: Extract with images',
      Array.isArray(content.images),
      undefined,
      { imageCount: content.images?.length || 0 }
    );
  } catch (error) {
    logTest('ContentExtractor: Extract with images', false, (error as Error).message);
  }

  // Test 5: Convert to markdown
  try {
    const response = await fetchClient.get('https://example.com');
    const content = await extractor.extractContent(response.body, response.finalUrl, {
      convertToMarkdown: true
    });
    logTest('ContentExtractor: Convert to markdown',
      !!content.markdown && content.markdown.length > 0,
      undefined,
      {
        hasMarkdown: !!content.markdown,
        markdownLength: content.markdown?.length || 0
      }
    );
  } catch (error) {
    logTest('ContentExtractor: Convert to markdown', false, (error as Error).message);
  }

  // Test 6: Extract specific CSS selector
  try {
    const response = await fetchClient.get('https://example.com');
    const content = await extractor.extractContent(response.body, response.finalUrl, {
      selector: 'h1'
    });
    logTest('ContentExtractor: Extract with CSS selector',
      content.content.length > 0,
      undefined,
      { extractedText: content.content.substring(0, 100) }
    );
  } catch (error) {
    logTest('ContentExtractor: Extract with CSS selector', false, (error as Error).message);
  }

  // Test 7: Full extraction with all options
  try {
    const response = await fetchClient.get('https://example.com');
    const content = await extractor.extractContent(response.body, response.finalUrl, {
      includeMetadata: true,
      includeLinks: true,
      includeImages: true,
      convertToMarkdown: true
    });
    logTest('ContentExtractor: Full extraction with all options',
      !!content.title &&
      !!content.metadata &&
      Array.isArray(content.links) &&
      Array.isArray(content.images) &&
      !!content.markdown,
      undefined,
      {
        title: content.title,
        description: content.description?.substring(0, 100),
        linkCount: content.links?.length || 0,
        imageCount: content.images?.length || 0,
        hasMarkdown: !!content.markdown
      }
    );
  } catch (error) {
    logTest('ContentExtractor: Full extraction with all options', false, (error as Error).message);
  }
}

async function testBrowserSandboxManager() {
  console.log('\n=== Test Suite 3: BrowserSandboxManager ===\n');
  const logger = new Logger('test-browser-sandbox');
  const browserManager = new BrowserSandboxManager(logger);

  let contextId: string | undefined;
  let pageId: string | undefined;

  // Test 1: Initialize browser manager
  try {
    browserManager.initialize();
    logTest('BrowserSandboxManager: Initialize', true);
  } catch (error) {
    logTest('BrowserSandboxManager: Initialize', false, (error as Error).message);
    return; // Cannot continue without initialization
  }

  // Test 2: Create browser context
  try {
    contextId = await browserManager.createContext({
      browserType: 'chromium',
      headless: true,
      viewport: { width: 1920, height: 1080 }
    });
    logTest('BrowserSandboxManager: Create context',
      !!contextId,
      undefined,
      { contextId }
    );
  } catch (error) {
    logTest('BrowserSandboxManager: Create context', false, (error as Error).message);
    await browserManager.shutdown();
    return;
  }

  if (!contextId) {
    console.error('Failed to create context, skipping remaining browser tests');
    await browserManager.shutdown();
    return;
  }

  // Test 3: Navigate to URL
  try {
    pageId = await browserManager.navigate(contextId, 'https://example.com', {
      waitUntil: 'networkidle'
    });
    logTest('BrowserSandboxManager: Navigate to URL',
      !!pageId,
      undefined,
      { pageId }
    );
  } catch (error) {
    logTest('BrowserSandboxManager: Navigate to URL', false, (error as Error).message);
    await browserManager.closeContext(contextId);
    await browserManager.shutdown();
    return;
  }

  if (!pageId) {
    console.error('Failed to create page, skipping remaining browser tests');
    await browserManager.closeContext(contextId);
    await browserManager.shutdown();
    return;
  }

  // Test 4: Get page content
  try {
    const html = await browserManager.getPageContent(contextId, pageId);
    logTest('BrowserSandboxManager: Get page content',
      html.length > 0 && html.includes('<html'),
      undefined,
      { htmlLength: html.length }
    );
  } catch (error) {
    logTest('BrowserSandboxManager: Get page content', false, (error as Error).message);
  }

  // Test 5: Execute JavaScript
  try {
    const result = await browserManager.executeJavaScript(contextId, 'document.title', pageId);
    logTest('BrowserSandboxManager: Execute JavaScript',
      !!result.result,
      undefined,
      { pageTitle: result.result }
    );
  } catch (error) {
    logTest('BrowserSandboxManager: Execute JavaScript', false, (error as Error).message);
  }

  // Test 6: Execute complex JavaScript
  try {
    const result = await browserManager.executeJavaScript(
      contextId,
      'Array.from(document.querySelectorAll("h1")).map(h => h.textContent)',
      pageId
    );
    logTest('BrowserSandboxManager: Execute complex JavaScript',
      !!result.result,
      undefined,
      { result: result.result }
    );
  } catch (error) {
    logTest('BrowserSandboxManager: Execute complex JavaScript', false, (error as Error).message);
  }

  // Test 7: Take screenshot
  try {
    const screenshot = await browserManager.screenshot(contextId, {
      fullPage: false
    }, pageId);
    logTest('BrowserSandboxManager: Take screenshot',
      screenshot.length > 0,
      undefined,
      { screenshotSize: screenshot.length }
    );
  } catch (error) {
    logTest('BrowserSandboxManager: Take screenshot', false, (error as Error).message);
  }

  // Test 8: List contexts
  try {
    const contexts = browserManager.listContexts();
    logTest('BrowserSandboxManager: List contexts',
      contexts.length > 0 && contexts.some(c => c.id === contextId),
      undefined,
      { contextCount: contexts.length }
    );
  } catch (error) {
    logTest('BrowserSandboxManager: List contexts', false, (error as Error).message);
  }

  // Test 9: Close context
  try {
    await browserManager.closeContext(contextId);
    const contexts = browserManager.listContexts();
    logTest('BrowserSandboxManager: Close context',
      !contexts.some(c => c.id === contextId),
      undefined,
      { remainingContexts: contexts.length }
    );
  } catch (error) {
    logTest('BrowserSandboxManager: Close context', false, (error as Error).message);
  }

  // Test 10: Shutdown
  try {
    await browserManager.shutdown();
    logTest('BrowserSandboxManager: Shutdown', true);
  } catch (error) {
    logTest('BrowserSandboxManager: Shutdown', false, (error as Error).message);
  }
}

async function testCombinedOperations() {
  console.log('\n=== Test Suite 4: Combined Operations ===\n');
  const logger = new Logger('test-combined');
  const fetchClient = new FetchClient(logger);
  const extractor = new ContentExtractor(logger);

  // Test: Fetch + Extract pipeline
  try {
    const response = await fetchClient.get('https://example.com', {
      followRedirects: true,
      timeout: 10000
    });

    const content = await extractor.extractContent(response.body, response.finalUrl, {
      includeMetadata: true,
      includeLinks: true,
      includeImages: true,
      convertToMarkdown: true
    });

    logTest('Combined: Fetch + Extract pipeline',
      response.status === 200 &&
      content.title.length > 0 &&
      !!content.markdown,
      undefined,
      {
        fetchStatus: response.status,
        title: content.title,
        wordCount: content.stats.wordCount,
        linkCount: content.links?.length || 0,
        imageCount: content.images?.length || 0,
        hasMarkdown: !!content.markdown
      }
    );
  } catch (error) {
    logTest('Combined: Fetch + Extract pipeline', false, (error as Error).message);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`);

  if (totalTests - passedTests > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      if (r.error) console.log(`    Error: ${r.error}`);
    });
    console.log('');
  }

  console.log('='.repeat(60));
}

async function runAllTests() {
  console.log('Starting Enhanced Fetch MCP Integration Tests...\n');

  await testFetchClient();
  await testContentExtractor();
  await testBrowserSandboxManager();
  await testCombinedOperations();

  await printSummary();

  // Exit with appropriate code
  process.exit(totalTests === passedTests ? 0 : 1);
}

// Run all tests
runAllTests().catch((error) => {
  console.error('Fatal error during testing:', error);
  process.exit(1);
});
