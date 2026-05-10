import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Prevent right-click context menu
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Apply saved user bubble color
const savedBubble = localStorage.getItem("userBubbleColor");
if (savedBubble) document.documentElement.style.setProperty("--user-bubble", savedBubble);

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
