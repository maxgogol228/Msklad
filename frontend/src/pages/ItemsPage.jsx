import { useEffect, useState } from "react";
import API from "../api";

export default function ItemsPage() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const res = await API.get("/items");
    setItems(res.data || []);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    const name = prompt("Название");
    if (!name) return;

    await API.post("/items", { name, quantity: 0 });
    load();
  };

  const remove = async (id) => {
    if (!confirm("Удалить?")) return;
    await API.delete(`/items/${id}`);
    load();
  };

  return (
    <div>
      <h2>Детали</h2>
      <button onClick={add}>+ Добавить</button>

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
              <td>{i.name}</td>
              <td>{i.quantity}</td>
              <td>
                <button onClick={() => remove(i.id)}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
