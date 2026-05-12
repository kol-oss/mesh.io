import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { ToastContext } from "../../shared/toast/context";
import Toast, { type ToastMessage } from "../../shared/ui/components/Toast/Toast";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, duration: number | null = 3000) => {
    const id = Date.now().toString();
    setToast({ id, text, duration });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      <Toast key={toast?.id ?? "toast-empty"} message={toast} onDismiss={dismissToast} />
      {children}
    </ToastContext.Provider>
  );
}
