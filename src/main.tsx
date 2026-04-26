import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyThemeSettings } from "./lib/themeUtils";
import { applyStoredClockOffset, detectAndCorrectClockSkew } from "./lib/clockSkew";

// Apply any previously detected clock offset SYNCHRONOUSLY before anything else.
// This guarantees Supabase Auth sees a corrected `Date.now()` from its very first call,
// so users with wrongly-set device clocks can still log in successfully.
applyStoredClockOffset();

// Apply saved theme settings on app load
applyThemeSettings();

// Refresh the offset against the server in the background — non-blocking.
void detectAndCorrectClockSkew();

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
