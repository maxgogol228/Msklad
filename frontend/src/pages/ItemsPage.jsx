import { useEffect, useState } from "react";
import API from "../api";

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [filter, setFilter] = useState("");

  // =====================
  // Загрузка
  // =====================
  const load = async () => {
    const res = await API.get("/items");
    setItems(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  // =====================
  // Добавление
  // =====================
  const addItem = async () => {
    await API.post("/items", {
      name: "Новая деталь",
      quantity: 0,
      min_quantity: 0,
      order_link: "",
      image: ""
    });

    load();
  };

  // =====================
  // Удаление
  // =====================
  const deleteItem = async (id) => {
    if (!window.confirm("Удалить деталь?")) return;

    await API.delete(`/items/${id}`);
    load();
  };

  // =====================
  // Редактирование
  // =====================
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData(item);
  };

  const saveEdit = async () => {
    await API.put(`/items/${editingId}`, editData);
    setEditingId(null);
    load();
  };

  // =====================
  // Фильтр
  // =====================
  const filtered = items.filter(i =>
    i.name?.toLowerCase().includes(filter.toLowerCase())
  );

  // =====================
  // UI
  // =====================
  return (
    <div style={{ padding: 20 }}>

      <h2>Детали</h2>

      <div style={{ marginBottom: 10 }}>
        <button onClick={addItem}>Добавить деталь</button>

        <input
          placeholder="Фильтр..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ marginLeft: 10 }}
        />
      </div>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Название</th>
            <th>Кол-во</th>
            <th>Мин</th>
            <th>Заказ</th>
            <th>Действия</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map(item => (
            <tr key={item.id}>

              {/* Название */}
              <td>
                {editingId === item.id ? (
                  <input
                    value={editData.name}
                    onChange={e =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                  />
                ) : (
                  item.name
                )}
              </td>

              {/* Кол-во */}
              <td>
                {editingId === item.id ? (
                  <input
                    type="number"
                    value={editData.quantity}
                    onChange={e =>
                      setEditData({ ...editData, quantity: +e.target.value })
                    }
                  />
                ) : (
                  item.quantity
                )}
              </td>

              {/* Мин */}
              <td>
                {editingId === item.id ? (
                  <input
                    type="number"
                    value={editData.min_quantity}
                    onChange={e =>
                      setEditData({ ...editData, min_quantity: +e.target.value })
                    }
                  />
                ) : (
                  item.min_quantity
                )}
              </td>

              {/* Заказ */}
              <td>
                {editingId === item.id ? (
                  <input
                    value={editData.order_link || ""}
                    onChange={e =>
                      setEditData({ ...editData, order_link: e.target.value })
                    }
                  />
                ) : item.order_link ? (
                  <button onClick={() => window.open(item.order_link)}>
                    Заказать
                  </button>
                ) : (
                  "-"
                )}
              </td>

              {/* Действия */}
              <td>
                {editingId === item.id ? (
                  <>
                    <button onClick={saveEdit}>Сохранить</button>
                    <button onClick={() => setEditingId(null)}>Отмена</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(item)}>Изменить</button>
                    <button onClick={() => deleteItem(item.id)}>Удалить</button>
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
