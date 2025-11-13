# Enhanced Fetch MCP

English | [简体中文](./README_ZH.md)

[![smithery badge](https://smithery.ai/badge/@Danielmelody/enhanced-fetch-mcp)](https://smithery.ai/server/@Danielmelody/enhanced-fetch-mcp)

**An AI-native web interaction layer that elevates Playwright into an intelligent, secure, and efficient service for AI agents.**

| Feature | Claude's Native Fetch | Standard Playwright | Enhanced Fetch MCP |
| :--- | :--- | :--- | :--- |
| **Content Extraction** | Basic | Manual Parsing | **Advanced**: Extracts main content, metadata, links, and images into clean Markdown. |
| **JavaScript Rendering** | ❌ No | ✅ Yes | **✅ Yes**: Full browser rendering for dynamic pages. |
| **Security** | ✅ Safe | ⚠️ Browser Sandbox | **🔒 Maximum Security**: All operations are isolated in a Docker container. |
| **Resource Efficiency** | High | Low | **Hybrid Engine**: Intelligently switches between lightweight HTTP and a full browser. |
| **Screenshots & PDFs** | ❌ No | ✅ Yes | **✅ Yes**: Captures screenshots and generates PDFs. |
| **Control & Customization** | Limited | High | **Full Control**: Customizable headers, timeouts, and more. |

---

## Quick Start

### Option 1: Local Installation

**1. Install:**
```bash
npm install -g enhanced-fetch-mcp
```

**2. Configure Claude Code (`~/.config/claude/config.json`):**
```json
{
  "mcpServers": { "enhanced-fetch": { "command": "enhanced-fetch-mcp" } }
}
```

**3. Use:**
> "Fetch the main content of `https://example.com` and take a screenshot."

### Option 2: Install via Smithery

Alternatively, you can use Smithery to simplify the installation and configuration process.

**Install via Smithery:**
[https://smithery.ai/server/@Danielmelody/enhanced-fetch-mcp](https://smithery.ai/server/@Danielmelody/enhanced-fetch-mcp)

Smithery automates the installation, dependency management, and MCP configuration for you. **Important:** The server runs entirely on your local machine—no data is sent to external servers. You maintain full control over your browsing activities, screenshots, and extracted content, ensuring maximum privacy and security.

---

## Tools

#### Web Scraping Tools (3)

| Tool | Description |
|------|-------------|
| `fetch_url` | Makes a direct HTTP request to a URL to retrieve its raw HTML content. It supports various methods (GET, POST, etc.), custom headers, and other advanced options. |
| `extract_content` | Parses raw HTML to pull out structured information. It identifies the main article, cleans it, and returns it in multiple formats (text, Markdown, and HTML), along with metadata, links, and images. |
| `fetch_and_extract` | A convenient, all-in-one tool that first fetches a URL and then automatically extracts its content. It intelligently decides whether to use a simple HTTP request or a full browser. |

#### Browser Automation Tools (8)

| Tool | Description |
|------|-------------|
| `create_browser_context` | Initializes and launches a new, isolated browser instance (like Chrome, Firefox, or WebKit) with a clean session, returning a unique ID for future operations. |
| `browser_navigate` | Instructs a specific browser instance to visit a URL and waits for the page to load, including executing any initial JavaScript. |
| `browser_get_content` | Retrieves the full HTML of a page after it has been rendered by the browser, ensuring all dynamic content is present. |
| `browser_screenshot` | Captures a visual snapshot of the current page in the browser, which can be a full-page or a specific region, and returns the image data. |
| `browser_pdf` | Generates a PDF document from the current page's content, allowing for a printable, offline version of the web page. |
| `browser_execute_js` | Runs a custom JavaScript snippet within the context of the current page, enabling interaction with page elements or data retrieval. |
| `list_browser_contexts` | Returns a list of all currently active browser instances that have been created, along with their IDs and status. |
| `close_browser_context` | Terminates a browser instance and cleans up all associated resources, including closing all its pages and freeing up memory. |

#### Docker Sandbox Tools (8)

| Tool | Description |
|------|-------------|
| `create_sandbox` | Provisions a new, secure Docker container with a specified image, providing an isolated environment for command execution. |
| `execute_in_sandbox` | Runs a shell command inside a designated Docker sandbox and returns its standard output, error, and exit code. |
| `list_sandboxes` | Provides a list of all currently running Docker sandboxes, including their IDs, names, and current status. |
| `get_sandbox` | Retrieves detailed information about a specific sandbox, such as its configuration, running state, and network settings. |
| `pause_sandbox` | Temporarily freezes a running sandbox, preserving its state while consuming minimal CPU resources. |
| `resume_sandbox` | Unpauses a previously paused sandbox, allowing it to continue execution from where it left off. |
| `cleanup_sandbox` | Stops and completely removes a sandbox container, deleting its file system and freeing up all associated system resources. |
| `get_sandbox_stats` | Fetches real-time resource usage metrics for a sandbox, including CPU, memory, and network I/O. |

### Usage Examples

#### Simple Web Scraping

```
User: Fetch content from https://example.com

Claude automatically calls fetch_and_extract:
→ Fetch HTML
→ Extract title, description, body
→ Convert to Markdown
→ Return structured content
```

#### JavaScript-Rendered Pages

```
User: This page requires browser rendering

Claude automatically uses browser tools:
→ Create browser context
→ Navigate to page
→ Wait for JavaScript execution
→ Get fully rendered content
```

#### Web Screenshots

```
User: Take a screenshot of this page

Claude automatically calls browser screenshot:
→ Open page
→ Wait for loading completion
→ Capture full-page screenshot
→ Return PNG image
```

### System Requirements

#### Required

- Node.js >= 18.0.0
- npm >= 8.0.0

#### Optional (for specific features)

- Docker (for sandbox functionality)
- Sufficient disk space (Playwright browsers ~300MB)

### Verify Installation

```bash
# Check if command is available
enhanced-fetch-mcp --version
# Output: v1.0.0

# View help
enhanced-fetch-mcp --help

# Test run (Ctrl+C to exit)
enhanced-fetch-mcp
# Output: Enhanced Fetch MCP Server running on stdio
```

### Troubleshooting

#### Command Not Found

```bash
# Check installation
npm list -g enhanced-fetch-mcp

# Reinstall
npm install -g enhanced-fetch-mcp

# Check path
which enhanced-fetch-mcp
```

#### Docker Not Running (affects sandbox functionality)

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Verify
docker ps
```

#### View Logs

```bash
# Server logs
tail -f ~/.local/share/enhanced-fetch-mcp/logs/browser-mcp.log

# Error logs
tail -f ~/.local/share/enhanced-fetch-mcp/logs/browser-mcp-error.log
```

### Update

```bash
npm update -g enhanced-fetch-mcp
```

### Development

#### Install from Source

```bash
# Clone project
git clone https://github.com/yourusername/enhanced-fetch-mcp.git
cd enhanced-fetch-mcp

# Install dependencies
npm install

# Build
npm run build

# Global link (development mode)
npm link

# Run tests
npm test

# Development mode (watch for changes)
npm run dev
```

### Performance Metrics

| Operation | Average Time |
|-----------|--------------|
| HTTP Request | 200-300ms |
| Content Extraction | 10-50ms |
| Browser Launch | 300-500ms |
| Page Navigation | 1.5-2s |
| Screenshot | ~50ms |
| JavaScript Execution | <10ms |

### Contributing

Contributions are welcome! Please submit a Pull Request or create an Issue.

### License

MIT License

### Acknowledgments

- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP protocol implementation
- [Playwright](https://playwright.dev/) - Browser automation
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion
- [Dockerode](https://github.com/apocas/dockerode) - Docker API
