import { researchTools } from './tools.js';
import dotenv from 'dotenv';
dotenv.config();

// ─── JSON Extraction Helper ────────────────────────────────────────────────────
function extractJSON(text) {
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in LLM response. Raw (first 500 chars): ' + cleaned.slice(0, 500));
  }
  cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}

// ─── Error Response (no mock data ever) ───────────────────────────────────────
export function handleAgentError(companyName, error) {
  return {
    company: companyName,
    ticker: 'N/A',
    verdict: 'PASS',
    confidence: 1,
    one_liner: `Research failed: ${error.message}`,
    sections: {
      business_overview: 'Research could not be completed. Please try again.',
      financial_health: 'Data unavailable.',
      competitive_position: 'Data unavailable.',
      recent_news: 'Data unavailable.',
      risks: 'Research failed — see error above.',
      bull_case: 'N/A',
      bear_case: 'N/A'
    },
    key_metrics: { revenue_growth: 'N/A', profit_margin: 'N/A', pe_ratio: 'N/A', market_cap: 'N/A', debt_to_equity: 'N/A' },
    sources: []
  };
}

// ─── Direct Gemini REST call (no SDK, no OpenAI compat layer) ─────────────────
async function callGemini(prompt, retries = 3) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set in server/.env');

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 4096 }
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[Gemini] Attempt ${attempt}/${retries} — model: ${model}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (res.status === 429) {
      const waitMs = attempt * 15000; // 15s, 30s, 45s
      console.log(`[Gemini] Rate limit (429) — waiting ${waitMs / 1000}s before retry...`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '(no body)');
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Gemini returned an empty response');

    console.log(`[Gemini] ✅ Success on attempt ${attempt}`);
    return text;
  }

  throw new Error('Gemini rate limit exceeded after all retries. Please wait a minute and try again.');
}

// ─── Phase 1: Gather research data via tools directly ─────────────────────────
async function gatherResearchData(companyName, onStep) {
  const webSearch    = researchTools.find(t => t.name === 'web_search');
  const financials   = researchTools.find(t => t.name === 'get_financial_summary');
  const news         = researchTools.find(t => t.name === 'get_news_sentiment');
  const competitors  = researchTools.find(t => t.name === 'analyze_competitors');

  onStep({ type: 'step', message: `🔍 Searching web for ${companyName} overview...` });

  const [overviewRes, tickerRes, newsRes, competitorsRes] = await Promise.allSettled([
    webSearch.invoke({ query: `${companyName} company overview business model revenue 2024` }),
    webSearch.invoke({ query: `${companyName} stock ticker symbol NASDAQ NYSE exchange` }),
    news.invoke({ company: companyName }),
    competitors.invoke({ company: companyName }),
  ]);

  // Extract likely ticker from search results
  const tickerText = tickerRes.status === 'fulfilled' ? String(tickerRes.value) : '';
  const tickerMatches = tickerText.match(/\b([A-Z]{2,5})\b/g) || [];
  const excluded = new Set(['NYSE', 'NASDAQ', 'CEO', 'IPO', 'ETF', 'SEC', 'USA', 'AND', 'FOR', 'THE', 'INC', 'LLC', 'US', 'AI']);
  const likelyTicker = tickerMatches.find(t => !excluded.has(t)) || companyName.slice(0, 4).toUpperCase();

  onStep({ type: 'step', message: `📊 Fetching financial metrics (${likelyTicker})...` });
  const financialsRes = await financials.invoke({ ticker: likelyTicker }).catch(e => `Unavailable: ${e.message}`);

  onStep({ type: 'step', message: `📰 Analyzing news sentiment...` });
  onStep({ type: 'step', message: `🏆 Mapping competitive landscape...` });

  const overviewText    = overviewRes.status === 'fulfilled' ? String(overviewRes.value) : 'Unavailable';
  const financialsText  = typeof financialsRes === 'string' ? financialsRes : JSON.stringify(financialsRes, null, 2);
  const newsText        = newsRes.status === 'fulfilled' ? String(newsRes.value) : 'Unavailable';
  const competitorsText = competitorsRes.status === 'fulfilled' ? String(competitorsRes.value) : 'Unavailable';

  console.log('[Gather] Overview:', overviewText.slice(0, 150));
  console.log('[Gather] Ticker:', tickerText.slice(0, 80), '→ likely:', likelyTicker);
  console.log('[Gather] Financials:', financialsText.slice(0, 200));
  console.log('[Gather] News:', newsText.slice(0, 100));

  return { overview: overviewText, tickerInfo: tickerText, likelyTicker, financials: financialsText, news: newsText, competitors: competitorsText };
}

// ─── Phase 2: Synthesis via Gemini REST ───────────────────────────────────────
async function synthesizeReport(companyName, data, onStep) {
  onStep({ type: 'step', message: '🤖 Gemini synthesizing investment verdict...' });

  const prompt = `You are a top-tier investment analyst. Below is real research data gathered about "${companyName}". Produce a professional investment analysis.

=== REAL RESEARCH DATA ===

COMPANY: ${companyName}
LIKELY TICKER: ${data.likelyTicker}

WEB OVERVIEW:
${data.overview.slice(0, 2000)}

TICKER/STOCK INFO:
${data.tickerInfo.slice(0, 1000)}

FINANCIAL DATA:
${data.financials.slice(0, 1500)}

NEWS SENTIMENT:
${data.news.slice(0, 1500)}

COMPETITOR ANALYSIS:
${data.competitors.slice(0, 1000)}

=== OUTPUT INSTRUCTIONS ===
Output ONLY a raw JSON object — no markdown, no backticks, no explanation. Start with { and end with }.

{
  "company": "Official full company name",
  "ticker": "Correct stock ticker (from data above)",
  "verdict": "INVEST or PASS or WATCH",
  "confidence": <1-10>,
  "one_liner": "One specific sentence verdict using real facts from the research",
  "sections": {
    "business_overview": "2-3 sentences with specific facts from overview data",
    "financial_health": "2-3 sentences citing specific numbers from financial data",
    "competitive_position": "2-3 sentences citing specific competitors from competitor data",
    "recent_news": "2-3 sentences citing specific news items",
    "risks": "2-3 specific risk factors from the data"
  },
  "key_metrics": {
    "revenue_growth": "X% YoY",
    "profit_margin": "X%",
    "pe_ratio": "X",
    "market_cap": "$XB or $XT",
    "debt_to_equity": "X.XX"
  },
  "bull_case": "Specific upside scenario from research data",
  "bear_case": "Specific downside risk from research data",
  "sources": []
}`;

  console.log('[Synthesis] Calling Gemini (direct REST)...');
  return await callGemini(prompt);
}

// ─── Main Agent Entry Point ────────────────────────────────────────────────────
export async function runResearchAgent(companyName, onStep) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in server/.env');
  }

  console.log(`\n[Agent] ═══ Starting research for: "${companyName}" ═══`);
  console.log(`[Agent] Using Gemini model: ${process.env.GEMINI_MODEL || 'gemini-2.0-flash'}`);

  try {
    const researchData = await gatherResearchData(companyName, onStep);
    const rawText = await synthesizeReport(companyName, researchData, onStep);
    const result = extractJSON(rawText);

    result.verdict = (result.verdict || 'WATCH').toUpperCase();
    if (!['INVEST', 'PASS', 'WATCH'].includes(result.verdict)) result.verdict = 'WATCH';

    onStep({ type: 'step', message: `✅ Analysis complete — Verdict: ${result.verdict} (Confidence: ${result.confidence}/10)` });
    console.log(`[Agent] ✅ SUCCESS: ${result.verdict} for ${result.company} (${result.ticker})`);
    return result;

  } catch (error) {
    console.error('🔴 AGENT FAILED:');
    console.error('  message:', error.message);
    throw error;
  }
}
