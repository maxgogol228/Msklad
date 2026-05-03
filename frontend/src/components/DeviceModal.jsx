import { useEffect, useState } from "react";
import API from "../api";

export default function DeviceModal({ device, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    API.get("/items").then(r => setItems(r.data));
  }, []);

  const addItem = (id) => {
    setSelected([...selected, { item_id: id, quantity: 1 }]);
  };

  const save = async () => {
    await API.put(`/devices/${device.id}`, {
      ...device,
      items: selected
    });

    onSaved();
    onClose();
  };

  return (
    <div style={{ background: "#000a", position: "fixed", inset: 0 }}>
      <div style={{ background: "#fff", padding: 20, margin: 50 }}>

        <h3>Редактирование прибора</h3>

        <select onChange={(e) => addItem(e.target.value)}>
          <option>Выбрать деталь</option>
          {items.map(i => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>

        <div>
          {selected.map((s, idx) => (
            <div key={idx}>
              ID {s.item_id} x
              <input
                type="number"
                value={s.quantity}
                onChange={(e) => {
                  const copy = [...selected];
                  copy[idx].quantity = +e.target.value;
                  setSelected(copy);
                }}
              />
            </div>
          ))}
        </div>

        <button onClick={save}>Сохранить</button>
        <button onClick={onClose}>Закрыть</button>

      </div>
    </div>
  );
}
