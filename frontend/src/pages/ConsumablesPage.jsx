import React, { useEffect, useState } from "react";
import API from "../api";

export default function ConsumablesPage() {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [notifications, setNotifications] = useState([]);

  const load = async () => {
    try {
      const res = await API.get("/consumables");
      const loadedItems = res.data || [];
      setItems(loadedItems);
      checkMinimums(loadedItems);
    } catch (e) {
      console.error("Error loading consumables:", e);
    }
  };

  const checkMinimums = (itemsList) => {
    const newNotifications = [];
    itemsList.forEach(item => {
      if (item.min_quantity && item.quantity <= item.min_quantity) {
        newNotifications.push({
          id: item.id,
          message: `⚠️ ${item.name}: ${item.quantity} шт. (минимум: ${item.min_quantity})`,
          type: 'warning'
        });
      }
    });
    setNotifications(newNotifications);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const add = async () => {
    const name = prompt("Название расходника:");
    if (!name) return;
    
    const minQuantity = prompt("Минимальное количество (оставьте пустым, если не нужно):", "0");
    
    try {
      await API.post("/consumables", {
        name,
        quantity: 0,
        min_quantity: minQuantity ? parseInt(minQuantity) : null
      });
      load();
    } catch (e) {
      console.error("Error adding consumable:", e);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = async () => {
    try {
      await API.put(`/consumables/${editingId}`, editData);
      setEditingId(null);
      setEditData({});
      load();
    } catch (e) {
      console.error("Error saving consumable:", e);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить?")) return;
    try {
      await API.delete(`/consumables/${id}`);
      load();
    } catch (e) {
      console.error("Error deleting consumable:", e);
    }
  };

  const updateQuantity = async (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const newQuantity = Math.max(0, item.quantity + delta);
    try {
      await API.put(`/consumables/${id}`, { ...item, quantity: newQuantity });
      load();
    } catch (e) {
      console.error("Error updating quantity:", e);
    }
  };

  return (
    <div style={styles.container}>
      {notifications.length > 0 && (
        <div style={styles.notifications}>
          {notifications.map(notif => (
            <div key={notif.id} style={styles.notification}>
              <span>{notif.message}</span>
              <button
                onClick={() => setNotifications(notifications.filter(n => n.id !== notif.id))}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={styles.header}>
        <h2 style={styles.title}>🔧 Расходники</h2>
        <button onClick={add} style={styles.addButton}>
          + Добавить расходник
        </button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Название</th>
            <th style={styles.th}>Количество</th>
            <th style={styles.th}>Мин. запас</th>
            <th style={styles.th}>Статус</th>
            <th style={styles.th}>Действия</th>
          </tr>
        </thead>

        <tbody>
          {items.map(item => {
            const isLowStock = item.min_quantity && item.quantity <= item.min_quantity;
            const isEditing = editingId === item.id;
            
            return (
              <tr
                key={item.id}
                style={{
                  ...styles.tr,
                  background: isLowStock ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
                  borderLeft: isLowStock ? '3px solid #ff4444' : '3px solid transparent'
                }}
              >
                <td style={styles.td}>
                  {isEditing ? (
                    <input
                      value={editData.name || ''}
                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                      style={styles.editInput}
                    />
                  ) : (
                    <span style={isLowStock ? { color: '#ff6666', fontWeight: 'bold' } : {}}>
                      {item.name}
                    </span>
                  )}
                </td>

                <td style={styles.td}>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.quantity || 0}
                      onChange={e => setEditData({ ...editData, quantity: parseInt(e.target.value) })}
                      style={styles.editInput}
                      min="0"
                    />
                  ) : (
                    <div style={styles.quantityControl}>
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        style={styles.qtyButton}
                        disabled={item.quantity === 0}
                      >
                        −
                      </button>
                      <span style={{
                        ...styles.quantity,
                        color: isLowStock ? '#ff4444' : '#fff',
                        fontWeight: isLowStock ? 'bold' : 'normal'
                      }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        style={styles.qtyButton}
                      >
                        +
                      </button>
                    </div>
                  )}
                </td>

                <td style={styles.td}>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.min_quantity || 0}
                      onChange={e => setEditData({ ...editData, min_quantity: parseInt(e.target.value) || null })}
                      style={styles.editInput}
                      min="0"
                    />
                  ) : (
                    <span style={{ color: item.min_quantity ? '#aaa' : '#666' }}>
                      {item.min_quantity ? `${item.min_quantity} шт.` : 'Не задано'}
                    </span>
                  )}
                </td>

                <td style={styles.td}>
                  {isLowStock ? (
                    <span style={styles.statusWarning}>⚠️ Мало</span>
                  ) : (
                    <span style={styles.statusOk}>✓ Норма</span>
                  )}
                </td>

                <td style={styles.td}>
                  {isEditing ? (
                    <div style={styles.actionButtons}>
                      <button onClick={saveEdit} style={styles.saveButton}>
                        ✓ Сохранить
                      </button>
                      <button onClick={cancelEdit} style={styles.cancelButton}>
                        ✕ Отмена
                      </button>
                    </div>
                  ) : (
                    <div style={styles.actionButtons}>
                      <button onClick={() => startEdit(item)} style={styles.editButton}>
                        ✎ Изменить
                      </button>
                      <button onClick={() => remove(item.id)} style={styles.deleteButton}>
                        🗑 Удалить
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    height: '100%'
  },
  notifications: {
    marginBottom: '20px'
  },
  notification: {
    background: 'linear-gradient(135deg, rgba(255, 50, 50, 0.2), rgba(200, 0, 0, 0.2))',
    border: '1px solid rgba(255, 0, 0, 0.3)',
    color: '#ff6666',
    padding: '12px 15px',
    borderRadius: '8px',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#ff6666',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '0 5px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '24px'
  },
  addButton: {
    background: '#b30000',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#2a2a2a',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  th: {
    background: '#333',
    color: '#fff',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #b30000',
    fontSize: '14px'
  },
  tr: {
    transition: 'background 0.3s',
    borderBottom: '1px solid #444'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #444',
    color: '#fff'
  },
  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  qtyButton: {
    background: '#444',
    color: '#fff',
    border: 'none',
    width: '30px',
    height: '30px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quantity: {
    minWidth: '30px',
    textAlign: 'center',
    fontSize: '16px'
  },
  editInput: {
    background: '#1e1e1e',
    color: '#fff',
    border: '1px solid #555',
    padding: '8px',
    borderRadius: '4px',
    width: '100%',
    boxSizing: 'border-box'
  },
  statusWarning: {
    color: '#ff4444',
    fontWeight: 'bold',
    background: 'rgba(255, 0, 0, 0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px'
  },
  statusOk: {
    color: '#44ff44',
    background: 'rgba(0, 255, 0, 0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px'
  },
  actionButtons: {
    display: 'flex',
    gap: '5px'
  },
  editButton: {
    background: '#444',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  deleteButton: {
    background: '#660000',
    color: '#ff6666',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  saveButton: {
    background: '#006600',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  cancelButton: {
    background: '#666',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  }
};
