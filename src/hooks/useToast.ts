import { useState, useCallback, useRef } from "react";
import type { ToastMessage } from "../components/Toast";

export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const push = useCallback((text: string, type: "success" | "error") => {
    const id = ++nextId.current;
    setMessages((prev) => [...prev, { id, text, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { messages, push, dismiss };
}
