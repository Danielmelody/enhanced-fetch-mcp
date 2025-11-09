# Enhanced Fetch MCP

[English](./README.md) | 简体中文

一个功能强大的 MCP (Model Context Protocol) 服务器，为 Claude Code 提供网页抓取、内容提取和浏览器自动化能力。

## ✨ 特性

- 🌐 **HTTP 网页获取** - 完整的 HTTP 客户端，支持自定义 headers、超时、代理
- 📄 **智能内容提取** - HTML 转 Markdown，自动提取元数据、链接、图片
- 🎭 **浏览器自动化** - 基于 Playwright 的浏览器控制（Chromium/Firefox/WebKit）
- 📸 **截图和 PDF** - 全页面截图、区域截图、PDF 生成
- 🐳 **Docker 沙箱** - 隔离的容器执行环境
- 🔧 **19 个 MCP 工具** - 覆盖所有常见的 Web 操作场景

## 🚀 快速开始

### 安装

#### 方式 1: 使用 mcp-get（推荐）

```bash
# 安装 mcp-get（如果还没有）
npm install -g @michaellatman/mcp-get

# 安装 enhanced-fetch-mcp（自动配置 Claude Code）
mcp-get install enhanced-fetch-mcp
```

#### 方式 2: 直接 npm 安装

```bash
npm install -g enhanced-fetch-mcp
```

### 配置 Claude Code

编辑 `~/.config/claude/config.json`：

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    }
  }
}
```

### 开始使用

重启 Claude Code，然后直接对话：

```
帮我获取 https://example.com 的内容
```

就这么简单！

## 📦 可用工具

### 网页抓取工具（3个）

| 工具 | 描述 |
|------|------|
| `fetch_url` | 发送 HTTP 请求获取网页 |
| `extract_content` | 从 HTML 提取结构化内容 |
| `fetch_and_extract` ⭐ | 一键获取并提取（推荐） |

### 浏览器自动化工具（8个）

| 工具 | 描述 |
|------|------|
| `create_browser_context` | 创建浏览器上下文 |
| `browser_navigate` | 导航到 URL |
| `browser_get_content` | 获取渲染后的 HTML |
| `browser_screenshot` | 截取页面截图 |
| `browser_pdf` | 生成 PDF |
| `browser_execute_js` | 执行 JavaScript |
| `list_browser_contexts` | 列出所有浏览器上下文 |
| `close_browser_context` | 关闭浏览器上下文 |

### Docker 沙箱工具（8个）

| 工具 | 描述 |
|------|------|
| `create_sandbox` | 创建 Docker 沙箱 |
| `execute_in_sandbox` | 在沙箱中执行命令 |
| `list_sandboxes` | 列出所有沙箱 |
| `get_sandbox` | 获取沙箱信息 |
| `pause_sandbox` | 暂停沙箱 |
| `resume_sandbox` | 恢复沙箱 |
| `cleanup_sandbox` | 清理沙箱 |
| `get_sandbox_stats` | 获取资源使用统计 |

## 💡 使用示例

### 简单网页抓取

```
用户：获取 https://example.com 的内容

Claude 自动调用 fetch_and_extract：
→ 获取 HTML
→ 提取标题、描述、正文
→ 转换为 Markdown
→ 返回结构化内容
```

### JavaScript 渲染页面

```
用户：这个页面需要浏览器渲染

Claude 自动使用浏览器工具：
→ 创建浏览器上下文
→ 导航到页面
→ 等待 JavaScript 执行完成
→ 获取完整渲染的内容
```

### 网页截图

```
用户：给这个页面截个图

Claude 自动调用浏览器截图：
→ 打开页面
→ 等待加载完成
→ 截取全页面截图
→ 返回 PNG 图片
```

## 🔧 功能详解

### HTTP 客户端特性

- ✅ 支持所有 HTTP 方法（GET、POST、PUT、DELETE 等）
- ✅ 自定义 headers、User-Agent、Cookie
- ✅ 超时控制（默认 30 秒）
- ✅ 自动处理重定向（最多 5 次）
- ✅ 代理支持
- ✅ 请求/响应事件

### 内容提取特性

- ✅ HTML → Markdown 高质量转换
- ✅ 智能主内容识别
- ✅ 自动清理广告、导航
- ✅ 提取 Open Graph、Twitter Card 元数据
- ✅ 提取所有链接（去重）
- ✅ 提取所有图片（含属性）
- ✅ 计算字数、阅读时间

### 浏览器自动化特性

- ✅ 支持 Chromium、Firefox、WebKit
- ✅ 无头/有头模式
- ✅ 自定义 viewport、User-Agent
- ✅ 网络空闲等待
- ✅ JavaScript 执行
- ✅ 截图（PNG/JPEG，全页面/区域）
- ✅ PDF 生成（A4/Letter/Legal）
- ✅ 多页面管理
- ✅ 自动资源清理

## 🆚 与 Claude Code 内置 WebFetch 对比

| 功能 | 内置 WebFetch | Enhanced Fetch MCP |
|------|--------------|-------------------|
| 基础 HTTP 请求 | ✅ | ✅ |
| 内容提取 | ✅ 基础 | ✅ 增强（元数据、链接、图片） |
| Markdown 转换 | ✅ | ✅ |
| JavaScript 渲染 | ❌ | ✅ Playwright |
| 浏览器控制 | ❌ | ✅ 完全控制 |
| 截图/PDF | ❌ | ✅ |
| 自定义 Headers | 有限 | ✅ 完全自定义 |
| 重定向控制 | 有限 | ✅ 完全控制 |
| 代理支持 | ❌ | ✅ |

**结论**：Enhanced Fetch MCP 是内置 WebFetch 的强力替代方案！

## 📋 系统要求

### 必需

- Node.js >= 18.0.0
- npm >= 8.0.0

### 可选（用于特定功能）

- Docker（用于沙箱功能）
- 足够的磁盘空间（Playwright 浏览器约 300MB）

## 🔍 验证安装

```bash
# 检查命令是否可用
enhanced-fetch-mcp --version
# 输出: v1.0.0

# 查看帮助
enhanced-fetch-mcp --help

# 测试运行（Ctrl+C 退出）
enhanced-fetch-mcp
# 输出: Enhanced Fetch MCP Server running on stdio
```

## 🐛 故障排查

### 命令找不到

```bash
# 检查安装
npm list -g enhanced-fetch-mcp

# 重新安装
npm install -g enhanced-fetch-mcp

# 检查路径
which enhanced-fetch-mcp
```

### Docker 未运行（影响沙箱功能）

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# 验证
docker ps
```

### 查看日志

```bash
# 服务器日志
tail -f ~/.local/share/enhanced-fetch-mcp/logs/browser-mcp.log

# 错误日志
tail -f ~/.local/share/enhanced-fetch-mcp/logs/browser-mcp-error.log
```

## 🔄 更新

```bash
npm update -g enhanced-fetch-mcp
```

## 🛠️ 开发

### 从源码安装

```bash
# 克隆项目
git clone https://github.com/yourusername/enhanced-fetch-mcp.git
cd enhanced-fetch-mcp

# 安装依赖
npm install

# 构建
npm run build

# 全局链接（开发模式）
npm link

# 运行测试
npm test

# 开发模式（监听变化）
npm run dev
```

### 项目结构

```
enhanced-fetch-mcp/
├── src/
│   ├── fetch-client.ts           # HTTP 客户端
│   ├── content-extractor.ts      # 内容提取器
│   ├── browser-sandbox-manager.ts # 浏览器管理器
│   ├── mcp-server.ts             # MCP 服务器
│   ├── sandbox-manager.ts        # Docker 沙箱管理
│   ├── types.ts                  # 类型定义
│   ├── logger.ts                 # 日志系统
│   └── index.ts                  # 入口文件
├── dist/                          # 编译输出
├── logs/                          # 日志目录
└── README.md                      # 本文件
```

## 📊 性能指标

| 操作 | 平均耗时 |
|------|----------|
| HTTP 请求 | 200-300ms |
| 内容提取 | 10-50ms |
| 浏览器启动 | 300-500ms |
| 页面导航 | 1.5-2s |
| 截图 | ~50ms |
| JavaScript 执行 | <10ms |

## 🤝 贡献

欢迎贡献！请提交 Pull Request 或创建 Issue。

## 📄 许可证

MIT License

## 🙏 致谢

- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP 协议实现
- [Playwright](https://playwright.dev/) - 浏览器自动化
- [Cheerio](https://cheerio.js.org/) - HTML 解析
- [Turndown](https://github.com/mixmark-io/turndown) - HTML 转 Markdown
- [Dockerode](https://github.com/apocas/dockerode) - Docker API

---

**立即开始使用！** 🚀

```bash
npm install -g enhanced-fetch-mcp
```
