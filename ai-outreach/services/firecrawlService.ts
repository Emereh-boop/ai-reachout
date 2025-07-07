import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

export interface FirecrawlExtractor {
  selector: string;
  type?: 'text' | 'attribute' | 'html';
  attribute?: string;
}

export interface FirecrawlConfig {
  url: string;
  extractors?: {
    [key: string]: FirecrawlExtractor;
  };
  waitFor?: string;
  timeout?: number;
  screenshot?: boolean;
  pdf?: boolean;
}

export interface FirecrawlResult {
  url: string;
  title?: string;
  description?: string;
  emails?: string[];
  phones?: string[];
  social?: string[];
  content?: string;
  screenshot?: string;
  pdf?: string;
  [key: string]: any;
}

export class FirecrawlService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.FIRECRAWL_API_KEY || '';
    this.baseUrl = 'https://api.firecrawl.dev';
  }

  /**
   * Extract data from a website using Firecrawl
   */
  async extract(config: FirecrawlConfig): Promise<FirecrawlResult> {
    try {
      if (!this.apiKey) {
        throw new Error('Firecrawl API key not configured');
      }

      const response = await axios.post(
        `${this.baseUrl}/scrape`,
        {
          url: config.url,
          extractors: config.extractors || this.getDefaultExtractors(),
          waitFor: config.waitFor,
          timeout: config.timeout || 30000,
          screenshot: config.screenshot || false,
          pdf: config.pdf || false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return this.processResult(response.data, config.url);
    } catch (error: any) {
      console.error('Firecrawl extraction error:', error.response?.data || error.message);
      throw new Error(`Firecrawl extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract business contact information from a website
   */
  async extractBusinessContacts(url: string): Promise<{
    emails: string[];
    phones: string[];
    social: string[];
    title: string;
    description: string;
  }> {
    const extractors: { [key: string]: FirecrawlExtractor } = {
      title: { selector: 'title', type: 'text' },
      description: { selector: 'meta[name="description"]', type: 'attribute', attribute: 'content' },
      emails: { selector: 'a[href^="mailto:"]', type: 'attribute', attribute: 'href' },
      phones: { selector: 'a[href^="tel:"]', type: 'attribute', attribute: 'href' },
      linkedin: { selector: 'a[href*="linkedin.com"]', type: 'attribute', attribute: 'href' },
      facebook: { selector: 'a[href*="facebook.com"]', type: 'attribute', attribute: 'href' },
      twitter: { selector: 'a[href*="twitter.com"]', type: 'attribute', attribute: 'href' },
      instagram: { selector: 'a[href*="instagram.com"]', type: 'attribute', attribute: 'href' },
      content: { selector: 'body', type: 'text' }
    };

    const result = await this.extract({ url, extractors });
    
    // Process emails
    const emails = this.extractEmails(result);
    
    // Process phones
    const phones = this.extractPhones(result);
    
    // Process social media
    const social = this.extractSocialMedia(result);

    return {
      emails,
      phones,
      social,
      title: result.title || '',
      description: result.description || ''
    };
  }

  /**
   * Extract business information from multiple websites
   */
  async extractMultipleBusinesses(urls: string[]): Promise<Array<{
    url: string;
    contacts: {
      emails: string[];
      phones: string[];
      social: string[];
      title: string;
      description: string;
    };
  }>> {
    const results = [];
    
    for (const url of urls) {
      try {
        const contacts = await this.extractBusinessContacts(url);
        results.push({ url, contacts });
        
        // Add delay to avoid rate limiting
        await this.delay(1000);
      } catch (error) {
        console.error(`Failed to extract from ${url}:`, error);
        results.push({ 
          url, 
          contacts: { emails: [], phones: [], social: [], title: '', description: '' }
        });
      }
    }
    
    return results;
  }

  /**
   * Get default extractors for business websites
   */
  private getDefaultExtractors() {
    return {
      title: { selector: 'title', type: 'text' },
      description: { selector: 'meta[name="description"]', type: 'attribute', attribute: 'content' },
      ogTitle: { selector: 'meta[property="og:title"]', type: 'attribute', attribute: 'content' },
      ogDescription: { selector: 'meta[property="og:description"]', type: 'attribute', attribute: 'content' },
      emails: { selector: 'a[href^="mailto:"]', type: 'attribute', attribute: 'href' },
      phones: { selector: 'a[href^="tel:"]', type: 'attribute', attribute: 'href' },
      social: { selector: 'a[href*="linkedin.com"], a[href*="facebook.com"], a[href*="twitter.com"]', type: 'attribute', attribute: 'href' }
    };
  }

  /**
   * Process Firecrawl result and extract structured data
   */
  private processResult(data: any, url: string): FirecrawlResult {
    const result: FirecrawlResult = { url };

    // Extract basic metadata
    if (data.title) result.title = data.title;
    if (data.description) result.description = data.description;
    if (data.content) result.content = data.content;
    if (data.screenshot) result.screenshot = data.screenshot;
    if (data.pdf) result.pdf = data.pdf;

    // Process extractors
    if (data.extractors) {
      Object.entries(data.extractors).forEach(([key, value]: [string, any]) => {
        if (Array.isArray(value)) {
          result[key] = value;
        } else if (typeof value === 'string') {
          result[key] = [value];
        } else {
          result[key] = value;
        }
      });
    }

    return result;
  }

  /**
   * Extract email addresses from various sources
   */
  private extractEmails(result: FirecrawlResult): string[] {
    const emails = new Set<string>();

    // From mailto links
    if (result.emails) {
      result.emails.forEach((email: string) => {
        const match = email.match(/mailto:(.+)/);
        if (match) emails.add(match[1]);
      });
    }

    // From content using regex
    if (result.content) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const foundEmails = result.content.match(emailRegex) || [];
      foundEmails.forEach(email => emails.add(email));
    }

    return Array.from(emails).filter(email => 
      !email.includes('example.com') && 
      !email.includes('test.com') &&
      email.length > 5
    );
  }

  /**
   * Extract phone numbers from various sources
   */
  private extractPhones(result: FirecrawlResult): string[] {
    const phones = new Set<string>();

    // From tel links
    if (result.phones) {
      result.phones.forEach((phone: string) => {
        const match = phone.match(/tel:(.+)/);
        if (match) phones.add(match[1]);
      });
    }

    // From content using regex
    if (result.content) {
      const phoneRegex = /[\+]?[1-9][\d]{0,15}/g;
      const foundPhones = result.content.match(phoneRegex) || [];
      foundPhones.forEach(phone => {
        if (phone.length >= 10) phones.add(phone);
      });
    }

    return Array.from(phones);
  }

  /**
   * Extract social media links
   */
  private extractSocialMedia(result: FirecrawlResult): string[] {
    const social = new Set<string>();

    if (result.social) {
      result.social.forEach((link: string) => {
        if (link.includes('linkedin.com') || 
            link.includes('facebook.com') || 
            link.includes('twitter.com') ||
            link.includes('instagram.com')) {
          social.add(link);
        }
      });
    }

    return Array.from(social);
  }

  /**
   * Check if Firecrawl service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get account usage information
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/account`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  /**
   * Delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const firecrawlService = new FirecrawlService(); 