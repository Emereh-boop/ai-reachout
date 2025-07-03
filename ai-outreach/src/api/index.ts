import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { enrichProspects } from '../../scripts/importProspects';
import { runOutreach } from '../../scripts/runOutreach';
import { generateProspectsWithAI, enrichProspects as enrichProspectsFromScript, appendToCSV } from '../../scripts/generateProspects';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
app.use(cors({ 
  origin: '*',
  credentials: true 
}));
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// Create HTTP server and attach socket.io
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3000", "https://ai-reachout-ui.onrender.com"],
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true
  }
});

app.get('/', (req, res) => res.send('Unified API is running'));

// GET /prospects - return all prospects from prospects.csv
app.get('/prospects', (req, res) => {
  if (!fs.existsSync('scripts/prospects.csv')) return res.json([]);
  const prospects: any[] = [];
  fs.createReadStream('scripts/prospects.csv')
    .pipe(parse({ columns: true, trim: true }))
    .on('data', row => prospects.push(row))
    .on('end', () => res.json(prospects))
    .on('error', err => res.status(500).json({ error: String(err) }));
});

// POST /prospects - upload a new prospects.csv
app.post('/prospects', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  fs.renameSync(req.file.path, 'scripts/prospects.csv');
  res.json({ status: 'ok' });
});

// POST /enrich - run enrichment
app.post('/enrich', async (req, res) => {
  try {
    await enrichProspects();
    res.json({ status: 'enriched' });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /outreach - run outreach
app.post('/outreach', async (req, res) => {
  try {
    await runOutreach();
    res.json({ status: 'outreach complete' });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /generate-prospects - chat-based prospect generation
app.post('/generate-prospects', async (req, res) => {
  try {
    const { location, industry, companySize, intent, additional } = req.body;
    
    const criteria = {
      location: location || 'Nigeria',
      industry: industry || 'Technology',
      companySize: companySize || '1-10',
      intent: intent || 'optimization',
      additional: additional || 'None'
    };
    
    const prospects = await generateProspectsWithAI(criteria);
    
    if (prospects.length > 0) {
      // Enrich prospects with website data
      const enrichedProspects = await enrichProspectsFromScript(prospects);
      
      // Append to CSV file
      await appendToCSV(enrichedProspects);
      
      res.json({ 
        status: 'success', 
        prospects: enrichedProspects,
        message: `Generated and saved ${enrichedProspects.length} prospects`
      });
    } else {
      res.json({ 
        status: 'no-prospects', 
        message: 'No prospects generated. Please try different criteria.'
      });
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /results - return all results from results.csv
app.get('/results', (req, res) => {
  if (!fs.existsSync('results.csv')) return res.json([]);
  const results: any[] = [];
  fs.createReadStream('results.csv')
    .pipe(parse({ columns: true, trim: true }))
    .on('data', row => results.push(row))
    .on('end', () => res.json(results))
    .on('error', err => res.status(500).json({ error: String(err) }));
});

// Add confirmation endpoint
app.get('/api/confirm-interest', (req, res) => {
  const { email, token } = req.query;
  if (!email || !token) {
    return res.status(400).send('<h2>Invalid confirmation link.</h2>');
  }
  if (!fs.existsSync('results.csv')) {
    return res.status(404).send('<h2>No outreach results found.</h2>');
  }
  const results: any[] = [];
  fs.createReadStream('results.csv')
    .pipe(parse({ columns: true, trim: true }))
    .on('data', row => results.push(row))
    .on('end', () => {
      const idx = results.findIndex(r => r.email === email);
      if (idx === -1) {
        return res.status(404).send('<h2>Prospect not found.</h2>');
      }
      if (results[idx].confirmed === 'true') {
        return res.send('<h2>Thank you! Your interest has already been confirmed. We will be in touch soon.</h2>');
      }
      if (results[idx].token !== token) {
        return res.status(400).send('<h2>Invalid or expired confirmation link.</h2>');
      }
      results[idx].confirmed = 'true';
      // Write back to results.csv
      stringify(results, { header: true, quoted: true, quoted_empty: true }, (err: any, output: any) => {
        if (err) {
          return res.status(500).send('<h2>Failed to update confirmation. Please try again later.</h2>');
        }
        fs.writeFileSync('results.csv', output);
        res.send('<h2>Thank you for confirming your interest! We will contact you to schedule a meeting or chat.</h2>');
      });
    })
    .on('error', (err: any) => {
      res.status(500).send('<h2>Failed to process confirmation. Please try again later.</h2>');
    });
});

// DELETE /prospects - remove a prospect by email
app.delete('/prospects', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!fs.existsSync('scripts/prospects.csv')) return res.status(404).json({ error: 'No prospects file found' });
  const prospects: any[] = [];
  fs.createReadStream('scripts/prospects.csv')
    .pipe(parse({ columns: true, trim: true }))
    .on('data', row => prospects.push(row))
    .on('end', () => {
      const filtered = prospects.filter(p => p.email !== email);
      stringify(filtered, { header: true, quoted: true, quoted_empty: true }, (err, output) => {
        if (err) return res.status(500).json({ error: String(err) });
        fs.writeFileSync('scripts/prospects.csv', output);
        res.json({ status: 'removed', prospects: filtered });
      });
    })
    .on('error', err => res.status(500).json({ error: String(err) }));
});

// PATCH /prospects - update a prospect's reachedOut/closed status by email
app.patch('/prospects', (req, res) => {
  const { email, reachedOut } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (typeof reachedOut === 'undefined') return res.status(400).json({ error: 'reachedOut is required' });
  if (!fs.existsSync('scripts/prospects.csv')) return res.status(404).json({ error: 'No prospects file found' });
  const prospects: any[] = [];
  fs.createReadStream('scripts/prospects.csv')
    .pipe(parse({ columns: true, trim: true }))
    .on('data', row => prospects.push(row))
    .on('end', () => {
      const idx = prospects.findIndex(p => p.email === email);
      if (idx === -1) return res.status(404).json({ error: 'Prospect not found' });
      prospects[idx].reachedOut = String(reachedOut);
      stringify(prospects, { header: true, quoted: true, quoted_empty: true }, (err, output) => {
        if (err) return res.status(500).json({ error: String(err) });
        fs.writeFileSync('scripts/prospects.csv', output);
        res.json({ status: 'updated', prospects });
      });
    })
    .on('error', err => res.status(500).json({ error: String(err) }));
});

// WebSocket test endpoint
app.get('/ws-test', (req, res) => {
  res.send('WebSocket server is running.');
});

// GET /persons - return all persons from persons.csv
app.get('/persons', (req, res) => {
  if (!fs.existsSync('scripts/persons.csv')) return res.json([]);
  const persons: any[] = [];
  fs.createReadStream('scripts/persons.csv')
    .pipe(parse({ columns: true, trim: true }))
    .on('data', row => persons.push(row))
    .on('end', () => res.json(persons))
    .on('error', err => res.status(500).json({ error: String(err) }));
});

// POST /persons - upload a new persons.csv
app.post('/persons', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  fs.renameSync(req.file.path, 'scripts/persons.csv');
  res.json({ status: 'ok' });
});

// DELETE /persons - remove a person by email
app.delete('/persons', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!fs.existsSync('scripts/persons.csv')) return res.status(404).json({ error: 'No persons file found' });
  const persons: any[] = [];
  fs.createReadStream('scripts/persons.csv')
    .pipe(parse({ columns: true, trim: true }))
    .on('data', row => persons.push(row))
    .on('end', () => {
      const filtered = persons.filter(p => p.email !== email);
      stringify(filtered, { header: true, quoted: true, quoted_empty: true }, (err, output) => {
        if (err) return res.status(500).json({ error: String(err) });
        fs.writeFileSync('scripts/persons.csv', output);
        res.json({ status: 'removed', persons: filtered });
      });
    })
    .on('error', err => res.status(500).json({ error: String(err) }));
});

// PATCH /persons - update a person's reachedOut/closed status by email
app.patch('/persons', (req, res) => {
  const { email, reachedOut } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (typeof reachedOut === 'undefined') return res.status(400).json({ error: 'reachedOut is required' });
  if (!fs.existsSync('scripts/persons.csv')) return res.status(404).json({ error: 'No persons file found' });
  const persons: any[] = [];
  fs.createReadStream('scripts/persons.csv')
    .pipe(parse({ columns: true, trim: true }))
    .on('data', row => persons.push(row))
    .on('end', () => {
      const idx = persons.findIndex(p => p.email === email);
      if (idx === -1) return res.status(404).json({ error: 'Person not found' });
      persons[idx].reachedOut = String(reachedOut);
      stringify(persons, { header: true, quoted: true, quoted_empty: true }, (err, output) => {
        if (err) return res.status(500).json({ error: String(err) });
        fs.writeFileSync('scripts/persons.csv', output);
        res.json({ status: 'updated', persons });
      });
    })
    .on('error', err => res.status(500).json({ error: String(err) }));
});

// POST /chat - freeform AI chat (placeholder response for now)
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  // TODO: Replace with real AI logic
  res.json({ reply: `Echo: ${message}` });
});

const PORT = process.env.PORT || 2003;

// Only start the server if this file is run directly
if (require.main === module) {
  server.listen(PORT, () => console.log(`API server (with WebSocket) running on port ${PORT}`));
}

// Export io for use in scripts, but don't start the server on import
export { io }; 