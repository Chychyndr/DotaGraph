import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PortraitProvider } from "./components/PortraitProvider";
import "./styles/global.css";

const buildSha = import.meta.env.VITE_BUILD_SHA || "development";
document.documentElement.dataset.dotagraphBuild = buildSha;

const root = document.getElementById("root");

if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <PortraitProvider>
      <App />
    </PortraitProvider>
  </StrictMode>
);
