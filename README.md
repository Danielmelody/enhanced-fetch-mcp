# Enhanced Fetch MCP

English | [简体中文](./README_ZH.md)

[![smithery badge](https://smithery.ai/badge/@Danielmelody/enhanced-fetch-mcp)](https://smithery.ai/server/@Danielmelody/enhanced-fetch-mcp)

A powerful MCP (Model Context Protocol) server that provides web scraping, content extraction, and browser automation capabilities for Claude Code.

## ✨ Features

- 🌐 **HTTP Web Fetching** - Full-featured HTTP client with custom headers, timeouts, and proxy support
- 📄 **Smart Content Extraction** - HTML to Markdown conversion with automatic metadata, link, and image extraction
- 🎭 **Browser Automation** - Playwright-based browser control (Chromium/Firefox/WebKit)
- 📸 **Screenshot & PDF** - Full-page screenshots, region capture, PDF generation
- 🐳 **Docker Sandbox** - Isolated container execution environments
- 🔧 **19 MCP Tools** - Covering all common web operation scenarios

## 🚀 Quick Start

### Installation

#### Method 1: Using mcp-get (Recommended)

```bash
# Install mcp-get if you haven't
npm install -g @michaellatman/mcp-get

# Install enhanced-fetch-mcp (automatically configures Claude Code)
mcp-get install enhanced-fetch-mcp
```

#### Method 2: Direct npm install

```bash
npm install -g enhanced-fetch-mcp
```

### Configure Claude Code

Edit `~/.config/claude/config.json`:

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    }
  }
}
```

### Start Using

Restart Claude Code, then simply chat:

```
Help me fetch the content from https://example.com
```

That's it!

## 📦 Available Tools

### Web Scraping Tools (3)

| Tool | Description |
|------|-------------|
| `fetch_url` | Send HTTP requests to fetch web pages |
| `extract_content` | Extract structured content from HTML |
| `fetch_and_extract` ⭐ | One-click fetch and extract (recommended) |

### Browser Automation Tools (8)

| Tool | Description |
|------|-------------|
| `create_browser_context` | Create browser context |
| `browser_navigate` | Navigate to URL |
| `browser_get_content` | Get rendered HTML |
| `browser_screenshot` | Capture page screenshot |
| `browser_pdf` | Generate PDF |
| `browser_execute_js` | Execute JavaScript |
| `list_browser_contexts` | List all browser contexts |
| `close_browser_context` | Close browser context |

### Docker Sandbox Tools (8)

| Tool | Description |
|------|-------------|
| `create_sandbox` | Create Docker sandbox |
| `execute_in_sandbox` | Execute commands in sandbox |
| `list_sandboxes` | List all sandboxes |
| `get_sandbox` | Get sandbox information |
| `pause_sandbox` | Pause sandbox |
| `resume_sandbox` | Resume sandbox |
| `cleanup_sandbox` | Cleanup sandbox |
| `get_sandbox_stats` | Get resource usage statistics |

## 💡 Usage Examples

### Simple Web Scraping

```
User: Fetch content from https://example.com

Claude automatically calls fetch_and_extract:
→ Fetch HTML
→ Extract title, description, body
→ Convert to Markdown
→ Return structured content
```

### JavaScript-Rendered Pages

```
User: This page requires browser rendering

Claude automatically uses browser tools:
→ Create browser context
→ Navigate to page
→ Wait for JavaScript execution
→ Get fully rendered content
```

### Web Screenshots

```
User: Take a screenshot of this page

Claude automatically calls browser screenshot:
→ Open page
→ Wait for loading completion
→ Capture full-page screenshot
→ Return PNG image
```

## 🔧 Feature Details

### HTTP Client Features

- ✅ Support all HTTP methods (GET, POST, PUT, DELETE, etc.)
- ✅ Custom headers, User-Agent, Cookie
- ✅ Timeout control (default 30s)
- ✅ Automatic redirect handling (max 5)
- ✅ Proxy support
- ✅ Request/response events

### Content Extraction Features

- ✅ High-quality HTML → Markdown conversion
- ✅ Smart main content identification
- ✅ Automatic ad and navigation removal
- ✅ Extract Open Graph, Twitter Card metadata
- ✅ Extract all links (deduplicated)
- ✅ Extract all images (with attributes)
- ✅ Calculate word count, reading time

### Browser Automation Features

- ✅ Support Chromium, Firefox, WebKit
- ✅ Headless/headed modes
- ✅ Custom viewport, User-Agent
- ✅ Network idle waiting
- ✅ JavaScript execution
- ✅ Screenshots (PNG/JPEG, full-page/region)
- ✅ PDF generation (A4/Letter/Legal)
- ✅ Multi-page management
- ✅ Automatic resource cleanup

## 🆚 Comparison with Claude Code Built-in WebFetch

| Feature | Built-in WebFetch | Enhanced Fetch MCP |
|---------|------------------|-------------------|
| Basic HTTP Requests | ✅ | ✅ |
| Content Extraction | ✅ Basic | ✅ Enhanced (metadata, links, images) |
| Markdown Conversion | ✅ | ✅ |
| JavaScript Rendering | ❌ | ✅ Playwright |
| Browser Control | ❌ | ✅ Full control |
| Screenshot/PDF | ❌ | ✅ |
| Custom Headers | Limited | ✅ Full customization |
| Redirect Control | Limited | ✅ Full control |
| Proxy Support | ❌ | ✅ |

**Conclusion**: Enhanced Fetch MCP is a powerful replacement for the built-in WebFetch!

## 📋 System Requirements

### Required

- Node.js >= 18.0.0
- npm >= 8.0.0

### Optional (for specific features)

- Docker (for sandbox functionality)
- Sufficient disk space (Playwright browsers ~300MB)

## 🔍 Verify Installation

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

## 🐛 Troubleshooting

### Command Not Found

```bash
# Check installation
npm list -g enhanced-fetch-mcp

# Reinstall
npm install -g enhanced-fetch-mcp

# Check path
which enhanced-fetch-mcp
```

### Docker Not Running (affects sandbox functionality)

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Verify
docker ps
```

### View Logs

```bash
# Server logs
tail -f ~/.local/share/enhanced-fetch-mcp/logs/browser-mcp.log

# Error logs
tail -f ~/.local/share/enhanced-fetch-mcp/logs/browser-mcp-error.log
```

## 🔄 Update

```bash
npm update -g enhanced-fetch-mcp
```

## 🛠️ Development

### Install from Source

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

### Project Structure

```
enhanced-fetch-mcp/
├── src/
│   ├── fetch-client.ts           # HTTP client
│   ├── content-extractor.ts      # Content extractor
│   ├── browser-sandbox-manager.ts # Browser manager
│   ├── mcp-server.ts             # MCP server
│   ├── sandbox-manager.ts        # Docker sandbox manager
│   ├── types.ts                  # Type definitions
│   ├── logger.ts                 # Logging system
│   └── index.ts                  # Entry point
├── dist/                          # Compiled output
├── logs/                          # Log directory
└── README.md                      # This file
```

## 📊 Performance Metrics

| Operation | Average Time |
|-----------|--------------|
| HTTP Request | 200-300ms |
| Content Extraction | 10-50ms |
| Browser Launch | 300-500ms |
| Page Navigation | 1.5-2s |
| Screenshot | ~50ms |
| JavaScript Execution | <10ms |

## 🤝 Contributing

Contributions are welcome! Please submit a Pull Request or create an Issue.

## 📄 License

MIT License

## 🙏 Acknowledgments

- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP protocol implementation
- [Playwright](https://playwright.dev/) - Browser automation
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion
- [Dockerode](https://github.com/apocas/dockerode) - Docker API

---

**Start using it now!** 🚀

```bash
npm install -g enhanced-fetch-mcp
```