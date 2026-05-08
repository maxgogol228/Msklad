import React, { useState } from "react";
import Layout from "./layout/Layout";
import API from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setUser(res.data);
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
      await API.post("/auth/register", form);
      setError("");
      alert("Регистрация успешна! Ожидайте подтверждения администратора.");
    } catch (e) {
      setError(e.response?.data?.error || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.wrapper}>
        {/* Декоративный фон */}
        <div style={styles.backgroundDecor}>
          <div style={styles.circle1}></div>
          <div style={styles.circle2}></div>
        </div>
        
        <div style={styles.card}>
          {/* Логотип */}
          <div style={styles.logo}>
            <div style={styles.logoIcon}>📦</div>
            <h1 style={styles.title}>М Склад</h1>
            <p style={styles.subtitle}>Система управления запасами</p>
          </div>

          {/* Форма */}
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
              />
            </div>

            {/* Кнопки */}
            <div style={styles.buttons}>
              <button 
                type="submit" 
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  opacity: loading ? 0.7 : 1
                }}
                disabled={loading}
              >
                {loading ? "⏳ Загрузка..." : "🔑 Войти"}
              </button>
              
              <button 
                type="button" 
                onClick={register}
                style={{
                  ...styles.button,
                  ...styles.secondaryButton,
                  opacity: loading ? 0.7 : 1
                }}
                disabled={loading}
              >
                📝 Регистрация
              </button>
            </div>

            {/* Сообщение об ошибке */}
            {error && (
              <div style={styles.error}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Подсказка */}
            <div style={styles.hint}>
              <p style={styles.hintText}>
                Тестовый доступ: <strong>admin</strong> / <strong>admin123</strong>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <Layout user={user} />;
}

const styles = {
  wrapper: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1e1e1e 100%)",
    position: "relative",
    overflow: "hidden",
    margin: 0,
    padding: 0,
    border: "none"
  },
  backgroundDecor: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    zIndex: 0
  },
  circle1: {
    position: "absolute",
    top: "-100px",
    right: "-100px",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(179,0,0,0.1) 0%, transparent 70%)",
    animation: "pulse 4s infinite"
  },
  circle2: {
    position: "absolute",
    bottom: "-150px",
    left: "-150px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(179,0,0,0.05) 0%, transparent 70%)",
    animation: "pulse 6s infinite"
  },
  card: {
    background: "linear-gradient(145deg, #2a2a2a, #333)",
    padding: "40px",
    borderRadius: "20px",
    width: "380px",
    color: "#fff",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(179,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
    position: "relative",
    zIndex: 1,
    border: "1px solid rgba(179,0,0,0.3)"
  },
  logo: {
    textAlign: "center",
    marginBottom: "35px"
  },
  logoIcon: {
    fontSize: "48px",
    marginBottom: "10px"
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    margin: "0 0 5px 0",
    background: "linear-gradient(135deg, #ff4444, #b30000)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "0 2px 10px rgba(179,0,0,0.3)"
  },
  subtitle: {
    fontSize: "14px",
    color: "#888",
    margin: 0
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
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
    transition: "all 0.3s",
    outline: "none",
    boxSizing: "border-box",
    width: "100%"
  },
  buttons: {
    display: "flex",
    gap: "12px",
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
  },
  hint: {
    textAlign: "center",
    marginTop: "10px"
  },
  hintText: {
    fontSize: "12px",
    color: "#666",
    margin: 0
  }
};
