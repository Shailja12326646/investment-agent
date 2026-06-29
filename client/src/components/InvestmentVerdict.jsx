import { useEffect, useRef } from 'react';

const SECTION_CONFIG = [
  { key: 'business_overview',   icon: '🏢', title: 'Business Overview' },
  { key: 'financial_health',    icon: '💰', title: 'Financial Health' },
  { key: 'competitive_position',icon: '🏆', title: 'Competitive Position' },
  { key: 'recent_news',         icon: '📰', title: 'Recent News & Sentiment' },
  { key: 'risks',               icon: '⚠️', title: 'Key Risks' },
];

function VerdictBadge({ verdict }) {
  const styles = {
    INVEST: { gradient: 'linear-gradient(135deg, #10b981, #059669)', label: 'INVEST', emoji: '📈' },
    PASS:   { gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',   label: 'PASS',   emoji: '🚫' },
    WATCH:  { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',  label: 'WATCH',  emoji: '👁️' },
  };
  const s = styles[verdict] || styles.WATCH;
  return (
    <div
      className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white shadow-xl border border-white/10 transition-all duration-500 transform hover:scale-105"
      style={{ background: s.gradient }}
    >
      <span className="text-3xl select-none">{s.emoji}</span>
      <span className="text-4xl font-extrabold tracking-widest">{s.label}</span>
    </div>
  );
}

function ConfidenceMeter({ score }) {
  const val = Math.min(10, Math.max(1, score || 5));
  const percent = val * 10;
  const colorClass = val >= 8 ? 'bg-emerald-500' : val >= 5 ? 'bg-amber-500' : 'bg-red-500';
  
  return (
    <div className="max-w-md mx-auto space-y-1.5 text-left">
      <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
        <span>Agent Confidence</span>
        <span className="font-bold text-white font-mono">{val}/10</span>
      </div>
      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }) {
  const isPositive = value && (value.includes('+') || (parseFloat(value) > 0 && !value.startsWith('-')));
  const isNegative = value && value.startsWith('-');
  const textColor = isNegative ? 'text-red-400' : isPositive ? 'text-emerald-400' : 'text-white';

  return (
    <div className="glass glass-hover rounded-xl p-4 border border-white/5 flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base select-none">{icon}</span>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">{label}</span>
      </div>
      <p className={`text-base sm:text-lg font-black tracking-tight ${textColor} truncate`}>{value || 'N/A'}</p>
    </div>
  );
}

export default function InvestmentVerdict({ data }) {
  const {
    verdict, confidence, one_liner, company, ticker,
    sections = {}, key_metrics = {}, sources = [],
  } = data;

  return (
    <div className="space-y-6">

      {/* ── Hero Verdict Banner ──────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-white/8 p-8 text-center space-y-6 animate-fade-slide-up">
        <VerdictBadge verdict={verdict} />
        
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white leading-tight">{company}</h2>
          <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded inline-block">{ticker}</span>
        </div>

        <p className="text-slate-300 text-base max-w-xl mx-auto leading-relaxed italic">
          "{one_liner}"
        </p>

        <ConfidenceMeter score={confidence} />
      </div>

      {/* ── Key Metrics Grid ─────────────────────────────────────────────── */}
      <div className="animate-fade-slide-up delay-100">
        <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard label="Revenue Growth"  value={key_metrics.revenue_growth}  icon="📈" />
          <MetricCard label="Profit Margin"   value={key_metrics.profit_margin}   icon="💰" />
          <MetricCard label="P/E Ratio"       value={key_metrics.pe_ratio}        icon="📉" />
          <MetricCard label="Market Cap"      value={key_metrics.market_cap}      icon="🏦" />
          <MetricCard label="Debt / Equity"   value={key_metrics.debt_to_equity}  icon="⚖️" />
        </div>
      </div>

      {/* ── Research Sections Grid (Responsive 2 Column) ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-slide-up delay-200">
        {SECTION_CONFIG.filter(s => sections[s.key]).map((sectionCfg, i) => (
          <ResearchSection
            key={sectionCfg.key}
            icon={sectionCfg.icon}
            title={sectionCfg.title}
            content={sections[sectionCfg.key]}
            delay={i * 100}
          />
        ))}
      </div>

      {/* ── Bull / Bear Case ─────────────────────────────────────────────── */}
      {(sections.bull_case || sections.bear_case) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-slide-up delay-300">
          {sections.bull_case && (
            <div className="glass rounded-2xl border border-emerald-500/20 bg-emerald-500/3 p-5 border-l-4 border-l-emerald-500 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📈</span>
                <h4 className="font-bold text-emerald-400 text-sm uppercase tracking-wide">Bull Case</h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{sections.bull_case}</p>
            </div>
          )}
          {sections.bear_case && (
            <div className="glass rounded-2xl border border-red-500/20 bg-red-500/3 p-5 border-l-4 border-l-red-500 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📉</span>
                <h4 className="font-bold text-red-400 text-sm uppercase tracking-wide">Bear Case</h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{sections.bear_case}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Sources ──────────────────────────────────────────────────────── */}
      {sources?.length > 0 && (
        <div className="animate-fade-slide-up delay-400">
          <SourcesList sources={sources} />
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ResearchSection({ icon, title, content, delay = 0 }) {
  return (
    <div
      className="glass glass-hover rounded-2xl border border-white/6 p-5 space-y-3 animate-fade-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xl select-none">{icon}</span>
        <h3 className="font-bold text-white text-sm">{title}</h3>
      </div>
      <p className="text-slate-400 text-sm leading-relaxed">{content}</p>
    </div>
  );
}

function SourcesList({ sources }) {
  const getDomain = (url) => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  };

  const validSources = sources.filter(s => s && typeof s === 'string' && s.startsWith('http'));

  if (validSources.length === 0) return null;

  return (
    <div className="glass rounded-2xl border border-white/6 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base select-none">📚</span>
        <h3 className="font-bold text-white text-sm">Sources</h3>
        <span className="ml-auto text-xs text-slate-600">{validSources.length} references</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {validSources.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 glass rounded-lg text-xs text-blue-400 hover:text-blue-300 border border-blue-500/15 hover:border-blue-500/30 transition-all duration-200 truncate max-w-[200px]"
            title={url}
          >
            {getDomain(url)}
          </a>
        ))}
      </div>
    </div>
  );
}
