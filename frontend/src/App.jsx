
import { useState } from "react"; // ВОТ ЭТО ОБЯЗАТЕЛЬНО
import Layout from "./layout/Layout";
import API from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");

// В компоненте логина оберните поля в <form>
const login = async (e) => {
  e.preventDefault(); // Добавьте это
  try {
    const res = await API.post("/auth/login", form);
    console.log("LOGIN OK:", res.data);
    setUser(res.data);
  } catch (e) {
    console.error("LOGIN ERROR:", e.response?.data || e.message);
    setError(e.response?.data?.error || "Ошибка входа");
  }
};

// В JSX оберните в form:
<form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
  <input
    placeholder="Логин"
    value={form.login}
    onChange={e => setForm({ ...form, login: e.target.value })}
  />
  
  <input
    type="password"
    placeholder="Пароль"
    value={form.password}
    onChange={e => setForm({ ...form, password: e.target.value })}
  />
  
  <button type="submit">Войти</button>
  <button type="button" onClick={register}>Регистрация</button>
  
  {error && <div style={{ color: "red" }}>{error}</div>}
</form>

  const register = async () => {
    try {
      await API.post("/auth/register", form);
      setError("Ожидает подтверждения админа");
    } catch {
      setError("Ошибка регистрации");
    }
  };

  if (!user) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h2>М Склад</h2>

          <input
            placeholder="Логин"
            onChange={e => setForm({ ...form, login: e.target.value })}
          />

          <input
            type="password"
            placeholder="Пароль"
            onChange={e => setForm({ ...form, password: e.target.value })}
          />

          <button onClick={login}>Войти</button>
          <button onClick={register}>Регистрация</button>

          <div style={{ color: "red" }}>{error}</div>
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
    background: "#1e1e1e"
  },
  card: {
    background: "#2a2a2a",
    padding: 30,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: 300,
    color: "#fff"
  }
};
