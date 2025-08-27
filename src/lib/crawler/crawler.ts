import * as cheerio from 'cheerio';
import { parse as parseHtml } from 'node-html-parser';
// @ts-expect-error - no types available for robots-parser
import robotsParser from 'robots-parser';
import { 
  type CrawlResult, 
  type CrawlerOptions, 
  crawlerOptionsSchema,
  crawlResultSchema 
} from './types';
import { EnhancedExtractionEngine } from '../extraction/enhanced-extraction-engine';
import { isFeatureEnabled } from '../feature-flags/service';
import type { ExtractedData } from '../extraction/types';

export class WebCrawler {
  private options: CrawlerOptions;
  private enhancedExtractionEngine?: EnhancedExtractionEngine;
  
  constructor(options: Partial<CrawlerOptions> = {}) {
    this.options = crawlerOptionsSchema.parse(options);
    
    // Initialize enhanced extraction engine if API key is available
    if (process.env.FIRECRAWL_API_KEY) {
      this.enhancedExtractionEngine = new EnhancedExtractionEngine(process.env.FIRECRAWL_API_KEY);
    }
  }

  async crawl(url: string, userId?: string, userEmail?: string): Promise<CrawlResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🕷️ Starting crawl of: ${url}`);
      
      // Check robots.txt if enabled
      if (this.options.respectRobots) {
        const robotsAllowed = await this.checkRobotsTxt(url);
        if (!robotsAllowed) {
          throw new Error('Crawling not allowed by robots.txt');
        }
      }

      // Fetch the HTML content
      const response = await this.fetchContent(url);
      const html = response.html;
      const finalUrl = response.finalUrl;
      
      // Parse HTML with Cheerio for easy DOM manipulation
      const $ = cheerio.load(html);
      
      console.log(`📄 Successfully fetched ${html.length} bytes from ${finalUrl}`);
      
      // Extract all the data
      const result: CrawlResult = {
        url: finalUrl,
        timestamp: new Date().toISOString(),
        statusCode: response.statusCode,
        redirectUrl: finalUrl !== url ? finalUrl : undefined,
        contentType: response.contentType,
        
        htmlAnalysis: {
          meta: this.extractMetaTags($),
          headings: this.extractHeadings($),
          images: this.extractImages($, finalUrl),
          links: this.extractLinks($, finalUrl),
          forms: this.extractForms($),
          ctas: this.extractCTAs($),
          structure: this.analyzeStructure($, html),
        },
        
        cssAnalysis: this.analyzeCss($, html),
        
        performance: {
          loadTime: Date.now() - startTime,
          htmlSize: html.length,
          totalResourcesCount: $('link, script, img').length,
          imagesWithoutAlt: $('img:not([alt])').length,
          imagesWithoutSize: $('img:not([width]):not([height]):not([style*="width"]):not([style*="height"])').length,
          externalResourcesCount: $('link[href^="http"], script[src^="http"], img[src^="http"]').length,
        },
        
        errors: [],
        
        rawHtml: this.options.includeRawHtml ? html : undefined,
      };
      
      // Validate the result matches our schema
      const validatedResult = crawlResultSchema.parse(result);
      console.log(`✅ Crawl completed successfully for ${url}`);
      
      return validatedResult;
      
    } catch (error) {
      console.error(`❌ Crawl failed for ${url}:`, error);
      
      // Return a failed result with error information
      const errorResult: CrawlResult = {
        url,
        timestamp: new Date().toISOString(),
        statusCode: 0,
        htmlAnalysis: {
          meta: {},
          headings: [],
          images: [],
          links: [],
          forms: [],
          ctas: [],
          structure: {
            hasHeader: false,
            hasNavigation: false,
            hasFooter: false,
            hasSidebar: false,
            hasHeroSection: false,
            sectionsCount: 0,
            wordCount: 0,
          },
        },
        cssAnalysis: {
          externalStylesheets: [],
          hasInlineStyles: false,
          frameworks: [],
          responsive: {
            hasViewportMeta: false,
            hasMediaQueries: false,
          },
        },
        performance: {
          loadTime: Date.now() - startTime,
          htmlSize: 0,
          totalResourcesCount: 0,
          imagesWithoutAlt: 0,
          imagesWithoutSize: 0,
          externalResourcesCount: 0,
        },
        errors: [{
          type: 'network-error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error instanceof Error ? error.stack : undefined,
        }],
      };
      
      return errorResult;
    }
  }

  /**
   * Enhanced crawl method that integrates v1 (traditional) and v2 (enhanced) extraction
   */
  async crawlWithEnhancedExtraction(
    url: string, 
    userId?: string, 
    userEmail?: string
  ): Promise<{
    crawlResult: CrawlResult;
    extractedData?: ExtractedData;
    extractionMetadata: {
      useEnhancedExtraction: boolean;
      extractionVersion: 'v1' | 'v2';
      featureFlagsChecked: Record<string, boolean>;
    };
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Starting enhanced crawl of: ${url}`);
      
      // Check feature flags for enhanced extraction
      const featureFlags = {
        firecrawl_v2_enabled: await isFeatureEnabled('firecrawl_v2_enabled', userId, userEmail),
        firecrawl_extraction_enabled: await isFeatureEnabled('firecrawl_extraction_enabled', userId, userEmail),
        enhanced_analysis_enabled: await isFeatureEnabled('enhanced_analysis_enabled', userId, userEmail),
      };
      
      console.log(`🏁 Feature flags for user ${userId}:`, featureFlags);
      
      // Determine if we should use enhanced extraction
      const useEnhancedExtraction = 
        featureFlags.firecrawl_v2_enabled && 
        featureFlags.firecrawl_extraction_enabled && 
        this.enhancedExtractionEngine !== undefined;
      
      const extractionVersion: 'v1' | 'v2' = useEnhancedExtraction ? 'v2' : 'v1';
      
      console.log(`📊 Using extraction version: ${extractionVersion}`);
      
      // Always perform traditional crawl for baseline data
      const crawlResult = await this.crawl(url, userId, userEmail);
      
      let extractedData: ExtractedData | undefined;
      
      // Perform enhanced extraction if enabled
      if (useEnhancedExtraction && this.enhancedExtractionEngine) {
        try {
          console.log(`🧠 Starting enhanced extraction for: ${url}`);
          extractedData = await this.enhancedExtractionEngine.extractStructuredData(url);
          console.log(`✅ Enhanced extraction completed for: ${url}`);
          console.log(`📈 Page type: ${extractedData.structuredData.pageType} (confidence: ${extractedData.structuredData.confidence})`);
          console.log(`⭐ Data quality: ${extractedData.extractionMetrics.dataQualityScore}`);
        } catch (error) {
          console.warn(`⚠️ Enhanced extraction failed for ${url}, falling back to v1:`, error);
          // Continue with v1 data only
        }
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`🏁 Enhanced crawl completed in ${processingTime}ms`);
      
      return {
        crawlResult,
        extractedData,
        extractionMetadata: {
          useEnhancedExtraction,
          extractionVersion,
          featureFlagsChecked: featureFlags,
        },
      };
      
    } catch (error) {
      console.error(`❌ Enhanced crawl failed for ${url}:`, error);
      
      // Fallback to standard crawl
      const crawlResult = await this.crawl(url, userId, userEmail);
      
      return {
        crawlResult,
        extractedData: undefined,
        extractionMetadata: {
          useEnhancedExtraction: false,
          extractionVersion: 'v1',
          featureFlagsChecked: {
            firecrawl_v2_enabled: false,
            firecrawl_extraction_enabled: false,
            enhanced_analysis_enabled: false,
          },
        },
      };
    }
  }

  private async checkRobotsTxt(url: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', url).toString();
      const response = await fetch(robotsUrl, {
        timeout: 5000,
        headers: { 'User-Agent': this.options.userAgent },
      });
      
      if (!response.ok) {
        // If no robots.txt, assume crawling is allowed
        return true;
      }
      
      const robotsTxt = await response.text();
      const robots = robotsParser(robotsUrl, robotsTxt);
      
      return robots.isAllowed(url, this.options.userAgent) ?? true;
    } catch (error) {
      console.warn(`⚠️ Failed to check robots.txt for ${url}:`, error);
      // If we can't check robots.txt, assume crawling is allowed
      return true;
    }
  }

  private async fetchContent(url: string): Promise<{
    html: string;
    finalUrl: string;
    statusCode: number;
    contentType?: string;
  }> {
    const response = await fetch(url, {
      timeout: this.options.timeout,
      headers: {
        'User-Agent': this.options.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      redirect: this.options.followRedirects ? 'follow' : 'manual',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || undefined;
    
    // Check if it's actually HTML
    if (contentType && !contentType.includes('text/html')) {
      throw new Error(`Invalid content type: ${contentType}. Expected HTML.`);
    }

    const html = await response.text();
    
    // Check HTML size limit
    if (html.length > this.options.maxHtmlSize) {
      throw new Error(`HTML size (${html.length} bytes) exceeds limit (${this.options.maxHtmlSize} bytes)`);
    }

    return {
      html,
      finalUrl: response.url,
      statusCode: response.status,
      contentType,
    };
  }

  private extractMetaTags($: cheerio.CheerioAPI): CrawlResult['htmlAnalysis']['meta'] {
    return {
      title: $('title').first().text().trim() || undefined,
      description: $('meta[name="description"]').attr('content') || undefined,
      keywords: $('meta[name="keywords"]').attr('content') || undefined,
      viewport: $('meta[name="viewport"]').attr('content') || undefined,
      charset: $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content')?.match(/charset=([^;]+)/)?.[1] || undefined,
      robots: $('meta[name="robots"]').attr('content') || undefined,
      ogTitle: $('meta[property="og:title"]').attr('content') || undefined,
      ogDescription: $('meta[property="og:description"]').attr('content') || undefined,
      ogImage: $('meta[property="og:image"]').attr('content') || undefined,
      twitterCard: $('meta[name="twitter:card"]').attr('content') || undefined,
    };
  }

  private extractHeadings($: cheerio.CheerioAPI): CrawlResult['htmlAnalysis']['headings'] {
    const headings: CrawlResult['htmlAnalysis']['headings'] = [];
    
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $el = $(element);
      const tagName = element.tagName.toLowerCase();
      const level = parseInt(tagName.charAt(1), 10);
      
      headings.push({
        level,
        text: $el.text().trim(),
        id: $el.attr('id') || undefined,
        class: $el.attr('class') || undefined,
      });
    });
    
    return headings;
  }

  private extractImages($: cheerio.CheerioAPI, baseUrl: string): CrawlResult['htmlAnalysis']['images'] {
    const images: CrawlResult['htmlAnalysis']['images'] = [];
    
    $('img').each((_, element) => {
      const $el = $(element);
      let src = $el.attr('src');
      
      if (!src) return;
      
      // Handle relative URLs
      if (src.startsWith('/') || !src.startsWith('http')) {
        src = new URL(src, baseUrl).toString();
      }
      
      const alt = $el.attr('alt');
      const width = $el.attr('width') ? parseInt($el.attr('width')!, 10) : undefined;
      const height = $el.attr('height') ? parseInt($el.attr('height')!, 10) : undefined;
      
      // Heuristics for image classification
      const isLogo = Boolean(
        alt?.toLowerCase().includes('logo') ||
        src.toLowerCase().includes('logo') ||
        $el.closest('header, .header, nav, .nav').length > 0
      );
      
      const isHero = Boolean(
        $el.closest('hero, .hero, .banner, .jumbotron').length > 0 ||
        (width && height && width > 500 && height > 200)
      );
      
      images.push({
        src,
        alt: alt || undefined,
        title: $el.attr('title') || undefined,
        width,
        height,
        loading: $el.attr('loading') || undefined,
        isLogo,
        isHero,
      });
    });
    
    return images;
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): CrawlResult['htmlAnalysis']['links'] {
    const links: CrawlResult['htmlAnalysis']['links'] = [];
    const baseHostname = new URL(baseUrl).hostname;
    
    $('a[href]').each((_, element) => {
      const $el = $(element);
      let href = $el.attr('href')!;
      
      // Skip email, phone, and anchor links
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
        return;
      }
      
      // Handle relative URLs
      if (href.startsWith('/') || !href.startsWith('http')) {
        href = new URL(href, baseUrl).toString();
      }
      
      const isInternal = new URL(href).hostname === baseHostname;
      const text = $el.text().trim();
      
      // Heuristics for navigation and CTA classification
      const isNavigation = Boolean(
        $el.closest('nav, .nav, .navigation, .menu, header, .header').length > 0
      );
      
      const isCTA = Boolean(
        $el.hasClass('btn') ||
        $el.hasClass('button') ||
        $el.hasClass('cta') ||
        text.toLowerCase().match(/^(buy|shop|order|get|start|try|sign up|contact|call|email|download)/)
      );
      
      links.push({
        href,
        text,
        title: $el.attr('title') || undefined,
        target: $el.attr('target') || undefined,
        rel: $el.attr('rel') || undefined,
        isInternal,
        isNavigation,
        isCTA,
      });
    });
    
    return links;
  }

  private extractForms($: cheerio.CheerioAPI): CrawlResult['htmlAnalysis']['forms'] {
    const forms: CrawlResult['htmlAnalysis']['forms'] = [];
    
    $('form').each((_, element) => {
      const $form = $(element);
      const fields: CrawlResult['htmlAnalysis']['forms'][0]['fields'] = [];
      
      // Extract form fields
      $form.find('input, textarea, select').each((_, fieldElement) => {
        const $field = $(fieldElement);
        const type = $field.attr('type') || fieldElement.tagName.toLowerCase();
        
        // Skip hidden and submit fields
        if (type === 'hidden' || type === 'submit') return;
        
        fields.push({
          type,
          name: $field.attr('name') || undefined,
          placeholder: $field.attr('placeholder') || undefined,
          required: $field.attr('required') !== undefined,
          label: $field.closest('label').text().trim() || 
                 $form.find(`label[for="${$field.attr('id')}"]`).text().trim() || 
                 undefined,
        });
      });
      
      // Find submit button
      const $submitButton = $form.find('input[type="submit"], button[type="submit"], button:not([type])').first();
      
      forms.push({
        action: $form.attr('action') || undefined,
        method: $form.attr('method') || undefined,
        id: $form.attr('id') || undefined,
        class: $form.attr('class') || undefined,
        fields,
        submitButton: $submitButton.length > 0 ? {
          text: $submitButton.val()?.toString() || $submitButton.text().trim() || undefined,
          type: $submitButton.attr('type') || undefined,
        } : undefined,
      });
    });
    
    return forms;
  }

  private extractCTAs($: cheerio.CheerioAPI): CrawlResult['htmlAnalysis']['ctas'] {
    const ctas: CrawlResult['htmlAnalysis']['ctas'] = [];
    
    // Find button elements and button-like links
    $('button, .btn, .button, a[class*="btn"], a[class*="button"], input[type="submit"]').each((_, element) => {
      const $el = $(element);
      const tagName = element.tagName.toLowerCase();
      
      let text = '';
      let href: string | undefined;
      let type: CrawlResult['htmlAnalysis']['ctas'][0]['type'];
      
      if (tagName === 'a') {
        text = $el.text().trim();
        href = $el.attr('href') || undefined;
        type = 'link';
      } else if (tagName === 'input') {
        text = $el.val()?.toString() || '';
        type = 'form-submit';
      } else {
        text = $el.text().trim();
        type = 'button';
        href = $el.attr('onclick')?.includes('location') ? 'javascript' : undefined;
      }
      
      if (!text) return;
      
      // Determine prominence based on classes and position
      let prominence: CrawlResult['htmlAnalysis']['ctas'][0]['prominence'];
      const classes = $el.attr('class') || '';
      
      if (classes.includes('primary') || classes.includes('main') || $el.closest('hero, .hero').length > 0) {
        prominence = 'primary';
      } else if (classes.includes('secondary')) {
        prominence = 'secondary';
      } else {
        prominence = 'tertiary';
      }
      
      // Determine position (above/below fold - rough heuristic)
      const position = $el.index() < 10 ? 'above-fold' : 'below-fold';
      
      ctas.push({
        text,
        href,
        type,
        class: classes || undefined,
        position,
        prominence,
      });
    });
    
    return ctas;
  }

  private analyzeStructure($: cheerio.CheerioAPI, html: string): CrawlResult['htmlAnalysis']['structure'] {
    // Count words in text content
    const textContent = $.root().text();
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
    
    return {
      hasHeader: $('header, .header').length > 0,
      hasNavigation: $('nav, .nav, .navigation').length > 0,
      hasFooter: $('footer, .footer').length > 0,
      hasSidebar: $('aside, .sidebar, .side-nav').length > 0,
      hasHeroSection: $('.hero, .jumbotron, .banner, .hero-section').length > 0,
      sectionsCount: $('section').length,
      wordCount,
    };
  }

  private analyzeCss($: cheerio.CheerioAPI, htmlContent: string): CrawlResult['cssAnalysis'] {
    const externalStylesheets: string[] = [];
    
    $('link[rel="stylesheet"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        externalStylesheets.push(href);
      }
    });
    
    // Detect frameworks by looking at class names and stylesheets
    const frameworks: string[] = [];
    const htmlLower = htmlContent.toLowerCase();
    
    if (htmlLower.includes('bootstrap') || $('[class*="bs-"]').length > 0) {
      frameworks.push('bootstrap');
    }
    if (htmlLower.includes('tailwind') || $('[class*="tw-"]').length > 0) {
      frameworks.push('tailwind');
    }
    if (htmlLower.includes('foundation')) {
      frameworks.push('foundation');
    }
    if (htmlLower.includes('bulma')) {
      frameworks.push('bulma');
    }
    
    return {
      externalStylesheets,
      hasInlineStyles: $('[style]').length > 0,
      frameworks,
      responsive: {
        hasViewportMeta: $('meta[name="viewport"]').length > 0,
        hasMediaQueries: htmlContent.includes('@media'),
        hasMobileFirst: htmlContent.includes('min-width') && !htmlContent.includes('max-width'),
      },
    };
  }
}