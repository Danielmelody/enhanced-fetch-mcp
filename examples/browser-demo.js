#!/usr/bin/env node
/**
 * Playwright 浏览器沙箱演示
 * 运行: node examples/browser-demo.js
 */

import { chromium } from 'playwright';

async function demo() {
  console.log('🎬 Playwright 浏览器沙箱演示\n');

  // 1. 启动浏览器
  console.log('1️⃣  启动 Chromium 浏览器...');
  const browser = await chromium.launch({
    headless: false, // 显示浏览器窗口
    slowMo: 100 // 减慢操作速度便于观察
  });
  console.log('   ✅ 浏览器已启动\n');

  // 2. 创建上下文（沙箱）
  console.log('2️⃣  创建隔离的浏览器上下文...');
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai'
  });
  console.log('   ✅ 上下文已创建（独立的 cookie、存储）\n');

  // 3. 打开新页面
  console.log('3️⃣  打开新页面...');
  const page = await context.newPage();
  console.log('   ✅ 页面已创建\n');

  // 4. 访问网站
  console.log('4️⃣  访问 Example.com...');
  await page.goto('https://example.com');
  const title = await page.title();
  console.log(`   ✅ 页面标题: ${title}\n`);

  // 5. 执行 JavaScript
  console.log('5️⃣  在页面中执行 JavaScript...');
  const pageInfo = await page.evaluate(() => {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      width: window.innerWidth,
      height: window.innerHeight,
      elementCount: document.querySelectorAll('*').length
    };
  });
  console.log('   ✅ 页面信息:');
  console.log('      URL:', pageInfo.url);
  console.log('      元素数量:', pageInfo.elementCount);
  console.log('      视口尺寸:', `${pageInfo.width}x${pageInfo.height}\n`);

  // 6. 截图
  console.log('6️⃣  截取页面截图...');
  await page.screenshot({ path: 'examples/screenshot-demo.png', fullPage: true });
  console.log('   ✅ 截图已保存: examples/screenshot-demo.png\n');

  // 7. 导出 PDF
  console.log('7️⃣  导出为 PDF...');
  await page.pdf({ path: 'examples/page-demo.pdf', format: 'A4' });
  console.log('   ✅ PDF 已保存: examples/page-demo.pdf\n');

  // 8. 获取页面内容
  console.log('8️⃣  获取页面 HTML...');
  const html = await page.content();
  console.log(`   ✅ HTML 长度: ${html.length} 字符\n`);

  // 9. 等待一下让用户看到浏览器
  console.log('⏳ 等待 3 秒...');
  await page.waitForTimeout(3000);

  // 10. 清理
  console.log('\n🧹 清理资源...');
  await context.close();
  await browser.close();
  console.log('   ✅ 浏览器已关闭\n');

  console.log('🎉 演示完成！\n');
  console.log('生成的文件:');
  console.log('  - examples/screenshot-demo.png');
  console.log('  - examples/page-demo.pdf');
}

// 运行演示
demo().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
