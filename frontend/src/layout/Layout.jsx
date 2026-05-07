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
        <div style={styles.userInfo}>👤 {user.name}</div>

        <button style={styles.button} onClick={() => setPage("items")}>
          📦 Детали
        </button>
        <button style={styles.button} onClick={() => setPage("consumables")}>
          🔧 Расходники
        </button>
        <button style={styles.button} onClick={() => setPage("devices")}>
          🔬 Приборы
        </button>

        {user.is_admin && (
          <button style={styles.adminButton} onClick={() => setPage("admin")}>
            ⚙️ Админка
          </button>
        )}
      </div>

      <div style={styles.content}>
        <div style={styles.topbar}>
          <h2 style={{ margin: 0, color: "#fff" }}>М Склад</h2>
          <div style={{ color: "#aaa" }}>{user.name}</div>
        </div>
        
        <div style={styles.pageContent}>
          {page === "items" && <ItemsPage />}
          {page === "consumables" && <ConsumablesPage />}
          {page === "devices" && <DevicesPage />}
          {page === "admin" && <AdminPage />}
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { 
    display: "flex", 
    height: "100vh",
    background: "#1e1e1e",
    color: "#fff"
  },
  sidebar: {
    width: 220,
    background: "#2b2b2b",
    color: "#fff",
    padding: "20px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderRight: "1px solid #444"
  },
  userInfo: {
    padding: "10px",
    borderBottom: "1px solid #444",
    marginBottom: "10px",
    fontSize: "16px"
  },
  button: {
    display: "block",
    width: "100%",
    padding: "12px",
    background: "#333",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "5px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14px",
    transition: "background 0.2s"
  },
  adminButton: {
    display: "block",
    width: "100%",
    padding: "12px",
    background: "#b30000",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14px",
    marginTop: "20px"
  },
  content: { 
    flex: 1, 
    display: "flex",
    flexDirection: "column"
  },
  topbar: {
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    borderBottom: "1px solid #444",
    background: "#2a2a2a"
  },
  pageContent: {
    padding: 20,
    overflow: "auto",
    flex: 1
  }
};
