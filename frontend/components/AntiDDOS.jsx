import { useState } from "react";

let count = 0;
setInterval(() => count = 0, 60000);

export default function AntiDDOS() {
  const [blocked, setBlocked] = useState(false);

  count++;
  if (count > 100 && !blocked) setBlocked(true);

  if (!blocked) return null;

  return (
    <div style={{
      position: "fixed",
      background: "#000",
      color: "#fff",
      width: "100%",
      height: "100%",
      zIndex: 999
    }}>
      <h2>Проверка</h2>
      <button onClick={() => {
        count = 0;
        setBlocked(false);
      }}>
        Я человек
      </button>
    </div>
  );
}
