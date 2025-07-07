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
exports.businessApiService = exports.BusinessApiService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const firecrawlService_1 = require("./firecrawlService");
dotenv.config();
class BusinessApiService {
    constructor() {
        this.googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY || '';
        this.openCorporatesApiKey = process.env.OPENCORPORATES_API_KEY || '';
        this.clearbitApiKey = process.env.CLEARBIT_API_KEY || '';
    }
    /**
     * Search businesses using multiple APIs
     */
    searchBusinesses(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            try {
                // Try Google Places API first (free tier available)
                if (this.googlePlacesApiKey) {
                    const googleResults = yield this.searchGooglePlaces(params);
                    results.push(...googleResults);
                }
                // Try OpenCorporates API (free tier available)
                if (this.openCorporatesApiKey) {
                    const openCorpResults = yield this.searchOpenCorporates(params);
                    results.push(...openCorpResults);
                }
                // Try Clearbit API (paid, but comprehensive)
                if (this.clearbitApiKey) {
                    const clearbitResults = yield this.searchClearbit(params);
                    results.push(...clearbitResults);
                }
                // Remove duplicates based on name and website
                const uniqueResults = this.removeDuplicates(results);
                return uniqueResults.slice(0, params.limit || 50);
            }
            catch (error) {
                console.error('Error searching businesses:', error);
                return [];
            }
        });
    }
    /**
     * Search using Google Places API
     */
    searchGooglePlaces(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const searchQuery = params.query || 'business';
                const location = params.location || 'Nigeria';
                const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
                const response = yield axios_1.default.get(url, {
                    params: {
                        query: `${searchQuery} in ${location}`,
                        key: this.googlePlacesApiKey,
                        type: 'establishment'
                    }
                });
                if (response.data.status === 'OK') {
                    return response.data.results.map((place) => ({
                        name: place.name,
                        address: place.formatted_address,
                        phone: place.formatted_phone_number,
                        website: place.website,
                        rating: place.rating,
                        industry: this.categorizeBusiness(place.types),
                        source: 'Google Places'
                    }));
                }
            }
            catch (error) {
                console.error('Google Places API error:', error);
            }
            return [];
        });
    }
    /**
     * Search using OpenCorporates API
     */
    searchOpenCorporates(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const searchQuery = params.query || 'business';
                const jurisdiction = this.getJurisdiction(params.location);
                const url = `https://api.opencorporates.com/companies/search`;
                const response = yield axios_1.default.get(url, {
                    params: {
                        q: searchQuery,
                        jurisdiction_code: jurisdiction,
                        api_token: this.openCorporatesApiKey
                    }
                });
                if (response.data.results && response.data.results.companies) {
                    return response.data.results.companies.map((company) => ({
                        name: company.company.name,
                        website: company.company.homepage_url,
                        address: company.company.registered_address_in_full,
                        founded: company.company.incorporation_date,
                        source: 'OpenCorporates'
                    }));
                }
            }
            catch (error) {
                console.error('OpenCorporates API error:', error);
            }
            return [];
        });
    }
    /**
     * Search using Clearbit API
     */
    searchClearbit(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const searchQuery = params.query || 'business';
                const url = `https://autocomplete.clearbit.com/v1/companies/suggest`;
                const response = yield axios_1.default.get(url, {
                    params: {
                        query: searchQuery
                    },
                    headers: {
                        'Authorization': `Bearer ${this.clearbitApiKey}`
                    }
                });
                if (Array.isArray(response.data)) {
                    return response.data.map((company) => {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                        return ({
                            name: company.name,
                            website: company.domain,
                            description: company.description,
                            industry: (_a = company.category) === null || _a === void 0 ? void 0 : _a.industry,
                            companySize: this.mapCompanySize((_b = company.metrics) === null || _b === void 0 ? void 0 : _b.employees),
                            linkedin: (_c = company.linkedin) === null || _c === void 0 ? void 0 : _c.handle,
                            facebook: (_d = company.facebook) === null || _d === void 0 ? void 0 : _d.handle,
                            twitter: (_e = company.twitter) === null || _e === void 0 ? void 0 : _e.handle,
                            founded: (_f = company.foundedYear) === null || _f === void 0 ? void 0 : _f.toString(),
                            revenue: (_g = company.metrics) === null || _g === void 0 ? void 0 : _g.annualRevenue,
                            employees: (_j = (_h = company.metrics) === null || _h === void 0 ? void 0 : _h.employees) === null || _j === void 0 ? void 0 : _j.toString(),
                            source: 'Clearbit'
                        });
                    });
                }
            }
            catch (error) {
                console.error('Clearbit API error:', error);
            }
            return [];
        });
    }
    /**
     * Enrich business data with additional information
     */
    enrichBusinessData(business) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Try to get more details from website using Firecrawl
                if (business.website) {
                    if (firecrawlService_1.firecrawlService.isConfigured()) {
                        const firecrawlData = yield firecrawlService_1.firecrawlService.extractBusinessContacts(business.website);
                        return Object.assign(Object.assign({}, business), { email: business.email || firecrawlData.emails[0], phone: business.phone || firecrawlData.phones[0], social: business.social || firecrawlData.social.join(', '), description: business.description || firecrawlData.description, title: business.title || firecrawlData.title });
                    }
                    else {
                        // Fallback to basic scraping
                        const websiteData = yield this.scrapeWebsite(business.website);
                        return Object.assign(Object.assign({}, business), websiteData);
                    }
                }
            }
            catch (error) {
                console.error('Error enriching business data:', error);
            }
            return business;
        });
    }
    /**
     * Scrape website for additional business information
     */
    scrapeWebsite(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(url, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                const html = response.data;
                // Extract email addresses
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const emails = html.match(emailRegex) || [];
                // Extract phone numbers
                const phoneRegex = /[\+]?[1-9][\d]{0,15}/g;
                const phones = html.match(phoneRegex) || [];
                // Extract social media links
                const linkedinMatch = html.match(/linkedin\.com\/company\/[a-zA-Z0-9-]+/);
                const facebookMatch = html.match(/facebook\.com\/[a-zA-Z0-9.-]+/);
                const twitterMatch = html.match(/twitter\.com\/[a-zA-Z0-9_]+/);
                return {
                    email: emails[0] || undefined,
                    phone: phones[0] || undefined,
                    linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : undefined,
                    facebook: facebookMatch ? `https://${facebookMatch[0]}` : undefined,
                    twitter: twitterMatch ? `https://${twitterMatch[0]}` : undefined
                };
            }
            catch (error) {
                console.error('Error scraping website:', error);
                return {};
            }
        });
    }
    /**
     * Remove duplicate businesses
     */
    removeDuplicates(businesses) {
        const seen = new Set();
        return businesses.filter(business => {
            const key = `${business.name}-${business.website}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    /**
     * Categorize business based on Google Places types
     */
    categorizeBusiness(types) {
        if (!types || types.length === 0)
            return 'General';
        const typeMap = {
            'restaurant': 'Food & Beverage',
            'store': 'Retail',
            'health': 'Healthcare',
            'finance': 'Financial Services',
            'education': 'Education',
            'technology': 'Technology',
            'manufacturing': 'Manufacturing',
            'transportation': 'Transportation',
            'real_estate': 'Real Estate',
            'entertainment': 'Entertainment'
        };
        for (const type of types) {
            for (const [key, category] of Object.entries(typeMap)) {
                if (type.includes(key)) {
                    return category;
                }
            }
        }
        return 'General';
    }
    /**
     * Get jurisdiction code for OpenCorporates
     */
    getJurisdiction(location) {
        if (!location)
            return 'ng';
        const jurisdictionMap = {
            'nigeria': 'ng',
            'ghana': 'gh',
            'kenya': 'ke',
            'south africa': 'za',
            'uk': 'gb',
            'united kingdom': 'gb',
            'usa': 'us',
            'united states': 'us'
        };
        const lowerLocation = location.toLowerCase();
        return jurisdictionMap[lowerLocation] || 'ng';
    }
    /**
     * Map company size from Clearbit to our format
     */
    mapCompanySize(employees) {
        if (!employees)
            return 'Unknown';
        if (employees <= 10)
            return '1-10';
        if (employees <= 49)
            return '10-49';
        if (employees <= 249)
            return '50-249';
        return '250+';
    }
    /**
     * Get business by domain (for Clearbit)
     */
    getBusinessByDomain(domain) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            try {
                const url = `https://company.clearbit.com/v2/companies/find`;
                const response = yield axios_1.default.get(url, {
                    params: { domain },
                    headers: {
                        'Authorization': `Bearer ${this.clearbitApiKey}`
                    }
                });
                const company = response.data;
                return {
                    name: company.name,
                    website: company.domain,
                    description: company.description,
                    industry: (_a = company.category) === null || _a === void 0 ? void 0 : _a.industry,
                    companySize: this.mapCompanySize((_b = company.metrics) === null || _b === void 0 ? void 0 : _b.employees),
                    linkedin: (_c = company.linkedin) === null || _c === void 0 ? void 0 : _c.handle,
                    facebook: (_d = company.facebook) === null || _d === void 0 ? void 0 : _d.handle,
                    twitter: (_e = company.twitter) === null || _e === void 0 ? void 0 : _e.handle,
                    founded: (_f = company.foundedYear) === null || _f === void 0 ? void 0 : _f.toString(),
                    revenue: (_g = company.metrics) === null || _g === void 0 ? void 0 : _g.annualRevenue,
                    employees: (_j = (_h = company.metrics) === null || _h === void 0 ? void 0 : _h.employees) === null || _j === void 0 ? void 0 : _j.toString(),
                    source: 'Clearbit'
                };
            }
            catch (error) {
                console.error('Error getting business by domain:', error);
                return null;
            }
        });
    }
}
exports.BusinessApiService = BusinessApiService;
// Export singleton instance
exports.businessApiService = new BusinessApiService();
