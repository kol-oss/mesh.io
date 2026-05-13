import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ReduxProvider } from "./providers/ReduxProvider";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./providers/ToastProvider";

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
