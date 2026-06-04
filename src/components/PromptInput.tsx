import { useEffect, useRef } from "react";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function PromptInput({ value, onChange, onSubmit, disabled }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
    }
  };

  return (
    <div className="prompt-input-wrapper">
      <textarea
        ref={textareaRef}
        className="prompt-textarea"
        placeholder="描述你想要的图像 ..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={3}
      />
      <button
        className="prompt-submit-btn"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
      >
        {disabled ? (
          <>
            <span className="spinner" />
            生成中
          </>
        ) : (
          "生成"
        )}
      </button>
    </div>
  );
}
