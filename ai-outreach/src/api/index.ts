import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import { enrichProspects } from "../../scripts/importProspects";
import { runOutreach } from "../../scripts/runOutreach";
import {
  generateProspectsWithAI,
  enrichProspects as enrichProspectsFromScript,
  appendToCSV,
  // Add this import:
  // @ts-ignore
  validateProspects as validateProspectsFromScript,
} from "../../scripts/generateProspects";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fetch from "node-fetch";
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
      "http://localhost:3002",
      "http://localhost:3000",
      "https://mojtabai.vercel.app",
      "https://ai-reachout.onrender.com/",
    ],
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true,
  },
});

app.get("/", (req, res) => res.send("Unified API is running"));

// GET /prospects - return all prospects from prospects.csv
app.get("/prospects", (req, res) => {
  if (!fs.existsSync("scripts/prospects.csv")) return res.json([]);
  const prospects: any[] = [];
  fs.createReadStream("scripts/prospects.csv")
    .pipe(parse({ 
      columns: true, 
      trim: true,
      relax_column_count: true,
      skip_empty_lines: true,
      relax_quotes: true
    }))
    .on("data", (row) => prospects.push(row))
    .on("end", () => res.json(prospects))
    .on("error", (err) => res.status(500).json({ error: String(err) }));
});

// POST /prospects - upload a new prospects.csv
app.post("/prospects", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  fs.renameSync(req.file.path, "scripts/prospects.csv");
  res.json({ status: "ok" });
});

// POST /enrich - run enrichment
app.post("/enrich", async (req, res) => {
  try {
    await enrichProspects();
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

// GET /results - return all results from results.csv
app.get("/results", (req, res) => {
  if (!fs.existsSync("results.csv")) return res.json([]);
  const results: any[] = [];
  fs.createReadStream("results.csv")
    .pipe(parse({ columns: true, trim: true }))
    .on("data", (row) => results.push(row))
    .on("end", () => res.json(results))
    .on("error", (err) => res.status(500).json({ error: String(err) }));
});

// Add confirmation endpoint
app.get("/api/confirm-interest", (req, res) => {
  const { email, token } = req.query;
  if (!email || !token) {
    return res.status(400).send("<h2>Invalid confirmation link.</h2>");
  }
  if (!fs.existsSync("results.csv")) {
    return res.status(404).send("<h2>No outreach results found.</h2>");
  }
  const results: any[] = [];
  fs.createReadStream("results.csv")
    .pipe(parse({ columns: true, trim: true }))
    .on("data", (row) => results.push(row))
    .on("end", () => {
      const idx = results.findIndex((r) => r.email === email);
      if (idx === -1) {
        return res.status(404).send("<h2>Prospect not found.</h2>");
      }
      if (results[idx].confirmed === "true") {
        return res.send(
          "<h2>Thank you! Your interest has already been confirmed. We will be in touch soon.</h2>"
        );
      }
      if (results[idx].token !== token) {
        return res
          .status(400)
          .send("<h2>Invalid or expired confirmation link.</h2>");
      }
      results[idx].confirmed = "true";
      // Write back to results.csv
      stringify(
        results,
        { header: true, quoted: true, quoted_empty: true },
        (err: any, output: any) => {
          if (err) {
            return res
              .status(500)
              .send(
                "<h2>Failed to update confirmation. Please try again later.</h2>"
              );
          }
          fs.writeFileSync("results.csv", output);
          res.send(
            "<h2>Thank you for confirming your interest! We will contact you to schedule a meeting or chat.</h2>"
          );
        }
      );
    })
    .on("error", (err: any) => {
      res
        .status(500)
        .send(
          "<h2>Failed to process confirmation. Please try again later.</h2>"
        );
    });
});

// DELETE /prospects - remove a prospect by email
app.delete("/prospects", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  if (!fs.existsSync("scripts/prospects.csv"))
    return res.status(404).json({ error: "No prospects file found" });
  const prospects: any[] = [];
  fs.createReadStream("scripts/prospects.csv")
    .pipe(parse({ columns: true, trim: true }))
    .on("data", (row) => prospects.push(row))
    .on("end", () => {
      const filtered = prospects.filter((p) => p.email !== email);
      stringify(
        filtered,
        { header: true, quoted: true, quoted_empty: true },
        (err, output) => {
          if (err) return res.status(500).json({ error: String(err) });
          fs.writeFileSync("scripts/prospects.csv", output);
          res.json({ status: "removed", prospects: filtered });
        }
      );
    })
    .on("error", (err) => res.status(500).json({ error: String(err) }));
});

// PATCH /prospects - update a prospect's reachedOut/closed status by email
app.patch("/prospects", (req, res) => {
  const { email, reachedOut } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  if (typeof reachedOut === "undefined")
    return res.status(400).json({ error: "reachedOut is required" });
  if (!fs.existsSync("scripts/prospects.csv"))
    return res.status(404).json({ error: "No prospects file found" });
  const prospects: any[] = [];
  fs.createReadStream("scripts/prospects.csv")
    .pipe(parse({ columns: true, trim: true }))
    .on("data", (row) => prospects.push(row))
    .on("end", () => {
      const idx = prospects.findIndex((p) => p.email === email);
      if (idx === -1)
        return res.status(404).json({ error: "Prospect not found" });
      prospects[idx].reachedOut = String(reachedOut);
      stringify(
        prospects,
        { header: true, quoted: true, quoted_empty: true },
        (err, output) => {
          if (err) return res.status(500).json({ error: String(err) });
          fs.writeFileSync("scripts/prospects.csv", output);
          res.json({ status: "updated", prospects });
        }
      );
    })
    .on("error", (err) => res.status(500).json({ error: String(err) }));
});

// WebSocket test endpoint
app.get("/ws-test", (req, res) => {
  res.send("WebSocket server is running.");
});

// GET /persons - return all persons from persons.csv
app.get("/persons", (req, res) => {
  if (!fs.existsSync("scripts/persons.csv")) {
    return res.json([]);
  }
  const persons: any[] = [];
  fs.createReadStream("scripts/persons.csv")
    .pipe(parse({ 
      columns: true, 
      trim: true,
      relax_column_count: true,
      skip_empty_lines: true,
      relax_quotes: true
    }))
    .on("data", (row) => {
      persons.push(row);
    })
    .on("end", () => {
      res.json(persons);
    })
    .on("error", (err) => {
      res.status(500).json({ error: String(err) });
    });
});

// POST /persons - upload a new persons.csv
app.post("/persons", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  fs.renameSync(req.file.path, "scripts/persons.csv");
  res.json({ status: "ok" });
});

// DELETE /persons - remove a person by email
app.delete("/persons", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  if (!fs.existsSync("scripts/persons.csv"))
    return res.status(404).json({ error: "No persons file found" });
  const persons: any[] = [];
  fs.createReadStream("scripts/persons.csv")
    .pipe(parse({ columns: true, trim: true }))
    .on("data", (row) => persons.push(row))
    .on("end", () => {
      const filtered = persons.filter((p) => p.email !== email);
      stringify(
        filtered,
        { header: true, quoted: true, quoted_empty: true },
        (err, output) => {
          if (err) return res.status(500).json({ error: String(err) });
          fs.writeFileSync("scripts/persons.csv", output);
          res.json({ status: "removed", persons: filtered });
        }
      );
    })
    .on("error", (err) => res.status(500).json({ error: String(err) }));
});

// PATCH /persons - update a person's reachedOut/closed status by email
app.patch("/persons", (req, res) => {
  const { email, reachedOut } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  if (typeof reachedOut === "undefined")
    return res.status(400).json({ error: "reachedOut is required" });
  if (!fs.existsSync("scripts/persons.csv"))
    return res.status(404).json({ error: "No persons file found" });
  const persons: any[] = [];
  fs.createReadStream("scripts/persons.csv")
    .pipe(parse({ columns: true, trim: true }))
    .on("data", (row) => persons.push(row))
    .on("end", () => {
      const idx = persons.findIndex((p) => p.email === email);
      if (idx === -1)
        return res.status(404).json({ error: "Person not found" });
      persons[idx].reachedOut = String(reachedOut);
      stringify(
        persons,
        { header: true, quoted: true, quoted_empty: true },
        (err, output) => {
          if (err) return res.status(500).json({ error: String(err) });
          fs.writeFileSync("scripts/persons.csv", output);
          res.json({ status: "updated", persons });
        }
      );
    })
    .on("error", (err) => res.status(500).json({ error: String(err) }));
});

// Add CORS middleware for dev and prod
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://mojtabai.vercel.app",
    "https://ai-reachout.onrender.com",
    "http://localhost:3002",
    "http://localhost:3000",
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
          const enrichedProspects = await enrichProspectsFromScript(validProspects, prospectType);
          
          // Save to appropriate CSV file based on type
          await appendToCSV(enrichedProspects, prospectType);
          
          // Return enriched prospects for confirmation
          return res.json({ 
            reply: text, 
            enrichedProspects,
            type: prospectType,
            message: `Successfully saved ${enrichedProspects.length} ${prospectType} prospects`
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
    const country = req.query.country || 'ng'; // Default to Nigeria
    const category = req.query.category || 'business';
    
    console.log(`🔑 News API Key: ${apiKey ? 'Present' : 'Missing'}`);
    
    if (!apiKey || apiKey === 'demo') {
      console.log('📰 Using demo news data (no API key)');
      const demoNews = [
        {
          title: "Business Growth Trends in 2024",
          description: "Key insights into emerging business opportunities and market dynamics.",
          url: "#",
          publishedAt: new Date().toISOString(),
          source: "Business Daily"
        },
        {
          title: "Digital Transformation in SMEs",
          description: "How small and medium enterprises are adapting to digital technologies.",
          url: "#", 
          publishedAt: new Date().toISOString(),
          source: "Tech Weekly"
        },
        {
          title: "AI-Powered Business Solutions",
          description: "How artificial intelligence is revolutionizing business operations and customer engagement.",
          url: "#",
          publishedAt: new Date().toISOString(),
          source: "Tech Insights"
        }
      ];
      return res.json(demoNews);
    }
    
    const url = `https://newsapi.org/v2/everything?q=business+entrepreneurs+startups&language=en&sortBy=publishedAt&apiKey=${apiKey}`;
    console.log(`�� Fetching news from: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (data.status === 'error') {
      console.error('❌ News API error:', data.message);
      // Fallback to demo data if API fails
      const demoNews = [
        {
          title: "Business Growth Trends in 2024",
          description: "Key insights into emerging business opportunities and market dynamics.",
          url: "#",
          publishedAt: new Date().toISOString(),
          source: "Business Daily"
        },
        {
          title: "Digital Transformation in SMEs",
          description: "How small and medium enterprises are adapting to digital technologies.",
          url: "#", 
          publishedAt: new Date().toISOString(),
          source: "Tech Weekly"
        }
      ];
      return res.json(demoNews);
    }
    
    const news = data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      publishedAt: article.publishedAt,
      source: article.source.name
    }));
    
    console.log(`✅ Fetched ${news.length} news articles`);
    res.json(news);
    
  } catch (error) {
    console.error('❌ Error fetching news:', error);
    // Return demo data on error
    const demoNews = [
      {
        title: "Business Growth Trends in 2024",
        description: "Key insights into emerging business opportunities and market dynamics.",
        url: "#",
        publishedAt: new Date().toISOString(),
        source: "Business Daily"
      },
      {
        title: "Digital Transformation in SMEs", 
        description: "How small and medium enterprises are adapting to digital technologies.",
        url: "#",
        publishedAt: new Date().toISOString(),
        source: "Tech Weekly"
      }
    ];
    res.json(demoNews);
  }
});

const PORT = process.env.PORT || 2003;

// Only start the server if this file is run directly
if (require.main === module) {
  server.listen(PORT, () =>
    console.log(`API server running on port ${PORT}`)
  );
}

// Export io for use in scripts, but don't start the server on import
export { io };
