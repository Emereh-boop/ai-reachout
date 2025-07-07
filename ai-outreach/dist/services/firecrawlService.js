"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firecrawlService = exports.FirecrawlService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class FirecrawlService {
    constructor() {
        this.apiKey = process.env.FIRECRAWL_API_KEY || '';
        this.baseUrl = 'https://api.firecrawl.dev';
    }
    /**
     * Extract data from a website using Firecrawl
     */
    extract(config) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!this.apiKey) {
                    throw new Error('Firecrawl API key not configured');
                }
                const response = yield axios_1.default.post(`${this.baseUrl}/scrape`, {
                    url: config.url,
                    extractors: config.extractors || this.getDefaultExtractors(),
                    waitFor: config.waitFor,
                    timeout: config.timeout || 30000,
                    screenshot: config.screenshot || false,
                    pdf: config.pdf || false
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                return this.processResult(response.data, config.url);
            }
            catch (error) {
                console.error('Firecrawl extraction error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Firecrawl extraction failed: ${error.message}`);
            }
        });
    }
    /**
     * Extract business contact information from a website
     */
    extractBusinessContacts(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const extractors = {
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
            const result = yield this.extract({ url, extractors });
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
        });
    }
    /**
     * Extract business information from multiple websites
     */
    extractMultipleBusinesses(urls) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (const url of urls) {
                try {
                    const contacts = yield this.extractBusinessContacts(url);
                    results.push({ url, contacts });
                    // Add delay to avoid rate limiting
                    yield this.delay(1000);
                }
                catch (error) {
                    console.error(`Failed to extract from ${url}:`, error);
                    results.push({
                        url,
                        contacts: { emails: [], phones: [], social: [], title: '', description: '' }
                    });
                }
            }
            return results;
        });
    }
    /**
     * Get default extractors for business websites
     */
    getDefaultExtractors() {
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
    processResult(data, url) {
        const result = { url };
        // Extract basic metadata
        if (data.title)
            result.title = data.title;
        if (data.description)
            result.description = data.description;
        if (data.content)
            result.content = data.content;
        if (data.screenshot)
            result.screenshot = data.screenshot;
        if (data.pdf)
            result.pdf = data.pdf;
        // Process extractors
        if (data.extractors) {
            Object.entries(data.extractors).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    result[key] = value;
                }
                else if (typeof value === 'string') {
                    result[key] = [value];
                }
                else {
                    result[key] = value;
                }
            });
        }
        return result;
    }
    /**
     * Extract email addresses from various sources
     */
    extractEmails(result) {
        const emails = new Set();
        // From mailto links
        if (result.emails) {
            result.emails.forEach((email) => {
                const match = email.match(/mailto:(.+)/);
                if (match)
                    emails.add(match[1]);
            });
        }
        // From content using regex
        if (result.content) {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const foundEmails = result.content.match(emailRegex) || [];
            foundEmails.forEach(email => emails.add(email));
        }
        return Array.from(emails).filter(email => !email.includes('example.com') &&
            !email.includes('test.com') &&
            email.length > 5);
    }
    /**
     * Extract phone numbers from various sources
     */
    extractPhones(result) {
        const phones = new Set();
        // From tel links
        if (result.phones) {
            result.phones.forEach((phone) => {
                const match = phone.match(/tel:(.+)/);
                if (match)
                    phones.add(match[1]);
            });
        }
        // From content using regex
        if (result.content) {
            const phoneRegex = /[\+]?[1-9][\d]{0,15}/g;
            const foundPhones = result.content.match(phoneRegex) || [];
            foundPhones.forEach(phone => {
                if (phone.length >= 10)
                    phones.add(phone);
            });
        }
        return Array.from(phones);
    }
    /**
     * Extract social media links
     */
    extractSocialMedia(result) {
        const social = new Set();
        if (result.social) {
            result.social.forEach((link) => {
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
    isConfigured() {
        return !!this.apiKey;
    }
    /**
     * Get account usage information
     */
    getAccountInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/account`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });
                return response.data;
            }
            catch (error) {
                console.error('Error getting account info:', error);
                return null;
            }
        });
    }
    /**
     * Delay function for rate limiting
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.FirecrawlService = FirecrawlService;
// Export singleton instance
exports.firecrawlService = new FirecrawlService();
