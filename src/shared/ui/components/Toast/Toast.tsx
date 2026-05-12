import { useEffect, useState } from "react";
import type { UUID } from "../../../types/uuid";

export type ToastMessage = {
  id: UUID;
  text: string;
  duration?: number | null;
};

type ToastProps = {
  message: ToastMessage | null;
  onDismiss: () => void;
};

export default function Toast({ message, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isVisible || !message) {
      return;
    }

    if (message.duration === null) {
      return;
    }

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, message.duration ?? 3000);

    return () => clearTimeout(hideTimer);
  }, [isVisible, message]);

  useEffect(() => {
    if (isVisible || !message) {
      return;
    }

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 300);

    return () => clearTimeout(dismissTimer);
  }, [isVisible, message, onDismiss]);

  if (!message) return null;

  return <div className={`toast ${isVisible ? "toast--visible" : ""}`}>{message.text}</div>;
}
