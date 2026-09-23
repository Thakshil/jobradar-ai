# JobRadar AI

JobRadar AI is an AI-powered job discovery and matching platform that analyzes a candidate's resume, extracts relevant technical and professional skills, and matches and ranks live job opportunities from multiple career portals based on skill alignment.

---

## 🚀 Features

- **Resume Upload & Parsing**: Supports `.pdf` and `.docx` formats, extracting text, contact information, and candidate experience using `pdfplumber` and `python-docx`.
- **Skill Extraction**: Automatically matches candidate resume text against an indexed dictionary of technical domains, programming languages, frameworks, cloud tooling, and soft skills.
- **Multi-Portal Job Aggregation**: Concurrently queries multiple job boards to gather live opportunities:
  - **Adzuna**: Live job search across global and regional markets (requires App ID & App Key).
  - **Remotive**: Live remote developer and tech listings queried by skill keywords.
  - **Jobicy**: Live remote opportunities filtered by skill tags.
- **Skill-Based Match Scoring & Ranking**: Computes an alignment score (percentage match) comparing candidate skills against job descriptions, identifies matched competencies, highlights missing skill gaps, and ranks opportunities dynamically.
- **Job Search & Filtering**: Interactive filtering by location (e.g., India, USA, UK, Canada, Australia), remote-only roles, and specific job portals with pagination support.
- **In-Memory Result Caching**: Built-in 6-hour LRU-style result cache (`_cache`, up to 200 entries) keyed by MD5 hashes of query parameters to optimize response times and respect external API rate limits.
- **Excel Report Export**: One-click export of matched job listings and extracted skills into styled `.xlsx` spreadsheets using `openpyxl`.

---

## 🧠 How It Works

```
Candidate Resume (.pdf / .docx)
               ↓
Text Extraction (pdfplumber / python-docx)
               ↓
Skill & Experience Extraction (Curated Skills Taxonomy)
               ↓
Concurrent Job Board Querying (Adzuna · Remotive · Jobicy via HTTPX)
               ↓
Skill Matching & Gap Analysis (Score calculation & missing skills detection)
               ↓
Dynamic Ranking & Interactive Dashboard (+ Excel Export via openpyxl)
```

1. **Upload**: The user uploads their resume through the web interface.
2. **Analysis**: The backend extracts clean text and identifies matching skills and potential job titles.
3. **Search & Aggregate**: The engine performs concurrent searches across connected job APIs.
4. **Scoring**: Each listing is scored based on the candidate's skill set, computing both matched skills and skill gaps.
5. **Presentation**: Results are delivered ranked by match percentage to the dashboard, with export capabilities.

---

## 🏗️ Architecture

JobRadar AI is built with a decoupled client-server architecture:

- **Frontend Client**: A Single Page Application (SPA) built with React 18 and Vite, styled using Tailwind CSS and custom glassmorphism components. It manages user state (session ID, extracted resume data) and communicates with the backend via Axios.
- **Backend API**: A high-performance asynchronous API built with FastAPI and Uvicorn. It handles multi-part file uploads, orchestrates concurrent asynchronous HTTP requests to external job boards via `httpx`, maintains in-memory session states, and serves streaming Excel file downloads.
- **External Services**: REST integrations with external job board APIs (Adzuna, Remotive, Jobicy).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3, PostCSS, Autoprefixer
- **HTTP Client**: Axios
- **Routing**: React Router DOM 6

### Backend
- **Framework**: FastAPI (v0.111.0)
- **ASGI Server**: Uvicorn (v0.29.0)
- **Async HTTP**: HTTPX (v0.27.0)
- **Document Parsing**: `pdfplumber` (PDF), `python-docx` (DOCX)
- **Spreadsheet Generation**: `openpyxl` (v3.1.2)
- **Environment Management**: `python-dotenv`

### APIs & Data Sources
- **Adzuna API**: Global job search API
- **Remotive API**: Remote tech jobs API
- **Jobicy API**: Remote job feed API

### State & Caching
- **Session Store**: In-memory dictionary (`sessions = {}` in `main.py`)
- **Query Caching**: In-memory MD5-hashed LRU cache with 6-hour TTL

### Testing & Performance
- **Load Testing**: Locust (v2.46.6)

### Deployment Configurations
- **Frontend Hosting**: Vercel (`vercel.json`)
- **Backend Hosting**: Railway (`railway.json`, `Procfile`) / Render

---

## ⚡ Performance

The JobRadar AI backend was evaluated under simulated concurrent user traffic on localhost using Locust.

### 100-User Load Test

| Metric | Measured Value |
|---|---|
| **Test Environment** | Localhost (`127.0.0.1:8000`) |
| **Concurrent Users** | 100 concurrent simulated users |
| **Spawn Rate** | 10 users/sec |
| **Duration** | 120 seconds |
| **Total Requests** | 5,610 |
| **Observed Throughput** | ~48 req/s during the test |
| **Average Response Time** | 91 ms |
| **Median Latency (P50)** | 28 ms |
| **95th Percentile Latency (P95)** | 390 ms |
| **99th Percentile Latency (P99)** | 900 ms |
| **Maximum Latency** | 2,071 ms |
| **Failed Requests** | 0 |
| **Failure Rate** | 0.00% |

> [!NOTE]
> Performance results were measured locally using Locust with simulated concurrent users. These results represent observed benchmark performance in the test environment and should not be interpreted as a production capacity guarantee.

---

## 📊 Load Testing

The FastAPI backend includes a reproducible Locust load-testing suite modeling realistic user behavior across all core endpoints:
- `GET /` — Liveness & health check (10% traffic weight)
- `POST /api/resume/upload` — Resume document upload & parsing (20% traffic weight)
- `GET /api/jobs/search` — Aggregated job search, scoring & ranking (55% traffic weight)
- `GET /api/jobs/export` — Formatted Excel export generation (15% traffic weight)

For full setup instructions, test profiles (10-user baseline, 50-user normal, 100-user target, 200-user stress), metrics explanations, and step-by-step reproduction commands, see the detailed documentation:

👉 **[Load Testing Documentation](backend/tests/load/README.md)**

---

## 📸 Screenshots / Demo

The application interface consists of:
- **Resume Upload Portal**: Drag-and-drop interface supporting PDF and DOCX files with upload progress indicators.
- **Match Dashboard**: Interactive dashboard displaying extracted skills, summary metrics (total jobs, high matches, average score, portal counts), location/remote filters, match breakdown chips, and Excel export.

Live web access is available via the deployment links below.

---

## ⚙️ Installation & Local Setup

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ and npm
- (Optional) Adzuna API credentials for full search access

### 1. Clone the Repository
```bash
git clone https://github.com/Thakshil/jobradar-ai.git
cd jobradar-ai
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# On Windows:
.\venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Create a `.env` file in the `backend/` directory (see `backend/.env.example`):
```env
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
```
*(Note: If Adzuna credentials are not provided, JobRadar will still retrieve jobs from Remotive and Jobicy.)*

### 4. Start the Backend Server
```bash
# From the backend/ directory
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will be available at `http://127.0.0.1:8000`.

### 5. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# (Optional) Point to local backend if not default
# Create frontend/.env with:
# VITE_API_URL=http://127.0.0.1:8000

# Start frontend development server
npm run dev
```
The frontend interface will be accessible at `http://localhost:5173`.

---

## 📁 Project Structure

```
jobradar-ai/
├── README.md                         # Main project documentation
├── .gitignore                        # Git ignore patterns
├── backend/
│   ├── main.py                       # FastAPI application & API endpoints
│   ├── job_search.py                 # Multi-portal job search & scoring engine
│   ├── resume_parser.py              # Resume extraction (PDF/DOCX) & skill matching
│   ├── excel_export.py               # Excel export generator (openpyxl)
│   ├── requirements.txt              # Backend Python dependencies
│   ├── .env.example                  # Example environment variables
│   ├── Procfile                      # Deployment process config
│   ├── railway.json                  # Railway deployment configuration
│   └── tests/
│       └── load/
│           ├── README.md             # Detailed Locust load-testing documentation
│           ├── locustfile.py         # Locust performance test suite
│           └── run_load_test.ps1     # PowerShell load test runner
└── frontend/
    ├── index.html                    # Single-page application HTML entry
    ├── package.json                  # Frontend dependencies and npm scripts
    ├── vite.config.js                # Vite build configuration
    ├── tailwind.config.js            # Tailwind CSS configuration
    ├── postcss.config.js             # PostCSS configuration
    ├── vercel.json                   # Vercel deployment configuration
    └── src/
        ├── App.jsx                   # Application routing
        ├── main.jsx                  # React application entry point
        ├── index.css                 # Global styles & Tailwind directives
        └── pages/
            ├── Upload.jsx            # Resume upload page
            └── Dashboard.jsx         # Job matching dashboard page
```

---

## 🔗 Links

- **Frontend Deployment**: [https://thaksjobradar.vercel.app/](https://thaksjobradar.vercel.app/)
- **Backend API Deployment**: [https://jobradar-ai.onrender.com](https://jobradar-ai.onrender.com)
- **GitHub Repository**: [https://github.com/Thakshil/jobradar-ai](https://github.com/Thakshil/jobradar-ai)

---

## 📄 License

This repository does not currently include an open-source license file. All rights are reserved by the repository owner.
