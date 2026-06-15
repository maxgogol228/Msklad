import React, { useState, useEffect } from "react";
import Layout from "./layout/Layout";
import API from "./api";

const s = {
  wrap: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#111", padding: "16px" },
  card: { background: "#1a1a1a", padding: "32px 24px", borderRadius: "8px", width: "100%", maxWidth: "340px", border: "1px solid #333" },
  logo: { textAlign: "center", marginBottom: "24px" },
  title: { fontSize: "18px", fontWeight: "bold", color: "#fff", margin: "0 0 4px" },
  subtitle: { fontSize: "11px", color: "#666", margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  field: { display: "flex", flexDirection: "column", gap: "4px" },
  label: { fontSize: "11px", color: "#888" },
  input: { background: "#111", border: "1px solid #333", padding: "10px 12px", borderRadius: "4px", color: "#ccc", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box" },
  row: { display: "flex", gap: "8px", marginTop: "4px" },
  btn: (c) => ({ flex: 1, padding: "10px", borderRadius: "4px", fontSize: "13px", cursor: "pointer", border: "none", background: c === 'red' ? "#b30000" : "#2a2a2a", color: c === 'red' ? "#fff" : "#888", opacity: 1 }),
  error: { background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.2)", color: "#ff6666", padding: "10px", borderRadius: "4px", fontSize: "11px", textAlign: "center" },
  savedRow: { marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #222" },
  savedTitle: { fontSize: "10px", color: "#555", marginBottom: "6px" },
  savedBtn: { display: "block", width: "100%", padding: "8px 10px", background: "#1a1a1a", border: "1px solid #333", borderRadius: "4px", color: "#aaa", cursor: "pointer", fontSize: "12px", marginBottom: "4px", textAlign: "left" },
  savedDel: { background: "none", border: "none", color: "#ff6666", cursor: "pointer", fontSize: "12px", float: "right", padding: "0 4px" }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState([]);

  // Загрузка сохранённых аккаунтов
  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_accounts');
      if (saved) setSavedAccounts(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Авто-вход если есть токен
  useEffect(() => {
    const autoLogin = async () => {
      const token = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('user_data');
      if (token && savedUser) {
        try {
          const res = await API.get("/auth/check-session");
          setUser(res.data.user);
          localStorage.setItem('user_data', JSON.stringify(res.data.user));
          return;
        } catch (e) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      }
      setChecking(false);
    };
    autoLogin();
  }, []);

  const saveAccount = (login) => {
    const updated = savedAccounts.filter(a => a.login !== login);
    updated.unshift({ login, date: Date.now() });
    if (updated.length > 5) updated.pop();
    setSavedAccounts(updated);
    localStorage.setItem('saved_accounts', JSON.stringify(updated));
  };

  const removeSaved = (login) => {
    const updated = savedAccounts.filter(a => a.login !== login);
    setSavedAccounts(updated);
    localStorage.setItem('saved_accounts', JSON.stringify(updated));
  };

  const login = async (e) => {
    e.preventDefault();
    if (!form.login || !form.password) { setError("Заполните все поля"); return; }
    setLoading(true); setError("");
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('user_data', JSON.stringify(res.data.user));
      saveAccount(form.login);
      setUser(res.data.user);
    } catch (e) {
      setError(e.response?.data?.error || "Ошибка входа");
    } finally { setLoading(false); }
  };

  const register = async () => {
    if (!form.login || !form.password) { setError("Заполните все поля"); return; }
    setLoading(true); setError("");
    try {
      const res = await API.post("/auth/register", form);
      setError("");
      const msg = document.createElement('div');
      msg.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#1a3a1a;border:1px solid #2d5a2d;color:#4CAF50;padding:10px 16px;border-radius:4px;font-size:12px;z-index:9999';
      msg.textContent = res.data.message || "Регистрация успешна";
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Ошибка регистрации");
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  if (checking) {
    return <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#111", color: "#555", fontSize: "13px" }}>Загрузка...</div>;
  }

  if (!user) {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <div style={s.logo}>
            <h1 style={s.title}>М Склад</h1>
            <p style={s.subtitle}>Управление запасами</p>
          </div>
          <form onSubmit={login} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Логин</label>
              <input placeholder="Введите логин" value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} style={s.input} autoFocus autoComplete="username" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Пароль</label>
              <input type="password" placeholder="Введите пароль" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={s.input} autoComplete="current-password" />
            </div>
            <div style={s.row}>
              <button type="submit" disabled={loading} style={s.btn('red')}>{loading ? "Вход..." : "Войти"}</button>
              <button type="button" onClick={register} disabled={loading} style={s.btn('dark')}>Регистрация</button>
            </div>
            {error && <div style={s.error}>{error}</div>}
          </form>

          {savedAccounts.length > 0 && (
            <div style={s.savedRow}>
              <div style={s.savedTitle}>Сохранённые входы</div>
              {savedAccounts.map(acc => (
                <button key={acc.login} style={s.savedBtn} onClick={() => setForm({ ...form, login: acc.login })}>
                  {acc.login}
                  <span style={s.savedDel} onClick={(e) => { e.stopPropagation(); removeSaved(acc.login); }}>x</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <Layout user={user} setUser={setUser} onLogout={handleLogout} initialPage="tasks" />;
}
