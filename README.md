# Business Outreach Platform

A modern business outreach platform that helps you find, manage, and reach out to businesses and their key people using AI-powered search and web scraping.

## Features

- **AI-Powered Business Search**: Find businesses by location, industry, and company size
- **Business Database**: Manage businesses with their associated people and contacts
- **Firecrawl Integration**: Extract emails, phones, and social media from business websites
- **Email & WhatsApp Outreach**: Send personalized outreach messages
- **Analytics Dashboard**: Track outreach performance and business growth
- **Modern UI**: Professional design inspired by Apollo.io and Hunter.io

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Environment variables configured

### Backend Setup (ai-outreach)

1. Navigate to the backend directory:
```bash
cd ai-outreach
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
NEWS_API_KEY=your_news_api_key
PORT=3000
```

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:3000`

### Frontend Setup (ai-outreach-ui)

1. Navigate to the frontend directory:
```bash
cd ai-outreach-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3001`

## API Endpoints

### Business Search
- `GET /search-businesses` - Search businesses by criteria
- `GET /business/:id` - Get detailed business information
- `POST /enrich-business` - Enrich business data with Firecrawl
- `POST /bulk-enrich` - Enrich multiple businesses

### Business Management
- `GET /prospects` - Get all businesses
- `POST /prospects` - Upload businesses CSV
- `DELETE /prospects` - Delete a business
- `PATCH /prospects` - Update business status

### Outreach
- `POST /bulk-outreach` - Send outreach to multiple businesses
- `POST /outreach` - Send outreach to all businesses
- `POST /outreach-single` - Send outreach to single business

### Analytics
- `GET /analytics` - Get outreach analytics and statistics

### Firecrawl
- `GET /firecrawl-status` - Check Firecrawl configuration

## Environment Variables

### Required
- `GEMINI_API_KEY` - Google Gemini AI API key for prospect generation
- `FIRECRAWL_API_KEY` - Firecrawl API key for web scraping

### Optional
- `NEWS_API_KEY` - News API key for business news (falls back to demo data)
- `PORT` - Backend server port (default: 3000)

## Usage

1. **Search for Businesses**: Use the search tab to find businesses by location, industry, or keywords
2. **Enrich Data**: Click "Enrich" on any business to extract contact information from their website
3. **Manage Database**: Add, edit, and organize businesses in the Businesses tab
4. **Add People**: Expand businesses to add and manage people associated with each business
5. **Send Outreach**: Use bulk outreach to send emails or WhatsApp messages
6. **Track Performance**: Monitor your outreach success in the Analytics tab

## Architecture

- **Frontend**: Next.js 14 with TypeScript, modern UI components
- **Backend**: Express.js with TypeScript, CSV-based data storage
- **AI**: Google Gemini for prospect generation and chat
- **Web Scraping**: Firecrawl for extracting business contact information
- **Styling**: Custom CSS with modern design system

## Development Notes

- The app now focuses on businesses with people attached to them (no separate people tab)
- API base is configured for localhost:3000 for development
- CORS is configured to allow localhost:3001 (frontend) to connect to localhost:3000 (backend)
- All business data is stored in CSV files for simplicity
- Firecrawl integration provides web scraping capabilities for contact extraction

## 🏗️ Architecture

```
├── ai-outreach/          # Backend API (Node.js + Express)
│   ├── src/api/         # API endpoints
│   ├── services/        # Business logic services
│   ├── scripts/         # Data processing scripts
│   └── uploads/         # File uploads
├── ai-outreach-ui/      # Frontend (Next.js + React)
│   ├── src/app/         # Main application
│   └── public/          # Static assets
└── docs/               # Documentation
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Places API key (optional)
- OpenCorporates API key (optional)
- Clearbit API key (optional)
- WhatsApp Business API credentials (optional)

### Backend Setup

```bash
cd ai-outreach

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure environment variables
# See .env.example for required variables

# Start development server
npm run start
```

### Frontend Setup

```bash
cd ai-outreach-ui

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure API base URL
NEXT_PUBLIC_API_BASE=http://localhost:3000

# Start development server
npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# AI Services
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Business APIs
GOOGLE_PLACES_API_KEY=your_google_places_key
OPENCORPORATES_API_KEY=your_opencorporates_key
CLEARBIT_API_KEY=your_clearbit_key

# Web Scraping
FIRECRAWL_API_KEY=your_firecrawl_api_key

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# Email Configuration
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# News API (optional)
NEWS_API_KEY=your_news_api_key
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_BASE=http://localhost:3000
```

## 📊 API Endpoints

### Business Search
- `GET /search-businesses` - Search businesses by criteria
- `GET /business/:id` - Get detailed business information
- `POST /generate-prospects` - Generate prospects using AI

### Contact Management
- `GET /prospects` - Get all businesses
- `POST /prospects` - Add/update businesses (CSV upload)
- `DELETE /prospects` - Delete business by email
- `GET /persons` - Get all people contacts
- `POST /persons` - Add/update people (CSV upload)
- `DELETE /persons` - Delete person by email

### Outreach
- `POST /bulk-outreach` - Send bulk outreach messages
- `POST /outreach` - Send email outreach
- `GET /results` - Get outreach results

### Business Enrichment (Firecrawl)
- `POST /enrich-business` - Enrich business data using Firecrawl
- `POST /bulk-enrich` - Enrich multiple businesses
- `GET /firecrawl-status` - Check Firecrawl configuration

### Analytics
- `GET /analytics` - Get outreach analytics

## 🎯 Usage Guide

### 1. Business Search

1. Navigate to the **Search** tab
2. Enter search criteria:
   - **Query**: Business name, industry, or keywords
   - **Location**: City, state, or country
   - **Industry**: Specific industry focus
   - **Company Size**: 1-10, 10-49, 50-249, 250+
3. Click **Search Businesses**
4. Review results and select businesses for outreach

### 2. Contact Management

#### Adding Contacts Manually
1. Go to **Businesses** or **People** tab
2. Click the **+** button
3. Fill in contact details
4. Click **Add**

#### Importing Contacts
1. Prepare a CSV file with columns:
   - For businesses: `name,email,phone,social,website,title,description,category`
   - For people: `name,email,phone,social`
2. Click **Import** button
3. Select your CSV file
4. Contacts will be automatically imported

### 3. Outreach Campaigns

#### Email Outreach
1. Select businesses/people from the list
2. Click **Bulk Email**
3. Emails will be sent automatically with AI-generated content

#### WhatsApp Outreach
1. Select contacts with phone numbers
2. Click **WhatsApp** (coming soon)
3. Messages will be sent via WhatsApp Business API

### 4. Analytics

1. Go to **Analytics** tab
2. View key metrics:
   - Total businesses and people
   - Outreach sent and response rates
   - Top industries and locations

## 🔌 API Integrations

### Business Data Providers

#### Google Places API
- **Cost**: Free tier available
- **Data**: Basic business info, contact details
- **Coverage**: Global
- **Best for**: Local business discovery

#### OpenCorporates API
- **Cost**: Free tier available
- **Data**: Company registrations, legal info
- **Coverage**: Worldwide
- **Best for**: Legal business data

#### Clearbit API
- **Cost**: Paid (comprehensive)
- **Data**: Company intelligence, contact info
- **Coverage**: Global
- **Best for**: B2B prospecting

### Messaging Platforms

#### Email (Gmail SMTP)
- **Cost**: Free
- **Features**: Automated sending, templates
- **Limits**: 500 emails/day (Gmail)

#### WhatsApp Business API
- **Cost**: Per message
- **Features**: Rich media, templates
- **Limits**: Rate limited by Meta

## 📈 Scaling Strategy

### MVP Phase (Current)
- ✅ Basic business search
- ✅ Contact management
- ✅ Email outreach
- ✅ Simple analytics

### Growth Phase
- 🔄 WhatsApp integration
- 🔄 Advanced business APIs
- 🔄 CRM integration
- 🔄 Advanced analytics

### Enterprise Phase
- 📋 Multi-user accounts
- 📋 Advanced automation
- 📋 API marketplace
- 📋 White-label solutions

## 🚀 Deployment

### Backend Deployment (Render)
```bash
# Connect your GitHub repo to Render
# Set environment variables in Render dashboard
# Deploy automatically on push to main branch
```

### Frontend Deployment (Vercel)
```bash
# Connect your GitHub repo to Vercel
# Set environment variables
# Deploy automatically
```

## 📝 Data Structure

### Business Record
```typescript
{
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  title?: string;
  description?: string;
  category?: string;
  companySize?: string;
  social?: string;
  reachedOut?: string;
}
```

### Person Record
```typescript
{
  name: string;
  email?: string;
  phone?: string;
  social?: string;
  reachedOut?: string;
}
```

## 🔒 Security & Compliance

- **Data Encryption**: All sensitive data encrypted at rest
- **API Security**: Rate limiting and authentication
- **GDPR Compliance**: Data deletion and export capabilities
- **Privacy**: No personal data stored without consent

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs or feature requests
- **Email**: support@yourdomain.com

## 🎯 Roadmap

### Q1 2024
- [ ] WhatsApp Business API integration
- [ ] Advanced business search filters
- [ ] Email template editor
- [ ] Basic analytics dashboard

### Q2 2024
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Advanced automation workflows
- [ ] Multi-user accounts
- [ ] API rate limiting

### Q3 2024
- [ ] White-label solution
- [ ] Advanced reporting
- [ ] Mobile app
- [ ] Enterprise features

---

**Built with ❤️ for business growth and outreach automation** 