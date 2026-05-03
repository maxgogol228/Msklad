import { useState } from "react";
import Layout from "./layout/Layout";
import API from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const login = async () => {
    try {
      const res = await API.post("/auth/login", { name, key });
      setUser(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Ошибка входа");
    }
  };

  const register = async () => {
    await API.post("/auth/register", { name, key });
    alert("Заявка отправлена, ждите подтверждения");
    setIsRegister(false);
  };

  if (!user) {
    return (
      <div style={styles.login}>
        <h2>М Склад</h2>

        <input
          placeholder="Имя"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          placeholder="Ключ"
          value={key}
          onChange={e => setKey(e.target.value)}
        />

        {isRegister ? (
          <>
            <button onClick={register}>Регистрация</button>
            <button onClick={() => setIsRegister(false)}>Назад</button>
          </>
        ) : (
          <>
            <button onClick={login}>Войти</button>
            <button onClick={() => setIsRegister(true)}>
              Создать аккаунт
            </button>
          </>
        )}
      </div>
    );
  }

  return <Layout user={user} />;
}

const styles = {
  login: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: 250,
    margin: "100px auto"
  }
};
