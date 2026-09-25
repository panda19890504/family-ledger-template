import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthGate } from "./components/AuthGate";
import { LedgerProvider } from "./context/LedgerContext";
import { configurePwaUpdate, reportPwaUpdateAvailable } from "./lib/pwaUpdate";
import "./styles.css";

if (!import.meta.env.DEV) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    const updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh: reportPwaUpdateAvailable,
      onRegisteredSW: (_swUrl, registration) => {
        if (!registration) return;
        const checkForUpdate = () => {
          if (document.visibilityState === "visible") void registration.update().catch(() => undefined);
        };
        document.addEventListener("visibilitychange", checkForUpdate);
        window.setInterval(checkForUpdate, 15 * 60 * 1000);
      },
    });
    configurePwaUpdate(() => updateServiceWorker(true));
  });
}

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister())),
  );
  if ("caches" in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>
      <LedgerProvider>
        <App />
      </LedgerProvider>
    </AuthGate>
  </StrictMode>,
);
