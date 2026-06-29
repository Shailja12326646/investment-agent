import { useState, useCallback, useEffect } from 'react';
import SearchBar from './components/SearchBar.jsx';
import ResearchProgress from './components/ResearchProgress.jsx';
import InvestmentVerdict from './components/InvestmentVerdict.jsx';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState('idle'); // idle | loading | complete | error
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [company, setCompany] = useState('');

  // Auto-trigger from ?company= URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const co = params.get('company');
    if (co) handleResearch(co);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResearch = useCallback(async (companyName) => {
    setCompany(companyName);
    setStatus('loading');
    setSteps([]);
    setResult(null);
    setError(null);

    try {
      // Use fetch with ReadableStream for SSE over POST
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event;
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === 'step') {
            setSteps(prev => [...prev, event.message]);
          } else if (event.type === 'complete') {
            setResult(event.result);
            setStatus('complete');
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      console.error('Research error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  }, []);

  const handleReset = () => {
    setStatus('idle');
    setSteps([]);
    setResult(null);
    setError(null);
    setCompany('');
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleShare = () => {
    const url = `${window.location.origin}?company=${encodeURIComponent(company)}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Research link copied to clipboard!');
    });
  };

  return (
    <div className="bg-deep-navy min-h-screen text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="text-center space-y-4 animate-fade-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold uppercase tracking-widest">
            <Sparkles size={12} />
            <span>AI-Powered Investment Research</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="text-white">Investment </span>
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Research Agent
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Enter any company and an AI agent will autonomously research its fundamentals,
            news, and competitive position — delivering an{' '}
            <span className="text-emerald-400 font-semibold">INVEST</span>,{' '}
            <span className="text-red-400 font-semibold">PASS</span>, or{' '}
            <span className="text-amber-400 font-semibold">WATCH</span>{' '}
            verdict with full reasoning.
          </p>
        </header>

        {/* ── Search Bar (shown when idle) ─────────────────────────────────── */}
        {status === 'idle' && (
          <div className="animate-fade-slide-up delay-100">
            <SearchBar onSearch={handleResearch} isLoading={false} />
          </div>
        )}

        {/* ── Error State ────────────────────────────────────────────────── */}
        {status === 'error' && (
          <div className="max-w-2xl mx-auto glass rounded-2xl p-6 border border-red-500/30 bg-red-950/20 flex flex-col items-center text-center gap-4 animate-fade-slide-up">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl select-none">
              ❌
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-red-400">Research Failed</h4>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">{error}</p>
            </div>
            <button
              onClick={handleReset}
              className="mt-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer shadow-lg hover:shadow-red-500/5"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Loading — Live Research Progress ───────────────────────────── */}
        {status === 'loading' && (
          <div className="animate-fade-in">
            <ResearchProgress steps={steps} company={company} />
          </div>
        )}

        {/* ── Complete — Investment Verdict Dashboard ─────────────────────── */}
        {status === 'complete' && result && (
          <div className="space-y-6 animate-fade-slide-up">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Research Report</p>
                <h2 className="text-xl font-bold text-white">{result.company} ({result.ticker})</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="px-3 py-2 glass rounded-xl text-xs text-slate-400 hover:text-white border border-white/5 hover:border-white/15 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔗</span> Share
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 glass rounded-xl text-xs text-slate-400 hover:text-white border border-white/5 hover:border-white/15 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={11} /> New Research
                </button>
              </div>
            </div>
            <InvestmentVerdict data={result} />
          </div>
        )}
      </div>
    </div>
  );
}
