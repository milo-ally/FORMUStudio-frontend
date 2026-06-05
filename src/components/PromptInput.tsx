import { useEffect, useRef, useState, useCallback } from "react";
import { fetchPromptHistory, addPromptEntry } from "../lib/dataApi";

interface PromptEntry { prompt: string; count: number; last_used: number }

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text?: string) => void;
  generating?: boolean;
  onCancel?: () => void;
  allowEmptySubmit?: boolean;
  category?: string;
  placeholder?: string;
}

export function PromptInput({ value, onChange, onSubmit, generating, onCancel, allowEmptySubmit, category = "image", placeholder = "描述你想要的图像 ..." }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<PromptEntry[]>([]);

  useEffect(() => {
    fetchPromptHistory(category).then(setHistory).catch(() => {});
  }, [category]);

  const recordPrompt = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addPromptEntry(trimmed, category).catch(() => {});
    setHistory((prev) => {
      const idx = prev.findIndex((e) => e.prompt === trimmed);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], count: next[idx].count + 1, last_used: Date.now() };
        return next;
      }
      return [...prev, { prompt: trimmed, count: 1, last_used: Date.now() }];
    });
  }, [category]);

  const suggestions = value.trim()
    ? history.filter((e) => e.prompt.includes(value.trim()) && e.prompt !== value.trim()).slice(0, 5)
    : history.slice(0, 5);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectSuggestion = useCallback(
    (text: string) => {
      recordPrompt(text.trim());
      onChange(text);
      setSelectedIndex(-1);
      setFocused(false);
    },
    [onChange],
  );

  const handleSubmit = useCallback(() => {
    if (generating) return;
    if (!allowEmptySubmit && !value.trim()) return;
    recordPrompt(value.trim());
    setFocused(false);
    onSubmit(value.trim());
  }, [generating, value, onSubmit, allowEmptySubmit]);

  const handleChange = useCallback(
    (v: string) => {
      setSelectedIndex(-1);
      onChange(v);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        if (suggestions.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }

      if (e.key === "ArrowUp") {
        if (suggestions.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex].prompt);
        } else if ((value.trim() || allowEmptySubmit) && !generating) {
          if (value.trim()) recordPrompt(value.trim());
          setFocused(false);
          onSubmit(value.trim());
        }
        return;
      }

      if (e.key === "Escape") {
        setSelectedIndex(-1);
        setFocused(false);
      }
    },
    [suggestions, selectedIndex, value, generating, selectSuggestion, onSubmit, allowEmptySubmit],
  );

  const handleSuggestionClick = useCallback(
    (prompt: string) => {
      selectSuggestion(prompt);
    },
    [selectSuggestion],
  );

  const open = focused && suggestions.length > 0;

  return (
    <div className="prompt-input-wrapper" ref={wrapperRef}>
      <textarea
        ref={textareaRef}
        className="prompt-textarea"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        rows={3}
      />
      <div className="prompt-actions">
        {generating && (
          <span className="generating-indicator">
            <span className="spinner-triple">
              <span className="spinner-dot" />
              <span className="spinner-dot" />
              <span className="spinner-dot" />
            </span>
            生成中
          </span>
        )}
        {generating && onCancel && (
          <button className="prompt-cancel-btn" onClick={onCancel}>
            取消
          </button>
        )}
        <button
          className="prompt-submit-btn"
          onClick={handleSubmit}
          disabled={generating || (!allowEmptySubmit && !value.trim())}
        >
          生成
        </button>
      </div>

      {open && (
        <div className="prompt-suggestions">
          {suggestions.map((entry, i) => (
            <button
              key={entry.prompt}
              className={`prompt-suggestion-item ${i === selectedIndex ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(entry.prompt);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="prompt-suggestion-text">{entry.prompt}</span>
              <span className="prompt-suggestion-count">{entry.count} 次</span>
            </button>
          ))}
          <div className="prompt-suggestions-hint">
            <kbd>↑↓</kbd> 导航 <kbd>Enter</kbd> 填入 <kbd>Esc</kbd> 关闭
          </div>
        </div>
      )}
    </div>
  );
}
