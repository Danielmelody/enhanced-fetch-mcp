# Enhanced Fetch MCP - 使用指南

## 📋 目录
1. [前置要求](#前置要求)
2. [启动 Docker](#启动-docker)
3. [配置 Claude Desktop](#配置-claude-desktop)
4. [验证安装](#验证安装)
5. [使用示例](#使用示例)
6. [常见问题](#常见问题)

---

## 前置要求

### ✅ 已完成
- [x] Node.js 18+ 已安装
- [x] Docker 已安装
- [x] 项目已构建（`npm run build`）

### ⚠️ 需要完成
- [ ] Docker 守护进程需要运行
- [ ] Claude Desktop 需要配置

---

## 启动 Docker

### macOS (使用 OrbStack 或 Docker Desktop)

**如果你使用 OrbStack：**
```bash
# 启动 OrbStack
open -a OrbStack

# 等待几秒后验证
docker ps
```

**如果你使用 Docker Desktop：**
```bash
# 启动 Docker Desktop
open -a Docker

# 等待几秒后验证
docker ps
```

### 验证 Docker 是否运行
```bash
docker ps
# 应该看到 CONTAINER ID   IMAGE   ...（即使列表为空）
```

---

## 配置 Claude Desktop

### 步骤 1: 找到配置文件

**macOS:**
```bash
# 配置文件位置
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

### 步骤 2: 编辑配置文件

**macOS 快速打开：**
```bash
# 使用默认编辑器打开
open ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 或使用 nano
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 步骤 3: 添加 MCP Server 配置

将以下内容添加到配置文件中：

```json
{
  "mcpServers": {
    "enhanced-fetch-sandbox": {
      "command": "node",
      "args": [
        "/Users/danielhu/Projects/enhanced-fetch/dist/index.js"
      ]
    }
  }
}
```

**⚠️ 重要提示：**
- 确保路径是绝对路径
- 使用你的实际项目路径
- JSON 格式必须正确（注意逗号和引号）

### 步骤 4: 重启 Claude Desktop

```bash
# 完全退出 Claude Desktop
# Command + Q (macOS) 或点击菜单 Claude > Quit

# 重新打开 Claude Desktop
open -a Claude
```

---

## 验证安装

### 方法 1: 在 Claude Desktop 中测试

打开 Claude Desktop，输入以下内容：

```
请列出所有可用的沙箱管理工具
```

**期望看到：**
- ✅ create_sandbox
- ✅ execute_in_sandbox
- ✅ list_sandboxes
- ✅ get_sandbox
- ✅ pause_sandbox
- ✅ resume_sandbox
- ✅ cleanup_sandbox
- ✅ get_sandbox_stats

### 方法 2: 查看 Claude Desktop 日志

如果工具没有显示，检查日志：

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# 查看最近的错误
grep -i error ~/Library/Logs/Claude/mcp*.log
```

---

## 使用示例

### 示例 1: 创建并使用沙箱

**在 Claude Desktop 中输入：**

```
1. 创建一个名为 "test-env" 的沙箱，使用 Node.js 20
2. 在这个沙箱中执行命令 "node --version"
3. 列出所有活动的沙箱
4. 清理这个沙箱
```

**Claude 会：**
1. 调用 `create_sandbox` 工具
2. 调用 `execute_in_sandbox` 工具
3. 调用 `list_sandboxes` 工具
4. 调用 `cleanup_sandbox` 工具

---

### 示例 2: 测试 Python 代码

```
创建一个 Python 沙箱并运行 "print('Hello from sandbox')"

配置：
- 名称：python-test
- 镜像：python:3.11-alpine
- 内存限制：256m
```

---

### 示例 3: 长期运行任务

```
1. 创建一个沙箱，超时时间设置为 10 分钟
2. 在里面安装 express：npm install express
3. 暂停沙箱以节省资源
4. 恢复沙箱
5. 检查资源使用情况
```

---

### 示例 4: 多命令工作流

```
帮我在沙箱中：
1. 创建一个 package.json
2. 安装 lodash
3. 创建一个测试文件
4. 运行测试
```

---

## 常见问题

### ❌ 问题 1: "Cannot connect to Docker daemon"

**原因：** Docker 未运行

**解决方案：**
```bash
# 启动 Docker (OrbStack 或 Docker Desktop)
open -a OrbStack
# 或
open -a Docker

# 等待 10-30 秒后验证
docker ps
```

---

### ❌ 问题 2: Claude Desktop 中看不到工具

**原因 1：** 配置文件路径错误

**检查：**
```bash
# 验证文件存在
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 验证 dist/index.js 存在
ls -la /Users/danielhu/Projects/enhanced-fetch/dist/index.js
```

**原因 2：** JSON 格式错误

**验证：**
```bash
# 使用 jq 检查 JSON 格式
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
```

**原因 3：** 未重启 Claude Desktop

**解决：** 完全退出（Command + Q）后重新打开

---

### ❌ 问题 3: "Image not found" 错误

**原因：** Docker 镜像未下载

**解决方案：**
```bash
# 手动拉取默认镜像
docker pull node:20-alpine

# 或拉取 Python 镜像
docker pull python:3.11-alpine
```

---

### ❌ 问题 4: 沙箱创建失败

**检查日志：**
```bash
# 在项目目录查看日志
tail -f logs/browser-mcp.log
```

**常见原因：**
1. 端口冲突
2. 内存不足
3. Docker 存储空间不足

**解决：**
```bash
# 清理未使用的 Docker 资源
docker system prune -a

# 检查 Docker 资源
docker system df
```

---

## 🎯 快速启动脚本

创建一个快速启动脚本：

```bash
# 创建启动脚本
cat > ~/start-mcp-sandbox.sh << 'EOF'
#!/bin/bash

echo "🚀 启动 Enhanced Fetch MCP Sandbox..."

# 启动 Docker
echo "📦 启动 Docker..."
open -a OrbStack
sleep 5

# 验证 Docker
echo "✅ 验证 Docker..."
if docker ps &> /dev/null; then
    echo "✅ Docker 运行正常"
else
    echo "❌ Docker 启动失败"
    exit 1
fi

# 启动 Claude Desktop
echo "🤖 启动 Claude Desktop..."
open -a Claude

echo "✨ 完成！现在可以使用沙箱管理工具了"
EOF

chmod +x ~/start-mcp-sandbox.sh
```

**使用：**
```bash
~/start-mcp-sandbox.sh
```

---

## 📚 高级用法

### 自定义 Docker 镜像

```
创建一个沙箱：
- 名称：custom-env
- 镜像：node:18-bullseye
- 内存：1g
- CPU：2 核心
- 环境变量：NODE_ENV=production, DEBUG=true
- 工作目录：/app
```

### 监控资源使用

```
获取沙箱 [sandbox-id] 的资源统计信息
```

### 批量管理

```
列出所有沙箱，然后清理所有状态为 'stopped' 的沙箱
```

---

## 🔧 调试技巧

### 启用详细日志

```bash
# 设置环境变量
export DEBUG=*

# 重启 MCP Server
```

### 查看实时容器状态

```bash
# 监控 Docker 容器
watch -n 1 docker ps -a

# 查看容器日志
docker logs <container-id>
```

### 测试 MCP Server 直接运行

```bash
# 直接运行（用于调试）
node /Users/danielhu/Projects/enhanced-fetch/dist/index.js
```

---

## 📞 获取帮助

如果遇到问题：

1. **检查日志**
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   tail -f /Users/danielhu/Projects/enhanced-fetch/logs/*.log
   ```

2. **验证配置**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **测试 Docker**
   ```bash
   docker run --rm node:20-alpine node --version
   ```

4. **重新构建项目**
   ```bash
   cd /Users/danielhu/Projects/enhanced-fetch
   npm run clean
   npm run build
   ```

---

## ✨ 下一步

现在你已经配置好了，可以：

1. ✅ 尝试创建第一个沙箱
2. ✅ 阅读 `EXAMPLES.md` 查看更多示例
3. ✅ 阅读 `README.md` 了解完整 API
4. ✅ 探索不同的 Docker 镜像和配置

**祝使用愉快！** 🎉
