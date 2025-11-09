# 🚀 快速开始 - 浏览器沙箱（无 Docker）

## ✅ 已完成

- [x] Playwright 已安装
- [x] Chromium 浏览器正在下载中...
- [x] 演示脚本已创建

---

## 🎯 快速测试（3 分钟）

### 步骤 1: 等待浏览器下载完成

```bash
# 检查下载进度
# Chromium 大约 150-200 MB，需要 1-3 分钟
```

### 步骤 2: 运行演示

```bash
cd /Users/danielhu/Projects/enhanced-fetch

# 运行浏览器演示
node examples/browser-demo.js
```

**你会看到：**
1. 🌐 浏览器窗口自动打开
2. 📄 访问 example.com
3. 📸 自动截图
4. 📑 生成 PDF
5. 🧹 自动关闭

**生成的文件：**
- `examples/screenshot-demo.png` - 页面截图
- `examples/page-demo.pdf` - 页面 PDF

---

## 🔧 完整功能示例

### 示例 1: 简单浏览器控制

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// 访问网站
await page.goto('https://example.com');

// 获取标题
const title = await page.title();
console.log('标题:', title);

// 截图
await page.screenshot({ path: 'screenshot.png' });

await browser.close();
```

### 示例 2: 搜索引擎自动化

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// 访问搜索引擎
await page.goto('https://www.bing.com');

// 输入搜索词
await page.fill('input[name="q"]', 'Playwright 教程');

// 点击搜索
await page.click('input[type="submit"]');

// 等待结果
await page.waitForSelector('.b_algo');

// 获取搜索结果
const results = await page.evaluate(() => {
  const items = document.querySelectorAll('.b_algo');
  return Array.from(items).slice(0, 5).map(item => ({
    title: item.querySelector('h2')?.textContent,
    link: item.querySelector('a')?.href
  }));
});

console.log('搜索结果:', results);

await browser.close();
```

### 示例 3: 多页面管理

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();

// 打开多个页面
const page1 = await context.newPage();
await page1.goto('https://example.com');

const page2 = await context.newPage();
await page2.goto('https://example.org');

const page3 = await context.newPage();
await page3.goto('https://example.net');

// 获取所有页面标题
const pages = context.pages();
for (const page of pages) {
  const title = await page.title();
  console.log('页面:', title, '- URL:', page.url());
}

await browser.close();
```

### 示例 4: 表单自动填写

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await page.goto('https://example.com/form');

// 填写表单
await page.fill('input[name="username"]', 'testuser');
await page.fill('input[name="password"]', 'password123');
await page.check('input[type="checkbox"]');
await page.selectOption('select[name="country"]', 'CN');

// 提交
await page.click('button[type="submit"]');

// 等待导航
await page.waitForURL('**/success');

await browser.close();
```

### 示例 5: 截图和录制

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  // 录制视频
  recordVideo: {
    dir: './recordings/',
    size: { width: 1280, height: 720 }
  }
});

const page = await context.newPage();

// 开始追踪
await context.tracing.start({ screenshots: true, snapshots: true });

// 执行操作
await page.goto('https://example.com');
await page.screenshot({ path: 'full-page.png', fullPage: true });
await page.screenshot({ path: 'viewport.png' });

// 停止追踪
await context.tracing.stop({ path: 'trace.zip' });

await context.close();
await browser.close();

// 查看追踪: npx playwright show-trace trace.zip
```

### 示例 6: 执行 JavaScript

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com');

// 执行自定义 JavaScript
const data = await page.evaluate(() => {
  // 在浏览器上下文中执行
  return {
    links: Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent,
      href: a.href
    })),
    images: document.querySelectorAll('img').length,
    title: document.title,
    paragraphs: document.querySelectorAll('p').length
  };
});

console.log('页面数据:', data);

// 修改页面
await page.evaluate(() => {
  document.body.style.backgroundColor = 'lightblue';
  document.querySelector('h1').textContent = '已被修改！';
});

await page.screenshot({ path: 'modified.png' });

await browser.close();
```

---

## 📱 完整的沙箱管理器

创建一个完整的浏览器沙箱管理系统：

```bash
cat > browser-sandbox-manager.js << 'EOF'
import { chromium, firefox, webkit } from 'playwright';

class BrowserSandboxManager {
  constructor() {
    this.sandboxes = new Map();
  }

  async createSandbox(name, options = {}) {
    const id = `sandbox_${Date.now()}`;

    // 选择浏览器
    const browserType = {
      chromium: chromium,
      firefox: firefox,
      webkit: webkit
    }[options.browser || 'chromium'];

    // 启动浏览器
    const browser = await browserType.launch({
      headless: options.headless !== false,
    });

    // 创建上下文
    const context = await browser.newContext({
      viewport: options.viewport || { width: 1280, height: 720 },
      userAgent: options.userAgent,
      locale: options.locale || 'zh-CN',
      recordVideo: options.recordVideo ? {
        dir: `./recordings/${id}/`
      } : undefined
    });

    // 保存沙箱
    this.sandboxes.set(id, {
      id,
      name,
      browser,
      context,
      pages: [],
      createdAt: new Date()
    });

    console.log(`✅ 沙箱创建: ${name} (${id})`);
    return { id, name };
  }

  async openPage(sandboxId, url) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) throw new Error('沙箱不存在');

    const page = await sandbox.context.newPage();
    await page.goto(url);
    sandbox.pages.push(page);

    console.log(`📄 页面已打开: ${url}`);
    return page;
  }

  async screenshot(sandboxId, path) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox || sandbox.pages.length === 0) {
      throw new Error('没有可用的页面');
    }

    const page = sandbox.pages[sandbox.pages.length - 1];
    await page.screenshot({ path, fullPage: true });
    console.log(`📸 截图已保存: ${path}`);
  }

  async execute(sandboxId, code) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox || sandbox.pages.length === 0) {
      throw new Error('没有可用的页面');
    }

    const page = sandbox.pages[sandbox.pages.length - 1];
    const result = await page.evaluate(code);
    return result;
  }

  listSandboxes() {
    return Array.from(this.sandboxes.values()).map(s => ({
      id: s.id,
      name: s.name,
      pages: s.pages.length,
      createdAt: s.createdAt
    }));
  }

  async closeSandbox(sandboxId) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) throw new Error('沙箱不存在');

    await sandbox.context.close();
    await sandbox.browser.close();
    this.sandboxes.delete(sandboxId);

    console.log(`🧹 沙箱已关闭: ${sandboxId}`);
  }

  async closeAll() {
    for (const id of this.sandboxes.keys()) {
      await this.closeSandbox(id);
    }
  }
}

// 使用示例
async function example() {
  const manager = new BrowserSandboxManager();

  try {
    // 创建沙箱
    const sandbox = await manager.createSandbox('测试沙箱', {
      browser: 'chromium',
      headless: false
    });

    // 打开页面
    await manager.openPage(sandbox.id, 'https://example.com');

    // 截图
    await manager.screenshot(sandbox.id, 'test.png');

    // 执行 JS
    const title = await manager.execute(sandbox.id, 'document.title');
    console.log('页面标题:', title);

    // 列出所有沙箱
    console.log('所有沙箱:', manager.listSandboxes());

    // 关闭
    await manager.closeSandbox(sandbox.id);

  } catch (error) {
    console.error('错误:', error);
  }
}

export { BrowserSandboxManager };
export default example;
EOF
```

---

## 🎮 交互式测试

创建一个交互式 REPL：

```bash
cat > browser-repl.js << 'EOF'
import { chromium } from 'playwright';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let browser, page;

async function init() {
  console.log('🚀 启动浏览器...');
  browser = await chromium.launch({ headless: false });
  page = await browser.newPage();
  console.log('✅ 浏览器已启动');
  prompt();
}

function prompt() {
  rl.question('\n> ', async (cmd) => {
    try {
      const [action, ...args] = cmd.trim().split(' ');

      switch (action) {
        case 'goto':
          await page.goto(args[0]);
          console.log('✅ 已访问:', args[0]);
          break;

        case 'screenshot':
          await page.screenshot({ path: args[0] || 'screenshot.png' });
          console.log('✅ 截图已保存');
          break;

        case 'title':
          console.log('📄', await page.title());
          break;

        case 'eval':
          const result = await page.evaluate(args.join(' '));
          console.log('📊', result);
          break;

        case 'click':
          await page.click(args[0]);
          console.log('✅ 已点击:', args[0]);
          break;

        case 'type':
          await page.type(args[0], args.slice(1).join(' '));
          console.log('✅ 已输入');
          break;

        case 'help':
          console.log(`
可用命令:
  goto <url>          - 访问网址
  screenshot [path]   - 截图
  title              - 获取标题
  eval <code>        - 执行 JS
  click <selector>   - 点击元素
  type <selector> <text> - 输入文本
  exit               - 退出
          `);
          break;

        case 'exit':
          await browser.close();
          rl.close();
          process.exit(0);
          return;

        default:
          console.log('❌ 未知命令，输入 help 查看帮助');
      }
    } catch (error) {
      console.error('❌', error.message);
    }
    prompt();
  });
}

console.log('🎮 Playwright 浏览器 REPL');
console.log('输入 "help" 查看命令');
init();
EOF

# 运行: node browser-repl.js
```

---

## 🔗 与 MCP 集成

将浏览器沙箱集成到 MCP Server 中，这样就可以通过 Claude 控制浏览器了！

详见完整实现：`BROWSER_SANDBOX.md`

---

## 📚 更多资源

- **Playwright 官方文档**: https://playwright.dev
- **API 参考**: https://playwright.dev/docs/api/class-playwright
- **示例集合**: https://playwright.dev/docs/examples

---

## 🎉 现在你可以

1. ✅ 不需要 Docker 运行浏览器自动化
2. ✅ 完整控制浏览器（访问、点击、截图、执行 JS）
3. ✅ 创建多个隔离的浏览器上下文
4. ✅ 支持 Chromium、Firefox、WebKit
5. ✅ 集成到 MCP Server

**开始使用吧！** 🚀
