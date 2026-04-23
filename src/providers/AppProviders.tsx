import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

type AppProvidersProps = {
  children: ReactNode;
};

export default function AppProviders({ children }: AppProvidersProps) {
  return <BrowserRouter>{children}</BrowserRouter>;
}
