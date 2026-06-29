import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import researchRouter from './routes/research.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.ALLOWED_ORIGIN || ''
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Cache-Control'],
  credentials: true,
}));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', researchRouter);

app.get('/api/test-tools', async (req, res) => {
  const { researchTools } = await import('./agent/tools.js');
  const results = {};
  
  try {
    const webSearch = researchTools.find(t => t.name === 'web_search');
    results.web_search = await webSearch.invoke({ query: 'Netflix company overview 2024' });
  } catch (e) { results.web_search_error = e.message; }
  
  try {
    const financials = researchTools.find(t => t.name === 'get_financial_summary');
    results.financials = await financials.invoke({ ticker: 'NFLX' });
  } catch (e) { results.financials_error = e.message; }
  
  res.json(results);
});

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const llm = process.env.GEMINI_API_KEY
    ? `Gemini ${process.env.GEMINI_MODEL || 'gemini-2.0-flash'} (Google)`
    : 'No GEMINI_API_KEY configured';

  res.json({
    status: 'ok',
    llm,
    search: process.env.TAVILY_API_KEY ? 'Tavily Live Search' : 'Static Database + Alpha Vantage',
    timestamp: new Date().toISOString(),
  });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const llm = process.env.GEMINI_API_KEY
    ? `🟢 Gemini ${process.env.GEMINI_MODEL || 'gemini-2.0-flash'} (Google)`
    : '🔴 No GEMINI_API_KEY — set it in server/.env';

  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     🚀 Investment Research Agent — Server Ready        ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  API   : http://localhost:${PORT}/api                    ║`);
  console.log(`║  LLM   : ${llm.padEnd(45)}║`);
  console.log(`║  Search: ${(process.env.TAVILY_API_KEY ? '🟢 Tavily Live Search' : '🟡 Static DB (add TAVILY_API_KEY)').padEnd(45)}║`);
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
});
