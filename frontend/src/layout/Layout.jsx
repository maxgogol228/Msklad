import { useState } from "react";
import ItemsPage from "../pages/ItemsPage";
import ConsumablesPage from "../pages/ConsumablesPage";
import DevicesPage from "../pages/DevicesPage";
import AdminPage from "../pages/AdminPage";

export default function Layout({ user }) {
  const [page, setPage] = useState("items");
  const [admin, setAdmin] = useState(user.name === "admin");

  return (
    <div style={styles.wrapper}>
      <div style={styles.sidebar}>
        <button onClick={() => setPage("items")}>Детали</button>
        <button onClick={() => setPage("consumables")}>Расходники</button>
        <button onClick={() => setPage("devices")}>Приборы</button>

        {admin && (
          <button onClick={() => setPage("admin")}>
            Админ панель
          </button>
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
  wrapper: {
    display: "flex",
    height: "100vh",
    background: "#1e1e1e",
    color: "#fff"
  },
  sidebar: {
    width: 200,
    background: "#2a2a2a",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  content: {
    flex: 1,
    padding: 20
  }
};
