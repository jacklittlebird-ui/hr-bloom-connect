import { createRoot } from "react-dom/client";
import "./index.css";
import { applyThemeSettings } from "./lib/themeUtils";

const AUTH_STORAGE_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;

const resetBrokenClientState = async () => {
  if (window.location.pathname === "/login") {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
};

// Apply saved theme settings on app load
applyThemeSettings();

resetBrokenClientState()
  .catch(console.error)
  .finally(async () => {
    const { default: App } = await import("./App.tsx");
    createRoot(document.getElementById("root")!).render(<App />);
  });
