import express from "express";
import cors from "cors";
import multer from "multer";
import { enrichProspects } from "../scripts/importProspects";
import { runOutreach } from "../scripts/runOutreach";
import {
  generateProspectsWithAI,
  enrichProspects as enrichProspectsFromScript,
  appendToCSV,
  // Add this import:
  // @ts-ignore
  validateProspects as validateProspectsFromScript,
} from "../scripts/generateProspects";
import { sendEmail } from "../services/emailSender";
import { businessApiService } from "../services/businessApi";
import { firecrawlService } from "../services/firecrawlService";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import Database from "better-sqlite3";
dotenv.config();

const app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());
const upload = multer({ dest: "uploads/" });

// Create HTTP server and attach socket.io
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "https://ai-reachout.onrender.com",
      "http://localhost:3002",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://mojtabai.vercel.app",
    ],
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true,
  },
});

app.get("/", (req, res) => res.send("Unified API is running"));

// GET /prospects - return all prospects from SQLite
const db = new Database("data.db");
db.pragma('journal_mode = WAL');
app.get("/prospects", (req, res) => {
  try {
    const prospects = db.prepare("SELECT * FROM prospects").all();
    res.json(prospects);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /prospects - add a new prospect (JSON body)
app.post("/prospects", (req, res) => {
  const newProspect = req.body;
  if (!newProspect || !newProspect.email)
    return res.status(400).json({ error: "Missing prospect data or email" });
  try {
    const exists = db.prepare("SELECT 1 FROM prospects WHERE email = ?").get(newProspect.email);
    if (exists) {
      return res.status(400).json({ error: "Prospect with this email already exists" });
    }
    db.prepare(`INSERT INTO prospects (name, email, phone, social, website, title, description, category, tags, companySize, inferredIntent, emailPrompt, reachedOut) VALUES (@name, @email, @phone, @social, @website, @title, @description, @category, @tags, @companySize, @inferredIntent, @emailPrompt, @reachedOut)`).run(newProspect);
    res.json({ status: "ok", prospect: newProspect });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /enrich - run enrichment on all prospects in JSON
app.post("/enrich", async (req, res) => {
  try {
    const prospects = db.prepare("SELECT * FROM prospects").all() as Prospect[];
    for (const prospect of prospects) {
      db.prepare("UPDATE prospects SET enriched = ? WHERE email = ?").run(true, prospect.email);
    }
    res.json({ status: "enriched" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /outreach - run outreach
app.post("/outreach", async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      // Single prospect outreach
      await runOutreach(email);
      res.json({ status: "outreach complete", target: email });
    } else {
      // Bulk outreach (all prospects)
      await runOutreach();
      res.json({ status: "outreach complete", target: "all" });
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /outreach-single - run outreach for a single prospect
app.post("/outreach-single", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    await runOutreach(email);
    res.json({ status: "outreach complete", target: email });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /generate-prospects - chat-based prospect generation
app.post("/generate-prospects", async (req, res) => {
  try {
    const { location, industry, companySize, intent, additional } = req.body;

    const criteria = {
      location: location || "Nigeria",
      industry: industry || "Technology",
      companySize: companySize || "1-10",
      intent: intent || "optimization",
      additional: additional || "None",
    };

    const prospects = await generateProspectsWithAI(criteria);

    if (prospects.length > 0) {
      // Enrich prospects with website data
      const enrichedProspects = await enrichProspectsFromScript(prospects);

      // Append to CSV file
      await appendToCSV(enrichedProspects);

      res.json({
        status: "success",
        prospects: enrichedProspects,
        message: `Generated and saved ${enrichedProspects.length} prospects`,
      });
    } else {
      res.json({
        status: "no-prospects",
        message: "No prospects generated. Please try different criteria.",
      });
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /results - return all results from SQLite
db.pragma('journal_mode = WAL');
app.get("/results", (req, res) => {
  try {
    const results = db.prepare("SELECT * FROM results").all();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// TypeScript interfaces
interface Prospect {
  id?: number;
  name?: string;
  email: string;
  phone?: string;
  social?: string;
  website?: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string;
  companySize?: string;
  inferredIntent?: string;
  emailPrompt?: string;
  reachedOut?: string;
  enriched?: boolean;
}

interface Result {
  id?: number;
  business?: string;
  email: string;
  status?: string;
  error?: string;
  subject?: string;
  timestamp?: string;
  confirmed?: string;
  token?: string;
}

interface Person {
  id?: number;
  name?: string;
  email: string;
  phone?: string;
  social?: string;
  title?: string;
  company?: string;
  description?: string;
  category?: string;
  tags?: string;
  companySize?: string;
  inferredIntent?: string;
  emailPrompt?: string;
  reachedOut?: string;
}

// /api/confirm-interest using SQLite
app.get("/api/confirm-interest", (req: Request, res: Response) => {
  const { email, token } = req.query;
  if (!email || !token) {
    return res.status(400).send("<h2>Invalid confirmation link.</h2>");
  }
  const result = db.prepare("SELECT * FROM results WHERE email = ?").get(email) as Result | undefined;
  if (!result) {
    return res.status(404).send("<h2>Prospect not found.</h2>");
  }
  if (result.confirmed === "true") {
    return res.send("<h2>Thank you! Your interest has already been confirmed. We will be in touch soon.</h2>");
  }
  if (result.token !== token) {
    return res.status(400).send("<h2>Invalid or expired confirmation link.</h2>");
  }
  db.prepare("UPDATE results SET confirmed = 'true' WHERE email = ?").run(email);
  res.send("<h2>Thank you for confirming your interest! We will contact you to schedule a meeting or chat.</h2>");
});

// DELETE /prospects - remove a prospect by email
app.delete("/prospects", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    db.prepare("DELETE FROM prospects WHERE email = ?").run(email);
    const prospects = db.prepare("SELECT * FROM prospects").all();
    res.json({ status: "removed", prospects });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /prospects - update a prospect's reachedOut/closed status by email
app.patch("/prospects", (req, res) => {
  const { email, reachedOut } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  if (typeof reachedOut === "undefined")
    return res.status(400).json({ error: "reachedOut is required" });
  try {
    const result = db.prepare("UPDATE prospects SET reachedOut = ? WHERE email = ?").run(String(reachedOut), email);
    if (result.changes === 0) return res.status(404).json({ error: "Prospect not found" });
    const prospects = db.prepare("SELECT * FROM prospects").all();
    res.json({ status: "updated", prospects });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// WebSocket test endpoint
app.get("/ws-test", (req, res) => {
  res.send("WebSocket server is running.");
});

// GET /persons - return all persons from SQLite
db.pragma('journal_mode = WAL');
app.get("/persons", (req, res) => {
  try {
    const persons = db.prepare("SELECT * FROM persons").all();
    res.json(persons);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /persons - add a new person (JSON body)
app.post("/persons", (req, res) => {
  const newPerson = req.body;
  if (!newPerson || !newPerson.email)
    return res.status(400).json({ error: "Missing person data or email" });
  try {
    const exists = db.prepare("SELECT 1 FROM persons WHERE email = ?").get(newPerson.email);
    if (exists) {
      return res.status(400).json({ error: "Person with this email already exists" });
    }
    db.prepare(`INSERT INTO persons (name, email, phone, social, title, company, description, category, tags, companySize, inferredIntent, emailPrompt, reachedOut) VALUES (@name, @email, @phone, @social, @title, @company, @description, @category, @tags, @companySize, @inferredIntent, @emailPrompt, @reachedOut)`).run(newPerson);
    res.json({ status: "ok", person: newPerson });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /persons - remove a person by email
app.delete("/persons", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    db.prepare("DELETE FROM persons WHERE email = ?").run(email);
    const persons = db.prepare("SELECT * FROM persons").all();
    res.json({ status: "removed", persons });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /persons - update a person's reachedOut/closed status by email
app.patch("/persons", (req, res) => {
  const { email, reachedOut } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  if (typeof reachedOut === "undefined")
    return res.status(400).json({ error: "reachedOut is required" });
  try {
    const result = db.prepare("UPDATE persons SET reachedOut = ? WHERE email = ?").run(String(reachedOut), email);
    if (result.changes === 0) return res.status(404).json({ error: "Person not found" });
    const persons = db.prepare("SELECT * FROM persons").all();
    res.json({ status: "updated", persons });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Add CORS middleware for dev and prod
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://ai-reachout.onrender.com",
    "https://mojtabai.vercel.app",
    "http://localhost:3002",
    "http://localhost:3000",
    "http://localhost:3001",
  ];
  // Allow any localhost port
  const isLocalhost = origin && /^http:\/\/localhost:\d+$/.test(origin);
  if (
    (allowedOrigins.includes(origin as string) || isLocalhost) &&
    typeof origin === "string"
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  next();
});

// POST /chat - freeform AI chat (Gemini-powered, context-aware)
app.post("/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages (array) is required" });
  }
  // Filter out messages with empty or missing text
  const filteredMessages = messages.filter((m) => m.text && m.text.trim());
  if (filteredMessages.length !== messages.length) {
    // Filtered out empty/invalid messages
  }
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const systemPrompt = `You are an AI assistant for business prospecting and outreach. Your job is to help the user find real businesses and contacts for outreach. 

      You can help with:
      - Finding business prospects and contacts
      - Generating prospect lists with contact information
      - Business research and analysis
      - Outreach strategy and messaging
      - General business questions and advice

      When the user wants to generate prospects, ask them what type they prefer:
      - "People" (individual business owners, entrepreneurs, key decision makers)
      - "Enterprise" (companies/businesses)

      Then gather information like location, industry focus, company size, business intent, and any additional criteria.

      When you have all the required information for prospect generation, format your response as a JSON array of prospects.

      For PEOPLE (individual business owners/entrepreneurs):
      Each prospect should have:
      - name (full name of the person)
      - email (real, public email of the person)
      - phone (real, public phone, if available)
      - socialMedia (real, public social profiles)
      - title (their role: CEO, Founder, Owner, Director, etc.)
      - company (the business they own/run)
      - description (brief description of their business)
      - category (industry)
      - tags (comma-separated)
      - companySize (size of their business)
      - inferredIntent (growth, optimization, efficiency, etc.)
      - emailPrompt (Subject and Body for cold outreach)

      For ENTERPRISE (companies):
      Each prospect should have:
      - name (company name)
      - email (real, public contact email)
      - phone (real, public phone)
      - socialMedia (real, public social profiles)
      - website (company website)
      - title (key person's title)
      - description (company description)
      - category (industry)
      - tags (comma-separated)
      - companySize (1-10, 10-49, 50-249, 250+)
      - inferredIntent (growth, optimization, efficiency, etc.)
      - emailPrompt (Subject and Body for cold outreach)

      You can also help with general business questions, market research, and outreach strategies. Be helpful and informative while staying focused on business-related topics.`;
    const context = [
      { role: "model", parts: [{ text: systemPrompt }] },
      ...filteredMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      })),
    ];
    const result = await model.generateContent({ contents: context });
    const response = await result.response;
    const text = response.text();
    // Try to extract JSON array from the reply
    let validProspects = [];
    let prospectType: "enterprise" | "people" = "enterprise"; // default

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const prospects = JSON.parse(jsonMatch[0]);

        // Determine if these are people or enterprise prospects
        // Check if the first prospect has a 'company' field (indicates people)
        if (prospects.length > 0 && prospects[0].company) {
          prospectType = "people";
        }

        validProspects = validateProspectsFromScript(prospects, prospectType);
        if (validProspects.length > 0) {
          // Enrich prospects with website data
          const enrichedProspects = await enrichProspectsFromScript(
            validProspects,
            prospectType
          );

          // Save to appropriate CSV file based on type
          await appendToCSV(enrichedProspects, prospectType);

          // Return enriched prospects for confirmation
          return res.json({
            reply: text,
            enrichedProspects,
            type: prospectType,
            message: `Successfully saved ${enrichedProspects.length} ${prospectType} prospects`,
          });
        }
        // If no valid prospects, return as before
        return res.json({ reply: text, validProspects, type: prospectType });
      }
    } catch (err) {
      // Failed to parse or validate prospects from Gemini reply
    }
    res.json({ reply: text });
  } catch (e) {
    let errorMsg = String(e);
    let errorStack = undefined;
    if (e instanceof Error) {
      errorMsg = e.message;
      errorStack = e.stack;
    } else {
      // Non-Error thrown
    }
    res.status(500).json({ error: errorMsg, stack: errorStack });
  }
});

// GET /news - fetch business news for reports section
app.get("/news", async (req, res) => {
  try {
    // Using NewsAPI.org (free tier: 100 requests/day)
    const apiKey = process.env.NEWS_API_KEY;
    const country = req.query.country || "ng"; // Default to Nigeria
    const category = req.query.category || "business";
    const url = `https://newsapi.org/v2/everything?q=business+entrepreneurs+startups&language=en&sortBy=publishedAt&apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = (await response.json()) as any;
    if (data.status === "error") {
      console.error("News API error:", data.message);
    }
    const news = data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      publishedAt: article.publishedAt,
      source: article.source.name,
    }));
    console.log(` Fetched ${news.length} news articles`);
    res.json(news);
  } catch (error) {
    console.error(" Error fetching news:", error);
  }
});

// GET /search-businesses - search businesses by criteria
app.get("/search-businesses", async (req, res) => {
  try {
    const { query, location, industry, companySize, limit = 20 } = req.query;
    let results: Prospect[] = [];
    const prospects = db.prepare("SELECT * FROM prospects").all() as Prospect[];
    const filtered = prospects.filter((prospect: Prospect) => {
      const matchesQuery =
        !query ||
        prospect.name?.toLowerCase().includes(query.toString().toLowerCase()) ||
        prospect.description?.toLowerCase().includes(query.toString().toLowerCase()) ||
        prospect.category?.toLowerCase().includes(query.toString().toLowerCase());
      const matchesLocation =
        !location ||
        (prospect as any).location?.toLowerCase().includes(location.toString().toLowerCase());
      const matchesIndustry =
        !industry ||
        prospect.category?.toLowerCase().includes(industry.toString().toLowerCase());
      const matchesSize = !companySize || prospect.companySize === companySize;
      return matchesQuery && matchesLocation && matchesIndustry && matchesSize;
    });
    results = filtered.slice(0, parseInt(limit.toString()));
    res.json({
      status: "success",
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("Error searching businesses:", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /business/:id - get detailed business info
app.get("/business/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const prospect = db.prepare("SELECT * FROM prospects WHERE email = ? OR name = ?").get(id, id) as Prospect | undefined;
    if (prospect) {
      res.json({
        status: "success",
        business: {
          ...prospect,
          websiteData: prospect.title && prospect.description ? {
            title: prospect.title,
            description: prospect.description,
            category: prospect.category
          } : null
        }
      });
    } else {
      res.status(404).json({ error: "Business not found" });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /bulk-outreach - send outreach to multiple businesses
app.post("/bulk-outreach", async (req, res) => {
  try {
    const { businessIds, messageType = "email", customMessage } = req.body;
    if (!businessIds || !Array.isArray(businessIds)) {
      return res.status(400).json({ error: "businessIds array is required" });
    }
    const results: any[] = [];
    const prospects = db.prepare("SELECT * FROM prospects").all() as Prospect[];
    for (const id of businessIds) {
      const business = prospects.find((p: Prospect) => p.email === id || p.name === id);
      if (business) {
        try {
          if (messageType === "email" && business.email) {
            const emailResult = await sendEmail({
              to: business.email,
              subject: customMessage?.slice(0, 50) || "Outreach",
              body: customMessage || "Hello, this is an outreach message."
            });
            results.push({
              business: business.name,
              email: business.email,
              status: emailResult.status === "sent" ? "sent" : "failed",
              error: emailResult.error,
              subject: customMessage?.slice(0, 50) || "Outreach",
              timestamp: new Date().toISOString(),
            });
          } else if (messageType === "whatsapp" && business.phone) {
            results.push({
              business: business.name,
              phone: business.phone,
              status: "not_implemented",
              error: "WhatsApp integration not yet implemented",
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          results.push({
            business: business.name,
            status: "error",
            error: String(error),
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
    // Save results to results table (not shown here)
    res.json({
      status: "success",
      results,
      summary: {
        total: businessIds.length,
        successful: results.filter((r) => r.status === "sent").length,
        failed: results.filter((r) => r.status === "failed" || r.status === "error").length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// TODO: GET /analytics - get outreach analytics
app.get("/analytics", async (req, res) => {
  try {
    const analytics: {
      totalBusinesses: number;
      totalPeople: number;
      outreachSent: number;
      responseRate: number;
      topIndustries: Array<{ industry: string; count: number }>;
      topLocations: Array<{ location: string; count: number }>;
    } = {
      totalBusinesses: 0,
      totalPeople: 0,
      outreachSent: 0,
      responseRate: 0,
      topIndustries: [],
      topLocations: [],
    };
    const prospects = db.prepare("SELECT * FROM prospects").all() as Prospect[];
    analytics.totalBusinesses = prospects.length;
    const industries: { [key: string]: number } = prospects.reduce((acc: { [key: string]: number }, p: Prospect) => {
      if (p.category) acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});
    analytics.topIndustries = Object.entries(industries)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([industry, count]) => ({ industry, count: count as number }));
    res.json({
      status: "success",
      analytics,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /enrich-business - enrich business data using Firecrawl
app.post("/enrich-business", async (req, res) => {
  try {
    const { website, businessData } = req.body;

    if (!website) {
      return res.status(400).json({ error: "Website URL is required" });
    }

    if (!firecrawlService.isConfigured()) {
      return res.status(400).json({
        error:
          "Firecrawl not configured. Please add FIRECRAWL_API_KEY to environment variables.",
      });
    }

    // Extract business contacts using Firecrawl
    const contacts = await firecrawlService.extractBusinessContacts(website);

    // Enrich with additional business data
    const enrichedData = await businessApiService.enrichBusinessData({
      name: businessData?.name || "",
      website,
      email: contacts.emails[0],
      phone: contacts.phones[0],
      social: contacts.social.join(", "),
      title: contacts.title,
      description: contacts.description,
      source: "Firecrawl",
    });

    res.json({
      status: "success",
      data: enrichedData,
      contacts,
    });
  } catch (error) {
    console.error("Error enriching business:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /bulk-enrich - enrich multiple businesses
app.post("/bulk-enrich", async (req, res) => {
  try {
    const { websites } = req.body;

    if (!websites || !Array.isArray(websites)) {
      return res.status(400).json({ error: "websites array is required" });
    }

    if (!firecrawlService.isConfigured()) {
      return res.status(400).json({
        error:
          "Firecrawl not configured. Please add FIRECRAWL_API_KEY to environment variables.",
      });
    }

    const results = await firecrawlService.extractMultipleBusinesses(websites);

    res.json({
      status: "success",
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("Error bulk enriching businesses:", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /firecrawl-status - check Firecrawl configuration
app.get("/firecrawl-status", async (req, res) => {
  try {
    const isConfigured = firecrawlService.isConfigured();
    const accountInfo = isConfigured
      ? await firecrawlService.getAccountInfo()
      : null;

    res.json({
      status: "success",
      configured: isConfigured,
      accountInfo,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

const PORT = process.env.PORT || 3002;

// Only start the server if this file is run directly
if (require.main === module) {
  server.listen(PORT, () => console.log(`API server running on port ${PORT}`));
}

// Export io for use in scripts, but don't start the server on import
export { io };

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === "production"
    ? "https://ai-reachout.onrender.com/auth/google/callback"
    : "http://localhost:3002/auth/google/callback"
);

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const userTokens: { [userId: string]: any } = {};

// User login (demo: accepts any email/password, returns JWT)
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  // In production, validate password and user existence
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// User logout (client just deletes token)
app.post("/auth/logout", (req, res) => {
  res.json({ status: "logged out" });
});

// Middleware to check JWT and set req.user
function requireAuth(req: Request & { user?: any }, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No auth token" });
  try {
    const decoded = jwt.verify(auth.replace("Bearer ", ""), JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Gmail OAuth: Step 1 - Redirect user to Google OAuth consent screen
app.get("/auth/google", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    // Optionally, pass state or user info here
  });
  res.redirect(url);
});

// Gmail OAuth: Step 2 (associate tokens with user)
app.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;
  // In production, use state to prevent CSRF and link to user session
  const { tokens } = await oauth2Client.getToken(code as string);
  // For demo, require JWT in query or header
  const userReq = req as Request & { user?: any };
  let userEmail = null;
  if (userReq.user && userReq.user.email) userEmail = userReq.user.email;
  else if (req.query.email) userEmail = req.query.email;
  if (!userEmail) return res.status(400).json({ error: "No user context" });
  userTokens[userEmail] = tokens;
  res.redirect(
    process.env.NODE_ENV === "production"
      ? "https://mojtabai.vercel.app/settings?gmail=connected"
      : "http://localhost:3000/settings?gmail=connected"
  );
});

// Endpoint to check Gmail connection
app.get("/auth/gmail-status", requireAuth, (req, res) => {
  const userReq = req as Request & { user?: any };
  const email = userReq.user.email;
  res.json({ connected: !!userTokens[email] });
});

// Endpoint to send email via Gmail API for authenticated user
app.post("/send-gmail", requireAuth, async (req, res) => {
  const { to, subject, body } = req.body;
  const userReq = req as Request & { user?: any };
  const email = userReq.user.email;
  const tokens = userTokens[email];
  if (!tokens) return res.status(400).json({ error: "Gmail not connected" });
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NODE_ENV === "production"
      ? "https://ai-reachout.onrender.com/auth/google/callback"
      : "http://localhost:3002/auth/google/callback"
  );
  oauth2.setCredentials(tokens);
  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const message = [
    `To: ${to}`,
    "Subject: " + subject,
    "Content-Type: text/html; charset=utf-8",
    "",
    body,
  ].join("\n");
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });
    res.json({ status: "sent" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
