/**
 * 日志管理模块
 * 提供统一的日志记录和管理功能
 */

import winston from 'winston';
import path from 'path';
import { promises as fs } from 'fs';
import { LogEntry, SandboxInfo } from './types.js';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * 日志管理器类
 */
export class Logger {
  private logger: winston.Logger;
  private logEntries: LogEntry[] = [];
  private maxLogEntries: number = 10000;

  constructor(
    private serviceName: string = 'browser-mcp',
    logLevel: LogLevel = LogLevel.INFO
  ) {
    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: serviceName },
      transports: [
        // 控制台输出 - MUST write to stderr for MCP compatibility
        new winston.transports.Console({
          stderrLevels: ['debug', 'info', 'warn', 'error'],
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf((info) => {
              const level = String(info.level ?? '');
              const message = String(info.message ?? '');
              const timestamp = String(info.timestamp ?? '');
              const service = String(info.service ?? 'unknown');

              // Extract metadata excluding standard fields
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { level: _, message: __, timestamp: ___, service: ____, ...meta } = info;
              const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
            })
          )
        }),
        // 文件输出 - 所有日志
        new winston.transports.File({
          filename: path.join('logs', 'browser-mcp.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        }),
        // 文件输出 - 错误日志
        new winston.transports.File({
          filename: path.join('logs', 'browser-mcp-error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        })
      ]
    });

    // 确保日志目录存在
    void this.ensureLogDirectory();
  }

  /**
   * 确保日志目录存在
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir('logs', { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  /**
   * 创建日志条目
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    sandboxInfo?: SandboxInfo
  ): LogEntry {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      source: this.serviceName,
      message,
      metadata,
      sandboxId: sandboxInfo?.id,
      containerId: sandboxInfo?.containerId
    };

    return entry;
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加日志到内存缓存
   */
  private addToMemoryCache(entry: LogEntry): void {
    this.logEntries.push(entry);

    // 保持内存日志数量在限制范围内
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries.shift();
    }
  }

  /**
   * 调试日志
   */
  debug(message: string, metadata?: Record<string, unknown>, sandboxInfo?: SandboxInfo): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata, sandboxInfo);
    this.addToMemoryCache(entry);
    this.logger.debug(message, metadata);
  }

  /**
   * 信息日志
   */
  info(message: string, metadata?: Record<string, unknown>, sandboxInfo?: SandboxInfo): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata, sandboxInfo);
    this.addToMemoryCache(entry);
    this.logger.info(message, metadata);
  }

  /**
   * 警告日志
   */
  warn(message: string, metadata?: Record<string, unknown>, sandboxInfo?: SandboxInfo): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, metadata, sandboxInfo);
    this.addToMemoryCache(entry);
    this.logger.warn(message, metadata);
  }

  /**
   * 错误日志
   */
  error(message: string, metadata?: Record<string, unknown>, sandboxInfo?: SandboxInfo): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, metadata, sandboxInfo);
    this.addToMemoryCache(entry);
    this.logger.error(message, metadata);
  }

  /**
   * 致命错误日志
   */
  fatal(message: string, metadata?: Record<string, unknown>, sandboxInfo?: SandboxInfo): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, metadata, sandboxInfo);
    this.addToMemoryCache(entry);
    this.logger.error(`FATAL: ${message}`, metadata);
  }

  /**
   * 获取内存中的日志条目
   */
  getLogEntries(
    sandboxId?: string,
    level?: LogLevel,
    limit: number = 100
  ): LogEntry[] {
    let logs = [...this.logEntries];

    // 按沙箱ID过滤
    if (sandboxId) {
      logs = logs.filter(entry => entry.sandboxId === sandboxId);
    }

    // 按日志级别过滤
    if (level) {
      logs = logs.filter(entry => entry.level === level);
    }

    // 按时间排序（最新的在前）
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 限制数量
    return logs.slice(0, limit);
  }

  /**
   * 获取日志统计信息
   */
  getLogStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const level of Object.values(LogLevel)) {
      stats[level] = this.logEntries.filter(entry => entry.level === level).length;
    }

    return stats;
  }

  /**
   * 清除内存中的日志
   */
  clearMemoryLogs(): void {
    this.logEntries = [];
    this.info('Memory logs cleared');
  }

  /**
   * 从文件读取日志
   */
  async readLogFile(
    fileName: string = 'browser-mcp.log',
    limit: number = 1000
  ): Promise<string[]> {
    try {
      const filePath = path.join('logs', fileName);
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());

      return lines.slice(-limit);
    } catch (error) {
      this.error(`Failed to read log file: ${fileName}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 清除日志文件
   */
  async clearLogFiles(): Promise<void> {
    try {
      const logFiles = ['browser-mcp.log', 'browser-mcp-error.log'];

      for (const fileName of logFiles) {
        const filePath = path.join('logs', fileName);
        try {
          await fs.writeFile(filePath, '');
          this.info(`Cleared log file: ${fileName}`);
        } catch (error) {
          this.error(`Failed to clear log file: ${fileName}`, { error: error instanceof Error ? error.message : String(error) });
        }
      }
    } catch (error) {
      this.error('Failed to clear log files', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}