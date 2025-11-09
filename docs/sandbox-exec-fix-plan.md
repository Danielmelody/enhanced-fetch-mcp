## Sandbox Exec 输出修复计划（方案 A：关闭 TTY）

### 背景与问题

- **模块**：`src/sandbox-manager.ts`
- **问题**：沙箱容器在创建时设置了 `Tty: true`，但 `executeInSandbox` 仍按非 TTY 模式解析 Docker exec 的输出（跳过 8 字节头并区分 stdout/stderr）。在 TTY 模式下 Docker 不再提供该头部，导致：
  - stdout/stderr 开头的字符被截掉；
  - stderr 实际上与 stdout 合并，调用方无法看到错误输出。
- **影响**：所有沙箱命令的返回内容不完整，调试和错误定位困难。

### 修复目标

1. 关闭容器 TTY，使 Docker exec 恢复标准多路复用输出，从而获得完整的 stdout/stderr。
2. 保持 `executeInSandbox` 现有的解析逻辑，确保可以继续区分 stdout/stderr。
3. 补充回归测试，验证输出不会再被截断。
4. 在必要位置记录设计决策，便于未来如果需要 TTY 时知晓取舍。

### 实施步骤

1. **修改容器配置**
   - 在 `SandboxManager.createSandbox()` 中调用 `docker.createContainer` 时，将 `Tty` 设为 `false`（或删除该字段，默认即为 false）。`OpenStdin` 如仍需要可以保留。
2. **确认 exec 解析逻辑**
   - 继续使用当前基于首字节判断流类型、去掉 8 字节头的实现，仅在注释中说明依赖非 TTY 模式。
   - 如需额外稳健性，可在解析时检测 `chunk.length < 8` 并直接返回（可选）。
3. **新增回归测试**
   - 在 `src/__tests__/sandbox-manager.test.ts` 新增一个测试：执行 `sh -c 'echo STDOUT && >&2 echo STDERR'`，断言 stdout/stderr 分别等于 `STDOUT` 与 `STDERR`，确保首字符不被截断且 stderr 可见。
   - 测试依赖 Docker，需在 README 或测试描述中注明。
4. **文档或注释更新（可选）**
   - 在 `createSandbox` 的注释或 README 中说明：为获得标准 stdout/stderr，默认关闭 TTY；若未来需要交互式 TTY，应切换策略并接受合并输出。

### 验证流程

1. 运行 `npm run build`，确保 TypeScript 编译通过。
2. 在有 Docker 的环境执行 `npm test`（或单独运行新增测试）。
3. 手动调用 MCP 工具 `execute_in_sandbox`，执行简单命令（如 `echo hello` / `>&2 echo err`），确认 stdout/stderr 完整返回。

### 风险与缓解

- **交互式体验下降**：关闭 TTY 后，命令执行不再模拟真实终端（无颜色/行缓冲）。当前 MCP 主要执行非交互式命令，可接受。如将来需要交互式 shell，可新增参数切换。
- **测试依赖 Docker**：CI 或本地若无法运行 Docker，需要跳过相关测试或在运行环境中开启 Docker。
- **脚本兼容性**：部分脚本若检测 TTY（如 `tty -s`），行为可能变化，需在发布说明中提及。

### 交付物

1. 更新后的 `src/sandbox-manager.ts`。
2. 新增/更新的 `src/__tests__/sandbox-manager.test.ts`（包含 stdout/stderr 校验）。
3. （可选）README 或代码注释，记录关闭 TTY 的设计原因。
4. 构建与测试结果记录。
