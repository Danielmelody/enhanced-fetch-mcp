# 无 Docker 沙箱方案

## 🎯 概述

提供不依赖 Docker 的 JavaScript/Node.js 沙箱实现方案。

---

## 方案对比

| 方案 | 隔离级别 | 性能 | 易用性 | 适用场景 |
|------|---------|------|--------|----------|
| **Docker** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 完整隔离，多语言支持 |
| **VM2** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | JavaScript 代码执行 |
| **Worker Threads** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | CPU 密集任务隔离 |
| **Child Process** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 进程级隔离 |
| **Isolated-VM** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | V8 隔离环境 |

---

## 方案 1: VM2（推荐用于 JS 代码执行）

### 特点
- ✅ 纯 JavaScript，无需 Docker
- ✅ V8 隔离上下文
- ✅ 内存和时间限制
- ⚠️ 只支持 JavaScript 代码
- ⚠️ 有已知安全漏洞（需谨慎）

### 安装

```bash
npm install vm2
```

### 实现示例

```javascript
// src/vm2-sandbox.js
import { VM, NodeVM } from 'vm2';

export class VM2Sandbox {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 5000,
      sandbox: options.sandbox || {},
      ...options
    };
  }

  // 执行纯 JavaScript 代码
  runScript(code) {
    const vm = new VM({
      timeout: this.options.timeout,
      sandbox: this.options.sandbox,
      eval: false,
      wasm: false,
      fixAsync: true
    });

    try {
      const result = vm.run(code);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 执行 Node.js 代码（可使用 require）
  runNodeScript(code, allowedModules = []) {
    const vm = new NodeVM({
      timeout: this.options.timeout,
      sandbox: this.options.sandbox,
      require: {
        external: allowedModules.length > 0 ? allowedModules : false,
        builtin: ['fs', 'path', 'crypto'],
        root: './',
        mock: {}
      }
    });

    try {
      const result = vm.run(code, 'sandbox.js');
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// 使用示例
const sandbox = new VM2Sandbox({ timeout: 3000 });

// 执行简单代码
const result1 = sandbox.runScript(`
  const sum = (a, b) => a + b;
  sum(2, 3);
`);
console.log(result1); // { success: true, result: 5 }

// 执行 Node.js 代码
const result2 = sandbox.runNodeScript(`
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
`, ['crypto']);
console.log(result2); // { success: true, result: '...' }
```

---

## 方案 2: Worker Threads（Node.js 原生）

### 特点
- ✅ Node.js 原生支持
- ✅ 真实的线程隔离
- ✅ 共享内存（SharedArrayBuffer）
- ⚠️ 需要文件或字符串代码
- ⚠️ 线程间通信需要序列化

### 实现示例

```javascript
// src/worker-sandbox.js
import { Worker } from 'worker_threads';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class WorkerSandbox {
  constructor(options = {}) {
    this.timeout = options.timeout || 5000;
    this.resourceLimits = options.resourceLimits || {
      maxOldGenerationSizeMb: 128,
      maxYoungGenerationSizeMb: 64,
      codeRangeSizeMb: 16
    };
  }

  async execute(code, data = {}) {
    return new Promise((resolve, reject) => {
      // 创建临时文件
      const tempFile = join(tmpdir(), `sandbox-${Date.now()}.js`);
      const wrappedCode = `
        const { parentPort, workerData } = require('worker_threads');

        try {
          const result = (function() {
            ${code}
          })();

          parentPort.postMessage({ success: true, result });
        } catch (error) {
          parentPort.postMessage({
            success: false,
            error: error.message,
            stack: error.stack
          });
        }
      `;

      writeFileSync(tempFile, wrappedCode);

      const worker = new Worker(tempFile, {
        workerData: data,
        resourceLimits: this.resourceLimits
      });

      const timeoutId = setTimeout(() => {
        worker.terminate();
        unlinkSync(tempFile);
        reject(new Error('Execution timeout'));
      }, this.timeout);

      worker.on('message', (message) => {
        clearTimeout(timeoutId);
        worker.terminate();
        unlinkSync(tempFile);
        resolve(message);
      });

      worker.on('error', (error) => {
        clearTimeout(timeoutId);
        unlinkSync(tempFile);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeoutId);
        try {
          unlinkSync(tempFile);
        } catch (e) {
          // File may already be deleted
        }
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}

// 使用示例
const sandbox = new WorkerSandbox({
  timeout: 5000,
  resourceLimits: {
    maxOldGenerationSizeMb: 128
  }
});

const result = await sandbox.execute(`
  // 可以访问 workerData
  const data = require('worker_threads').workerData;

  // 执行计算
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  return fibonacci(10);
`);

console.log(result); // { success: true, result: 55 }
```

---

## 方案 3: Child Process（进程隔离）

### 特点
- ✅ 完整的进程隔离
- ✅ 可以执行任何程序
- ✅ 更安全（独立进程）
- ⚠️ 进程创建开销
- ⚠️ 通信需要 IPC

### 实现示例

```javascript
// src/process-sandbox.js
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class ProcessSandbox {
  constructor(options = {}) {
    this.timeout = options.timeout || 5000;
    this.memoryLimit = options.memoryLimit || 128; // MB
  }

  async execute(code) {
    return new Promise((resolve, reject) => {
      const tempFile = join(tmpdir(), `sandbox-${Date.now()}.js`);
      writeFileSync(tempFile, code);

      const child = spawn('node', [
        `--max-old-space-size=${this.memoryLimit}`,
        tempFile
      ], {
        timeout: this.timeout,
        killSignal: 'SIGKILL'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        unlinkSync(tempFile);

        if (code === 0) {
          resolve({
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim()
          });
        } else {
          reject({
            success: false,
            code,
            stdout: stdout.trim(),
            stderr: stderr.trim()
          });
        }
      });

      child.on('error', (error) => {
        try {
          unlinkSync(tempFile);
        } catch (e) {
          // Ignore
        }
        reject(error);
      });
    });
  }
}

// 使用示例
const sandbox = new ProcessSandbox({
  timeout: 5000,
  memoryLimit: 128
});

const result = await sandbox.execute(`
  console.log('Hello from sandbox!');
  console.log(JSON.stringify({ result: 42 }));
`);

console.log(result);
// { success: true, stdout: 'Hello from sandbox!\n{"result":42}', stderr: '' }
```

---

## 方案 4: Isolated-VM（V8 隔离）

### 特点
- ✅ 真正的 V8 隔离环境
- ✅ 内存和 CPU 限制
- ✅ 比 VM2 更安全
- ⚠️ 需要编译原生模块
- ⚠️ API 相对复杂

### 安装

```bash
npm install isolated-vm
```

### 实现示例

```javascript
// src/isolated-sandbox.js
import ivm from 'isolated-vm';

export class IsolatedSandbox {
  constructor(options = {}) {
    this.memoryLimit = options.memoryLimit || 128; // MB
    this.timeout = options.timeout || 5000; // ms
  }

  async execute(code, context = {}) {
    const isolate = new ivm.Isolate({
      memoryLimit: this.memoryLimit
    });

    try {
      const ctx = await isolate.createContext();
      const jail = ctx.global;

      // 注入上下文
      await jail.set('global', jail.derefInto());

      for (const [key, value] of Object.entries(context)) {
        await jail.set(key, new ivm.ExternalCopy(value).copyInto());
      }

      // 注入 console.log
      const logCallback = new ivm.Reference(function(...args) {
        console.log(...args);
      });
      await jail.set('log', logCallback);
      await ctx.eval('global.console = { log }');

      // 执行代码
      const script = await isolate.compileScript(code);
      const result = await script.run(ctx, {
        timeout: this.timeout,
        release: true
      });

      // 转换结果
      const output = result?.copy ? result.copy() : result;

      isolate.dispose();

      return { success: true, result: output };

    } catch (error) {
      isolate.dispose();
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 使用示例
const sandbox = new IsolatedSandbox({
  memoryLimit: 128,
  timeout: 3000
});

const result = await sandbox.execute(`
  console.log('Running in isolated VM');

  function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  }

  factorial(5);
`, {
  initialValue: 10
});

console.log(result); // { success: true, result: 120 }
```

---

## 完整 MCP Server 实现（使用 VM2）

创建一个不依赖 Docker 的 MCP Server：

```bash
cat > src/vm2-mcp-server.ts << 'EOF'
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { VM, NodeVM } from 'vm2';
import { z } from 'zod';

const ExecuteCodeSchema = z.object({
  code: z.string().describe('JavaScript code to execute'),
  timeout: z.number().optional().describe('Timeout in milliseconds (default: 5000)'),
  allowModules: z.array(z.string()).optional().describe('Allowed Node.js modules')
});

export class VM2MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'vm2-sandbox',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        {
          name: 'execute_js',
          description: 'Execute JavaScript code in a sandboxed VM',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'JavaScript code to execute'
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 5000)'
              }
            },
            required: ['code']
          }
        },
        {
          name: 'execute_node_js',
          description: 'Execute Node.js code with module support',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Node.js code to execute'
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds'
              },
              allowModules: {
                type: 'array',
                items: { type: 'string' },
                description: 'Allowed modules (e.g., ["fs", "crypto"])'
              }
            },
            required: ['code']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'execute_js': {
            const params = ExecuteCodeSchema.parse(args);
            const vm = new VM({
              timeout: params.timeout || 5000,
              eval: false,
              wasm: false
            });

            try {
              const result = vm.run(params.code);
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    result: String(result)
                  }, null, 2)
                }]
              };
            } catch (error) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: (error as Error).message
                  }, null, 2)
                }]
              };
            }
          }

          case 'execute_node_js': {
            const params = ExecuteCodeSchema.parse(args);
            const vm = new NodeVM({
              timeout: params.timeout || 5000,
              require: {
                external: params.allowModules || false,
                builtin: params.allowModules || []
              }
            });

            try {
              const result = vm.run(params.code);
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    result: String(result)
                  }, null, 2)
                }]
              };
            } catch (error) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: (error as Error).message
                  }, null, 2)
                }]
              };
            }
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${(error as Error).message}`
          }],
          isError: true
        };
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('VM2 MCP Sandbox Server running on stdio');
  }
}

// 启动
const server = new VM2MCPServer();
void server.start();
EOF
```

---

## 推荐方案选择

### 简单 JS 执行
→ **VM2**（最简单）

### CPU 密集任务
→ **Worker Threads**（性能最好）

### 高安全要求
→ **Isolated-VM**（最安全）

### 多语言支持
→ **Child Process** 或坚持使用 **Docker**

---

## 快速测试

```bash
# 安装 VM2
npm install vm2

# 创建测试文件
cat > test-vm2.js << 'EOF'
import { VM } from 'vm2';

const vm = new VM({ timeout: 1000 });

console.log('🧪 测试 1: 简单计算');
const result1 = vm.run('1 + 2 + 3');
console.log('✅', result1);

console.log('\n🧪 测试 2: 函数执行');
const result2 = vm.run(`
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
  fibonacci(10);
`);
console.log('✅', result2);

console.log('\n🧪 测试 3: 超时保护');
try {
  vm.run('while(true) {}');
} catch (error) {
  console.log('✅ 超时保护工作正常:', error.message);
}

console.log('\n🎉 所有测试通过！');
EOF

node test-vm2.js
```

---

## 总结

选择合适的方案：

1. **快速原型** → VM2
2. **生产环境** → Isolated-VM 或 Worker Threads
3. **完整隔离** → 保留 Docker 方案

每个方案都有权衡，根据你的具体需求选择！
