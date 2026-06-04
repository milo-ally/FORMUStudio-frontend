import { useEffect } from "react";

export interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error";
}

interface ToastProps {
  messages: ToastMessage[];
  onDone: (id: number) => void;
}

export function Toast({ messages, onDone }: ToastProps) {
  return (
    <div className="toast-container">
      {messages.map((m) => (
        <ToastItem key={m.id} message={m} onDone={onDone} />
      ))}
    </div>
  );
}

function ToastItem({ message, onDone }: { message: ToastMessage; onDone: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone(message.id), 2500);
    return () => clearTimeout(timer);
  }, [message.id, onDone]);

  return (
    <div className={`toast toast-${message.type}`}>
      {message.type === "success" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )}
      <span>{message.text}</span>
    </div>
  );
}
