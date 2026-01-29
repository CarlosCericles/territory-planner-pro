import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  // Si esto llega a pasar, es un problema del index.html
  document.body.innerHTML = '<div style="color:white; background:red; padding:20px">Error crítico: No se encontró el contenedor "root"</div>';
} else {
  const root = createRoot(container);
  root.render(<App />);
}
