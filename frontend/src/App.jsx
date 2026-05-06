import { useState } from "react";
import Layout from "./layout/Layout";
import API from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", key: "" });
  const [error, setError] = useState("");

  const login = async () => {
    try {
      const res = await API.post("/auth/login", form);
      setUser(res.data);
    } catch (e) {
      setError("Ошибка входа");
    }
  };

  const register = async () => {
    try {
      await API.post("/auth/register", form);
      setError("Заявка отправлена (ждёт подтверждения)");
    } catch {
      setError("Ошибка регистрации");
    }
  };

  if (!user) {
    return (
      <div style={styles.login}>
        <h2>М Склад</h2>

        <input
          placeholder="Имя"
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Ключ"
          type="password"
          onChange={e => setForm({ ...form, key: e.target.value })}
        />

        <button onClick={login}>Войти</button>
        <button onClick={register}>Регистрация</button>

        <div>{error}</div>
      </div>
    );
  }

  return <Layout user={user} />;
}

const styles = {
  login: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    justifyContent: "center",
    alignItems: "center"
  }
};
