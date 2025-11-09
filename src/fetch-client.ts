/**
 * Fetch Client - HTTP client module for fetching web content
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { EventEmitter } from 'events';
import {
  FetchOptions,
  FetchResponse,
  FetchError,
  FetchErrorCode,
} from './types.js';
import { Logger } from './logger.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  timeout: 30000, // 30 seconds
  maxRedirects: 5,
  followRedirects: true,
  userAgent: 'Enhanced-Fetch-MCP/1.0',
  validateStatus: (status: number): boolean => status >= 200 && status < 600,
};

/**
 * FetchClient class - Handles HTTP requests with comprehensive error handling
 */
export class FetchClient extends EventEmitter {
  private axiosInstance: AxiosInstance;
  private logger: Logger;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('fetch-client');

    // Create axios instance with default configuration
    this.axiosInstance = axios.create({
      timeout: DEFAULT_CONFIG.timeout,
      maxRedirects: DEFAULT_CONFIG.maxRedirects,
      validateStatus: DEFAULT_CONFIG.validateStatus,
      headers: {
        'User-Agent': DEFAULT_CONFIG.userAgent,
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug('Outgoing HTTP request', {
          method: config.method,
          url: config.url,
          headers: config.headers,
        });
        this.emit('request', { method: config.method, url: config.url });
        return config;
      },
      (error: Error) => {
        this.logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug('HTTP response received', {
          status: response.status,
          url: response.config.url,
        });
        this.emit('response', { status: response.status, url: response.config.url });
        return response;
      },
      (error: Error) => {
        if (axios.isAxiosError(error)) {
          this.logger.warn('HTTP request failed', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.message,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch URL with given options
   */
  async fetchUrl(url: string, options: FetchOptions = {}): Promise<FetchResponse> {
    const startTime = Date.now();

    try {
      // Validate URL
      this.validateUrl(url);

      // Prepare request configuration
      const config = this.buildRequestConfig(url, options);

      this.logger.info('Fetching URL', { url, method: config.method });

      // Execute request
      const response = await this.executeRequest(config);

      // Build response object
      const fetchResponse = this.buildFetchResponse(response, url, startTime);

      this.logger.info('URL fetch completed', {
        url,
        status: fetchResponse.status,
        redirectCount: fetchResponse.redirectCount,
        duration: fetchResponse.timings?.total,
      });

      this.emit('fetch:success', fetchResponse);
      return fetchResponse;
    } catch (error) {
      this.logger.error('URL fetch failed', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });

      const fetchError = this.handleError(error, url);
      this.emit('fetch:error', fetchError);
      throw fetchError;
    }
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);

      // Only support HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new FetchError(
          `Unsupported protocol: ${parsedUrl.protocol}`,
          FetchErrorCode.UNSUPPORTED_PROTOCOL
        );
      }
    } catch (error) {
      if (error instanceof FetchError) {
        throw error;
      }
      throw new FetchError(
        `Invalid URL: ${url}`,
        FetchErrorCode.INVALID_URL,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Build axios request configuration from fetch options
   */
  private buildRequestConfig(url: string, options: FetchOptions): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      url,
      method: (options.method || 'GET') as string,
      timeout: options.timeout || DEFAULT_CONFIG.timeout,
      maxRedirects: options.maxRedirects ?? DEFAULT_CONFIG.maxRedirects,
      headers: {
        'User-Agent': options.userAgent || DEFAULT_CONFIG.userAgent,
        ...options.headers,
      },
      validateStatus: options.validateStatus || DEFAULT_CONFIG.validateStatus,
    };

    // Handle redirects
    if (options.followRedirects === false) {
      config.maxRedirects = 0;
    }

    // Handle request body
    if (options.body) {
      if (typeof options.body === 'string') {
        config.data = options.body;
      } else {
        config.data = options.body;
        // Set content-type to JSON if not already set
        if (!config.headers || !config.headers['Content-Type']) {
          config.headers = {
            ...config.headers,
            'Content-Type': 'application/json',
          };
        }
      }
    }

    // Handle proxy configuration
    if (options.proxy) {
      if (options.proxy.auth) {
        config.proxy = {
          host: options.proxy.host,
          port: options.proxy.port,
          auth: options.proxy.auth,
        };
      } else {
        config.proxy = {
          host: options.proxy.host,
          port: options.proxy.port,
        };
      }
    }

    return config;
  }

  /**
   * Execute HTTP request with error handling
   */
  private async executeRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    const response = await this.axiosInstance.request(config);
    return response;
  }

  /**
   * Build FetchResponse from axios response
   */
  private buildFetchResponse(
    response: AxiosResponse,
    originalUrl: string,
    startTime: number
  ): FetchResponse {
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Extract headers
    const headers: Record<string, string> = {};
    if (response.headers) {
      Object.keys(response.headers).forEach((key) => {
        const value = response.headers[key] as unknown;
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value.join(', ');
        } else if (value !== undefined) {
          headers[key] = String(value);
        }
      });
    }

    // Get content type
    const contentType = headers['content-type'] || 'application/octet-stream';

    // Get content length
    const contentLengthStr = headers['content-length'];
    const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : undefined;

    // Calculate redirect count
    const redirectCount = this.calculateRedirectCount(response);

    // Get final URL (after redirects)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const responseUrl = response.request?.res?.responseUrl;
    const finalUrl = (typeof responseUrl === 'string' ? responseUrl : response.config.url) || originalUrl;

    // Convert response data to string
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = this.convertResponseToString(response.data);

    const result: FetchResponse = {
      url: originalUrl,
      finalUrl,
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
      contentType,
      redirectCount,
      timings: {
        start: startTime,
        total: totalTime,
      },
    };

    // Only add contentLength if it exists
    if (contentLength !== undefined) {
      result.contentLength = contentLength;
    }

    return result;
  }

  /**
   * Convert response data to string
   */
  private convertResponseToString(data: unknown): string {
    if (typeof data === 'string') {
      return data;
    }

    if (data instanceof Buffer) {
      return data.toString('utf-8');
    }

    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data);
    }

    return String(data);
  }

  /**
   * Calculate number of redirects from response
   */
  private calculateRedirectCount(response: AxiosResponse): number {
    // Axios doesn't provide direct redirect count, estimate from response chain
    let count = 0;

    // Access private redirect count if available (internal axios implementation detail)
    const request = response.request as unknown;

    if (
      request &&
      typeof request === 'object' &&
      '_redirectable' in request &&
      request._redirectable &&
      typeof request._redirectable === 'object' &&
      '_redirectCount' in request._redirectable
    ) {
      const redirectCount = (request._redirectable as { _redirectCount: unknown })._redirectCount;
      if (typeof redirectCount === 'number') {
        count = redirectCount;
      }
    }

    return count;
  }

  /**
   * Handle errors and convert to FetchError
   */
  private handleError(error: unknown, url: string): FetchError {
    if (error instanceof FetchError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      return this.handleAxiosError(error, url);
    }

    return new FetchError(
      `Unknown error occurred while fetching ${url}`,
      FetchErrorCode.REQUEST_FAILED,
      undefined,
      undefined,
      error instanceof Error ? error : undefined
    );
  }

  /**
   * Handle Axios-specific errors
   */
  private handleAxiosError(error: AxiosError, url: string): FetchError {
    // Timeout error
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new FetchError(
        `Request timeout while fetching ${url}`,
        FetchErrorCode.TIMEOUT_ERROR,
        undefined,
        undefined,
        error
      );
    }

    // Network error
    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENETUNREACH'
    ) {
      return new FetchError(
        `Network error while fetching ${url}: ${error.message}`,
        FetchErrorCode.NETWORK_ERROR,
        undefined,
        undefined,
        error
      );
    }

    // Too many redirects
    if (error.message.includes('maximum redirect')) {
      return new FetchError(
        `Too many redirects while fetching ${url}`,
        FetchErrorCode.TOO_MANY_REDIRECTS,
        undefined,
        undefined,
        error
      );
    }

    // Response error (4xx, 5xx)
    if (error.response) {
      const responseHeaders: Record<string, string> = {};
      if (error.response.headers) {
        Object.keys(error.response.headers).forEach((key) => {
          const value = error.response?.headers[key] as unknown;
          if (typeof value === 'string') {
            responseHeaders[key] = value;
          } else if (Array.isArray(value)) {
            responseHeaders[key] = value.join(', ');
          } else if (value !== undefined) {
            responseHeaders[key] = String(value);
          }
        });
      }

      return new FetchError(
        `HTTP ${error.response.status} error while fetching ${url}`,
        FetchErrorCode.REQUEST_FAILED,
        error.response.status,
        {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: responseHeaders,
          body: this.convertResponseToString(error.response.data),
        },
        error
      );
    }

    // Generic request error
    return new FetchError(
      `Request failed while fetching ${url}: ${error.message}`,
      FetchErrorCode.REQUEST_FAILED,
      undefined,
      undefined,
      error
    );
  }

  /**
   * Create a GET request
   */
  async get(url: string, options: Omit<FetchOptions, 'method'> = {}): Promise<FetchResponse> {
    return this.fetchUrl(url, { ...options, method: 'GET' });
  }

  /**
   * Create a POST request
   */
  async post(
    url: string,
    body?: string | Record<string, unknown>,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<FetchResponse> {
    const requestOptions: FetchOptions = { ...options, method: 'POST' };
    if (body !== undefined) {
      requestOptions.body = body;
    }
    return this.fetchUrl(url, requestOptions);
  }

  /**
   * Create a PUT request
   */
  async put(
    url: string,
    body?: string | Record<string, unknown>,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<FetchResponse> {
    const requestOptions: FetchOptions = { ...options, method: 'PUT' };
    if (body !== undefined) {
      requestOptions.body = body;
    }
    return this.fetchUrl(url, requestOptions);
  }

  /**
   * Create a DELETE request
   */
  async delete(url: string, options: Omit<FetchOptions, 'method'> = {}): Promise<FetchResponse> {
    return this.fetchUrl(url, { ...options, method: 'DELETE' });
  }

  /**
   * Create a PATCH request
   */
  async patch(
    url: string,
    body?: string | Record<string, unknown>,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<FetchResponse> {
    const requestOptions: FetchOptions = { ...options, method: 'PATCH' };
    if (body !== undefined) {
      requestOptions.body = body;
    }
    return this.fetchUrl(url, requestOptions);
  }

  /**
   * Create a HEAD request
   */
  async head(url: string, options: Omit<FetchOptions, 'method'> = {}): Promise<FetchResponse> {
    return this.fetchUrl(url, { ...options, method: 'HEAD' });
  }

  /**
   * Set default timeout for all requests
   */
  setDefaultTimeout(timeout: number): void {
    this.axiosInstance.defaults.timeout = timeout;
    this.logger.debug('Default timeout updated', { timeout });
  }

  /**
   * Set default user agent for all requests
   */
  setDefaultUserAgent(userAgent: string): void {
    this.axiosInstance.defaults.headers.common['User-Agent'] = userAgent;
    this.logger.debug('Default user agent updated', { userAgent });
  }

  /**
   * Set default headers for all requests
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.keys(headers).forEach((key) => {
      this.axiosInstance.defaults.headers.common[key] = headers[key];
    });
    this.logger.debug('Default headers updated', { headers });
  }

  /**
   * Get current axios instance configuration
   */
  getConfig(): {
    timeout: number | undefined;
    maxRedirects: number | undefined;
    headers: Record<string, string>;
  } {
    const headers: Record<string, string> = {};
    const commonHeaders = this.axiosInstance.defaults.headers.common;

    Object.keys(commonHeaders).forEach((key) => {
      const value = commonHeaders[key];
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });

    return {
      timeout: this.axiosInstance.defaults.timeout,
      maxRedirects: this.axiosInstance.defaults.maxRedirects,
      headers,
    };
  }
}
