/**
 * Browser MCP 沙箱管理工具类型定义
 */

/**
 * 容器状态枚举
 */
export enum ContainerStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  PAUSED = 'paused',
  RESTARTING = 'restarting',
  REMOVING = 'removing',
  DEAD = 'dead',
  CREATED = 'created',
  UNKNOWN = 'unknown'
}

/**
 * 沙箱状态枚举
 */
export enum SandboxStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * 浏览器类型枚举
 */
export enum BrowserType {
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  EDGE = 'edge',
  SAFARI = 'safari'
}

/**
 * 沙箱配置接口
 */
export interface SandboxConfig {
  id?: string;
  name?: string;
  browserType?: BrowserType;
  version?: string;
  image?: string;
  memoryLimit?: string;
  cpuLimit?: number;
  timeout?: number;
  env?: Record<string, string>;
  workDir?: string;
  autoRemove?: boolean;
  ports?: {
    vnc: number;
    chromeDebugger: number;
    app: number;
  };
  resources?: {
    memory: string;
    cpu: string;
    shm: string;
  };
  security?: {
    enableVNC: boolean;
    vncPassword?: string;
    urlWhitelist?: string[];
    timeLimit?: number;
    allowFileAccess: boolean;
    allowDownloads: boolean;
  };
  environment?: Record<string, string>;
  volumes?: Array<{
    host: string;
    container: string;
    mode: 'rw' | 'ro';
  }>;
  network?: {
    name: string;
    aliases?: string[];
  };
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    retries: number;
  };
}

/**
 * 容器信息接口
 */
export interface ContainerInfo {
  id: string;
  name: string;
  status: ContainerStatus;
  created: Date;
  started?: Date;
  image: string;
  ports: Record<string, string>;
  networks: string[];
  volumes: Array<{
    source: string;
    destination: string;
    mode: string;
  }>;
  labels: Record<string, string>;
  sandboxId?: string;
}

/**
 * 沙箱状态接口
 */
export interface SandboxInfo {
  id: string;
  name: string;
  status: SandboxStatus;
  containerId?: string;
  createdAt: Date;
  config: SandboxConfig;
  metadata?: Record<string, unknown>;
  containerInfo?: ContainerInfo;
  browserInfo?: {
    version: string;
    debuggerPort: number;
    debuggerUrl?: string;
  };
  vncInfo?: {
    port: number;
    password?: string;
  };
  health?: {
    status: 'healthy' | 'unhealthy';
    lastCheck?: Date;
    message?: string;
  };
  resources?: {
    cpu: number;
    memory: number;
    memoryLimit?: number;
    network?: {
      rx_bytes: number;
      tx_bytes: number;
    };
  };
}

/**
 * 执行结果接口
 */
export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * 沙箱统计信息接口
 */
export interface SandboxStats {
  cpuUsage: number;
  memoryUsage: number;
  networkRx: number;
  networkTx: number;
}

/**
 * 健康检查响应接口
 */
export interface HealthCheckResponse {
  healthy: boolean;
  checks: Array<{
    name: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
    message?: string;
    timestamp: Date;
  }>;
  timestamp: Date;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source: string;
  message: string;
  metadata?: Record<string, unknown> | undefined;
  sandboxId?: string | undefined;
  containerId?: string | undefined;
}

/**
 * 审计日志接口
 */
export interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  user?: string;
  sandboxId?: string;
  details: Record<string, unknown>;
  result: 'success' | 'failure';
  ip?: string;
}

/**
 * 安全策略接口
 */
export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: Rule[];
  created: Date;
  updated: Date;
}

/**
 * 安全规则接口
 */
export interface Rule {
  id: string;
  type: 'url_whitelist' | 'time_limit' | 'file_access' | 'download' | 'upload' | 'network_access';
  description?: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Array<{
    type: 'allow' | 'deny' | 'log' | 'alert';
    parameters?: Record<string, unknown>;
  }>;
}

/**
 * 错误码枚举
 */
export enum ErrorCode {
  CONTAINER_NOT_FOUND = 'CONTAINER_NOT_FOUND',
  CONTAINER_START_FAILED = 'CONTAINER_START_FAILED',
  CONTAINER_STOP_FAILED = 'CONTAINER_STOP_FAILED',
  CONFIGURATION_INVALID = 'CONFIGURATION_INVALID',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  DOCKER_ERROR = 'DOCKER_ERROR',
  BROWSER_ERROR = 'BROWSER_ERROR',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION'
}

/**
 * 自定义错误类
 */
export class SandboxError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: Record<string, unknown>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SandboxError';
  }
}
