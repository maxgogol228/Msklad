import { useEffect, useState } from "react";
import API from "../api";

export default function AdminPage() {
  const [logs, setLogs] = useState([]);

  const load = async () => {
    const res = await API.get("/logs");
    setLogs(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const rollback = async (snapshotId) => {
    if (!window.confirm("Откатить состояние?")) return;

    await API.post(`/snapshots/${snapshotId}/restore`);
    alert("Откат выполнен");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Админ панель</h2>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Действие</th>
            <th>Пользователь</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td>{l.created_at}</td>
              <td>{l.action}</td>
              <td>{l.user_name}</td>
              <td>
                <button onClick={() => rollback(l.snapshot_id)}>
                  Откат
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
