import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyThemeSettings } from "./lib/themeUtils";

// Apply saved theme settings on app load
applyThemeSettings();

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
