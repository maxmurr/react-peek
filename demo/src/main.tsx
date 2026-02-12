import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

import("react-peek");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
