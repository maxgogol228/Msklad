import { useEffect, useState } from "react";
import API from "../api";
import DeviceModal from "../components/DeviceModal";

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const load = async () => {
    const res = await API.get("/devices");
    setDevices(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const addDevice = async () => {
    const res = await API.post("/devices", { name: "Новый прибор" });
    setCurrent(res.data);
    setOpen(true);
    load();
  };

  const build = async (id) => {
    if (!window.confirm("Собрать прибор?")) return;

    await API.post(`/devices/${id}/build`);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить прибор?")) return;

    await API.delete(`/devices/${id}`);
    load();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Приборы</h2>

      <button onClick={addDevice}>Добавить прибор</button>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Название</th>
            <th>Состав</th>
            <th>Действия</th>
          </tr>
        </thead>

        <tbody>
          {devices.map(d => (
            <tr key={d.id}>
              <td>{d.name}</td>

              <td>
                {d.items?.map(i => (
                  <div key={i.id}>
                    {i.name} x{i.quantity}
                  </div>
                ))}
              </td>

              <td>
                <button onClick={() => { setCurrent(d); setOpen(true); }}>
                  Изменить
                </button>

                <button onClick={() => build(d.id)}>
                  Собрать
                </button>

                <button onClick={() => remove(d.id)}>
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && (
        <DeviceModal
          device={current}
          onClose={() => setOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
