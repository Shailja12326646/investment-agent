import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    return null; // Return null on timeout, don't throw
  }
}

// ─── Curated Financial Database (fallback when APIs unavailable) ─────────────
const FINANCIAL_DB = {
  AAPL:  { companyName: 'Apple Inc.',              mktCap: '3.1T',  peRatio: '32.1',  revenueGrowth: '2.0%',  profitMargin: '26.3%', debtToEquity: '1.40', beta: '1.24' },
  MSFT:  { companyName: 'Microsoft Corporation',   mktCap: '3.2T',  peRatio: '37.4',  revenueGrowth: '15.7%', profitMargin: '36.0%', debtToEquity: '0.35', beta: '0.90' },
  NVDA:  { companyName: 'NVIDIA Corporation',      mktCap: '2.9T',  peRatio: '65.2',  revenueGrowth: '122.4%',profitMargin: '55.0%', debtToEquity: '0.43', beta: '1.68' },
  GOOGL: { companyName: 'Alphabet Inc.',            mktCap: '2.1T',  peRatio: '23.5',  revenueGrowth: '13.9%', profitMargin: '24.0%', debtToEquity: '0.06', beta: '1.05' },
  AMZN:  { companyName: 'Amazon.com Inc.',          mktCap: '1.9T',  peRatio: '41.3',  revenueGrowth: '12.5%', profitMargin: '8.5%',  debtToEquity: '0.45', beta: '1.30' },
  META:  { companyName: 'Meta Platforms Inc.',      mktCap: '1.4T',  peRatio: '27.8',  revenueGrowth: '22.0%', profitMargin: '35.0%', debtToEquity: '0.13', beta: '1.28' },
  TSLA:  { companyName: 'Tesla Inc.',               mktCap: '700B',  peRatio: '62.4',  revenueGrowth: '0.95%', profitMargin: '5.5%',  debtToEquity: '0.07', beta: '2.10' },
  INTC:  { companyName: 'Intel Corporation',        mktCap: '95B',   peRatio: 'N/A',   revenueGrowth: '-2.1%', profitMargin: '-3.5%', debtToEquity: '0.55', beta: '1.05' },
  NFLX:  { companyName: 'Netflix Inc.',             mktCap: '320B',  peRatio: '44.7',  revenueGrowth: '15.0%', profitMargin: '15.0%', debtToEquity: '0.70', beta: '1.33' },
  AMD:   { companyName: 'Advanced Micro Devices',   mktCap: '230B',  peRatio: '118.3', revenueGrowth: '13.7%', profitMargin: '5.0%',  debtToEquity: '0.08', beta: '1.75' },
  JPM:   { companyName: 'JPMorgan Chase & Co.',     mktCap: '620B',  peRatio: '13.2',  revenueGrowth: '22.0%', profitMargin: '28.0%', debtToEquity: '1.30', beta: '1.10' },
  PLTR:  { companyName: 'Palantir Technologies',    mktCap: '85B',   peRatio: '192.0', revenueGrowth: '29.0%', profitMargin: '16.0%', debtToEquity: '0.00', beta: '1.85' },
  SHOP:  { companyName: 'Shopify Inc.',             mktCap: '90B',   peRatio: '88.0',  revenueGrowth: '26.0%', profitMargin: '13.0%', debtToEquity: '0.08', beta: '1.55' },
  COIN:  { companyName: 'Coinbase Global Inc.',     mktCap: '55B',   peRatio: '41.2',  revenueGrowth: '108.0%',profitMargin: '28.0%', debtToEquity: '0.22', beta: '3.20' },
  UBER:  { companyName: 'Uber Technologies Inc.',   mktCap: '155B',  peRatio: '82.0',  revenueGrowth: '16.0%', profitMargin: '6.0%',  debtToEquity: '0.85', beta: '1.40' },
  DIS:   { companyName: 'The Walt Disney Company',  mktCap: '200B',  peRatio: '40.3',  revenueGrowth: '3.0%',  profitMargin: '4.5%',  debtToEquity: '0.56', beta: '1.12' },
  RIVN:  { companyName: 'Rivian Automotive Inc.',   mktCap: '14B',   peRatio: 'N/A',   revenueGrowth: '55.0%', profitMargin: '-85.0%',debtToEquity: '0.60', beta: '2.80' },
};

// ─── Ticker Resolution Helper ─────────────────────────────────────────────────
function resolveTickerFromName(name) {
  const aliases = {
    apple: 'AAPL', microsoft: 'MSFT', nvidia: 'NVDA', google: 'GOOGL', alphabet: 'GOOGL',
    amazon: 'AMZN', meta: 'META', facebook: 'META', tesla: 'TSLA', intel: 'INTC',
    netflix: 'NFLX', amd: 'AMD', jpmorgan: 'JPM', 'jp morgan': 'JPM', palantir: 'PLTR',
    shopify: 'SHOP', coinbase: 'COIN', uber: 'UBER', disney: 'DIS', rivian: 'RIVN',
  };
  const lower = name.toLowerCase().trim();
  return aliases[lower] || name.toUpperCase().replace(/\s+/g, '').slice(0, 5);
}

// ─── Tool 1: web_search ──────────────────────────────────────────────────────
export const webSearch = tool(
  async ({ query, input }) => {
    const searchQuery = query || input;
    if (!searchQuery) return 'No search query provided';
    
    // Use Tavily if key is present
    if (process.env.TAVILY_API_KEY) {
      try {
        const { tavily } = await import('@tavily/core');
        const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
        const response = await client.search(searchQuery, {
          maxResults: 5,
          includeAnswer: true,
        });
        const answer = response.answer ? `Summary: ${response.answer}\n\n` : '';
        const results = response.results
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content?.slice(0, 400)}`)
          .join('\n\n');
        return answer + results;
      } catch (err) {
        console.warn('[web_search] Tavily failed:', err.message);
      }
    }

    // Fallback: Alpha Vantage news if available
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      try {
        const ticker = resolveTickerFromName(searchQuery.split(' ')[0]);
        const res = await fetchWithTimeout(
          `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${ticker}&limit=5&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
          6000
        );
        if (!res) return "Data unavailable due to timeout.";
        const data = await res.json();
        if (data?.feed?.length > 0) {
          return data.feed
            .slice(0, 5)
            .map((a, i) => `[${i + 1}] ${a.title}\n${a.url}\n${a.summary?.slice(0, 300)}`)
            .join('\n\n');
        }
      } catch (err) {
        console.warn('[web_search] Alpha Vantage news failed:', err.message);
      }
    }

    // Final fallback: return a structured mock result
    return `Search results for "${searchQuery}": No live search available (Tavily API key not configured). Using curated database analysis.`;
  },
  {
    name: 'web_search',
    description: 'Search the web for information about a company. Use this to find company overview, news, financials, and any relevant data.',
    schema: z.object({
      query: z.string().describe('The search query to execute'),
    }),
  }
);

// ─── Tool 2: get_financial_summary ───────────────────────────────────────────
export const getFinancialSummary = tool(
  async ({ ticker }) => {
    const symbol = ticker.toUpperCase().trim();

    // Try Financial Modeling Prep (free demo tier)
    try {
      const [profileRes, ratiosRes] = await Promise.allSettled([
        fetchWithTimeout(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=demo`, 5000),
        fetchWithTimeout(`https://financialmodelingprep.com/api/v3/ratios-ttm/${symbol}?apikey=demo`, 5000),
      ]);

      const profileResVal = profileRes.status === 'fulfilled' ? profileRes.value : null;
      const ratiosResVal = ratiosRes.status === 'fulfilled' ? ratiosRes.value : null;

      if (!profileResVal || !ratiosResVal) {
        return "Data unavailable due to timeout.";
      }

      const profileData = await profileResVal.json();
      const ratiosData = await ratiosResVal.json();
      const profile = profileData?.[0];
      const ratios  = ratiosData?.[0];

      if (profile?.companyName) {
        return JSON.stringify({
          companyName: profile.companyName,
          ticker: profile.symbol,
          price: `$${profile.price?.toFixed(2) ?? 'N/A'}`,
          mktCap: `$${profile.mktCap ? (profile.mktCap / 1e9).toFixed(1) + 'B' : 'N/A'}`,
          beta: profile.beta?.toFixed(2) ?? 'N/A',
          peRatioTTM: ratios?.priceEarningsRatioTTM?.toFixed(1) ?? 'N/A',
          debtToEquityTTM: ratios?.debtEquityRatioTTM?.toFixed(2) ?? 'N/A',
          revenuePerShareTTM: ratios?.revenuePerShareTTM?.toFixed(2) ?? 'N/A',
          profitMarginTTM: `${((ratios?.netProfitMarginTTM ?? 0) * 100).toFixed(1)}%`,
          source: 'Financial Modeling Prep (live)',
        });
      }
    } catch (err) {
      console.warn('[get_financial_summary] FMP failed:', err.message);
    }

    // Curated database fallback
    const data = FINANCIAL_DB[symbol];
    if (data) {
      return JSON.stringify({ ...data, ticker: symbol, source: 'Curated database (cached)' });
    }

    // Alpha Vantage overview fallback
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      try {
        const res = await fetchWithTimeout(
          `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
          6000
        );
        if (!res) return "Data unavailable due to timeout.";
        const d = await res.json();
        if (d?.Symbol) {
          return JSON.stringify({
            companyName: d.Name,
            ticker: d.Symbol,
            mktCap: `$${d.MarketCapitalization ? (parseInt(d.MarketCapitalization) / 1e9).toFixed(1) + 'B' : 'N/A'}`,
            peRatio: d.PERatio ?? 'N/A',
            profitMargin: d.ProfitMargin ? `${(parseFloat(d.ProfitMargin) * 100).toFixed(1)}%` : 'N/A',
            debtToEquity: d.DebtToEquityRatio ?? 'N/A',
            beta: d.Beta ?? 'N/A',
            revenueGrowth: d.RevenueGrowthYOY ? `${(parseFloat(d.RevenueGrowthYOY) * 100).toFixed(1)}%` : 'N/A',
            source: 'Alpha Vantage (live)',
          });
        }
      } catch (err) {
        console.warn('[get_financial_summary] Alpha Vantage failed:', err.message);
      }
    }

    return `Financial data unavailable for ticker "${symbol}". Please analyze based on web search results.`;
  },
  {
    name: 'get_financial_summary',
    description: 'Get key financial metrics for a company using its stock ticker symbol (e.g. AAPL, MSFT, TSLA)',
    schema: z.object({
      ticker: z.string().describe('The stock ticker symbol of the company (e.g. AAPL for Apple)'),
    }),
  }
);

// ─── Tool 3: get_news_sentiment ──────────────────────────────────────────────
export const getNewsSentiment = tool(
  async ({ company }) => {
    const query = `"${company}" stock news sentiment analyst rating site:reuters.com OR site:bloomberg.com OR site:seekingalpha.com`;

    if (process.env.TAVILY_API_KEY) {
      try {
        const { tavily } = await import('@tavily/core');
        const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
        const response = await client.search(query, { maxResults: 3, includeAnswer: true });
        const results = response.results
          .map((r, i) => `[${i + 1}] ${r.title}\nSource: ${r.url}\n${r.content?.slice(0, 500)}`)
          .join('\n\n');
        return results || `No sentiment results found for ${company}.`;
      } catch (err) {
        console.warn('[get_news_sentiment] Tavily failed:', err.message);
      }
    }

    // NewsAPI fallback
    if (process.env.NEWS_API_KEY) {
      try {
        const res = await fetchWithTimeout(`https://newsapi.org/v2/everything?q=${encodeURIComponent(company + ' stock')}&pageSize=3&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`, 5000);
        if (!res) return "Data unavailable due to timeout.";
        const data = await res.json();
        if (data?.articles?.length > 0) {
          return data.articles
            .map((a, i) => `[${i + 1}] ${a.title}\nSource: ${a.url}\n${a.description ?? ''}`)
            .join('\n\n');
        }
      } catch (err) {
        console.warn('[get_news_sentiment] NewsAPI failed:', err.message);
      }
    }

    return `News sentiment data unavailable. Analyze based on general knowledge about ${company}.`;
  },
  {
    name: 'get_news_sentiment',
    description: 'Get recent analyst sentiment, news, and ratings from financial media for a company',
    schema: z.object({
      company: z.string().describe('The company name to get news sentiment for'),
    }),
  }
);

// ─── Tool 4: analyze_competitors ─────────────────────────────────────────────
export const analyzeCompetitors = tool(
  async ({ company }) => {
    const query = `"${company}" competitors market share industry analysis 2024`;

    if (process.env.TAVILY_API_KEY) {
      try {
        const { tavily } = await import('@tavily/core');
        const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
        const response = await client.search(query, { maxResults: 3 });
        const results = response.results
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content?.slice(0, 500)}`)
          .join('\n\n');
        return results || `No competitor data found for ${company}.`;
      } catch (err) {
        console.warn('[analyze_competitors] Tavily failed:', err.message);
      }
    }

    return `Competitive analysis data unavailable via live search. Please use your knowledge of ${company}'s competitive landscape.`;
  },
  {
    name: 'analyze_competitors',
    description: 'Analyze the competitive landscape, market share, and industry position for a company',
    schema: z.object({
      company: z.string().describe('The company name to analyze competitors for'),
    }),
  }
);

// ─── Export all tools ─────────────────────────────────────────────────────────
export const researchTools = [webSearch, getFinancialSummary, getNewsSentiment, analyzeCompetitors];
