# Enhanced Fetch MCP - 安装和使用总结

这是 Enhanced Fetch MCP 的最终版本，支持通过 npm 全局安装。

---

## 🚀 快速开始（推荐方式）

### 1. 安装

```bash
npm install -g enhanced-fetch-mcp
```

### 2. 配置 Claude Code

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

### 3. 验证安装

```bash
# 检查命令
enhanced-fetch-mcp --version
# 输出: v1.0.0

# 查看帮助
enhanced-fetch-mcp --help
```

### 4. 开始使用

重启 Claude Code，然后直接对话：

```
"帮我获取 https://example.com 的内容"
```

---

## 📦 包信息

- **包名**: `enhanced-fetch-mcp`
- **命令**: `enhanced-fetch-mcp`
- **版本**: 1.0.0
- **Node.js**: >= 18.0.0

---

## 🎯 功能特性

### 19 个 MCP 工具

#### 网页获取（3个）
1. `fetch_url` - HTTP 请求
2. `extract_content` - 内容提取
3. `fetch_and_extract` ⭐ - 组合操作

#### 浏览器自动化（8个）
4. `create_browser_context` - 创建浏览器
5. `browser_navigate` - 页面导航
6. `browser_get_content` - 获取内容
7. `browser_screenshot` - 截图
8. `browser_pdf` - 生成 PDF
9. `browser_execute_js` - 执行 JS
10. `list_browser_contexts` - 列出上下文
11. `close_browser_context` - 关闭浏览器

#### Docker 沙箱（8个）
12-19. 完整的容器管理

---

## 🔧 开发者安装

### 从源码安装

```bash
# 克隆项目
git clone <repository>
cd enhanced-fetch

# 安装依赖
npm install

# 构建
npm run build

# 全局链接
npm link

# 现在可以使用
enhanced-fetch-mcp --version
```

### 配置（开发模式）

与全局安装相同：

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    }
  }
}
```

---

## 📖 文档

### 主要文档
- `README.md` - 完整功能文档
- `NPM_INSTALL.md` - 详细安装指南
- `QUICKSTART_CC.md` - Claude Code 快速开始
- `CLAUDE_CODE_SETUP.md` - 详细使用教程

### API 文档
- `API_REFERENCE.md` - 完整 API 参考
- `TOOLS_SUMMARY.md` - 工具速查
- `WEB_FETCHING.md` - 网页获取指南

### 测试文档
- `TEST_REPORT.md` - 测试报告
- `TESTING_COMPLETE.md` - 测试总结

---

## 🎓 使用示例

### 简单获取
```
用户: 获取 https://example.com 的内容
→ Claude 调用 fetch_and_extract
→ 返回: 标题、内容、Markdown、统计
```

### JavaScript 渲染
```
用户: 这个页面需要浏览器渲染
→ Claude 创建浏览器上下文
→ 导航并等待渲染完成
→ 返回: 完整的渲染内容
```

### 截图
```
用户: 截个图
→ Claude 调用 browser_screenshot
→ 返回: PNG 格式图片
```

---

## 🔍 故障排查

### 命令找不到

```bash
# 检查安装
npm list -g enhanced-fetch-mcp

# 重新安装
npm install -g enhanced-fetch-mcp

# 检查路径
which enhanced-fetch-mcp
```

### 权限问题

```bash
# 配置 npm 使用用户目录
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g enhanced-fetch-mcp
```

### Docker 未运行

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# 验证
docker ps
```

---

## 🔄 更新和维护

### 更新包

```bash
npm update -g enhanced-fetch-mcp
```

### 开发版更新

```bash
cd /path/to/enhanced-fetch
git pull
npm install
npm run build
```

---

## 📊 项目统计

- **代码量**: 3,695 行 TypeScript
- **测试**: 44/44 通过
- **文档**: 8 个完整文档
- **工具**: 19 个 MCP 工具
- **性能**: HTTP 200-300ms, 浏览器 1.5-2s

---

## 🎯 与 Claude Code WebFetch 对比

| 功能 | WebFetch | Enhanced Fetch |
|------|----------|----------------|
| HTTP 请求 | ✅ | ✅ |
| 内容提取 | ✅ | ✅ 更强大 |
| JS 渲染 | ❌ | ✅ Playwright |
| 截图/PDF | ❌ | ✅ |
| 自定义控制 | 有限 | ✅ 完全控制 |

**结论**: Enhanced Fetch 是 WebFetch 的增强替代方案！

---

## 📝 配置示例

### 最简配置（推荐）

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    }
  }
}
```

### 多 MCP Server

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    },
    "filesystem": {
      "command": "mcp-filesystem"
    }
  }
}
```

---

## 🤝 支持

- **Issues**: GitHub Issues
- **文档**: 项目根目录的 MD 文件
- **日志**: `~/.local/share/enhanced-fetch-mcp/logs/`

---

## 📜 许可证

MIT License

---

## ✅ 准备就绪！

Enhanced Fetch MCP 已经完全准备好分发和使用：

- ✅ npm 全局安装支持
- ✅ 简单的命令行接口
- ✅ 完整的文档
- ✅ 通过所有测试
- ✅ 生产就绪

立即安装并开始使用吧！🚀

```bash
npm install -g enhanced-fetch-mcp
```
