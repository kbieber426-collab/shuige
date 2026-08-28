import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

// NOTE: StrictMode is intentionally omitted — the WebGL scene initialises
// exactly once during the loading sequence and must not double-mount.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.Fragment>
    <App />
  </React.Fragment>
);

