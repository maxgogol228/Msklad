import { useEffect, useState } from "react";
import API from "../api";

export default function ConsumablesPage() {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const load = async () => {
    const res = await API.get("/consumables");
    setItems(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    await API.post("/consumables", {
      name: "Новый расходник",
      quantity: 0
    });
    load();
  };

  const save = async () => {
    await API.put(`/consumables/${editingId}`, editData);
    setEditingId(null);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить?")) return;
    await API.delete(`/consumables/${id}`);
    load();
  };

  return (
    <div>
      <h2>Расходники</h2>

      <button onClick={add}>Добавить</button>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Название</th>
            <th>Кол-во</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {items.map(i => (
            <tr key={i.id}>
              <td>
                {editingId === i.id ? (
                  <input
                    value={editData.name}
                    onChange={e =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                  />
                ) : (
                  i.name
                )}
              </td>

              <td>
                {editingId === i.id ? (
                  <input
                    type="number"
                    value={editData.quantity}
                    onChange={e =>
                      setEditData({
                        ...editData,
                        quantity: +e.target.value
                      })
                    }
                  />
                ) : (
                  i.quantity
                )}
              </td>

              <td>
                {editingId === i.id ? (
                  <>
                    <button onClick={save}>Сохранить</button>
                    <button onClick={() => setEditingId(null)}>
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => {
                      setEditingId(i.id);
                      setEditData(i);
                    }}>
                      Изменить
                    </button>

                    <button onClick={() => remove(i.id)}>
                      Удалить
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
