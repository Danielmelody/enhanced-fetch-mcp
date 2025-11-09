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

/**
 * HTTP Fetch 相关类型定义
 */

/**
 * HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Fetch 请求选项
 */
export interface FetchOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  timeout?: number;
  maxRedirects?: number;
  followRedirects?: boolean;
  userAgent?: string;
  validateStatus?: (status: number) => boolean;
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

/**
 * Fetch 响应结果
 */
export interface FetchResponse {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  contentLength?: number;
  redirectCount: number;
  timings?: {
    start: number;
    dns?: number;
    tcp?: number;
    tls?: number;
    firstByte?: number;
    download?: number;
    total: number;
  };
}

/**
 * Fetch 错误码
 */
export enum FetchErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INVALID_URL = 'INVALID_URL',
  TOO_MANY_REDIRECTS = 'TOO_MANY_REDIRECTS',
  REQUEST_FAILED = 'REQUEST_FAILED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  UNSUPPORTED_PROTOCOL = 'UNSUPPORTED_PROTOCOL'
}

/**
 * Fetch 错误类
 */
export class FetchError extends Error {
  constructor(
    message: string,
    public code: FetchErrorCode,
    public statusCode?: number,
    public response?: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body?: string;
    },
    public originalError?: Error
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Content Extraction 相关类型定义
 */

/**
 * 内容提取选项
 */
export interface ExtractOptions {
  includeMetadata?: boolean;
  includeLinks?: boolean;
  includeImages?: boolean;
  preserveFormatting?: boolean;
  removeSelectors?: string[];
  mainContentSelector?: string;
  convertToMarkdown?: boolean;
}

/**
 * 链接信息
 */
export interface LinkInfo {
  text: string;
  href: string;
  title?: string;
}

/**
 * 图片信息
 */
export interface ImageInfo {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

/**
 * 元数据信息
 */
export interface ContentMetadata {
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  canonical?: string;
  lang?: string;
}

/**
 * 内容统计信息
 */
export interface ContentStats {
  wordCount: number;
  characterCount: number;
  readingTimeMinutes: number;
}

/**
 * 提取的内容结果
 */
export interface ExtractedContent {
  title: string;
  description?: string | undefined;
  author?: string | undefined;
  publishedDate?: string | undefined;
  content: string;
  markdown?: string | undefined;
  html?: string | undefined;
  metadata: ContentMetadata;
  links?: LinkInfo[] | undefined;
  images?: ImageInfo[] | undefined;
  stats: ContentStats;
}

/**
 * 内容提取错误码
 */
export enum ExtractErrorCode {
  INVALID_HTML = 'INVALID_HTML',
  PARSING_FAILED = 'PARSING_FAILED',
  NO_CONTENT_FOUND = 'NO_CONTENT_FOUND',
  CONVERSION_FAILED = 'CONVERSION_FAILED'
}

/**
 * 内容提取错误类
 */
export class ExtractError extends Error {
  constructor(
    message: string,
    public code: ExtractErrorCode,
    public details?: Record<string, unknown>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ExtractError';
  }
}

/**
 * Browser Sandbox 相关类型定义
 */

/**
 * 浏览器上下文配置
 */
export interface BrowserContextConfig {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  timeout?: number;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  locale?: string;
  timezone?: string;
  permissions?: string[];
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  colorScheme?: 'light' | 'dark' | 'no-preference';
  deviceScaleFactor?: number;
}

/**
 * 导航选项
 */
export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  referer?: string;
}

/**
 * 浏览器上下文信息
 */
export interface BrowserContextInfo {
  id: string;
  browserType: 'chromium' | 'firefox' | 'webkit';
  createdAt: Date;
  pageCount: number;
  status: 'active' | 'closed';
}

/**
 * 浏览器页面信息
 */
export interface BrowserPageInfo {
  id: string;
  contextId: string;
  url: string;
  title: string;
  createdAt: Date;
}

/**
 * 截图选项
 */
export interface ScreenshotOptions {
  path?: string;
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  type?: 'png' | 'jpeg';
  quality?: number;
}

/**
 * PDF 生成选项
 */
export interface PDFOptions {
  path?: string;
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * JavaScript 执行结果
 */
export interface JavaScriptResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * 浏览器错误码
 */
export enum BrowserErrorCode {
  BROWSER_NOT_INITIALIZED = 'BROWSER_NOT_INITIALIZED',
  CONTEXT_NOT_FOUND = 'CONTEXT_NOT_FOUND',
  PAGE_NOT_FOUND = 'PAGE_NOT_FOUND',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  NAVIGATION_TIMEOUT = 'NAVIGATION_TIMEOUT',
  SCREENSHOT_FAILED = 'SCREENSHOT_FAILED',
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  JAVASCRIPT_EXECUTION_FAILED = 'JAVASCRIPT_EXECUTION_FAILED',
  BROWSER_LAUNCH_FAILED = 'BROWSER_LAUNCH_FAILED',
  CONTEXT_CREATION_FAILED = 'CONTEXT_CREATION_FAILED'
}

/**
 * 浏览器错误类
 */
export class BrowserError extends Error {
  constructor(
    message: string,
    public code: BrowserErrorCode,
    public details?: Record<string, unknown>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BrowserError';
  }
}
