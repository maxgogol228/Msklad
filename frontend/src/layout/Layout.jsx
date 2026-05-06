import { useState } from "react";
import ItemsPage from "../pages/ItemsPage";
import ConsumablesPage from "../pages/ConsumablesPage";
import DevicesPage from "../pages/DevicesPage";
import AdminPage from "../pages/AdminPage";

export default function Layout({ user }) {
  const [page, setPage] = useState("items");

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <div>👤 {user.name}</div>

        <button onClick={() => setPage("items")}>Детали</button>
        <button onClick={() => setPage("consumables")}>Расходники</button>
        <button onClick={() => setPage("devices")}>Приборы</button>

        {user.is_admin && (
          <button onClick={() => setPage("admin")}>Админка</button>
        )}
      </div>

      <div style={styles.content}>
        {page === "items" && <ItemsPage />}
        {page === "consumables" && <ConsumablesPage />}
        {page === "devices" && <DevicesPage />}
        {page === "admin" && <AdminPage />}
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", height: "100vh" },
  sidebar: {
    width: 220,
    background: "#2b2b2b",
    color: "#fff",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  content: { flex: 1, padding: 20 }
};
