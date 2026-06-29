import { useState, useRef, useEffect } from 'react';
import { Search, TrendingUp } from 'lucide-react';

const EXAMPLE_COMPANIES = ['Apple', 'NVIDIA', 'Tesla', 'Rivian', 'Netflix'];

export default function SearchBar({ onSearch, isLoading }) {
  const [value, setValue] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      setRecentSearches(stored.slice(0, 3));
    } catch (_) {}
    inputRef.current?.focus();
  }, []);

  const submit = (company) => {
    const trimmed = (company || value).trim();
    if (!trimmed || isLoading) return;

    // Save to recent searches
    try {
      const prev = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const updated = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, 3);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (_) {}

    onSearch(trimmed);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-emerald-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="relative glass rounded-2xl border border-white/8 group-focus-within:border-blue-500/30 transition-all duration-300">
          <div className="flex items-center">
            <div className="pl-5 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-200">
              <Search size={20} />
            </div>
            <input
              ref={inputRef}
              id="company-search"
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Enter a company name or ticker (e.g. Apple, TSLA, Stripe)"
              className="search-input flex-1 bg-transparent px-4 py-4 text-white placeholder-slate-500 text-sm sm:text-base outline-none"
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              id="search-submit-btn"
              onClick={() => submit()}
              disabled={isLoading || !value.trim()}
              className="m-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              Analyze
            </button>
          </div>
        </div>
      </div>

      {/* Example Company Chips */}
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <span className="text-xs text-slate-600 font-medium">Try:</span>
        {EXAMPLE_COMPANIES.map(co => (
          <button
            key={co}
            id={`example-${co.toLowerCase()}`}
            onClick={() => submit(co)}
            className="px-3 py-1.5 glass rounded-lg text-xs text-slate-400 hover:text-white border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200 cursor-pointer flex items-center gap-1.5"
          >
            <TrendingUp size={10} className="text-blue-500" />
            {co}
          </button>
        ))}
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <span className="text-xs text-slate-600 font-medium">Recent:</span>
          {recentSearches.map(s => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-300 border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
