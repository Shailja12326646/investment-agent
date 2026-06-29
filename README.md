# AI Investment Research Agent

> An autonomous AI agent that researches companies in real-time and delivers structured investment verdicts — powered by Google Gemini and live web data.

![Investment Agent Demo](./client/public/demo.png)

---

## Overview

The AI Investment Research Agent is a full-stack web application that acts as an automated financial analyst. You type a company name, and the agent:

1. **Searches the web** for recent company overview and news (via Tavily)
2. **Fetches financial metrics** — market cap, P/E ratio, revenue growth, profit margin, debt/equity
3. **Analyzes news sentiment** from financial media (Seeking Alpha, Bloomberg feeds)
4. **Maps the competitive landscape** — key rivals, market position
5. **Synthesizes everything** using Google Gemini to produce a structured investment verdict: **INVEST / WATCH / PASS**

All of this streams live to the UI via Server-Sent Events (SSE), so you watch each research step happen in real time.

---

## How to Run It

### Prerequisites
- Node.js 18+
- A **Google Gemini API key** — free at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- A **Tavily API key** — free at [app.tavily.com](https://app.tavily.com)

### Setup

```bash
# 1. Clone / unzip the project
cd investment-agent

# 2. Install root dependencies
npm install

# 3. Install server dependencies
cd server && npm install && cd ..

# 4. Install client dependencies
cd client && npm install && cd ..

# 5. Configure environment variables
cp server/.env.example server/.env
# Edit server/.env and add your keys (see below)
```

### Environment Variables (`server/.env`)

```env
PORT=3002

# Required: Google Gemini (free at aistudio.google.com)
GEMINI_API_KEY=AIzaSy_YOUR_KEY_HERE
GEMINI_MODEL=gemini-2.0-flash

# Required: Tavily web search (free at app.tavily.com)
TAVILY_API_KEY=tvly-YOUR_KEY_HERE

# Optional: Additional financial data
FINNHUB_API_KEY=your_key
ALPHA_VANTAGE_API_KEY=your_key
```

### Run Locally

```bash
# From the investment-agent/ root — starts both server (port 3002) and client (port 5173)
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                │
│  SearchBar → ResearchProgress (SSE stream) → VerdictCard│
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP POST /api/research
                        │ ← SSE stream (steps + result)
┌───────────────────────▼─────────────────────────────────┐
│              Express Backend (Node.js)                  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Two-Phase Research Pipeline            │   │
│  │                                                  │   │
│  │  Phase 1: Parallel Tool Calls (no LLM needed)   │   │
│  │  ├── web_search("company overview 2024")         │   │
│  │  ├── web_search("company stock ticker")          │   │
│  │  ├── get_financial_summary(ticker)               │   │
│  │  ├── get_news_sentiment(company)                 │   │
│  │  └── analyze_competitors(company)                │   │
│  │                                                  │   │
│  │  Phase 2: Gemini Synthesis (direct REST API)     │   │
│  │  └── gemini-2.0-flash → structured JSON verdict  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Key Components

| File | Purpose |
|------|---------|
| `server/agent/graph.js` | Core research pipeline — tool orchestration + Gemini synthesis |
| `server/agent/tools.js` | 4 research tools: web search, financials, news, competitors |
| `server/agent/prompts.js` | Synthesis prompt engineering |
| `server/routes/research.js` | SSE streaming endpoint |
| `client/src/App.jsx` | Main app with SSE event handling |
| `client/src/components/VerdictCard.jsx` | Investment report display |
| `client/src/components/ResearchProgress.jsx` | Live step-by-step progress |

### Data Flow

1. Client POSTs `{ company: "Apple" }` to `/api/research`
2. Server opens an SSE stream and starts the pipeline
3. **Phase 1**: 5 tool calls run in parallel (web search ×2, financials, news, competitors)
4. Each completed tool call emits a `step` SSE event → UI shows live progress
5. **Phase 2**: All gathered data is compiled into a structured prompt and sent to Gemini
6. Gemini returns a JSON verdict → server emits a `complete` SSE event
7. Client renders the full investment report with metrics, sections, and verdict badge

---

## Key Decisions & Trade-offs

### Decision 1: Two-Phase Pipeline over LangGraph ReAct Loop
**Chose**: Direct tool orchestration (Phase 1) + pure LLM synthesis (Phase 2)  
**Why**: The LangGraph ReAct loop with Gemini via the OpenAI compatibility layer produced persistent `400` errors due to schema incompatibilities (`additionalProperties`, `$schema` fields) that LangChain injects but Gemini rejects. The two-phase approach is more reliable, faster (parallel tool calls), and produces the same output quality.  
**Trade-off**: Less flexible than a true agent loop — can't do multi-step reasoning or adaptive tool calls based on previous results.

### Decision 2: Direct Gemini REST API over SDK
**Chose**: `fetch()` directly to `generativelanguage.googleapis.com/v1beta`  
**Why**: The OpenAI SDK + LangChain adds schema processing that breaks with Gemini's compatibility layer. Direct REST eliminates the middleware entirely.  
**Trade-off**: Loses streaming support for the synthesis step (though SSE still streams the tool call progress).

### Decision 3: Parallel Tool Execution
**Chose**: `Promise.allSettled()` for all 4 data sources simultaneously  
**Why**: Reduces research time from ~20s (sequential) to ~8s (parallel). `allSettled` ensures one slow/failing source doesn't block others.  
**Trade-off**: Can't use results of one tool to inform another tool (e.g., using the discovered ticker to search for news).

### Decision 4: SSE over WebSockets
**Chose**: Server-Sent Events for real-time progress  
**Why**: SSE is simpler (unidirectional, works over standard HTTP, no special server), perfectly suited for streaming agent steps to the client.  
**Trade-off**: Can't receive messages from client mid-stream.

### What was left out
- User authentication / history persistence
- Portfolio comparison (multiple companies side-by-side)
- PDF export of reports
- Caching layer (same company queried twice hits the APIs again)
- Streaming the final synthesis token-by-token (currently the full JSON arrives at once)

---

## Example Runs

### Apple Inc. (AAPL)

**Verdict: WATCH | Confidence: 7/10**

> Apple's 2024 revenue of $391B grew only 2% YoY as iPhone growth plateaued, but the Services segment (growing 13% YoY) and a $3.1T market cap reflect strong brand moat and ecosystem lock-in.

| Metric | Value |
|--------|-------|
| Market Cap | $3.1T |
| Revenue Growth | 2.0% YoY |
| Profit Margin | 26.3% |
| P/E Ratio | 32.1 |
| Debt/Equity | 1.40 |

**Bull Case**: Services revenue expanding to become a recurring, high-margin revenue stream diversifies away from hardware dependence; India market penetration represents a significant untapped growth vector.

**Bear Case**: iPhone revenue plateau, rising competition from Chinese OEMs in Asia, and a P/E of 32× demanding perfect execution leave limited margin of safety at current prices.

---

### Alphabet / Google (GOOGL)

**Verdict: INVEST | Confidence: 8/10**

> Alphabet generated $350B in 2024 revenue (+13.9% YoY), with Google Cloud growing 28% and a remarkably low debt/equity of 0.06, making it one of the most financially sound mega-cap tech companies.

| Metric | Value |
|--------|-------|
| Market Cap | $2.1T |
| Revenue Growth | 13.9% YoY |
| Profit Margin | 24.0% |
| P/E Ratio | 23.5 |
| Debt/Equity | 0.06 |

**Bull Case**: Google Cloud achieving profitability while growing 28% YoY, combined with AI integration across Search and Workspace, positions Alphabet for sustained double-digit growth at a reasonable 23.5× P/E.

**Bear Case**: DOJ antitrust ruling requiring Chrome/Android divestiture, and AI-powered search alternatives (Perplexity, ChatGPT Search) threatening Google's core advertising moat.

---

### Netflix (NFLX)

**Verdict: WATCH | Confidence: 6/10**

> Netflix grew revenue 15.65% to $39B in 2024, has successfully monetized password sharing, and is expanding into live sports — but faces a P/E of 44.7× and intensifying competition from Disney+, HBO Max, and Amazon Prime.

| Metric | Value |
|--------|-------|
| Market Cap | $320B |
| Revenue Growth | 15.0% YoY |
| Profit Margin | 15.0% |
| P/E Ratio | 44.7 |
| Debt/Equity | 0.70 |

**Bull Case**: Ad-supported tier monetization still in early innings; live sports (NFL games) expanding TAM; gaming content library differentiating from pure-play streamers.

**Bear Case**: P/E of 44.7× prices in perfect execution; content spending arms race with well-funded rivals; recent 7-session losing streak signals near-term sentiment risk.

---

## What I Would Improve With More Time

1. **Streaming synthesis output** — Stream Gemini's JSON token-by-token so the verdict card builds live rather than appearing all at once
2. **Adaptive multi-turn research** — Let Gemini decide which tools to call based on what was found (true ReAct loop), rather than always calling all 4 tools
3. **Financial data accuracy** — Replace the curated database with real-time API calls to Polygon.io or Yahoo Finance for live price/metric data
4. **Report caching** — Redis cache with 6-hour TTL per company to avoid repeated API calls
5. **Comparison mode** — Research 2-3 companies side-by-side in a single view
6. **PDF export** — Export the full investment report as a formatted PDF
7. **Watchlist** — Save verdicts locally and alert when sentiment changes significantly

---

## Deployment

### Railway (Backend)

1. Create a new Railway project
2. Connect your GitHub repo
3. Set root directory to `server/`
4. Add environment variables in Railway dashboard:
   - `GEMINI_API_KEY`
   - `TAVILY_API_KEY`
   - `ALLOWED_ORIGIN` (your Vercel/frontend URL)
5. Railway auto-detects Node.js and runs `node index.js`

### Vercel (Frontend)

1. Connect repo to Vercel
2. Set root directory to `client/`
3. Add env variable: `VITE_API_URL=https://your-railway-app.railway.app`
4. Deploy

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Vanilla CSS |
| Backend | Node.js, Express |
| LLM | Google Gemini 2.0 Flash (direct REST API) |
| Web Search | Tavily Search API |
| Financial Data | Finnhub, Alpha Vantage, curated database |
| Streaming | Server-Sent Events (SSE) |
| Deployment | Railway (backend) + Vercel (frontend) |
