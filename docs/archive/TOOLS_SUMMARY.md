# Enhanced Fetch MCP - Tools Summary

## Overview
Total Tools: **19**
- Docker Sandbox Tools: 8
- Web Fetch Tools: 3
- Browser Automation Tools: 8

---

## Docker Sandbox Tools (8 tools)

### 1. create_sandbox
Create a new isolated Docker sandbox environment
- **Parameters:** name, image, memoryLimit, cpuLimit, timeout, env, workDir
- **Returns:** Sandbox ID and details

### 2. execute_in_sandbox
Execute a command inside a sandbox
- **Parameters:** sandboxId, command (array)
- **Returns:** stdout, stderr, exit code

### 3. list_sandboxes
List all active sandboxes
- **Parameters:** None
- **Returns:** Array of sandbox information

### 4. get_sandbox
Get detailed information about a specific sandbox
- **Parameters:** sandboxId
- **Returns:** Detailed sandbox status and metrics

### 5. pause_sandbox
Pause a running sandbox
- **Parameters:** sandboxId
- **Returns:** Success status

### 6. resume_sandbox
Resume a paused sandbox
- **Parameters:** sandboxId
- **Returns:** Success status

### 7. cleanup_sandbox
Remove a sandbox and clean up resources
- **Parameters:** sandboxId
- **Returns:** Success status

### 8. get_sandbox_stats
Get statistics for a specific sandbox
- **Parameters:** sandboxId
- **Returns:** CPU, memory, network stats

---

## Web Fetch Tools (3 tools)

### 9. fetch_url
Fetch a URL with full HTTP client capabilities
- **Parameters:** 
  - url (required)
  - method (GET, POST, PUT, DELETE, PATCH)
  - headers (object)
  - body (string)
  - timeout (ms)
  - followRedirects (boolean)
  - maxRedirects (number)
- **Returns:** status, headers, body, finalUrl, redirectCount, timings

### 10. extract_content
Extract structured content from HTML
- **Parameters:**
  - html (required)
  - url (required)
  - includeMetadata (boolean)
  - includeLinks (boolean)
  - includeImages (boolean)
  - convertToMarkdown (boolean)
  - selector (CSS selector)
- **Returns:** title, description, content, markdown, metadata, links, images, stats

### 11. fetch_and_extract
Combined operation: fetch URL and extract content
- **Parameters:** All parameters from fetch_url + extract_content
- **Returns:** Combined results from both operations

---

## Browser Automation Tools (8 tools)

### 12. create_browser_context
Create a new isolated browser context
- **Parameters:**
  - browserType (chromium, firefox, webkit)
  - headless (boolean)
  - viewport (width, height)
  - userAgent (string)
  - locale (string)
  - timezone (string)
  - permissions (array)
  - geolocation (object)
- **Returns:** contextId

### 13. browser_navigate
Navigate to a URL in a browser context
- **Parameters:**
  - contextId (required)
  - url (required)
  - pageId (optional)
  - waitUntil (load, domcontentloaded, networkidle)
  - timeout (ms)
- **Returns:** pageId, finalUrl

### 14. browser_get_content
Get the rendered HTML content from a page
- **Parameters:**
  - contextId (required)
  - pageId (optional)
- **Returns:** HTML content as string

### 15. browser_screenshot
Capture a screenshot of a page
- **Parameters:**
  - contextId (required)
  - pageId (optional)
  - fullPage (boolean)
  - type (png, jpeg)
  - quality (number, 0-100)
  - clip (x, y, width, height)
- **Returns:** Screenshot as base64-encoded PNG/JPEG

### 16. browser_pdf
Generate a PDF from a page
- **Parameters:**
  - contextId (required)
  - pageId (optional)
  - format (A4, Letter, etc.)
  - landscape (boolean)
  - printBackground (boolean)
  - margin (top, right, bottom, left)
- **Returns:** PDF as base64-encoded data

### 17. browser_execute_js
Execute JavaScript code in the page context
- **Parameters:**
  - contextId (required)
  - script (required - JavaScript code)
  - pageId (optional)
  - args (array - arguments to pass to script)
- **Returns:** Result of script execution

### 18. list_browser_contexts
List all active browser contexts
- **Parameters:** None
- **Returns:** Array of context information (id, browser type, status, pages)

### 19. close_browser_context
Close a browser context and cleanup resources
- **Parameters:** contextId (required)
- **Returns:** Success status

---

## Usage Examples

### Example 1: Simple Web Fetch
```json
{
  "tool": "fetch_url",
  "params": {
    "url": "https://example.com",
    "followRedirects": true
  }
}
```

### Example 2: Fetch and Extract Content
```json
{
  "tool": "fetch_and_extract",
  "params": {
    "url": "https://example.com",
    "includeMetadata": true,
    "includeLinks": true,
    "convertToMarkdown": true
  }
}
```

### Example 3: Browser Automation
```json
// Create context
{
  "tool": "create_browser_context",
  "params": {
    "browserType": "chromium",
    "headless": true,
    "viewport": {"width": 1920, "height": 1080}
  }
}

// Navigate
{
  "tool": "browser_navigate",
  "params": {
    "contextId": "ctx_xxx",
    "url": "https://example.com",
    "waitUntil": "networkidle"
  }
}

// Take screenshot
{
  "tool": "browser_screenshot",
  "params": {
    "contextId": "ctx_xxx",
    "fullPage": true
  }
}

// Cleanup
{
  "tool": "close_browser_context",
  "params": {
    "contextId": "ctx_xxx"
  }
}
```

### Example 4: Docker Sandbox
```json
// Create sandbox
{
  "tool": "create_sandbox",
  "params": {
    "name": "my-sandbox",
    "image": "node:20-alpine",
    "memoryLimit": "512m"
  }
}

// Execute command
{
  "tool": "execute_in_sandbox",
  "params": {
    "sandboxId": "sandbox_xxx",
    "command": ["node", "-v"]
  }
}
```

---

## Tool Categories by Use Case

### Web Scraping & Content Extraction:
- fetch_url
- extract_content
- fetch_and_extract

### Browser Automation & Testing:
- create_browser_context
- browser_navigate
- browser_get_content
- browser_screenshot
- browser_pdf
- browser_execute_js
- list_browser_contexts
- close_browser_context

### Code Execution & Isolation:
- create_sandbox
- execute_in_sandbox
- list_sandboxes
- get_sandbox
- pause_sandbox
- resume_sandbox
- cleanup_sandbox
- get_sandbox_stats

---

**Last Updated:** 2025-11-09
**Version:** 1.0.0
