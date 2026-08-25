import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TankDesigner from "../app/components/TankDesigner";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TankDesigner />
  </StrictMode>,
);
