import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { searchApi } from "../../config/api";

interface SearchBarProps {
  value?: string; // optional (controlled mode)
  onChange?: (value: string) => void; // optional (controlled mode)
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search products...",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [internalValue, setInternalValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [highlight, setHighlight] = React.useState<number>(-1);

  const isControlled = typeof value === "string";
  const inputValue = isControlled ? value : internalValue;

  const containerRef = React.useRef<HTMLFormElement | null>(null);
  const lastQueryRef = React.useRef<string | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  const handleChange = (v: string) => {
    if (isControlled) onChange?.(v);
    else setInternalValue(v);

    // open suggestions and debounce fetch
    setOpen(true);
    setHighlight(-1);

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const q = v.trim();
      lastQueryRef.current = q;
      if (!q) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const resp: any = await searchApi.suggest(q, 8);
        // support either { suggestions: [] } or an array
        let list: any[] = [];
        if (!resp) list = [];
        else if (Array.isArray(resp)) list = resp;
        else if (Array.isArray(resp.suggestions)) list = resp.suggestions;

        // ignore if user typed again
        if (lastQueryRef.current !== q) return;
        setSuggestions(list);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  React.useEffect(() => {
    if (!isControlled) {
      const params = new URLSearchParams(location.search);
      const q = params.get("q");
      if (q) setInternalValue(q);
    }
  }, [location.search, isControlled]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (highlight >= 0 && suggestions[highlight]) {
        e.preventDefault();
        const s = suggestions[highlight];
        navigate(`/search?q=${encodeURIComponent(s.title || s.name || s)}`);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  };

  const onSelectSuggestion = (s: any) => {
    navigate(`/search?q=${encodeURIComponent(s.title || s.name || s)}`);
    setOpen(false);
  };

  return (
    <form
      ref={containerRef}
      onSubmit={handleSubmit}
      className="relative"
      role="search"
      aria-label="Site search"
    >
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="search-suggestions"
        className="w-full pl-12 pr-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-[#00B0FF] focus:border-transparent transition-all"
      />

      {open && (
        <div
          id="search-suggestions"
          role="listbox"
          aria-live="polite"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-border rounded-xl shadow-lg z-50 overflow-hidden"
        >
          {loading ? (
            <div className="p-3 text-sm">Loading…</div>
          ) : suggestions.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No suggestions</div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={s.id ?? `${s.title ?? s}-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()} // prevent blur
                onClick={() => onSelectSuggestion(s)}
                className={`w-full text-left px-4 py-3 hover:bg-secondary flex items-center gap-2 ${
                  i === highlight ? "bg-[#00B0FF]/10 text-[#00B0FF]" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.title ?? s.name ?? s}</div>
                  {s.subtitle && <div className="text-xs text-muted-foreground">{s.subtitle}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </form>
  );
};
