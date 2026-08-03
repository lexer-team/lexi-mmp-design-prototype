import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import PrototypeMvpApp from "./concepts/Prototype-MVP";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrototypeMvpApp />
  </StrictMode>,
);
