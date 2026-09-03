import React from "react";
import ReactDOM from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import App from "./App";
import { FloodStoreProvider } from "./state/FloodStore";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FloodStoreProvider>
      <App />
    </FloodStoreProvider>
  </React.StrictMode>,
);
