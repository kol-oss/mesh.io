import { useEffect, useLayoutEffect, useState } from "react";

export type ToastMessage = {
  id: string;
  text: string;
  duration?: number;
};

type ToastProps = {
  message: ToastMessage | null;
  onDismiss: () => void;
};

export default function Toast({ message, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useLayoutEffect(() => {
    if (message) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);
    }
  }, [message]);

  useEffect(() => {
    if (!isVisible || !message) {
      return;
    }

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, message.duration || 3000);

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
