# Enhanced Fetch MCP - Claude Code 快速配置

只需 3 步，即可在 Claude Code 中使用强大的网页获取和浏览器自动化功能！

---

## 第 1 步：安装

### 方式 A: 全局安装（推荐）

```bash
npm install -g enhanced-fetch-mcp
```

### 方式 B: 本地开发

```bash
cd /path/to/enhanced-fetch
npm install
npm run build
npm link
```

---

## 第 2 步：配置 MCP Server

编辑配置文件：`~/.config/claude/config.json`

### 全局安装后的配置（推荐）

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    }
  }
}
```

### 或使用直接路径

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "node",
      "args": ["/path/to/enhanced-fetch/dist/index.js"]
    }
  }
}
```

---

## 第 3 步：重启 Claude Code

```bash
# 如果 Claude Code 正在运行，重启即可
# MCP Server 会自动启动
```

---

## 第 4 步：开始使用

直接在 Claude Code 中对话，无需特殊命令！

### 示例 1: 获取网页内容
```
你：帮我获取 https://example.com 的内容

Claude 自动调用 fetch_and_extract 工具
→ 返回：标题、内容、链接、图片、统计信息
```

### 示例 2: JavaScript 渲染的页面
```
你：这个页面需要 JavaScript 渲染，帮我获取完整内容

Claude 自动使用浏览器工具
→ 创建浏览器 → 渲染页面 → 返回完整内容
```

### 示例 3: 截图
```
你：给 https://example.com 截个全页面图

Claude 自动截图
→ 返回：PNG 格式的截图（Base64）
```

---

## 可用工具（19 个）

### 网页获取（3 个）
- `fetch_url` - HTTP 请求
- `extract_content` - 内容提取
- **`fetch_and_extract`** ⭐ 最常用

### 浏览器自动化（8 个）
- `create_browser_context` - 创建浏览器
- `browser_navigate` - 导航页面
- `browser_get_content` - 获取内容
- `browser_screenshot` - 截图
- `browser_pdf` - 生成 PDF
- `browser_execute_js` - 执行 JavaScript
- `list_browser_contexts` - 列出上下文
- `close_browser_context` - 关闭浏览器

### Docker 沙箱（8 个）
- 完整的容器管理工具

---

## 验证配置

在 Claude Code 中问：
```
"列出所有可用的工具"
```

应该能看到 enhanced-fetch 的 19 个工具。

---

## 故障排查

### MCP Server 未启动？

1. 检查路径是否正确
2. 确保项目已构建：`npm run build`
3. 查看日志：
   ```bash
   tail -f /Users/danielhu/Projects/enhanced-fetch/logs/browser-mcp.log
   ```

### 工具不可用？

1. 重启 Claude Code
2. 检查配置文件格式（必须是有效的 JSON）
3. 查看错误日志

---

## 完整文档

- `CLAUDE_CODE_SETUP.md` - 详细教程
- `README.md` - 完整功能说明
- `TOOLS_SUMMARY.md` - 工具参考

---

## 开始使用吧！🚀

配置完成后，只需要自然地和 Claude Code 对话：

```
"帮我获取这个网页的内容"
"截个图"
"提取所有链接"
"生成 PDF"
```

Claude 会自动选择最合适的工具完成任务！
