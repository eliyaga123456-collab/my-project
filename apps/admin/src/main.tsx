import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "@fontsource-variable/heebo";
import "@unsaid/tokens/tokens.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth";
import { I18nProvider } from "./i18n";
import { ToastProvider } from "./ui/Toast";

// Apply the saved theme before the first paint so the splash and logo match it.
try { const t = localStorage.getItem("unsaid-admin-theme"); document.documentElement.dataset.theme = t === "light" ? "light" : "dark"; } catch { document.documentElement.dataset.theme = "dark"; }

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </HashRouter>
  </StrictMode>
);
