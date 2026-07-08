# GrowEasy AI-Powered CRM CSV Importer

An intelligent, high-fidelity AI-powered CSV Importer that parses arbitrary spreadsheet layouts and maps them to the GrowEasy CRM schema using Google Gemini.

Designed with a premium glassmorphic theme (Slate/Obsidian UI), smooth animations, robust batch mapping, retry mechanisms, and a responsive scrollable preview.

## 🚀 Key Features

- **Any-Format CSV Parsing**: Upload CSVs from Facebook Ads, Google Ads, Real Estate CRMs, or manual spreadsheets. The AI dynamically maps columns (like `client`, `customer`, `first_name` -> `name`).
- **High-Fidelity Preview Table**: Inspect parsed records in a beautiful responsive table with sticky headers, horizontal/vertical scrollbars, search queries, and optimized pagination.
- **Resilient AI Batch Processing**: Sequences API calls in batches of 15 records using **exponential backoff retry mechanisms** (up to 3 attempts) to avoid rate limits and survive network drops.
- **Double-Safety Validation Filters**: programmatically checks status constraints, parses dates using JS rules, and automatically flags/filters invalid leads lacking both emails and mobile numbers.
- **Executive Obsidian Design**: Dark and Light theme triggers with high-quality radial gradients, customized scrolling thumbs, and modern SaaS typography (**Plus Jakarta Sans** headings + **Inter** copy).
- **Settings API Key Configuration**: Provide custom Gemini API Keys in the UI Settings modal (secured in browser `localStorage`), allowing instant end-to-end test execution on any deployment.
- **One-Click CRM CSV Export**: Export mapped CRM leads back to the GrowEasy CRM canonical format with a single click.
- **Fully Containerized (Docker)**: Set up and run the entire ecosystem (Next.js + Express) with one command.

---

## 📂 Project Directory Structure

```
groweasy-csv-importer/
├── backend/
│   ├── utils/
│   │   ├── ai.js           # Gemini API structured mapping schemas & fallback filters
│   │   └── csv.js          # Byte-order-mark stripping CSV parser stream
│   ├── Dockerfile          # Alpine-based Node.js Docker runner
│   ├── server.js           # Express routers (upload, batch processing)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css  # CSS custom properties, HSL color tokens, dark theme
│   │   │   ├── layout.tsx   # Google Font loading & SEO configurations
│   │   │   ├── page.tsx     # State machine for uploads, batch loops & backoff logic
│   │   │   └── page.module.css
│   │   └── components/
│   │       ├── ApiKeyModal.tsx   # Browser settings modal for custom Gemini keys
│   │       ├── FileUpload.tsx    # Drag-and-drop picker with network error handlers
│   │       ├── CsvPreviewTable.tsx # Paginated horizontal scroll list
│   │       └── CrmResultTable.tsx  # Metric statistics, tab togglers & exporter
│   ├── Dockerfile
│   └── package.json
├── test-csvs/              # Standard and messy mock datasets
├── docker-compose.yml      # Service orchestration config
└── README.md
```

---

## 🛠️ Local Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [npm](https://www.npmjs.com/)

### 1. Run with Docker (Recommended)
You can start the entire stack instantly using Docker Compose:
```bash
# Set your Gemini API key (Optional if you configure it in the UI settings later)
export GEMINI_API_KEY="your_api_key_here"

# Boot up the containers
docker-compose up --build
```
The frontend will be available at **`http://localhost:3000`** and the backend at **`http://localhost:5000`**.

---

### 2. Manual Local Setup

#### Step A: Configure & Start the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables file and configure your API key:
   ```bash
   cp .env.example .env
   # Add your key to .env: GEMINI_API_KEY=AIzaSy...
   ```
4. Start the Express server:
   ```bash
   npm start
   ```
   The backend will launch on port `5000`.

#### Step B: Configure & Start the Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the Next.js development server:
   ```bash
   npm run dev
   ```
   The application dashboard will be live on **`http://localhost:3000`**.

---

## 🧠 AI Prompt Engineering & Rules

The system sends CSV records to the model using a strict system instruction set and a custom `responseSchema` mapping format.

### Target Schema Definition
- `created_at`: Valid JS parsable date. Defaults to current date if missing.
- `name`: Merged customer/lead names.
- `email` & `mobile`: Primary contact. Multiple values are parsed: the first matches the primary field, and any remainder is appended to `crm_note`.
- `crm_status`: Categorized strictly into `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, or `SALE_DONE`.
- `data_source`: Categorized strictly into `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`.
- **Skip Constraint**: If a row has neither an email nor phone, `is_skipped` is set to `true`, avoiding database pollution.

---

## 📝 Submission Guidelines
- **Applied Position**: Software Developer Intern / Full-Time
- **Hosted application URL**: [Insert hosted URL]
- **GitHub repository URL**: [Insert repository URL]
- **Email to**: `varun@groweasy.ai`
