import { GoogleGenerativeAI } from "@google/generative-ai";
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { stringify } from 'csv-stringify';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

interface Prospect {
  name: string;
  email: string;
  phone?: string;
  socialMedia?: string;
  website: string;
  title: string;
  description: string;
  category: string;
  tags: string;
  companySize: string;
  inferredIntent: string;
  emailPrompt: string;
  ogSiteName?: string;
}

// Create readline interface for chat
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper to extract metadata from HTML
function extractAllMetadata(html: string): any {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogTypeMatch = html.match(/<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogSiteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const twitterTitleMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const twitterDescMatch = html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  return {
    title: titleMatch ? titleMatch[1] : '',
    description: descMatch ? descMatch[1] : '',
    ogTitle: ogTitleMatch ? ogTitleMatch[1] : '',
    ogDescription: ogDescMatch ? ogDescMatch[1] : '',
    ogType: ogTypeMatch ? ogTypeMatch[1] : '',
    ogSiteName: ogSiteNameMatch ? ogSiteNameMatch[1] : '',
    twitterTitle: twitterTitleMatch ? twitterTitleMatch[1] : '',
    twitterDescription: twitterDescMatch ? twitterDescMatch[1] : ''
  };
}

// Enrich prospects with website metadata
export async function enrichProspects(prospects: Prospect[]): Promise<Prospect[]> {
  console.log('🔍 Enriching prospects with website data...');
  
  const enriched = [];
  for (const prospect of prospects) {
    let meta: any = {};
    try {
      if (prospect.website && prospect.website !== 'Not provided') {
        console.log(`   📡 Fetching: ${prospect.website}`);
        const res = await axios.get(prospect.website, { 
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        meta = extractAllMetadata(res.data);
      }
    } catch (e) {
      console.log(`   ⚠️  Could not fetch: ${prospect.website}`);
    }
    
    enriched.push({
      ...prospect,
      title: meta.title || meta.ogTitle || meta.twitterTitle || prospect.title || '',
      description: meta.description || meta.ogDescription || meta.twitterDescription || prospect.description || '',
      category: meta.ogType || prospect.category || '',
      ogSiteName: meta.ogSiteName || '',
    });
  }
  
  return enriched;
}

// Validate prospects have real contact information
function validateProspects(prospects: Prospect[]): Prospect[] {
  return prospects.filter(prospect => {
    const hasEmail = prospect.email && prospect.email.trim() !== '' && !prospect.email.includes('@example.com');
    const hasSocialMedia = prospect.socialMedia && prospect.socialMedia.trim() !== '';
    const hasPhone = prospect.phone && prospect.phone.trim() !== '';
    if (!hasEmail && !hasSocialMedia && !hasPhone) {
      console.log(`⚠️  Skipping ${prospect.name} - No real contact information found`);
      return false;
    }
    return true;
  });
}

// Append prospects to CSV file
export async function appendToCSV(prospects: Prospect[], filename: string = 'prospects.csv') {
  const csvPath = path.join(__dirname, filename);
  
  // Check if file exists to determine if we need headers
  const fileExists = fs.existsSync(csvPath);
  
  return new Promise<void>((resolve, reject) => {
    stringify(prospects, {
      header: true,
      quoted: true,
      quoted_empty: true,
      escape: '"',
      quoted_match: /.*/,
      record_delimiter: 'auto',
    }, (err, output) => {
      if (err) return reject(err);
      
      if (fileExists) {
        // Append to existing file (remove header from output)
        const lines = output.split('\n');
        const dataLines = lines.slice(1).join('\n'); // Remove header line
        fs.appendFileSync(csvPath, dataLines);
      } else {
        // Create new file with header
        fs.writeFileSync(csvPath, output);
      }
      
      resolve();
    });
  });
}

// AI-powered prospect generation
export async function generateProspectsWithAI(criteria: any): Promise<Prospect[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  
  const prompt = `Generate 10 real businesses in ${criteria.location}, Nigeria that match these criteria:

Industry Focus: ${criteria.industry}
Company Size Preference: ${criteria.companySize}
Business Intent: ${criteria.intent}
Additional Criteria: ${criteria.additional}

STRICT CONTACT REQUIREMENT: For each business, you MUST provide at least one real, public contact method:
- A real, public email address of the owner, CEO, manager, or business (no likely/fake emails, no placeholders, no info@ or contact@ unless it's the real public contact)
- OR a real, public phone number
- OR a real, public social media handle (LinkedIn, Instagram, Facebook, Twitter, etc.)
If you cannot find a real contact method, SKIP that business.

For each business, provide:
1. Company name (real, existing business)
2. Contact email (if available, must be real and public)
3. Phone number (if available, must be real and public)
4. Social media handles (if available, must be real and public)
5. Website URL (if available)
6. Key person's title (CEO, Founder, Manager, etc.)
7. Business description (1-2 sentences)
8. Industry category
9. Relevant tags (comma-separated)
10. Company size (1-10, 10-49, 50-249, 250+)
11. Business intent (growth, optimization, efficiency)
12. Email prompt (Subject and Body for cold outreach)

Format as JSON array:
[
  {
    "name": "Company Name",
    "email": "real@email.com",
    "phone": "+2348012345678",
    "socialMedia": "LinkedIn: linkedin.com/in/person, Twitter: @person",
    "website": "https://company.com",
    "title": "CEO",
    "description": "Brief description",
    "category": "Industry",
    "tags": "tag1,tag2,tag3",
    "companySize": "1-10",
    "inferredIntent": "growth",
    "emailPrompt": "Subject: [High-performing subject line]\nBody: [3-sentence email body]"
  }
]

Focus on real, verifiable businesses with at least one real, public contact method. SKIP any business where you cannot find a real contact method.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const prospects = JSON.parse(jsonMatch[0]);
      return prospects;
    }
    
    return [];
  } catch (e) {
    console.error("AI prospect generation failed:", e);
    return [];
  }
}

// Display prospects in a nice format
function displayProspects(prospects: Prospect[]) {
  console.log('\n🎯 GENERATED PROSPECTS:\n');
  console.log('='.repeat(80));
  
  prospects.forEach((prospect, index) => {
    console.log(`\n${index + 1}. ${prospect.name}`);
    console.log(`   📧 Email: ${prospect.email || '❌ NO EMAIL - SKIP THIS PROSPECT'}`);
    console.log(`   📱 Phone: ${prospect.phone || 'Not provided'}`);
    console.log(`   📱 Social: ${prospect.socialMedia || 'Not provided'}`);
    console.log(`   🌐 Website: ${prospect.website || 'Not provided'}`);
    console.log(`   👤 Title: ${prospect.title}`);
    console.log(`   📝 Description: ${prospect.description}`);
    console.log(`   🏢 Category: ${prospect.category}`);
    console.log(`   🏷️  Tags: ${prospect.tags}`);
    console.log(`   👥 Size: ${prospect.companySize}`);
    console.log(`   🎯 Intent: ${prospect.inferredIntent}`);
    console.log(`   📧 Email Prompt:`);
    console.log(`      ${prospect.emailPrompt.replace(/\n/g, '\n      ')}`);
    console.log('-'.repeat(80));
  });
}

// Main chat function
export async function chatWithUser() {
  console.log('🤖 Welcome to Daily Prospect Generator!');
  console.log('Let me help you find 10 prospects for today.\n');
  
  // Get user criteria
  const location = await askQuestion('📍 Location (e.g., Lagos, Abuja, Enugu): ');
  const industry = await askQuestion('🏢 Industry focus (e.g., Tech, Retail, Manufacturing): ');
  const companySize = await askQuestion('👥 Company size preference (e.g., 1-10, 10-49, 50-249, 250+): ');
  const intent = await askQuestion('🎯 Business intent (e.g., growth, optimization, efficiency): ');
  const additional = await askQuestion('➕ Additional criteria (optional): ');
  
  console.log('\n🔄 Generating prospects... Please wait...\n');
  
  // Generate prospects
  const criteria = {
    location: location || 'Enugu',
    industry: industry || 'Education',
    
    companySize: companySize || '1-10',
    intent: intent || 'growth',
    additional: additional || 'None'
  };
  
  const prospects = await generateProspectsWithAI(criteria);
  
  if (prospects.length > 0) {
    displayProspects(prospects);
    
    // Ask if user wants to enrich and save
    const saveChoice = await askQuestion('\n💾 Would you like to enrich and save these prospects to CSV? (y/n): ');
    
    if (saveChoice.toLowerCase() === 'y' || saveChoice.toLowerCase() === 'yes') {
      console.log('\n🔄 Processing prospects...');
      
      // Validate prospects have real contact information
      const validProspects = validateProspects(prospects);
      
      if (validProspects.length === 0) {
        console.log('\n❌ No prospects with valid contact information found. Please try again with different criteria.');
        return;
      }
      
      // Enrich prospects with website data
      const enrichedProspects = await enrichProspects(validProspects);
      
      // Append to CSV file
      await appendToCSV(enrichedProspects);
      
      console.log(`\n✅ Successfully added ${enrichedProspects.length} valid prospects to prospects.csv`);
      console.log(`📊 Original: ${prospects.length} prospects | Valid: ${enrichedProspects.length} prospects`);
      console.log('\n📋 Next step:');
      console.log('Run: npm run out (to send outreach emails)');
      
    } else {
      console.log('\n📋 COPY THE JSON BELOW TO YOUR PROSPECTS.CSV FILE:\n');
      console.log('='.repeat(80));
      console.log(JSON.stringify(prospects, null, 2));
      console.log('='.repeat(80));
      
      console.log('\n✅ Next steps:');
      console.log('1. Copy the JSON above');
      console.log('2. Replace the content in scripts/prospects.csv');
      console.log('3. Run: npm run imp (to enrich)');
      console.log('4. Run: npm run out (to send emails)');
    }
    
  } else {
    console.log('❌ No prospects generated. Please try again with different criteria.');
  }
  
  // Ask if user wants to generate more
  const more = await askQuestion('\n🔄 Generate more prospects? (y/n): ');
  if (more.toLowerCase() === 'y' || more.toLowerCase() === 'yes') {
    console.log('\n' + '='.repeat(80) + '\n');
    await chatWithUser();
  } else {
    console.log('\n👋 Thanks for using Daily Prospect Generator! See you tomorrow!');
    rl.close();
  }
}

// Start the chat only if this file is run directly
if (require.main === module) {
  chatWithUser().catch(console.error);
} 