import { useEffect, useRef } from 'react';

const STEP_LABELS = {
  web_search: '🔍 Searching the web for company information...',
  get_financial_summary: '📊 Fetching financial metrics and ratios...',
  get_news_sentiment: '📰 Analyzing recent news and analyst sentiment...',
  analyze_competitors: '🏆 Mapping competitive landscape...',
  default: '🤖 Agent is reasoning...'
};

function mapStepMessage(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('web_search') || lower.includes('searching the web')) {
    return STEP_LABELS.web_search;
  }
  if (lower.includes('get_financial_summary') || lower.includes('financial metrics') || lower.includes('fetching key financial')) {
    return STEP_LABELS.get_financial_summary;
  }
  if (lower.includes('get_news_sentiment') || lower.includes('analyzing recent news') || lower.includes('news sentiment')) {
    return STEP_LABELS.get_news_sentiment;
  }
  if (lower.includes('analyze_competitors') || lower.includes('mapping competitive')) {
    return STEP_LABELS.analyze_competitors;
  }
  return msg || STEP_LABELS.default;
}

export default function ResearchProgress({ steps, company }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [steps]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-blue-400 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-500 step-dot-pulse inline-block" />
          Researching <span className="text-white font-bold">"{company}"</span>
        </div>
        <p className="text-slate-500 text-xs">AI agent is autonomously collecting data across multiple dimensions...</p>
      </div>

      {/* Progress Bar (Visual Reassurance 0-90% over 30s) */}
      <div className="glass rounded-2xl border border-white/8 p-6 space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Agent research progress...</span>
          <span className="text-blue-400 font-mono animate-pulse">Running</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full progress-bar animate-progress-30s" />
        </div>
      </div>

      {/* Mapped Timeline Display */}
      <div className="glass rounded-2xl border border-white/8 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300">Research Timeline</h3>
        <div className="relative pl-6 border-l border-white/5 space-y-5">
          {steps.map((rawStep, idx) => {
            const mappedText = mapStepMessage(rawStep);
            const isCompleted = idx < steps.length - 1;
            const isCurrent = idx === steps.length - 1;

            return (
              <div key={idx} className="relative flex items-start gap-3 animate-fade-in">
                {/* Timeline node */}
                <div className="absolute -left-[33px] top-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-[#0a0f1e]">
                  {isCompleted ? (
                    <span className="text-emerald-400 text-xs select-none">✅</span>
                  ) : isCurrent ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 step-dot-pulse" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>

                {/* Text content */}
                <div className="flex-1">
                  <p className={`text-sm ${isCompleted ? 'text-emerald-400/90' : isCurrent ? 'text-white font-semibold' : 'text-slate-500'}`}>
                    {mappedText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Log Console */}
      {steps.length > 0 && (
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-black/20">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <span className="text-xs text-slate-600 font-mono ml-1">agent.log</span>
          </div>
          <div
            ref={logRef}
            className="p-4 h-36 overflow-y-auto space-y-1.5 font-mono text-xs"
          >
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-slate-400 animate-fade-in"
              >
                <span className="text-slate-600 select-none shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="shrink-0">⚙️</span>
                <span className={i === steps.length - 1 ? 'text-slate-200' : ''}>{step}</span>
              </div>
            ))}
            {/* Blinking cursor */}
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-slate-700 select-none">
                {String(steps.length + 1).padStart(2, '0')}
              </span>
              <span className="w-2 h-3.5 bg-blue-500/70 animate-pulse inline-block" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
