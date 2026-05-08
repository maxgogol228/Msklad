import React, { useState } from "react";
import ItemsPage from "../pages/ItemsPage";
import ConsumablesPage from "../pages/ConsumablesPage";
import DevicesPage from "../pages/DevicesPage";
import AdminPage from "../pages/AdminPage";
import ArchivePage from "../pages/ArchivePage";

export default function Layout({ user }) {
  const [page, setPage] = useState("items");

  // Проверяем, является ли пользователь админом
  const isAdmin = user && (user.is_admin === true || user.id === 1);

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <div style={styles.userInfo}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>👤 {user.name || user.login}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            {isAdmin ? 'Администратор' : 'Пользователь'}
          </div>
        </div>

        <button 
          style={page === "items" ? styles.activeButton : styles.button} 
          onClick={() => setPage("items")}
          onMouseEnter={(e) => e.target.style.background = page === "items" ? "#b30000" : "#444"}
          onMouseLeave={(e) => e.target.style.background = page === "items" ? "#b30000" : "#333"}
        >
          📦 Детали
        </button>
        
        <button 
          style={page === "consumables" ? styles.activeButton : styles.button} 
          onClick={() => setPage("consumables")}
          onMouseEnter={(e) => e.target.style.background = page === "consumables" ? "#b30000" : "#444"}
          onMouseLeave={(e) => e.target.style.background = page === "consumables" ? "#b30000" : "#333"}
        >
          🔧 Расходники
        </button>
        
        <button 
          style={page === "devices" ? styles.activeButton : styles.button} 
          onClick={() => setPage("devices")}
          onMouseEnter={(e) => e.target.style.background = page === "devices" ? "#b30000" : "#444"}
          onMouseLeave={(e) => e.target.style.background = page === "devices" ? "#b30000" : "#333"}
        >
          🔬 Приборы
        </button>

        <button 
          style={page === "archive" ? styles.activeButton : styles.button} 
          onClick={() => setPage("archive")}
          onMouseEnter={(e) => e.target.style.background = page === "archive" ? "#b30000" : "#444"}
          onMouseLeave={(e) => e.target.style.background = page === "archive" ? "#b30000" : "#333"}
        >
          🗄️ Архив
        </button>

        {/* АДМИНКА - показывается только для админов */}
        {isAdmin && (
          <button 
            style={page === "admin" ? styles.activeAdminButton : styles.adminButton} 
            onClick={() => setPage("admin")}
          >
            ⚙️ Админ панель
          </button>
        )}
      </div>

      <div style={styles.content}>
        <div style={styles.topbar}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: "20px" }}>
            {page === "items" && "📦 Детали"}
            {page === "consumables" && "🔧 Расходники"}
            {page === "devices" && "🔬 Приборы"}
            {page === "archive" && "🗄️ Архив"}
            {page === "admin" && "⚙️ Админ панель"}
          </h2>
          <div style={{ color: "#aaa", fontSize: "14px" }}>
            {user.name || user.login}
          </div>
        </div>
        
        <div style={styles.pageContent}>
          {page === "items" && <ItemsPage />}
          {page === "consumables" && <ConsumablesPage />}
          {page === "devices" && <DevicesPage />}
          {page === "archive" && <ArchivePage />}
          {page === "admin" && isAdmin && <AdminPage />}
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
    color: "#fff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  sidebar: {
    width: 240,
    background: "#2b2b2b",
    color: "#fff",
    padding: "20px 15px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    borderRight: "2px solid #b30000",
    boxShadow: "2px 0 10px rgba(0,0,0,0.5)"
  },
  userInfo: {
    padding: "15px",
    borderBottom: "1px solid #444",
    marginBottom: "15px",
    textAlign: "center",
    background: "#333",
    borderRadius: "8px"
  },
  button: {
    display: "block",
    width: "100%",
    padding: "12px 15px",
    background: "#333",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "6px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "15px",
    transition: "all 0.2s"
  },
  activeButton: {
    display: "block",
    width: "100%",
    padding: "12px 15px",
    background: "#b30000",
    color: "#fff",
    border: "1px solid #ff3333",
    borderRadius: "6px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "15px",
    boxShadow: "0 0 10px rgba(179,0,0,0.5)"
  },
  adminButton: {
    display: "block",
    width: "100%",
    padding: "12px 15px",
    background: "#8b0000",
    color: "#fff",
    border: "1px solid #ff3333",
    borderRadius: "6px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "15px",
    marginTop: "auto"
  },
  activeAdminButton: {
    display: "block",
    width: "100%",
    padding: "12px 15px",
    background: "#ff0000",
    color: "#fff",
    border: "1px solid #ff6666",
    borderRadius: "6px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "15px",
    marginTop: "auto",
    boxShadow: "0 0 15px rgba(255,0,0,0.5)"
  },
  content: { 
    flex: 1, 
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  topbar: {
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 25px",
    borderBottom: "1px solid #444",
    background: "#2a2a2a",
    boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
  },
  pageContent: {
    padding: 25,
    overflow: "auto",
    flex: 1,
    background: "#1e1e1e"
  }
};
