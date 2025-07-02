# AI Outreach System

## Install
```bash
npm install
```

## Setup Environment
Copy `.env.example` to `.env` and fill in your credentials:
- GMAIL_USER
- GMAIL_PASS
- GEMINI_API_KEY (Get a free key from [Google AI Studio](https://makersuite.google.com/app/apikey))

## How to Run

### Daily Prospect Generation (All-in-One)
```bash
npm run chat         # Interactive chat to generate, enrich, and save prospects
npm run daily        # Same as chat (alternative command)
```

### Simplified Workflow
```bash
npm run chat         # Generate, enrich, and save prospects to CSV
npm run out          # Send outreach emails
```

### Individual Steps (Legacy)
```bash
npm run gen:prospects # Generate prospects only (non-interactive)
npm run out          # Send outreach emails
```

## Where Results Are Stored
- `scripts/prospects.csv`: Prospect data with contact information
- `results.csv`: Email send results 