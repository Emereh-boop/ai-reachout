# AI-Powered Outreach System – Project Context

You are inside a project that automates personalized cold-email outreach to local businesses using free-tier tools. The goal is to send 20 customized emails per day by tomorrow.

---

## ✅ System Modules

1. **Prospect Import & Enrichment**
   - Reads `prospects.csv` with `name,email,website`
   - Fetches homepage title and meta description via HTTP
   - Writes `enrichedProspects.csv`

2. **Email Composer**
   - Uses OpenAI GPT-4 Turbo to generate 3-sentence emails
   - Tailors each email with the prospect’s title and description

3. **Email Sender**
   - Uses Nodemailer with Gmail SMTP (free)
   - Sends emails and returns status

4. **Outreach Script**
   - Runs import → compose → send for the first 20 prospects
   - Logs results to `results.csv`

5. **Environment & Execution**
   - Zero-cost: free-tier or built-in tools only
   - Must run end-to-end by tomorrow

---

## 📁 Expected Structure

/ai-outrich
├── /scripts
│   ├── importProspects.ts
│   └── runOutreach.ts
├── /services
│   ├── emailComposer.ts
│   └── emailSender.ts
├── prospects.csv
├── enrichedProspects.csv
├── results.csv
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── agent.yaml
└── PROJECT_CONTEXT.md



---

## 📜 Constraints

- No paid APIs (use Gmail SMTP, OpenAI free credits)  
- Must finish scaffolding today  
- Scripts must run with `npm run import` and `npm run outreach`  
- Document everything in `README.md` 

---

## 🧾 Workflow Commands

- `npm run import` → generates `enrichedProspects.csv`
- `npm run outreach` → sends first 20 emails and logs to `results.csv`