import { useContext } from "react";
import { ui } from "../i18n/messages";
import { ToastContext } from "../providers/toastContext";

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error(ui.errors.useToastOutsideProvider);
  }
  return context;
}
