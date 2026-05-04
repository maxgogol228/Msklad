import { useState } from "react";
import ItemsPage from "../pages/ItemsPage";
import ConsumablesPage from "../pages/ConsumablesPage";
import DevicesPage from "../pages/DevicesPage";

export default function Layout({ user }) {
  const [page, setPage] = useState("items");

  return (
    <div>TEST</div>
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#1e1e1e",
      color: "#fff"
    }}>
      <div style={{
        width: 200,
        background: "#2a2a2a",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}>
        <div>👤 {user?.name}</div>

        <button onClick={() => setPage("items")}>Детали</button>
        <button onClick={() => setPage("consumables")}>Расходники</button>
        <button onClick={() => setPage("devices")}>Приборы</button>
      </div>

      <div style={{ flex: 1, padding: 20 }}>
        {page === "items" && <ItemsPage />}
        {page === "consumables" && <ConsumablesPage />}
        {page === "devices" && <DevicesPage />}
      </div>
    </div>
  );
}
