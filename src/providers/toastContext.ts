import { createContext } from "react";

type ToastContextType = {
  showToast: (text: string, duration?: number) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
