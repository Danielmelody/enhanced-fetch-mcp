/**
 * Sandbox Manager - Core module for managing Docker-based sandboxes
 */

import Docker from 'dockerode';
import { EventEmitter } from 'events';
import {
  SandboxConfig,
  SandboxInfo,
  SandboxStatus,
  ExecuteResult,
  SandboxStats,
} from './types.js';

export class SandboxManager extends EventEmitter {
  private docker: Docker;
  private sandboxes: Map<string, SandboxInfo>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.docker = new Docker();
    this.sandboxes = new Map();
  }

  /**
   * Initialize the sandbox manager
   */
  async initialize(): Promise<void> {
    try {
      // Verify Docker is available
      await this.docker.ping();

      // Pull default image if not exists
      await this.ensureImage('node:20-alpine');

      // Start cleanup scheduler
      this.startCleanupScheduler();

      this.emit('initialized');
    } catch (error) {
      throw new Error(`Failed to initialize SandboxManager: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new sandbox
   */
  async createSandbox(name: string, config: SandboxConfig = {}): Promise<SandboxInfo> {
    const sandboxId = this.generateId();
    const defaultConfig: SandboxConfig = {
      image: 'node:20-alpine',
      memoryLimit: '512m',
      cpuLimit: 1,
      timeout: 300000, // 5 minutes
      autoRemove: true,
      ...config,
    };

    const sandboxInfo: SandboxInfo = {
      id: sandboxId,
      name,
      status: SandboxStatus.CREATING,
      createdAt: new Date(),
      config: defaultConfig,
    };

    this.sandboxes.set(sandboxId, sandboxInfo);

    try {
      // Create container
      const container = await this.docker.createContainer({
        name: `sandbox-${sandboxId}`,
        Image: defaultConfig.image!,
        Cmd: ['/bin/sh'],
        Tty: true,
        OpenStdin: true,
        HostConfig: {
          Memory: this.parseMemoryLimit(defaultConfig.memoryLimit!),
          NanoCpus: (defaultConfig.cpuLimit! * 1e9),
          AutoRemove: defaultConfig.autoRemove,
          NetworkMode: 'bridge',
        },
        Env: defaultConfig.env ? Object.entries(defaultConfig.env).map(([k, v]) => `${k}=${v}`) : [],
        WorkingDir: defaultConfig.workDir || '/workspace',
      });

      // Start container
      await container.start();

      sandboxInfo.containerId = container.id;
      sandboxInfo.status = SandboxStatus.RUNNING;
      this.sandboxes.set(sandboxId, sandboxInfo);

      this.emit('sandbox:created', sandboxInfo);

      // Schedule auto-cleanup if timeout is set
      if (defaultConfig.timeout) {
        setTimeout(() => {
          void this.cleanupSandbox(sandboxId).catch(console.error);
        }, defaultConfig.timeout);
      }

      return sandboxInfo;
    } catch (error) {
      sandboxInfo.status = SandboxStatus.ERROR;
      this.sandboxes.set(sandboxId, sandboxInfo);
      throw new Error(`Failed to create sandbox: ${(error as Error).message}`);
    }
  }

  /**
   * Execute command in sandbox
   */
  async executeInSandbox(sandboxId: string, command: string[]): Promise<ExecuteResult> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    if (sandbox.status !== SandboxStatus.RUNNING) {
      throw new Error(`Sandbox ${sandboxId} is not running (status: ${sandbox.status})`);
    }

    try {
      const container = this.docker.getContainer(sandbox.containerId!);

      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ Detach: false });

      let stdout = '';
      let stderr = '';

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          const data = chunk.toString();
          // Docker multiplexes stdout/stderr - first byte indicates stream type
          if (chunk[0] === 1) {
            stdout += data.substring(8);
          } else if (chunk[0] === 2) {
            stderr += data.substring(8);
          }
        });

        stream.on('end', () => {
          void (async () => {
            try {
              const inspectResult = await exec.inspect();
              resolve({
                stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: inspectResult.ExitCode || 0,
            });
            } catch (error) {
              reject(error);
            }
          })();
        });

        stream.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to execute command: ${(error as Error).message}`);
    }
  }

  /**
   * Pause a running sandbox
   */
  async pauseSandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    if (sandbox.status !== SandboxStatus.RUNNING) {
      throw new Error(`Sandbox ${sandboxId} is not running`);
    }

    try {
      const container = this.docker.getContainer(sandbox.containerId!);
      await container.pause();

      sandbox.status = SandboxStatus.PAUSED;
      this.sandboxes.set(sandboxId, sandbox);
      this.emit('sandbox:paused', sandbox);
    } catch (error) {
      throw new Error(`Failed to pause sandbox: ${(error as Error).message}`);
    }
  }

  /**
   * Resume a paused sandbox
   */
  async resumeSandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    if (sandbox.status !== SandboxStatus.PAUSED) {
      throw new Error(`Sandbox ${sandboxId} is not paused`);
    }

    try {
      const container = this.docker.getContainer(sandbox.containerId!);
      await container.unpause();

      sandbox.status = SandboxStatus.RUNNING;
      this.sandboxes.set(sandboxId, sandbox);
      this.emit('sandbox:resumed', sandbox);
    } catch (error) {
      throw new Error(`Failed to resume sandbox: ${(error as Error).message}`);
    }
  }

  /**
   * Stop and remove a sandbox
   */
  async cleanupSandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    try {
      if (sandbox.containerId) {
        const container = this.docker.getContainer(sandbox.containerId);

        // Try to stop gracefully
        try {
          await container.stop({ t: 10 });
        } catch (error) {
          // Container might already be stopped
        }

        // Remove container if not auto-removed
        if (!sandbox.config.autoRemove) {
          try {
            await container.remove({ force: true });
          } catch (error) {
            // Container might already be removed
          }
        }
      }

      sandbox.status = SandboxStatus.STOPPED;
      this.sandboxes.delete(sandboxId);
      this.emit('sandbox:cleaned', sandboxId);
    } catch (error) {
      throw new Error(`Failed to cleanup sandbox: ${(error as Error).message}`);
    }
  }

  /**
   * Get sandbox information
   */
  getSandbox(sandboxId: string): SandboxInfo | undefined {
    return this.sandboxes.get(sandboxId);
  }

  /**
   * List all sandboxes
   */
  listSandboxes(): SandboxInfo[] {
    return Array.from(this.sandboxes.values());
  }

  /**
   * Get sandbox statistics
   */
  async getSandboxStats(sandboxId: string): Promise<SandboxStats> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox || !sandbox.containerId) {
      throw new Error(`Sandbox ${sandboxId} not found or not running`);
    }

    try {
      const container = this.docker.getContainer(sandbox.containerId);
      const stats = await container.stats({ stream: false });

      return {
        cpuUsage: this.calculateCpuPercent(stats),
        memoryUsage: stats.memory_stats.usage || 0,
        networkRx: stats.networks?.eth0?.rx_bytes || 0,
        networkTx: stats.networks?.eth0?.tx_bytes || 0,
      };
    } catch (error) {
      throw new Error(`Failed to get sandbox stats: ${(error as Error).message}`);
    }
  }

  /**
   * Cleanup all sandboxes
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const sandboxIds = Array.from(this.sandboxes.keys());
    await Promise.all(
      sandboxIds.map(id => this.cleanupSandbox(id).catch(console.error))
    );

    this.emit('shutdown');
  }

  // Private helper methods

  private generateId(): string {
    return `sb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseMemoryLimit(limit: string): number {
    const units: Record<'b' | 'k' | 'm' | 'g', number> = {
      b: 1,
      k: 1024,
      m: 1024 ** 2,
      g: 1024 ** 3,
    };

    const match = limit.toLowerCase().match(/^(\d+)([bkmg])$/);
    if (!match) {
      throw new Error(`Invalid memory limit format: ${limit}`);
    }

    const value = match[1];
    const unit = match[2];
    if (!value || !unit) {
      throw new Error(`Invalid memory limit format: ${limit}`);
    }

    // Type-safe unit lookup
    const validUnit = unit as 'b' | 'k' | 'm' | 'g';
    if (!(validUnit in units)) {
      throw new Error(`Invalid memory unit: ${unit}`);
    }

    return parseInt(value, 10) * units[validUnit];
  }

  private calculateCpuPercent(stats: {
    cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number; online_cpus: number };
    precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number };
  }): number {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
                     stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage -
                        stats.precpu_stats.system_cpu_usage;
    const numberCpus = stats.cpu_stats.online_cpus || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * numberCpus * 100.0;
    }
    return 0;
  }

  private async ensureImage(image: string): Promise<void> {
    try {
      await this.docker.getImage(image).inspect();
    } catch (error) {
      // Image doesn't exist, pull it
      console.log(`Pulling image ${image}...`);
      await new Promise<void>((resolve, reject) => {
        void this.docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(stream, (err: Error | null) => {
            if (err) reject(err);
            else resolve(undefined);
          });
        });
      });
    }
  }

  private startCleanupScheduler(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSandboxes().catch(console.error);
    }, 5 * 60 * 1000);
  }

  private async cleanupStaleSandboxes(): Promise<void> {
    const now = Date.now();
    const staleSandboxes: string[] = [];

    for (const [id, sandbox] of this.sandboxes.entries()) {
      const age = now - sandbox.createdAt.getTime();
      const timeout = sandbox.config.timeout || 300000;

      if (age > timeout && sandbox.status !== SandboxStatus.STOPPED) {
        staleSandboxes.push(id);
      }
    }

    await Promise.all(
      staleSandboxes.map(id => this.cleanupSandbox(id).catch(console.error))
    );

    if (staleSandboxes.length > 0) {
      this.emit('cleanup:stale', staleSandboxes);
    }
  }
}
