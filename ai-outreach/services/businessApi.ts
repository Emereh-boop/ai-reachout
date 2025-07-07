import axios from 'axios';
import * as dotenv from 'dotenv';
import { firecrawlService } from './firecrawlService';
dotenv.config();

export interface BusinessData {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
  companySize?: string;
  description?: string;
  title?: string;
  social?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  founded?: string;
  revenue?: string;
  employees?: string;
  source: string;
}

export interface SearchParams {
  query?: string;
  location?: string;
  industry?: string;
  companySize?: string;
  limit?: number;
}

export class BusinessApiService {
  private googlePlacesApiKey: string;
  private openCorporatesApiKey: string;
  private clearbitApiKey: string;

  constructor() {
    this.googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    this.openCorporatesApiKey = process.env.OPENCORPORATES_API_KEY || '';
    this.clearbitApiKey = process.env.CLEARBIT_API_KEY || '';
  }

  /**
   * Search businesses using multiple APIs
   */
  async searchBusinesses(params: SearchParams): Promise<BusinessData[]> {
    const results: BusinessData[] = [];
    
    try {
      // Try Google Places API first (free tier available)
      if (this.googlePlacesApiKey) {
        const googleResults = await this.searchGooglePlaces(params);
        results.push(...googleResults);
      }

      // Try OpenCorporates API (free tier available)
      if (this.openCorporatesApiKey) {
        const openCorpResults = await this.searchOpenCorporates(params);
        results.push(...openCorpResults);
      }

      // Try Clearbit API (paid, but comprehensive)
      if (this.clearbitApiKey) {
        const clearbitResults = await this.searchClearbit(params);
        results.push(...clearbitResults);
      }

      // Remove duplicates based on name and website
      const uniqueResults = this.removeDuplicates(results);
      
      return uniqueResults.slice(0, params.limit || 50);
    } catch (error) {
      console.error('Error searching businesses:', error);
      return [];
    }
  }

  /**
   * Search using Google Places API
   */
  private async searchGooglePlaces(params: SearchParams): Promise<BusinessData[]> {
    try {
      const searchQuery = params.query || 'business';
      const location = params.location || 'Nigeria';
      
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
      const response = await axios.get(url, {
        params: {
          query: `${searchQuery} in ${location}`,
          key: this.googlePlacesApiKey,
          type: 'establishment'
        }
      });

      if (response.data.status === 'OK') {
        return response.data.results.map((place: any) => ({
          name: place.name,
          address: place.formatted_address,
          phone: place.formatted_phone_number,
          website: place.website,
          rating: place.rating,
          industry: this.categorizeBusiness(place.types),
          source: 'Google Places'
        }));
      }
    } catch (error) {
      console.error('Google Places API error:', error);
    }
    
    return [];
  }

  /**
   * Search using OpenCorporates API
   */
  private async searchOpenCorporates(params: SearchParams): Promise<BusinessData[]> {
    try {
      const searchQuery = params.query || 'business';
      const jurisdiction = this.getJurisdiction(params.location);
      
      const url = `https://api.opencorporates.com/companies/search`;
      const response = await axios.get(url, {
        params: {
          q: searchQuery,
          jurisdiction_code: jurisdiction,
          api_token: this.openCorporatesApiKey
        }
      });

      if (response.data.results && response.data.results.companies) {
        return response.data.results.companies.map((company: any) => ({
          name: company.company.name,
          website: company.company.homepage_url,
          address: company.company.registered_address_in_full,
          founded: company.company.incorporation_date,
          source: 'OpenCorporates'
        }));
      }
    } catch (error) {
      console.error('OpenCorporates API error:', error);
    }
    
    return [];
  }

  /**
   * Search using Clearbit API
   */
  private async searchClearbit(params: SearchParams): Promise<BusinessData[]> {
    try {
      const searchQuery = params.query || 'business';
      
      const url = `https://autocomplete.clearbit.com/v1/companies/suggest`;
      const response = await axios.get(url, {
        params: {
          query: searchQuery
        },
        headers: {
          'Authorization': `Bearer ${this.clearbitApiKey}`
        }
      });

      if (Array.isArray(response.data)) {
        return response.data.map((company: any) => ({
          name: company.name,
          website: company.domain,
          description: company.description,
          industry: company.category?.industry,
          companySize: this.mapCompanySize(company.metrics?.employees),
          linkedin: company.linkedin?.handle,
          facebook: company.facebook?.handle,
          twitter: company.twitter?.handle,
          founded: company.foundedYear?.toString(),
          revenue: company.metrics?.annualRevenue,
          employees: company.metrics?.employees?.toString(),
          source: 'Clearbit'
        }));
      }
    } catch (error) {
      console.error('Clearbit API error:', error);
    }
    
    return [];
  }

  /**
   * Enrich business data with additional information
   */
  async enrichBusinessData(business: BusinessData): Promise<BusinessData> {
    try {
      // Try to get more details from website using Firecrawl
      if (business.website) {
        if (firecrawlService.isConfigured()) {
          const firecrawlData = await firecrawlService.extractBusinessContacts(business.website);
          return {
            ...business,
            email: business.email || firecrawlData.emails[0],
            phone: business.phone || firecrawlData.phones[0],
            social: business.social || firecrawlData.social.join(', '),
            description: business.description || firecrawlData.description,
            title: business.title || firecrawlData.title
          };
        } else {
          // Fallback to basic scraping
          const websiteData = await this.scrapeWebsite(business.website);
          return { ...business, ...websiteData };
        }
      }
    } catch (error) {
      console.error('Error enriching business data:', error);
    }
    
    return business;
  }

  /**
   * Scrape website for additional business information
   */
  private async scrapeWebsite(url: string): Promise<Partial<BusinessData>> {
    try {
      const response = await axios.get(url, {
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
    } catch (error) {
      console.error('Error scraping website:', error);
      return {};
    }
  }

  /**
   * Remove duplicate businesses
   */
  private removeDuplicates(businesses: BusinessData[]): BusinessData[] {
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
  private categorizeBusiness(types: string[]): string {
    if (!types || types.length === 0) return 'General';
    
    const typeMap: { [key: string]: string } = {
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
  private getJurisdiction(location?: string): string {
    if (!location) return 'ng';
    
    const jurisdictionMap: { [key: string]: string } = {
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
  private mapCompanySize(employees?: number): string {
    if (!employees) return 'Unknown';
    
    if (employees <= 10) return '1-10';
    if (employees <= 49) return '10-49';
    if (employees <= 249) return '50-249';
    return '250+';
  }

  /**
   * Get business by domain (for Clearbit)
   */
  async getBusinessByDomain(domain: string): Promise<BusinessData | null> {
    try {
      const url = `https://company.clearbit.com/v2/companies/find`;
      const response = await axios.get(url, {
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
        industry: company.category?.industry,
        companySize: this.mapCompanySize(company.metrics?.employees),
        linkedin: company.linkedin?.handle,
        facebook: company.facebook?.handle,
        twitter: company.twitter?.handle,
        founded: company.foundedYear?.toString(),
        revenue: company.metrics?.annualRevenue,
        employees: company.metrics?.employees?.toString(),
        source: 'Clearbit'
      };
    } catch (error) {
      console.error('Error getting business by domain:', error);
      return null;
    }
  }
}

// Export singleton instance
export const businessApiService = new BusinessApiService(); 