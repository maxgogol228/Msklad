import React, { useEffect, useState } from "react";
import API from "../api";

export default function DeviceModal({ device, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [selected, setSelected] = useState([]);
  const [deviceName, setDeviceName] = useState(device?.name || "");
  const [showComposition, setShowComposition] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [itemsRes, consumablesRes] = await Promise.all([
          API.get("/items"),
          API.get("/consumables")
        ]);
        setItems(itemsRes.data || []);
        setConsumables(consumablesRes.data || []);
      } catch (e) {
        console.error("Error loading data:", e);
      }
    };
    loadData();

    // Загружаем существующий состав прибора
    if (device?.items && device.items.length > 0) {
      setSelected(device.items.map(item => ({
        id: Date.now() + Math.random(),
        item_id: item.item_id || null,
        consumable_id: item.consumable_id || null,
        quantity: item.quantity || 1,
        item_type: item.item_type || (item.item_id ? 'item' : 'consumable'),
        name: item.name || 'Неизвестный компонент',
        unit: item.unit || 'шт.'
      })));
    }
  }, [device]);

  const addComponent = (type, id) => {
    if (!id) return;
    
    const existingItem = type === 'item' 
      ? items.find(i => i.id === parseInt(id))
      : consumables.find(c => c.id === parseInt(id));
    
    if (!existingItem) return;

    // Проверяем, нет ли уже такого компонента
    const exists = selected.find(s => 
      (type === 'item' && s.item_id === existingItem.id) ||
      (type === 'consumable' && s.consumable_id === existingItem.id)
    );

    if (exists) {
      alert("Этот компонент уже добавлен в состав");
      return;
    }

    setSelected([...selected, {
      id: Date.now(),
      item_id: type === 'item' ? existingItem.id : null,
      consumable_id: type === 'consumable' ? existingItem.id : null,
      quantity: 1,
      item_type: type,
      name: existingItem.name,
      unit: existingItem.unit || 'шт.'
    }]);
  };

  const removeComponent = (index) => {
    setSelected(selected.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, quantity) => {
    const newSelected = [...selected];
    newSelected[index].quantity = Math.max(0, parseFloat(quantity) || 0);
    setSelected(newSelected);
  };

  const save = async () => {
    if (!deviceName.trim()) {
      alert("Введите название прибора");
      return;
    }

    try {
      const composition = selected
        .filter(s => s.quantity > 0)
        .map(s => ({
          item_id: s.item_id,
          consumable_id: s.consumable_id,
          quantity: s.quantity,
          item_type: s.item_type
        }));

      await API.put(`/devices/${device.id}`, {
        name: deviceName,
        items: composition
      });

      onSaved();
    } catch (e) {
      console.error("Error saving device:", e);
      alert("Ошибка сохранения прибора: " + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Редактирование прибора</h3>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        <div style={styles.content}>
          <div style={styles.field}>
            <label style={styles.label}>Название прибора:</label>
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              style={styles.input}
              placeholder="Введите название прибора"
            />
          </div>

          <div style={styles.compositionSection}>
            <div style={styles.compositionHeader}>
              <label style={styles.label}>Состав прибора:</label>
              <button 
                onClick={() => setShowComposition(!showComposition)}
                style={styles.toggleButton}
              >
                {showComposition ? '▲ Свернуть' : '▼ Развернуть'}
              </button>
            </div>

            {showComposition && (
              <div style={styles.compositionContent}>
                {/* Добавление деталей */}
                <div style={styles.addSection}>
                  <div style={styles.addGroup}>
                    <label style={styles.smallLabel}>🔩 Добавить деталь:</label>
                    <select 
                      onChange={(e) => { 
                        addComponent('item', e.target.value); 
                        e.target.value = ''; 
                      }}
                      style={styles.select}
                    >
                      <option value="">Выбрать деталь...</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} (на складе: {i.quantity} шт.)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Добавление расходников */}
                  <div style={styles.addGroup}>
                    <label style={styles.smallLabel}>🔧 Добавить расходник:</label>
                    <select 
                      onChange={(e) => { 
                        addComponent('consumable', e.target.value); 
                        e.target.value = ''; 
                      }}
                      style={styles.select}
                    >
                      <option value="">Выбрать расходник...</option>
                      {consumables.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (на складе: {c.quantity} {c.unit || 'шт.'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Список добавленных компонентов */}
                {selected.length > 0 && (
                  <div style={styles.selectedList}>
                    <h4 style={styles.subTitle}>
                      Добавленные компоненты ({selected.length}):
                    </h4>
                    {selected.map((comp, index) => (
                      <div key={comp.id} style={styles.componentRow}>
                        <span style={styles.componentType}>
                          {comp.item_type === 'consumable' ? '🔧' : '🔩'}
                        </span>
                        <span style={styles.componentName}>{comp.name}</span>
                        {comp.unit && comp.unit !== 'шт.' && (
                          <span style={styles.componentUnit}>({comp.unit})</span>
                        )}
                        <div style={styles.componentQuantity}>
                          <button 
                            onClick={() => updateQuantity(index, comp.quantity - 1)}
                            style={styles.qtyButton}
                            disabled={comp.quantity <= 0}
                          >−</button>
                          <input
                            type="number"
                            value={comp.quantity}
                            onChange={(e) => updateQuantity(index, e.target.value)}
                            style={styles.qtyInput}
                            min="0"
                            step={comp.item_type === 'consumable' ? "0.1" : "1"}
                          />
                          <button 
                            onClick={() => updateQuantity(index, comp.quantity + 1)}
                            style={styles.qtyButton}
                          >+</button>
                        </div>
                        <button 
                          onClick={() => removeComponent(index)}
                          style={styles.removeButton}
                          title="Удалить из состава"
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {selected.length === 0 && (
                  <div style={styles.emptyComposition}>
                    Выберите детали и расходники для добавления в состав прибора
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={save} style={styles.saveButton}>
            ✓ Сохранить
          </button>
          <button onClick={onClose} style={styles.cancelButton}>
            ✕ Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    background: '#2a2a2a',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid #b30000'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #444'
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '20px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer'
  },
  content: {
    padding: '20px'
  },
  field: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    color: '#aaa',
    marginBottom: '8px',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '10px',
    background: '#1e1e1e',
    border: '1px solid #555',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  compositionSection: {
    marginTop: '20px'
  },
  compositionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  toggleButton: {
    background: '#444',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  compositionContent: {
    background: '#1e1e1e',
    padding: '15px',
    borderRadius: '8px'
  },
  addSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px'
  },
  addGroup: {
    width: '100%'
  },
  smallLabel: {
    display: 'block',
    color: '#aaa',
    marginBottom: '5px',
    fontSize: '12px'
  },
  select: {
    width: '100%',
    padding: '8px',
    background: '#333',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer'
  },
  selectedList: {
    marginTop: '15px'
  },
  subTitle: {
    color: '#fff',
    fontSize: '14px',
    marginBottom: '10px'
  },
  componentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    background: '#333',
    borderRadius: '6px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  componentType: {
    fontSize: '16px'
  },
  componentName: {
    flex: 1,
    color: '#fff',
    fontSize: '14px',
    minWidth: '150px'
  },
  componentUnit: {
    color: '#888',
    fontSize: '12px'
  },
  componentQuantity: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  qtyButton: {
    background: '#555',
    color: '#fff',
    border: 'none',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qtyInput: {
    width: '60px',
    padding: '4px',
    background: '#1e1e1e',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#fff',
    textAlign: 'center',
    fontSize: '14px'
  },
  removeButton: {
    background: '#660000',
    color: '#ff6666',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  emptyComposition: {
    textAlign: 'center',
    color: '#666',
    padding: '20px',
    fontSize: '14px',
    fontStyle: 'italic'
  },
  footer: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    padding: '20px',
    borderTop: '1px solid #444'
  },
  saveButton: {
    background: '#006600',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  cancelButton: {
    background: '#666',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};
