import { useEffect, useState } from "react";
import API from "../api";

export default function AdminPage() {
  const [users, setUsers] = useState([]);

  const load = async () => {
    const res = await API.get("/users");
    setUsers(res.data);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    await API.post(`/users/approve/${id}`);
    load();
  };

  const makeAdmin = async (id) => {
    await API.post(`/users/make-admin/${id}`);
    load();
  };

  const removeAdmin = async (id) => {
    await API.post(`/users/remove-admin/${id}`);
    load();
  };

  const removeUser = async (id) => {
    if (!confirm("Удалить пользователя?")) return;
    await API.delete(`/users/${id}`);
    load();
  };

  return (
    <div>
      <h2>Админ панель</h2>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Имя</th>
            <th>Подтверждён</th>
            <th>Админ</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.approved ? "Да" : "Нет"}</td>
              <td>{u.is_admin ? "Да" : "Нет"}</td>

              <td>
                {!u.approved && (
                  <button onClick={() => approve(u.id)}>✔</button>
                )}

                {!u.is_admin && (
                  <button onClick={() => makeAdmin(u.id)}>+Admin</button>
                )}

                {u.is_admin && (
                  <button onClick={() => removeAdmin(u.id)}>−Admin</button>
                )}

                <button onClick={() => removeUser(u.id)}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
