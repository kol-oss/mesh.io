import { createContext } from "react";

type ToastContextType = {
  showToast: (text: string, duration?: number | null) => void;
  dismissToast: () => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
