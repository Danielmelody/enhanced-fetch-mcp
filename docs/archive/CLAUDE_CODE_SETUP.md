# Enhanced Fetch MCP - Claude Code 使用教程

本教程将指导你如何在 Claude Code CLI 中配置和使用 Enhanced Fetch MCP Server。

---

## 快速开始

### 1. 配置 MCP Server

在你的 Claude Code 配置文件中添加 Enhanced Fetch MCP Server：

**配置文件位置**：`~/.config/claude/config.json`

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "node",
      "args": ["/Users/danielhu/Projects/enhanced-fetch/dist/index.js"]
    }
  }
}
```

**注意**：将路径 `/Users/danielhu/Projects/enhanced-fetch/dist/index.js` 替换为你的实际项目路径。

### 2. 验证配置

重启 Claude Code 或重新加载配置后，MCP Server 会自动启动。

你可以通过以下方式验证：

```bash
# 检查进程是否运行
ps aux | grep "dist/index.js"

# 查看日志
tail -f /Users/danielhu/Projects/enhanced-fetch/logs/browser-mcp.log
```

---

## 使用示例

### 场景 1: 获取网页内容并提取信息 ⭐

**最常用的工具：`fetch_and_extract`**

在 Claude Code 中直接对话：

```
用户：帮我获取 https://example.com 的内容，提取标题、描述和主要内容

Claude 将自动调用 fetch_and_extract 工具：
- 获取网页 HTML
- 提取元数据（标题、描述）
- 转换为 Markdown 格式
- 提取链接和图片
- 计算阅读时间
```

**返回结果示例**：
```json
{
  "fetch": {
    "url": "https://example.com",
    "status": 200,
    "finalUrl": "https://example.com"
  },
  "content": {
    "title": "Example Domain",
    "description": "Example Domain for illustrative examples",
    "markdown": "# Example Domain\n\nThis domain is for use in illustrative examples...",
    "stats": {
      "wordCount": 16,
      "characterCount": 127,
      "readingTimeMinutes": 0
    }
  }
}
```

---

### 场景 2: 处理需要 JavaScript 渲染的网页

对于需要 JavaScript 执行的复杂网页（如 SPA 应用），使用浏览器工具：

```
用户：打开一个浏览器，访问 https://example.com，获取渲染后的内容

Claude 将依次调用：
1. create_browser_context - 创建浏览器上下文
2. browser_navigate - 导航到目标 URL
3. browser_get_content - 获取完整渲染的 HTML
```

**工作流程**：
```
Claude: 创建浏览器上下文...
→ 返回: contextId: "ctx_1234567890_abc"

Claude: 导航到 https://example.com...
→ 返回: pageId: "page_1234567890_xyz"

Claude: 获取页面内容...
→ 返回: 完整的渲染后 HTML (包括 JavaScript 动态生成的内容)
```

---

### 场景 3: 网页截图

```
用户：帮我截取 https://example.com 的全页面截图

Claude 将调用：
1. create_browser_context
2. browser_navigate
3. browser_screenshot (fullPage: true)
```

**返回**：Base64 编码的 PNG 图片

---

### 场景 4: 生成 PDF

```
用户：把 https://example.com 转换成 PDF

Claude 将调用：
1. create_browser_context
2. browser_navigate
3. browser_pdf (format: "A4")
```

**返回**：Base64 编码的 PDF 文件

---

### 场景 5: 执行自定义 JavaScript

```
用户：在 https://example.com 页面上执行 JavaScript，获取所有链接

Claude 将调用：
1. create_browser_context
2. browser_navigate
3. browser_execute_js
   script: "Array.from(document.querySelectorAll('a')).map(a => a.href)"
```

**返回**：页面上所有链接的数组

---

## 可用的 MCP 工具清单

### 网页获取工具（3 个）

1. **`fetch_url`** - 简单的 HTTP 请求
   - 支持 GET/POST/PUT/DELETE 等方法
   - 自定义 headers, timeout, User-Agent
   - 返回状态码、headers、body

2. **`extract_content`** - 内容提取
   - HTML → Markdown 转换
   - 提取元数据（title, description, og:tags）
   - 提取链接和图片
   - 计算统计信息

3. **`fetch_and_extract`** ⭐ - 组合操作（推荐）
   - 一次调用完成获取和提取
   - 类似 Claude Code 内置的 WebFetch
   - 返回格式化的内容

### 浏览器自动化工具（8 个）

4. **`create_browser_context`** - 创建浏览器上下文
   - 支持 Chromium/Firefox/WebKit
   - 可配置 viewport, userAgent 等

5. **`browser_navigate`** - 导航到 URL
   - 等待页面加载完成
   - 支持 networkidle 等待策略

6. **`browser_get_content`** - 获取渲染后的 HTML
   - JavaScript 执行后的完整内容

7. **`browser_screenshot`** - 截图
   - 支持全页面或区域截图
   - PNG/JPEG 格式

8. **`browser_pdf`** - 生成 PDF
   - A4/Letter 等格式
   - 横向/纵向布局

9. **`browser_execute_js`** - 执行 JavaScript
   - 在页面上下文中运行
   - 返回执行结果

10. **`list_browser_contexts`** - 列出浏览器上下文

11. **`close_browser_context`** - 关闭浏览器上下文

### Docker 沙箱工具（8 个）

12-19. Docker 容器管理工具（create_sandbox, execute_in_sandbox 等）

---

## 实际使用示例

### 示例 1: 抓取博客文章

```
用户：帮我抓取 https://blog.example.com/article 这篇文章的内容，
      提取标题、作者、发布日期，并转换成 Markdown 格式

Claude 自动处理：
✓ 调用 fetch_and_extract
✓ 提取元数据（标题、作者、日期）
✓ 转换为干净的 Markdown
✓ 移除广告和导航元素
✓ 返回格式化的内容
```

### 示例 2: 批量处理多个网页

```
用户：帮我抓取这些网址的内容：
      - https://example.com/page1
      - https://example.com/page2
      - https://example.com/page3

Claude 自动处理：
✓ 创建一个浏览器上下文（复用）
✓ 依次访问每个页面
✓ 提取内容
✓ 汇总结果
✓ 关闭浏览器上下文
```

### 示例 3: 处理动态加载内容

```
用户：https://example.com/spa 这个页面是用 React 写的，
      帮我获取完整渲染后的内容

Claude 自动处理：
✓ 识别需要浏览器渲染
✓ 创建浏览器上下文
✓ 导航并等待网络空闲
✓ 执行 JavaScript 完成渲染
✓ 提取完整内容
```

---

## 与 Claude Code 内置 WebFetch 的对比

| 功能 | 内置 WebFetch | Enhanced Fetch MCP |
|------|--------------|-------------------|
| 基础网页获取 | ✅ | ✅ |
| Markdown 转换 | ✅ | ✅ |
| 元数据提取 | 基础 | ✅ 完整 (og:tags, twitter:card) |
| JavaScript 渲染 | ❌ | ✅ Playwright |
| 浏览器控制 | ❌ | ✅ 完全控制 |
| 截图/PDF | ❌ | ✅ |
| 自定义 JS 执行 | ❌ | ✅ |
| 自定义 Headers | 有限 | ✅ 完全自定义 |
| 链接提取 | 基础 | ✅ 去重+过滤 |
| 图片提取 | 基础 | ✅ 完整属性 |

**结论**：Enhanced Fetch MCP 是内置 WebFetch 的增强版，提供更多控制和功能。

---

## 自然对话方式

Claude Code 会自动理解你的意图并调用相应的工具，你只需要自然地描述需求：

**简单获取**：
```
"帮我看看 https://example.com 的内容"
→ Claude 调用 fetch_and_extract
```

**需要浏览器**：
```
"这个网页是 JavaScript 渲染的，帮我获取完整内容"
→ Claude 调用浏览器工具
```

**截图**：
```
"给我截个图"
→ Claude 调用 browser_screenshot
```

**提取特定信息**：
```
"提取这个页面的所有链接"
→ Claude 调用 fetch + extract 或 browser_execute_js
```

---

## 常见问题

### Q: MCP Server 没有启动怎么办？

**A**: 检查以下几点：

1. 配置文件路径是否正确
2. 项目是否已构建（`npm run build`）
3. Docker 是否运行（如果需要沙箱功能）
4. 查看日志：`tail -f logs/browser-mcp.log`

### Q: 如何确认工具可用？

**A**: 在 Claude Code 中询问：

```
"列出所有可用的 MCP 工具"
```

Claude 会列出包括 Enhanced Fetch 在内的所有工具。

### Q: 浏览器工具很慢怎么办？

**A**: 浏览器启动需要一些时间（约 300-500ms），这是正常的。可以：

1. 创建一个浏览器上下文后复用
2. 对于简单页面，使用 `fetch_and_extract` 代替
3. 调整 timeout 参数

### Q: 如何调试问题？

**A**: 查看详细日志：

```bash
# 实时查看日志
tail -f /Users/danielhu/Projects/enhanced-fetch/logs/browser-mcp.log

# 查看错误日志
tail -f /Users/danielhu/Projects/enhanced-fetch/logs/browser-mcp-error.log
```

### Q: 资源会自动清理吗？

**A**: 会！系统有自动清理机制：

- 浏览器上下文：5 分钟未使用自动关闭
- Docker 容器：超时自动清理
- 定时清理：每 60 秒检查一次

---

## 性能参考

| 操作 | 平均耗时 |
|------|----------|
| 简单网页获取 | 200-300ms |
| 内容提取 | 10-50ms |
| 浏览器启动 | 300-500ms |
| 页面导航 | 1.5-2s |
| 截图 | ~50ms |
| JavaScript 执行 | <10ms |

---

## 最佳实践

1. **优先使用 `fetch_and_extract`**
   - 对于静态页面，这是最快的方式
   - 自动处理大部分情况

2. **浏览器工具按需使用**
   - 仅在需要 JavaScript 渲染时使用
   - 复用浏览器上下文提高效率

3. **合理设置超时**
   - 简单页面：10-15 秒
   - 复杂页面：30-60 秒
   - 大型 SPA：可能需要更长时间

4. **批量处理时复用资源**
   - 创建一个浏览器上下文
   - 依次访问多个页面
   - 最后统一关闭

---

## 升级和维护

### 更新项目

```bash
cd /Users/danielhu/Projects/enhanced-fetch
git pull
npm install
npm run build
```

### 查看版本

```bash
cat package.json | grep version
```

### 运行测试

```bash
# 集成测试
npx tsx test-integration.ts

# MCP 服务器测试
npx tsx test-mcp-server.ts
```

---

## 支持

- **项目仓库**: Enhanced Fetch MCP
- **文档**:
  - `README.md` - 完整文档
  - `WEB_FETCHING.md` - 网页获取详细指南
  - `API_REFERENCE.md` - API 参考
  - `TOOLS_SUMMARY.md` - 工具速查

- **日志位置**: `/Users/danielhu/Projects/enhanced-fetch/logs/`

---

## 总结

Enhanced Fetch MCP 让 Claude Code 具备了强大的网页获取和浏览器自动化能力：

✅ **简单使用** - 自然对话即可，无需记忆命令
✅ **功能强大** - 19 个工具覆盖所有需求
✅ **自动优化** - Claude 会选择最合适的工具
✅ **资源高效** - 自动清理，内存占用低

现在就开始使用吧！只需要在 Claude Code 中自然地描述你的需求。

---

**快速开始命令**：

```bash
# 1. 配置（编辑 ~/.config/claude/config.json）
# 2. 重启 Claude Code
# 3. 开始对话：
"帮我获取 https://example.com 的内容"
```

就这么简单！🚀
