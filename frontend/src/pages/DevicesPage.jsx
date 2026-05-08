import React, { useEffect, useState } from "react";
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
      const newDevice = res.data;
      
      // Добавляем новый прибор в список и сразу открываем редактирование
      setDevices([newDevice, ...devices]);
      setCurrent(newDevice);
      setOpen(true);
    } catch (e) {
      console.error("Error adding device:", e);
      alert("Ошибка создания прибора");
    }
  };

  const build = async (id) => {
    if (!window.confirm("Собрать прибор? Будут списаны необходимые компоненты.")) return;

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
    if (!window.confirm("Удалить прибор? Он будет перемещён в архив.")) return;

    try {
      await API.delete(`/devices/${id}`);
      alert("Прибор перемещён в архив");
      load();
    } catch (e) {
      console.error("Error deleting device:", e);
      alert("Ошибка удаления прибора");
    }
  };

  const getItemType = (item) => {
    if (item.item_type === 'consumable' || item.consumable_id) {
      return '🔧'; // Расходник
    }
    return '🔩'; // Деталь
  };

  const getItemName = (item) => {
    return item.name || item.component_name || 'Неизвестный компонент';
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

      {loading && (
        <div style={{ color: "#aaa", textAlign: "center", padding: "20px" }}>
          Загрузка...
        </div>
      )}

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
              borderBottom: "2px solid #b30000",
              width: "50px"
            }}>
              №
            </th>
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
              borderBottom: "2px solid #b30000",
              width: "40%"
            }}>
              Состав
            </th>
            <th style={{
              background: "#333",
              color: "#fff",
              padding: "12px",
              textAlign: "left",
              borderBottom: "2px solid #b30000",
              width: "250px"
            }}>
              Действия
            </th>
          </tr>
        </thead>

        <tbody>
          {devices.length === 0 && !loading ? (
            <tr>
              <td colSpan={4} style={{
                textAlign: "center",
                padding: "40px",
                color: "#666",
                fontSize: "16px"
              }}>
                Нет приборов. Нажмите "Добавить прибор" для создания.
              </td>
            </tr>
          ) : (
            devices.map((device, index) => (
              <tr key={device.id} style={{ borderBottom: "1px solid #444" }}>
                <td style={{ 
                  padding: "12px", 
                  color: "#888", 
                  textAlign: "center",
                  fontSize: "14px"
                }}>
                  {index + 1}
                </td>
                
                <td style={{ padding: "12px", color: "#fff", fontSize: "14px" }}>
                  {device.name || "Без названия"}
                </td>

                <td style={{ padding: "12px" }}>
                  {device.items && device.items.length > 0 ? (
                    <details style={{ color: "#aaa" }}>
                      <summary style={{ 
                        cursor: "pointer", 
                        color: "#4a9eff", 
                        fontSize: "14px",
                        userSelect: "none"
                      }}>
                        Состав ({device.items.length} поз.)
                      </summary>
                      <div style={{ 
                        marginTop: "8px", 
                        paddingLeft: "16px",
                        maxHeight: "300px",
                        overflowY: "auto"
                      }}>
                        {device.items.map((item, itemIndex) => (
                          <div key={item.id || itemIndex} style={{ 
                            fontSize: "13px",
                            marginBottom: "6px",
                            padding: "6px 10px",
                            background: "#333",
                            borderRadius: "4px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>{getItemType(item)}</span>
                              <span style={{ color: "#fff" }}>
                                {getItemName(item)}
                              </span>
                              {item.unit && (
                                <span style={{ color: "#888", fontSize: "11px" }}>
                                  ({item.unit})
                                </span>
                              )}
                            </span>
                            <span style={{ 
                              fontWeight: "bold",
                              color: "#fff",
                              marginLeft: "10px"
                            }}>
                              x{item.quantity}
                            </span>
                            {item.available_quantity !== undefined && 
                             parseFloat(item.available_quantity) < parseFloat(item.quantity) && (
                              <span style={{ 
                                color: "#ff4444", 
                                marginLeft: "8px",
                                fontSize: "12px"
                              }} title="Недостаточно на складе">
                                ⚠️
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <span style={{ color: "#666", fontSize: "13px", fontStyle: "italic" }}>
                      Пусто
                    </span>
                  )}
                </td>

                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button 
                      onClick={() => { 
                        setCurrent(device); 
                        setOpen(true); 
                      }}
                      style={{
                        background: "#444",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      ✎ Изменить
                    </button>

                    <button 
                      onClick={() => build(device.id)}
                      style={{
                        background: "#006600",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        whiteSpace: "nowrap"
                      }}
                      disabled={!device.items || device.items.length === 0}
                    >
                      🔨 Собрать
                    </button>

                    <button 
                      onClick={() => remove(device.id)}
                      style={{
                        background: "#660000",
                        color: "#ff6666",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      🗑 Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {open && current && (
        <DeviceModal
          device={current}
          onClose={() => {
            setOpen(false);
            setCurrent(null);
          }}
          onSaved={() => {
            load();
            setOpen(false);
            setCurrent(null);
          }}
        />
      )}
    </div>
  );
}
