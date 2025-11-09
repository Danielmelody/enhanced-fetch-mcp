/**
 * Tests for SandboxManager
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SandboxManager } from '../sandbox-manager.js';
import { SandboxStatus } from '../types.js';

describe('SandboxManager', () => {
  let manager: SandboxManager;

  beforeAll(async () => {
    manager = new SandboxManager();
    await manager.initialize();
  });

  afterAll(async () => {
    await manager.shutdown();
  });

  it('should create a sandbox', async () => {
    const sandbox = await manager.createSandbox('test-sandbox');

    expect(sandbox).toBeDefined();
    expect(sandbox.name).toBe('test-sandbox');
    expect(sandbox.status).toBe(SandboxStatus.RUNNING);
    expect(sandbox.id).toMatch(/^sb_\d+_[a-z0-9]+$/);

    await manager.cleanupSandbox(sandbox.id);
  });

  it('should execute commands in sandbox', async () => {
    const sandbox = await manager.createSandbox('exec-test');

    const result = await manager.executeInSandbox(sandbox.id, ['echo', 'hello']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello');

    await manager.cleanupSandbox(sandbox.id);
  });

  it('should keep stdout and stderr separate without truncation', async () => {
    const sandbox = await manager.createSandbox('stdio-test');

    const result = await manager.executeInSandbox(sandbox.id, [
      'sh',
      '-c',
      "echo STDOUT && >&2 echo STDERR",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('STDOUT');
    expect(result.stderr).toBe('STDERR');

    await manager.cleanupSandbox(sandbox.id);
  });

  it('should list sandboxes', async () => {
    const sandbox1 = await manager.createSandbox('list-test-1');
    const sandbox2 = await manager.createSandbox('list-test-2');

    const sandboxes = manager.listSandboxes();

    expect(sandboxes.length).toBeGreaterThanOrEqual(2);
    expect(sandboxes.some(s => s.id === sandbox1.id)).toBe(true);
    expect(sandboxes.some(s => s.id === sandbox2.id)).toBe(true);

    await manager.cleanupSandbox(sandbox1.id);
    await manager.cleanupSandbox(sandbox2.id);
  });

  it('should pause and resume sandbox', async () => {
    const sandbox = await manager.createSandbox('pause-test');

    await manager.pauseSandbox(sandbox.id);
    const pausedSandbox = manager.getSandbox(sandbox.id);
    expect(pausedSandbox?.status).toBe(SandboxStatus.PAUSED);

    await manager.resumeSandbox(sandbox.id);
    const resumedSandbox = manager.getSandbox(sandbox.id);
    expect(resumedSandbox?.status).toBe(SandboxStatus.RUNNING);

    await manager.cleanupSandbox(sandbox.id);
  });

  it('should get sandbox stats', async () => {
    const sandbox = await manager.createSandbox('stats-test');

    // Execute some command to generate activity
    await manager.executeInSandbox(sandbox.id, ['echo', 'test']);

    const stats = await manager.getSandboxStats(sandbox.id);

    expect(stats).toBeDefined();
    expect(stats.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(stats.memoryUsage).toBeGreaterThan(0);

    await manager.cleanupSandbox(sandbox.id);
  });

  it('should cleanup sandbox', async () => {
    const sandbox = await manager.createSandbox('cleanup-test');

    await manager.cleanupSandbox(sandbox.id);

    const cleanedSandbox = manager.getSandbox(sandbox.id);
    expect(cleanedSandbox).toBeUndefined();
  });

  it('should apply resource limits', async () => {
    const sandbox = await manager.createSandbox('limits-test', {
      memoryLimit: '256m',
      cpuLimit: 0.5,
    });

    expect(sandbox.config.memoryLimit).toBe('256m');
    expect(sandbox.config.cpuLimit).toBe(0.5);

    await manager.cleanupSandbox(sandbox.id);
  });
});
