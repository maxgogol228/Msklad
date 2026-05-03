import { useEffect, useState } from "react";
import API from "../api";

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");

  // =====================
  // Загрузка данных
  // =====================
  const load = async () => {
    try {
      const res = await API.get("/items");
      setItems(res.data);
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =====================
  // Добавление
  // =====================
  const addItem = async () => {
    try {
      await API.post("/items", {
        name: "Новая деталь",
        quantity: 0,
        min_quantity: 0,
        order_link: "",
        image: ""
      });

      await load();
    } catch (err) {
      console.error("Ошибка при добавлении:", err);
    }
  };

  // =====================
  // Редактирование
  // =====================
  const updateItem = async (id, field, value) => {
    try {
      const item = items.find(i => i.id === id);

      await API.put(`/items/${id}`, {
        ...item,
        [field]: value
      });

      await load();
    } catch (err) {
      console.error("Ошибка обновления:", err);
    }
  };

  // =====================
  // Фильтр
  // =====================
  const filteredItems = items.filter(i =>
    i.name?.toLowerCase().includes(filter.toLowerCase())
  );

  // =====================
  // UI
  // =====================
  return (
    <div style={{ padding: 20, color: "#fff" }}>
      
      {/* Верхняя панель */}
      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <button onClick={addItem}>Добавить деталь</button>

        <input
          placeholder="Фильтр..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Таблица */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#222" }}>
            <th>Фото</th>
            <th>Название</th>
            <th>Кол-во</th>
            <th>Мин.</th>
            <th>Заказ</th>
          </tr>
        </thead>

        <tbody>
          {filteredItems.map(item => (
            <tr key={item.id} style={{ borderBottom: "1px solid #333" }}>
              
              {/* Фото */}
              <td>
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    style={{ width: 40, height: 40 }}
                  />
                )}
              </td>

              {/* Название */}
              <td>
                <input
                  value={item.name || ""}
                  onChange={(e) =>
                    updateItem(item.id, "name", e.target.value)
                  }
                />
              </td>

              {/* Количество */}
              <td>
                <input
                  type="number"
                  value={item.quantity || 0}
                  onChange={(e) =>
                    updateItem(item.id, "quantity", Number(e.target.value))
                  }
                />
              </td>

              {/* Минимум */}
              <td>
                <input
                  type="number"
                  value={item.min_quantity || 0}
                  onChange={(e) =>
                    updateItem(item.id, "min_quantity", Number(e.target.value))
                  }
                />
              </td>

              {/* Заказ */}
              <td>
                {item.order_link ? (
                  <button
                    onClick={() => window.open(item.order_link, "_blank")}
                  >
                    Заказать
                  </button>
                ) : (
                  <input
                    placeholder="Ссылка"
                    value={item.order_link || ""}
                    onChange={(e) =>
                      updateItem(item.id, "order_link", e.target.value)
                    }
                  />
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
