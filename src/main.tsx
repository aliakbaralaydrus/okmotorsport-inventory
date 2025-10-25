import React from "react";
import ReactDOM from "react-dom/client";
import FSAEInventory from "./FSAEInventory";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FSAEInventory scriptUrl="https://script.google.com/macros/s/AKfycbxIPvQXbaPKNa-PyESRiTjkOm0PWT__0ff-OTmPNyxmbjQqpiV2X-Um-YHGFskNjwaA/exec" />
  </React.StrictMode>
);
