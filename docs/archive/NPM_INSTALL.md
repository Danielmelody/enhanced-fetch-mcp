# Enhanced Fetch MCP - NPM 安装指南

本指南说明如何发布和安装 Enhanced Fetch MCP。

---

## 方式 1: 全局安装（推荐）

### 安装

```bash
npm install -g enhanced-fetch-mcp
```

### Claude Code 配置

安装后，配置文件非常简单：

**`~/.config/claude/config.json`**:
```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    }
  }
}
```

就这么简单！不需要指定路径。

---

## 方式 2: 本地安装

### 从源码安装

```bash
# 克隆仓库
git clone <repository-url>
cd enhanced-fetch

# 安装依赖并构建
npm install
npm run build

# 全局链接（开发模式）
npm link
```

### Claude Code 配置

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

## 方式 3: 直接从项目路径运行

如果不想全局安装：

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

替换 `/path/to/enhanced-fetch` 为实际路径。

---

## 验证安装

### 检查命令是否可用

```bash
which enhanced-fetch-mcp
# 应该输出: /usr/local/bin/enhanced-fetch-mcp（或类似路径）

enhanced-fetch-mcp --version
# 应该输出版本号
```

### 测试运行

```bash
enhanced-fetch-mcp
# 应该看到: Enhanced Fetch MCP Server running on stdio
# 使用 Ctrl+C 退出
```

### 在 Claude Code 中验证

重启 Claude Code 后，询问：

```
"列出所有可用的 MCP 工具"
```

应该能看到 enhanced-fetch 的 19 个工具。

---

## 更新

### 全局安装的更新

```bash
npm update -g enhanced-fetch-mcp
```

### 本地开发的更新

```bash
cd /path/to/enhanced-fetch
git pull
npm install
npm run build
```

---

## 卸载

### 全局卸载

```bash
npm uninstall -g enhanced-fetch-mcp
```

### 取消链接（开发模式）

```bash
npm unlink -g enhanced-fetch-mcp
```

---

## 发布到 NPM（维护者）

### 首次发布

```bash
# 1. 登录 npm
npm login

# 2. 确保项目已构建
npm run build

# 3. 发布
npm publish
```

### 发布新版本

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 发布
npm publish

# 3. 推送标签到 Git
git push --tags
```

### 发布检查清单

- [ ] 所有测试通过 (`npm test`)
- [ ] 代码已构建 (`npm run build`)
- [ ] README.md 已更新
- [ ] CHANGELOG.md 已更新
- [ ] 版本号已更新
- [ ] package.json 信息正确

---

## 不同配置方式对比

| 方式 | 配置复杂度 | 更新方便性 | 推荐场景 |
|------|----------|----------|----------|
| 全局安装 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 普通用户 |
| 本地 npm link | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 开发者 |
| 直接路径 | ⭐⭐⭐ | ⭐⭐ | 临时测试 |

---

## 配置示例

### 最简配置（全局安装后）

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    }
  }
}
```

### 带环境变量配置

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp",
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 多 MCP Server 配置

```json
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    },
    "filesystem": {
      "command": "mcp-filesystem"
    },
    "git": {
      "command": "mcp-git"
    }
  }
}
```

---

## 故障排查

### 命令找不到

**问题**: `enhanced-fetch-mcp: command not found`

**解决方案**:
```bash
# 检查全局安装
npm list -g enhanced-fetch-mcp

# 重新安装
npm install -g enhanced-fetch-mcp

# 检查 PATH
echo $PATH | grep npm
```

### 权限问题

**问题**: `EACCES: permission denied`

**解决方案**:
```bash
# 使用 sudo（不推荐）
sudo npm install -g enhanced-fetch-mcp

# 或配置 npm 使用用户目录（推荐）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g enhanced-fetch-mcp
```

### Docker 未运行

**问题**: 沙箱功能不可用

**解决方案**:
```bash
# 启动 Docker
# macOS:
open -a Docker

# Linux:
sudo systemctl start docker

# 验证
docker ps
```

---

## 系统要求

### 必需
- Node.js >= 18.0.0
- npm >= 8.0.0

### 可选（用于特定功能）
- Docker（用于沙箱功能）
- Chromium/Firefox（Playwright 会自动下载）

---

## 开发者指南

### 从源码开发

```bash
# 1. 克隆并安装
git clone <repository-url>
cd enhanced-fetch
npm install

# 2. 开发模式（监听变化）
npm run dev

# 3. 构建
npm run build

# 4. 测试
npm test

# 5. 链接到全局
npm link
```

### 调试

```bash
# 运行带日志的服务器
NODE_ENV=development enhanced-fetch-mcp

# 查看日志
tail -f ~/.local/share/enhanced-fetch-mcp/logs/browser-mcp.log
```

---

## 包信息

### 包名
`enhanced-fetch-mcp`

### 命令
`enhanced-fetch-mcp`

### 仓库
GitHub: [enhanced-fetch-mcp](https://github.com/yourusername/enhanced-fetch-mcp)

### 许可证
MIT

---

## 快速参考

```bash
# 安装
npm install -g enhanced-fetch-mcp

# 配置 (~/.config/claude/config.json)
{
  "mcpServers": {
    "enhanced-fetch": {
      "command": "enhanced-fetch-mcp"
    }
  }
}

# 验证
enhanced-fetch-mcp --version

# 更新
npm update -g enhanced-fetch-mcp

# 卸载
npm uninstall -g enhanced-fetch-mcp
```

---

就这么简单！享受强大的网页获取和浏览器自动化功能吧！🚀
