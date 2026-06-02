import React, { useState, useEffect } from "react";
import Layout from "./layout/Layout";
import API from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('user_data');
      
      if (token && savedUser) {
        try {
          const res = await API.get("/auth/check-session");
          setUser(res.data.user);
          localStorage.setItem('user_data', JSON.stringify(res.data.user));
        } catch (e) {
          console.log("Session check failed:", e.message);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      }
      setCheckingSession(false);
    };
    
    checkSession();
    const interval = setInterval(checkSession, 30000);
    return () => clearInterval(interval);
  }, []);

  const login = async (e) => {
    e.preventDefault();
    if (!form.login || !form.password) {
      setError("Заполните все поля");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const res = await API.post("/auth/login", form);
      console.log("LOGIN OK:", res.data);
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('user_data', JSON.stringify(res.data.user));
      setUser(res.data.user);
    } catch (e) {
      console.error("LOGIN ERROR:", e.response?.data || e.message);
      setError(e.response?.data?.error || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!form.login || !form.password) {
      setError("Заполните все поля");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const res = await API.post("/auth/register", form);
      alert(res.data.message || "Регистрация успешна!");
    } catch (e) {
      setError(e.response?.data?.error || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  // Показываем загрузку пока проверяем сессию
  if (checkingSession) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#1e1e1e",
        color: "#fff",
        fontSize: "18px"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "15px" }}>📦</div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  // Страница входа
  if (!user) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>📦</div>
            <h1 style={styles.title}>М Склад</h1>
            <p style={styles.subtitle}>Система управления запасами</p>
          </div>

          <form onSubmit={login} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Логин</label>
              <input
                placeholder="Введите логин"
                value={form.login}
                onChange={e => setForm({ ...form, login: e.target.value })}
                style={styles.input}
                autoFocus
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Пароль</label>
              <input
                type="password"
                placeholder="Введите пароль"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={styles.input}
                autoComplete="current-password"
              />
            </div>

            <div style={styles.buttons}>
              <button type="submit" style={{
                ...styles.button,
                ...styles.primaryButton,
                opacity: loading ? 0.7 : 1
              }} disabled={loading}>
                {loading ? "Загрузка..." : "🔑 Войти"}
              </button>
              
              <button type="button" onClick={register} style={{
                ...styles.button,
                ...styles.secondaryButton,
                opacity: loading ? 0.7 : 1
              }} disabled={loading}>
                📝 Регистрация
              </button>
            </div>

            {error && (
              <div style={styles.error}>
                <span>⚠️</span> {error}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Основной интерфейс - передаем initialPage="tasks"
  return <Layout user={user} setUser={setUser} onLogout={handleLogout} initialPage="tasks" />;
}

const styles = {
  wrapper: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1e1e1e 100%)",
    padding: "20px"
  },
  card: {
    background: "linear-gradient(145deg, #2a2a2a, #333)",
    padding: "40px",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "380px",
    color: "#fff",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(179,0,0,0.2)",
    border: "1px solid rgba(179,0,0,0.3)"
  },
  logo: {
    textAlign: "center",
    marginBottom: "30px"
  },
  logoIcon: {
    fontSize: "48px",
    marginBottom: "10px"
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "0 0 5px 0",
    background: "linear-gradient(135deg, #ff4444, #b30000)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  subtitle: {
    fontSize: "14px",
    color: "#888",
    margin: 0
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "14px",
    color: "#aaa",
    fontWeight: "500"
  },
  input: {
    background: "#1e1e1e",
    border: "1px solid #444",
    padding: "12px 15px",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    width: "100%"
  },
  buttons: {
    display: "flex",
    gap: "10px",
    marginTop: "10px"
  },
  button: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s",
    border: "none"
  },
  primaryButton: {
    background: "linear-gradient(135deg, #b30000, #ff4444)",
    color: "#fff",
    boxShadow: "0 4px 15px rgba(179,0,0,0.3)"
  },
  secondaryButton: {
    background: "#333",
    color: "#fff",
    border: "1px solid #555"
  },
  error: {
    background: "rgba(255,0,0,0.1)",
    border: "1px solid rgba(255,0,0,0.3)",
    color: "#ff4444",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "14px",
    textAlign: "center"
  }
};
