import { useEffect, useState } from "react";
import API from "../api";
import DeviceModal from "../components/DeviceModal";

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get("/devices");
      setDevices(res.data || []);
    } catch (e) {
      console.error("Error loading devices:", e);
      alert("Ошибка загрузки приборов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addDevice = async () => {
    try {
      const res = await API.post("/devices", { name: "Новый прибор" });
      setCurrent(res.data);
      setOpen(true);
      load();
    } catch (e) {
      console.error("Error adding device:", e);
      alert("Ошибка создания прибора");
    }
  };

  const build = async (id) => {
    if (!window.confirm("Собрать прибор? Будут списаны необходимые детали.")) return;

    try {
      await API.post(`/devices/${id}/build`);
      alert("Прибор успешно собран!");
      load();
    } catch (e) {
      const errorMsg = e.response?.data?.error || "Ошибка сборки прибора";
      alert(errorMsg);
      console.error("Error building device:", e);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить прибор? Это действие нельзя отменить.")) return;

    try {
      const response = await API.delete(`/devices/${id}`);
      console.log("Delete response:", response.data);
      alert(response.data?.message || "Прибор удалён");
      load();
    } catch (e) {
      console.error("Error deleting device:", e);
      if (e.response?.status === 404) {
        alert("Прибор не найден. Возможно, он уже был удалён.");
        load(); // Перезагружаем список
      } else {
        alert("Ошибка удаления прибора");
      }
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <h2 style={{ color: "#fff", margin: 0 }}>🔬 Приборы</h2>
        <button 
          onClick={addDevice}
          style={{
            background: "#b30000",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          + Добавить прибор
        </button>
      </div>

      {loading && <div style={{ color: "#aaa", textAlign: "center", padding: "20px" }}>Загрузка...</div>}

      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        background: "#2a2a2a",
        borderRadius: "8px",
        overflow: "hidden"
      }}>
        <thead>
          <tr>
            <th style={{
              background: "#333",
              color: "#fff",
              padding: "12px",
              textAlign: "left",
              borderBottom: "2px solid #b30000"
            }}>
              Название
            </th>
            <th style={{
              background: "#333",
              color: "#fff",
              padding: "12px",
              textAlign: "left",
              borderBottom: "2px solid #b30000"
            }}>
              Состав
            </th>
            <th style={{
              background: "#333",
              color: "#fff",
              padding: "12px",
              textAlign: "left",
              borderBottom: "2px solid #b30000"
            }}>
              Действия
            </th>
          </tr>
        </thead>

        <tbody>
          {devices.map(d => (
            <tr key={d.id} style={{ borderBottom: "1px solid #444" }}>
              <td style={{ padding: "12px", color: "#fff" }}>
                {d.name}
              </td>

                          // В таблице приборов замените колонку "Состав" на:
              <td style={{ padding: "12px", color: "#fff", maxWidth: "300px" }}>
                {d.items && d.items.length > 0 ? (
                  <details style={{ color: "#aaa" }}>
                    <summary style={{ cursor: "pointer", color: "#4a9eff", fontSize: "14px" }}>
                      Состав ({d.items.length} поз.)
                    </summary>
                    <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
                      {d.items.map(i => (
                        <div key={i.id} style={{ 
                          fontSize: "13px",
                          marginBottom: "6px",
                          padding: "4px 8px",
                          background: "#333",
                          borderRadius: "4px",
                          display: "flex",
                          justifyContent: "space-between"
                        }}>
                          <span>
                            {i.item_type === 'consumable' ? '🔧' : '🔩'} {i.name}
                          </span>
                          <span style={{ fontWeight: "bold" }}>x{i.quantity}</span>
                          {i.available_quantity !== undefined && i.available_quantity < i.quantity && (
                            <span style={{ color: "#ff4444" }}>⚠️</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : (
                  <span style={{ color: "#666" }}>Пусто</span>
                )}
              </td>

              <td style={{ padding: "12px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    onClick={() => { setCurrent(d); setOpen(true); }}
                    style={{
                      background: "#444",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    ✎ Изменить
                  </button>

                  <button 
                    onClick={() => build(d.id)}
                    style={{
                      background: "#006600",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                    disabled={!d.items || d.items.length === 0}
                  >
                    🔨 Собрать
                  </button>

                  <button 
                    onClick={() => remove(d.id)}
                    style={{
                      background: "#660000",
                      color: "#ff6666",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    🗑 Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {devices.length === 0 && !loading && (
        <div style={{ 
          color: "#666", 
          textAlign: "center", 
          padding: "40px",
          fontSize: "16px"
        }}>
          Нет приборов. Создайте первый прибор!
        </div>
      )}

      {open && current && (
        <DeviceModal
          device={current}
          onClose={() => setOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
