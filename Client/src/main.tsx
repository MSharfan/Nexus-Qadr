import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
  <BrowserRouter>
    <ToastProvider>
      <App />
    </ToastProvider>
  </BrowserRouter>
  </React.StrictMode>
);
