# Enhanced Fetch MCP - Claude Code 使用指南

## 🎯 适用于 Claude Code CLI

这个 MCP Server 主要设计用于 Claude Desktop，但你也可以通过以下方式使用：

---

## 方案 1: 直接测试 MCP Server（推荐）

### 1. 启动 Docker

```bash
# 如果使用 OrbStack
open -a OrbStack

# 如果使用 Docker Desktop
open -a Docker

# 验证 Docker 运行
docker ps
```

### 2. 直接运行 MCP Server 测试

MCP Server 通过 stdio 协议通信，你可以手动测试：

```bash
cd /Users/danielhu/Projects/enhanced-fetch

# 运行 MCP Server（它会等待 stdin 输入）
node dist/index.js
```

### 3. 发送 MCP 协议消息

创建测试脚本：

```bash
cat > test-mcp.js << 'EOF'
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 启动 MCP Server
const server = spawn('node', [join(__dirname, 'dist/index.js')]);

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  console.log('📨 Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('⚠️  Server stderr:', data.toString());
});

// 等待服务器启动
setTimeout(() => {
  console.log('📤 Sending list tools request...');

  // 发送 MCP 请求：列出工具
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(request) + '\n');
}, 1000);

// 5 秒后关闭
setTimeout(() => {
  console.log('🔚 Closing...');
  server.kill();
  process.exit(0);
}, 5000);
EOF

# 运行测试
node test-mcp.js
```

---

## 方案 2: 使用底层库直接调用（开发/测试）

创建一个简单的测试脚本直接使用沙箱管理器：

```bash
cat > test-sandbox.js << 'EOF'
import { SandboxManager } from './dist/sandbox-manager.js';

async function test() {
  console.log('🚀 初始化沙箱管理器...');
  const manager = new SandboxManager();

  try {
    // 初始化
    await manager.initialize();
    console.log('✅ 沙箱管理器初始化成功');

    // 创建沙箱
    console.log('📦 创建沙箱...');
    const sandbox = await manager.createSandbox('test-sandbox', {
      image: 'node:20-alpine',
      memoryLimit: '256m',
      cpuLimit: 0.5,
      timeout: 60000
    });
    console.log('✅ 沙箱创建成功:', sandbox.id);

    // 执行命令
    console.log('⚡ 执行命令: node --version');
    const result = await manager.executeInSandbox(sandbox.id, ['node', '--version']);
    console.log('📤 输出:', result.stdout);

    // 获取统计信息
    console.log('📊 获取资源统计...');
    const stats = await manager.getSandboxStats(sandbox.id);
    console.log('💾 内存使用:', (stats.memoryUsage / 1024 / 1024).toFixed(2), 'MB');
    console.log('🔧 CPU 使用:', stats.cpuUsage.toFixed(2), '%');

    // 列出所有沙箱
    console.log('📋 所有沙箱:');
    const sandboxes = manager.listSandboxes();
    sandboxes.forEach(sb => {
      console.log(`  - ${sb.name} (${sb.id}): ${sb.status}`);
    });

    // 清理
    console.log('🧹 清理沙箱...');
    await manager.cleanupSandbox(sandbox.id);
    console.log('✅ 清理完成');

    // 关闭管理器
    await manager.shutdown();
    console.log('👋 测试完成');

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

test();
EOF

# 运行测试
node test-sandbox.js
```

---

## 方案 3: 作为库在你的项目中使用

### 安装

```bash
# 在你的项目中
npm install /Users/danielhu/Projects/enhanced-fetch
```

### 使用示例

```javascript
import { SandboxManager } from 'enhanced-fetch-mcp';

const manager = new SandboxManager();
await manager.initialize();

// 创建沙箱
const sandbox = await manager.createSandbox('my-sandbox', {
  image: 'node:20-alpine',
  memoryLimit: '512m'
});

// 执行命令
const result = await manager.executeInSandbox(sandbox.id, [
  'npm', 'install', 'express'
]);

// 清理
await manager.cleanupSandbox(sandbox.id);
```

---

## 方案 4: HTTP API 包装器（自建）

如果你需要 HTTP API，可以快速创建一个：

```bash
cat > api-server.js << 'EOF'
import express from 'express';
import { SandboxManager } from './dist/sandbox-manager.js';

const app = express();
app.use(express.json());

const manager = new SandboxManager();

// 初始化
app.post('/init', async (req, res) => {
  try {
    await manager.initialize();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建沙箱
app.post('/sandboxes', async (req, res) => {
  try {
    const { name, config } = req.body;
    const sandbox = await manager.createSandbox(name, config);
    res.json(sandbox);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 执行命令
app.post('/sandboxes/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { command } = req.body;
    const result = await manager.executeInSandbox(id, command);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 列出沙箱
app.get('/sandboxes', (req, res) => {
  const sandboxes = manager.listSandboxes();
  res.json(sandboxes);
});

// 获取统计
app.get('/sandboxes/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await manager.getSandboxStats(id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 清理沙箱
app.delete('/sandboxes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await manager.cleanupSandbox(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, async () => {
  await manager.initialize();
  console.log(`🚀 Sandbox API Server running on http://localhost:${PORT}`);
});
EOF

# 运行 API 服务器
node api-server.js
```

然后使用 curl 测试：

```bash
# 创建沙箱
curl -X POST http://localhost:3000/sandboxes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-sandbox",
    "config": {
      "image": "node:20-alpine",
      "memoryLimit": "256m"
    }
  }'

# 执行命令
curl -X POST http://localhost:3000/sandboxes/sb_xxx/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": ["node", "--version"]
  }'

# 列出沙箱
curl http://localhost:3000/sandboxes

# 清理
curl -X DELETE http://localhost:3000/sandboxes/sb_xxx
```

---

## 快速开始（推荐流程）

### 第 1 步：确保 Docker 运行

```bash
# 启动 Docker
open -a OrbStack

# 验证
docker ps
```

### 第 2 步：运行简单测试

```bash
cd /Users/danielhu/Projects/enhanced-fetch

# 创建并运行测试脚本
cat > quick-test.js << 'EOF'
import { SandboxManager } from './dist/sandbox-manager.js';

async function quickTest() {
  const manager = new SandboxManager();

  console.log('🚀 启动测试...\n');

  try {
    // 初始化
    console.log('1️⃣  初始化管理器...');
    await manager.initialize();
    console.log('✅ 初始化成功\n');

    // 创建沙箱
    console.log('2️⃣  创建沙箱...');
    const sandbox = await manager.createSandbox('quick-test', {
      image: 'node:20-alpine',
      memoryLimit: '256m',
      timeout: 60000
    });
    console.log(`✅ 沙箱创建: ${sandbox.id}\n`);

    // 执行命令
    console.log('3️⃣  执行命令: node --version');
    const result = await manager.executeInSandbox(sandbox.id, ['node', '--version']);
    console.log(`✅ 输出: ${result.stdout.trim()}\n`);

    // 清理
    console.log('4️⃣  清理沙箱...');
    await manager.cleanupSandbox(sandbox.id);
    console.log('✅ 清理完成\n');

    await manager.shutdown();
    console.log('🎉 测试成功！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

quickTest();
EOF

node quick-test.js
```

---

## 调试技巧

### 1. 查看日志

```bash
# 实时查看日志
tail -f logs/browser-mcp.log

# 查看错误日志
tail -f logs/browser-mcp-error.log
```

### 2. 检查 Docker 容器

```bash
# 查看所有容器（包括已停止的）
docker ps -a

# 查看容器日志
docker logs <container-id>

# 进入容器
docker exec -it <container-id> sh
```

### 3. 清理资源

```bash
# 停止所有沙箱容器
docker ps --filter "name=sandbox-" -q | xargs -r docker stop

# 删除所有沙箱容器
docker ps -a --filter "name=sandbox-" -q | xargs -r docker rm

# 清理未使用的镜像
docker image prune -a
```

---

## 常见错误和解决方案

### ❌ "Cannot connect to Docker daemon"

```bash
# 启动 Docker
open -a OrbStack
sleep 5
docker ps
```

### ❌ "Failed to pull image"

```bash
# 手动拉取镜像
docker pull node:20-alpine
```

### ❌ "Port already in use"

这个项目使用 stdio，不需要端口。如果看到端口错误，检查是否有其他进程冲突。

---

## 性能优化

### 预拉取常用镜像

```bash
# 拉取常用镜像
docker pull node:20-alpine
docker pull node:18-alpine
docker pull python:3.11-alpine
docker pull python:3.9-alpine
```

### 设置 Docker 资源限制

```bash
# 查看 Docker 资源使用
docker system df

# 清理
docker system prune -a
```

---

## 下一步

现在你可以：

1. ✅ 运行 `quick-test.js` 验证基本功能
2. ✅ 创建自己的测试脚本
3. ✅ 将其作为库集成到你的项目中
4. ✅ 或者构建 HTTP API 包装器

**祝使用愉快！** 🎉
