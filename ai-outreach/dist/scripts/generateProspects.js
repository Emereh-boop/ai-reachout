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
exports.enrichProspects = enrichProspects;
exports.appendToCSV = appendToCSV;
exports.generateProspectsWithAI = generateProspectsWithAI;
exports.chatWithUser = chatWithUser;
exports.validateProspects = validateProspects;
exports.displayProspects = displayProspects;
const generative_ai_1 = require("@google/generative-ai");
const readline = __importStar(require("readline"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const csv_writer_1 = require("csv-writer");
dotenv.config();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Create readline interface for chat
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
// Helper function to ask questions
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}
// Helper to extract metadata from HTML
function extractAllMetadata(html) {
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
function enrichProspects(prospects_1) {
    return __awaiter(this, arguments, void 0, function* (prospects, type = 'enterprise') {
        console.log(`🔍 Enriching ${type} prospects with website data...`);
        const enriched = [];
        for (const prospect of prospects) {
            let meta = {};
            try {
                // For people, use their company website; for enterprise, use their own website
                const websiteToFetch = type === 'people' ? prospect.website : prospect.website;
                if (websiteToFetch && websiteToFetch !== 'Not provided') {
                    console.log(`   📡 Fetching: ${websiteToFetch}`);
                    const res = yield axios_1.default.get(websiteToFetch, {
                        timeout: 5000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    meta = extractAllMetadata(res.data);
                }
            }
            catch (e) {
                console.log(`   ⚠️  Could not fetch: ${prospect.website}`);
            }
            enriched.push(Object.assign(Object.assign({}, prospect), { title: meta.title || meta.ogTitle || meta.twitterTitle || prospect.title || '', description: meta.description || meta.ogDescription || meta.twitterDescription || prospect.description || '', category: meta.ogType || prospect.category || '', ogSiteName: meta.ogSiteName || '' }));
        }
        return enriched;
    });
}
// Validate prospects have real contact information
function validateProspects(prospects, type = 'enterprise') {
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
// Append prospects to CSV file based on type
function appendToCSV(prospects_1) {
    return __awaiter(this, arguments, void 0, function* (prospects, type = 'enterprise') {
        if (type === 'people') {
            // Save people to persons.csv
            const peopleData = prospects.map(p => ({
                name: p.name,
                email: p.email,
                phone: p.phone || '',
                social: p.socialMedia || '',
                reachedOut: 'false'
            }));
            const csvPath = path.join(__dirname, 'persons.csv');
            const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
                path: csvPath,
                header: [
                    { id: 'name', title: 'name' },
                    { id: 'email', title: 'email' },
                    { id: 'phone', title: 'phone' },
                    { id: 'social', title: 'social' },
                    { id: 'reachedOut', title: 'reachedOut' }
                ],
                append: true,
                alwaysQuote: true,
            });
            yield csvWriter.writeRecords(peopleData);
            console.log(`✅ Saved ${peopleData.length} people to persons.csv`);
        }
        else {
            // Save enterprise to prospects.csv
            const csvPath = path.join(__dirname, 'prospects.csv');
            const headers = [
                { id: 'name', title: 'name' },
                { id: 'email', title: 'email' },
                { id: 'website', title: 'website' },
                { id: 'title', title: 'title' },
                { id: 'description', title: 'description' },
                { id: 'category', title: 'category' },
                { id: 'tags', title: 'tags' },
                { id: 'companySize', title: 'companySize' },
                { id: 'inferredIntent', title: 'inferredIntent' },
                { id: 'contactChannel', title: 'contactChannel' },
                { id: 'emailPrompt', title: 'emailPrompt' },
                { id: 'phone', title: 'phone' },
                { id: 'socialMedia', title: 'socialMedia' },
                { id: 'ogSiteName', title: 'ogSiteName' },
            ];
            const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
                path: csvPath,
                header: headers,
                append: true,
                alwaysQuote: true,
            });
            yield csvWriter.writeRecords(prospects);
            console.log(`✅ Saved ${prospects.length} enterprises to prospects.csv`);
        }
    });
}
// AI-powered prospect generation
function generateProspectsWithAI(criteria) {
    return __awaiter(this, void 0, void 0, function* () {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        const prompt = `Generate real businesses in ${criteria.location}, that match these criteria:

Industry Focus: ${criteria.industry}
Company Size Preference: ${criteria.companySize}
Business Intent: ${criteria.intent}
Additional Criteria: ${criteria.additional}

STRICT CONTACT REQUIREMENT: For each business, you MUST provide at least one real, public contact method:
- A real, public email address of the owner, CEO, manager, or business (no likely/fake emails, no placeholders, no info@ or contact@ unless it's the real public contact)
- OR a real, public phone number
- OR a real, public social media handle (LinkedIn, Instagram, Facebook, Twitter, etc.)
If you cannot find a real contact method, SKIP that business.
You must test the contect method and ensure they are reliable.

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
            const result = yield model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
            const response = yield result.response;
            const text = response.text();
            // Extract JSON from the response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const prospects = JSON.parse(jsonMatch[0]);
                return prospects;
            }
            return [];
        }
        catch (e) {
            console.error("AI prospect generation failed:", e);
            return [];
        }
    });
}
// Display prospects in a nice format
function displayProspects(prospects) {
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
function chatWithUser() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🤖 Welcome to Daily Prospect Generator!');
        console.log('Let me help you find prospects for today.\n');
        // Get user criteria
        const location = yield askQuestion('📍 Location (e.g., Lagos, Abuja, Enugu): ');
        const industry = yield askQuestion('🏢 Industry focus (e.g., Tech, Retail, Manufacturing): ');
        const companySize = yield askQuestion('👥 Company size preference (e.g., 1-10, 10-49, 50-249, 250+): ');
        const intent = yield askQuestion('🎯 Business intent (e.g., growth, optimization, efficiency): ');
        const additional = yield askQuestion('➕ Additional criteria (optional): ');
        console.log('\n🔄 Generating prospects... Please wait...\n');
        // Generate prospects
        const criteria = {
            location: location || 'Enugu',
            industry: industry || 'Education',
            companySize: companySize || '1-10',
            intent: intent || 'growth',
            additional: additional || 'None'
        };
        const prospects = yield generateProspectsWithAI(criteria);
        if (prospects.length > 0) {
            displayProspects(prospects);
            // Ask if user wants to enrich and save
            const saveChoice = yield askQuestion('\n💾 Would you like to enrich and save these prospects to CSV? (y/n): ');
            if (saveChoice.toLowerCase() === 'y' || saveChoice.toLowerCase() === 'yes') {
                console.log('\n Processing prospects...');
                // Validate prospects have real contact information
                const validProspects = validateProspects(prospects);
                if (validProspects.length === 0) {
                    console.log('\n No prospects with valid contact information found. Please try again with different criteria.');
                    return;
                }
                // Enrich prospects with website data
                const enrichedProspects = yield enrichProspects(validProspects);
                // Append to CSV file
                yield appendToCSV(enrichedProspects);
                console.log(`\n Successfully added ${enrichedProspects.length} valid prospects to prospects.csv`);
                console.log(` Original: ${prospects.length} prospects | Valid: ${enrichedProspects.length} prospects`);
                console.log('\n Next step:');
                console.log('Run: npm run out (to send outreach emails)');
            }
            else {
                console.log('\n COPY THE JSON BELOW TO YOUR PROSPECTS.CSV FILE:\n');
                console.log('='.repeat(80));
                console.log(JSON.stringify(prospects, null, 2));
                console.log('='.repeat(80));
                console.log('\n Next steps:');
                console.log('1. Copy the JSON above');
                console.log('2. Replace the content in scripts/prospects.csv');
                console.log('3. Run: npm run imp (to enrich)');
                console.log('4. Run: npm run out (to send emails)');
            }
        }
        else {
            console.log(' No prospects generated. Please try again with different criteria.');
        }
        // Ask if user wants to generate more
        const more = yield askQuestion('\n🔄 Generate more prospects? (y/n): ');
        if (more.toLowerCase() === 'y' || more.toLowerCase() === 'yes') {
            console.log('\n' + '='.repeat(80) + '\n');
            yield chatWithUser();
        }
        else {
            console.log('\n👋 Thanks for using Daily Prospect Generator! See you tomorrow!');
            rl.close();
        }
    });
}
// Start the chat only if this file is run directly
if (require.main === module) {
    chatWithUser().catch(console.error);
}
