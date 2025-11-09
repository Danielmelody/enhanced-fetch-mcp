/**
 * Content Extractor - HTML content extraction and conversion module
 * Converts HTML to readable Markdown format with metadata extraction
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import TurndownService from 'turndown';
import { Logger } from './logger.js';
import {
  ExtractOptions,
  ExtractedContent,
  LinkInfo,
  ImageInfo,
  ContentMetadata,
  ContentStats,
  ExtractError,
  ExtractErrorCode,
} from './types.js';

/**
 * Default extraction configuration
 */
const DEFAULT_OPTIONS: Required<ExtractOptions> = {
  includeMetadata: true,
  includeLinks: true,
  includeImages: true,
  preserveFormatting: true,
  removeSelectors: [],
  mainContentSelector: '',
  convertToMarkdown: true,
};

/**
 * Common selectors for content to remove
 */
const REMOVAL_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'object',
  'embed',
  'link[rel="stylesheet"]',
  // Advertisements
  '[id*="ad"]',
  '[class*="ad-"]',
  '[class*="advertisement"]',
  '[class*="banner"]',
  '[class*="sponsor"]',
  '[class*="popup"]',
  '[class*="modal"]',
  // Navigation and UI elements
  'nav',
  'header',
  'footer',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[class*="sidebar"]',
  '[class*="menu"]',
  '[class*="breadcrumb"]',
  // Social and sharing
  '[class*="share"]',
  '[class*="social"]',
  '[class*="follow"]',
  // Comments
  '[class*="comment"]',
  '[id*="comment"]',
  // Related content
  '[class*="related"]',
  '[class*="recommended"]',
];

/**
 * Selectors for finding main content
 */
const MAIN_CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.main-content',
  '#main-content',
  '.content',
  '#content',
  '.post-content',
  '.entry-content',
  '.article-content',
  '.page-content',
];

/**
 * ContentExtractor class - Extracts and converts HTML content
 */
export class ContentExtractor {
  private logger: Logger;
  private turndownService: TurndownService;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('content-extractor');

    // Configure Turndown service for HTML to Markdown conversion
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
    });

    // Add custom rules for better conversion
    this.configureTurndownRules();
  }

  /**
   * Configure custom Turndown conversion rules
   */
  private configureTurndownRules(): void {
    // Preserve code blocks
    this.turndownService.addRule('fencedCodeBlock', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filter: (node: any): boolean => {
        return (
          node.nodeName === 'PRE' &&
          node.firstChild !== null &&
          node.firstChild.nodeName === 'CODE'
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      replacement: (content: string, node: any): string => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const codeElement = node.firstChild;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const className = (codeElement.getAttribute?.('class') as string) || '';
        const language = className.match(/language-(\w+)/)?.[1] || '';
        return `\n\`\`\`${language}\n${content}\n\`\`\`\n`;
      },
    });

    // Handle images with better formatting
    this.turndownService.addRule('images', {
      filter: 'img',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      replacement: (_content: string, node: any): string => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const alt = (node.getAttribute?.('alt') as string) || '';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const src = (node.getAttribute?.('src') as string) || '';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const title = node.getAttribute?.('title') as string | undefined;
        return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
      },
    });

    // Preserve tables
    this.turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);
  }

  /**
   * Extract content from HTML
   */
  extractContent(
    html: string,
    url?: string,
    options: ExtractOptions = {}
  ): ExtractedContent {
    try {
      // Validate input
      if (!html || html.trim().length === 0) {
        throw new ExtractError(
          'HTML content is empty',
          ExtractErrorCode.INVALID_HTML
        );
      }

      this.logger.info('Starting content extraction', { url });

      // Merge options with defaults
      const mergedOptions: Required<ExtractOptions> = {
        ...DEFAULT_OPTIONS,
        ...options,
      };

      // Parse HTML with Cheerio
      const $ = cheerio.load(html);

      // Extract metadata
      const metadata = mergedOptions.includeMetadata
        ? this.extractMetadata($)
        : {};

      // Extract basic info
      const title = this.extractTitle($);
      const description = this.extractDescription($, metadata);
      const author = this.extractAuthor($, metadata);
      const publishedDate = this.extractPublishedDate($, metadata);

      // Clean HTML
      this.cleanHtml($, mergedOptions);

      // Find and extract main content
      const mainContent = this.findMainContent($, mergedOptions);
      const contentHtml = mainContent.html() || '';

      // Extract links
      const links = mergedOptions.includeLinks
        ? this.extractLinks(mainContent)
        : undefined;

      // Extract images
      const images = mergedOptions.includeImages
        ? this.extractImages(mainContent, url)
        : undefined;

      // Convert to text
      const contentText = mainContent.text().trim();

      // Convert to Markdown
      const markdown = mergedOptions.convertToMarkdown
        ? this.htmlToMarkdown(contentHtml)
        : undefined;

      // Calculate statistics
      const stats = this.calculateStats(contentText);

      const result: ExtractedContent = {
        title,
        description,
        author,
        publishedDate,
        content: contentText,
        markdown,
        html: contentHtml,
        metadata,
        links,
        images,
        stats,
      };

      this.logger.info('Content extraction completed', {
        url,
        titleLength: title.length,
        contentLength: contentText.length,
        wordCount: stats.wordCount,
        linkCount: links?.length || 0,
        imageCount: images?.length || 0,
      });

      return result;
    } catch (error) {
      if (error instanceof ExtractError) {
        throw error;
      }

      this.logger.error('Content extraction failed', {
        error: error instanceof Error ? error.message : String(error),
        url,
      });

      throw new ExtractError(
        'Failed to extract content from HTML',
        ExtractErrorCode.PARSING_FAILED,
        { url },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract metadata from HTML
   */
  private extractMetadata($: CheerioAPI): ContentMetadata {
    const metadata: ContentMetadata = {};

    // Extract keywords
    const keywordsContent = $('meta[name="keywords"]').attr('content');
    if (keywordsContent) {
      metadata.keywords = keywordsContent
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    }

    // Extract Open Graph tags
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle !== undefined) {
      metadata.ogTitle = ogTitle;
    }

    const ogDescription = $('meta[property="og:description"]').attr('content');
    if (ogDescription !== undefined) {
      metadata.ogDescription = ogDescription;
    }

    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage !== undefined) {
      metadata.ogImage = ogImage;
    }

    const ogUrl = $('meta[property="og:url"]').attr('content');
    if (ogUrl !== undefined) {
      metadata.ogUrl = ogUrl;
    }

    // Extract Twitter Card tags
    const twitterCard = $('meta[name="twitter:card"]').attr('content');
    if (twitterCard !== undefined) {
      metadata.twitterCard = twitterCard;
    }

    // Extract canonical URL
    const canonical = $('link[rel="canonical"]').attr('href');
    if (canonical !== undefined) {
      metadata.canonical = canonical;
    }

    // Extract language
    const lang = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content');
    if (lang !== undefined) {
      metadata.lang = lang;
    }

    return metadata;
  }

  /**
   * Extract page title
   */
  private extractTitle($: CheerioAPI): string {
    // Try multiple sources for title
    const sources = [
      $('meta[property="og:title"]').attr('content'),
      $('meta[name="twitter:title"]').attr('content'),
      $('h1').first().text().trim(),
      $('title').text().trim(),
      '',
    ];

    for (const source of sources) {
      if (source && source.length > 0) {
        return source;
      }
    }

    return 'Untitled';
  }

  /**
   * Extract page description
   */
  private extractDescription($: CheerioAPI, metadata: ContentMetadata): string | undefined {
    return (
      metadata.ogDescription ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content')
    );
  }

  /**
   * Extract author information
   */
  private extractAuthor($: CheerioAPI, _metadata: ContentMetadata): string | undefined {
    return (
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('[rel="author"]').text().trim() ||
      $('.author').first().text().trim() ||
      undefined
    );
  }

  /**
   * Extract published date
   */
  private extractPublishedDate($: CheerioAPI, _metadata: ContentMetadata): string | undefined {
    return (
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="publish-date"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      $('.publish-date').first().text().trim() ||
      undefined
    );
  }

  /**
   * Clean HTML by removing unwanted elements
   */
  private cleanHtml($: CheerioAPI, options: Required<ExtractOptions>): void {
    // Remove common unwanted elements
    REMOVAL_SELECTORS.forEach((selector) => {
      $(selector).remove();
    });

    // Remove custom selectors
    if (options.removeSelectors.length > 0) {
      options.removeSelectors.forEach((selector) => {
        $(selector).remove();
      });
    }

    // Remove hidden elements
    $('[style*="display:none"]').remove();
    $('[style*="display: none"]').remove();
    $('[hidden]').remove();
    $('[aria-hidden="true"]').remove();

    // Remove empty elements
    $('p:empty, div:empty, span:empty').remove();

    this.logger.debug('HTML cleaning completed');
  }

  /**
   * Find main content area in the document
   */
  private findMainContent(
    $: CheerioAPI,
    options: Required<ExtractOptions>
  ): Cheerio<AnyNode> {
    // If a specific selector is provided, use it
    if (options.mainContentSelector) {
      const customContent = $(options.mainContentSelector);
      if (customContent.length > 0) {
        this.logger.debug('Using custom main content selector', {
          selector: options.mainContentSelector,
        });
        return customContent.first();
      }
    }

    // Try common main content selectors
    for (const selector of MAIN_CONTENT_SELECTORS) {
      const element = $(selector);
      if (element.length > 0) {
        this.logger.debug('Found main content', { selector });
        return element.first();
      }
    }

    // Fallback: find the largest text block
    const bodyContent = $('body');
    if (bodyContent.length > 0) {
      this.logger.debug('Using body as main content (fallback)');
      return bodyContent;
    }

    // Last resort: use the entire document
    this.logger.warn('Could not find main content, using entire document');
    return $.root();
  }

  /**
   * Extract links from content
   */
  private extractLinks(content: Cheerio<AnyNode>): LinkInfo[] {
    const links: LinkInfo[] = [];
    const seen = new Set<string>();

    content.find('a[href]').each((_index, element) => {
      const $link = cheerio.load(element)('a');
      const href = $link.attr('href');

      if (!href || seen.has(href)) {
        return;
      }

      // Skip anchor links and javascript: links
      if (href.startsWith('#') || href.startsWith('javascript:')) {
        return;
      }

      seen.add(href);

      const link: LinkInfo = {
        text: $link.text().trim(),
        href: href,
      };

      const title = $link.attr('title');
      if (title) {
        link.title = title;
      }

      links.push(link);
    });

    this.logger.debug('Extracted links', { count: links.length });
    return links;
  }

  /**
   * Extract images from content
   */
  private extractImages(content: Cheerio<AnyNode>, baseUrl?: string): ImageInfo[] {
    const images: ImageInfo[] = [];
    const seen = new Set<string>();

    content.find('img[src]').each((_index, element) => {
      const $img = cheerio.load(element)('img');
      const src = $img.attr('src');

      if (!src || seen.has(src)) {
        return;
      }

      // Skip data URIs and placeholder images
      if (src.startsWith('data:') || src.includes('placeholder') || src.includes('spacer.gif')) {
        return;
      }

      seen.add(src);

      // Resolve relative URLs if base URL is provided
      let absoluteSrc = src;
      if (baseUrl && !src.startsWith('http://') && !src.startsWith('https://')) {
        try {
          const base = new URL(baseUrl);
          absoluteSrc = new URL(src, base).href;
        } catch (error) {
          this.logger.debug('Failed to resolve image URL', { src, baseUrl });
        }
      }

      const image: ImageInfo = {
        src: absoluteSrc,
      };

      const alt = $img.attr('alt');
      if (alt) {
        image.alt = alt;
      }

      const title = $img.attr('title');
      if (title) {
        image.title = title;
      }

      const width = $img.attr('width');
      if (width) {
        const widthNum = parseInt(width, 10);
        if (!isNaN(widthNum)) {
          image.width = widthNum;
        }
      }

      const height = $img.attr('height');
      if (height) {
        const heightNum = parseInt(height, 10);
        if (!isNaN(heightNum)) {
          image.height = heightNum;
        }
      }

      images.push(image);
    });

    this.logger.debug('Extracted images', { count: images.length });
    return images;
  }

  /**
   * Convert HTML to Markdown
   */
  private htmlToMarkdown(html: string): string {
    try {
      if (!html || html.trim().length === 0) {
        return '';
      }

      const markdown = this.turndownService.turndown(html);
      this.logger.debug('HTML to Markdown conversion completed', {
        htmlLength: html.length,
        markdownLength: markdown.length,
      });

      return markdown.trim();
    } catch (error) {
      this.logger.error('HTML to Markdown conversion failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ExtractError(
        'Failed to convert HTML to Markdown',
        ExtractErrorCode.CONVERSION_FAILED,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Calculate content statistics
   */
  private calculateStats(text: string): ContentStats {
    const cleanText = text.trim();
    const characterCount = cleanText.length;

    // Count words (split by whitespace and filter empty strings)
    const words = cleanText
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const wordCount = words.length;

    // Calculate reading time (assuming 200 words per minute)
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    this.logger.debug('Content statistics calculated', {
      characterCount,
      wordCount,
      readingTimeMinutes,
    });

    return {
      wordCount,
      characterCount,
      readingTimeMinutes,
    };
  }

  /**
   * Extract plain text from HTML (without Markdown conversion)
   */
  extractPlainText(html: string): string {
    try {
      const $ = cheerio.load(html);

      // Remove unwanted elements
      REMOVAL_SELECTORS.forEach((selector) => {
        $(selector).remove();
      });

      // Get text content
      const text = $('body').text().trim();

      // Normalize whitespace
      return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
      this.logger.error('Plain text extraction failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ExtractError(
        'Failed to extract plain text from HTML',
        ExtractErrorCode.PARSING_FAILED,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract only metadata without full content extraction
   */
  extractMetadataOnly(html: string): ContentMetadata {
    try {
      const $ = cheerio.load(html);
      return this.extractMetadata($);
    } catch (error) {
      this.logger.error('Metadata extraction failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ExtractError(
        'Failed to extract metadata from HTML',
        ExtractErrorCode.PARSING_FAILED,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
}
