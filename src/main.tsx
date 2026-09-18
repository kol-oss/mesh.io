import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/app/App";
import { ReduxProvider } from "@/app/providers/ReduxProvider";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@/app/providers/ToastProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReduxProvider>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </ReduxProvider>
  </StrictMode>,
);
