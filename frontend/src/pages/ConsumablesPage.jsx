import React, { Fragment, useEffect, useState } from "react";
import API from "../api";

export default function ConsumablesPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const units = ['шт.', 'см', 'м', 'мм', 'кг', 'г'];

  const load = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        API.get("/consumables"),
        API.get("/categories?type=consumable")
      ]);
      
      const loadedItems = itemsRes.data || [];
      setItems(loadedItems);
      setCategories(categoriesRes.data || []);
      checkMinimums(loadedItems);
    } catch (e) {
      console.error("Error loading data:", e);
    }
  };

  const checkMinimums = (itemsList) => {
    const newNotifications = [];
    itemsList.forEach(item => {
      if (item.min_quantity && parseFloat(item.quantity) <= parseFloat(item.min_quantity)) {
        newNotifications.push({
          id: item.id,
          message: `⚠️ ${item.name}: ${item.quantity} ${item.unit || 'шт.'} (минимум: ${item.min_quantity})`,
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
    try {
      const res = await API.post("/consumables", { 
        name: "Новый расходник", 
        quantity: 0,
        min_quantity: null,
        unit: 'шт.',
        category_id: null
      });
      
      const newItem = res.data;
      setItems([newItem, ...items]);
      setEditingId(newItem.id);
      setEditData(newItem);
    } catch (e) {
      console.error("Error adding consumable:", e);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Введите название категории");
      return;
    }
    
    try {
      await API.post("/categories", { name: newCategoryName, type: "consumable" });
      setNewCategoryName("");
      load();
    } catch (e) {
      console.error("Error adding category:", e);
      alert("Ошибка создания категории");
    }
  };

  const deleteCategory = async (id) => {
    if (!confirm("Удалить категорию? Все расходники в ней станут без категории.")) return;
    
    try {
      await API.delete(`/categories/${id}`);
      load();
    } catch (e) {
      console.error("Error deleting category:", e);
      alert("Ошибка удаления категории");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = async () => {
    try {
      const updatedItem = {
        ...editData,
        category_id: editData.category_id || null,
        min_quantity: editData.min_quantity || null,
        unit: editData.unit || 'шт.'
      };
      
      await API.put(`/consumables/${editingId}`, updatedItem);
      setEditingId(null);
      setEditData({});
      load();
    } catch (e) {
      console.error("Error saving consumable:", e);
      alert("Ошибка сохранения");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const remove = async (id) => {
    if (!confirm("Удалить расходник? Он будет перемещён в архив.")) return;
    try {
      await API.delete(`/consumables/${id}`);
      load();
    } catch (e) {
      console.error("Error deleting consumable:", e);
      alert("Ошибка удаления");
    }
  };

  const updateQuantity = async (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const newQuantity = Math.max(0, parseFloat(item.quantity) + delta);
    try {
      await API.put(`/consumables/${id}`, { ...item, quantity: newQuantity });
      
      setItems(items.map(i => 
        i.id === id ? { ...i, quantity: newQuantity } : i
      ));
    } catch (e) {
      console.error("Error updating quantity:", e);
      load();
    }
  };

  const getItemsByCategory = () => {
    const grouped = {};
    
    categories.forEach(cat => {
      grouped[cat.id] = [];
    });
    grouped['uncategorized'] = [];
    
    items.forEach(item => {
      const key = item.category_id || 'uncategorized';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return grouped;
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return "Без категории";
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Без категории";
  };

  const groupedItems = getItemsByCategory();

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
        <div style={styles.headerButtons}>
          <button 
            onClick={() => setShowCategoryManager(!showCategoryManager)} 
            style={styles.categoryButton}
          >
            📁 Категории ({categories.length})
          </button>
          <button onClick={add} style={styles.addButton}>
            + Добавить расходник
          </button>
        </div>
      </div>

      {showCategoryManager && (
        <div style={styles.categoryManager}>
          <h3 style={styles.categoryTitle}>Управление категориями</h3>
          
          <div style={styles.addCategoryForm}>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Название новой категории"
              style={styles.categoryInput}
              onKeyPress={(e) => e.key === 'Enter' && addCategory()}
            />
            <button onClick={addCategory} style={styles.addCategoryButton}>
              + Добавить
            </button>
          </div>
          
          <div style={styles.categoriesList}>
            {categories.length === 0 ? (
              <div style={styles.noCategories}>Нет созданных категорий</div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} style={styles.categoryItem}>
                  <span style={styles.categoryItemName}>📁 {cat.name}</span>
                  <button 
                    onClick={() => deleteCategory(cat.id)}
                    style={styles.deleteCategoryButton}
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: "50px" }}>№</th>
              <th style={styles.th}>Название</th>
              <th style={styles.th}>Категория</th>
              <th style={styles.th}>Количество</th>
              <th style={styles.th}>Ед. изм.</th>
              <th style={styles.th}>Мин. запас</th>
              <th style={styles.th}>Статус</th>
              <th style={styles.th}>Действия</th>
            </tr>
          </thead>

          <tbody>
            {categories.map(cat => {
              const catItems = groupedItems[cat.id] || [];
              
              return (
                <Fragment key={cat.id}>
                  <tr style={styles.categoryRow}>
                    <td colSpan={8} style={styles.categoryCell}>
                      <div style={styles.categoryHeader}>
                        <span>📁 {cat.name}</span>
                        <span style={styles.categoryCount}>
                          {catItems.length} поз.
                        </span>
                      </div>
                    </td>
                  </tr>
                  
                  {catItems.map((item, index) => {
                    const isLowStock = item.min_quantity && parseFloat(item.quantity) <= parseFloat(item.min_quantity);
                    const isEditing = editingId === item.id;
                    
                    return (
                      <tr 
                        key={item.id} 
                        style={{
                          ...styles.tr,
                          background: isLowStock ? 'rgba(255, 0, 0, 0.15)' : 'transparent',
                          borderLeft: isLowStock ? '4px solid #ff4444' : '4px solid transparent'
                        }}
                      >
                        <td style={{ ...styles.td, color: "#888", textAlign: "center", width: "50px" }}>
                          {index + 1}
                        </td>
                        
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              value={editData.name || ''}
                              onChange={e => setEditData({ ...editData, name: e.target.value })}
                              style={styles.editInput}
                              autoFocus
                            />
                          ) : (
                            <span style={{
                              color: isLowStock ? '#ff6666' : '#fff',
                              fontWeight: isLowStock ? 'bold' : 'normal'
                            }}>
                              {item.name}
                            </span>
                          )}
                        </td>

                        <td style={styles.td}>
                          {isEditing ? (
                            <select
                              value={editData.category_id || ''}
                              onChange={e => setEditData({ ...editData, category_id: e.target.value || null })}
                              style={styles.editSelect}
                            >
                              <option value="">Без категории</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={{
                              color: item.category_id ? '#4a9eff' : '#666',
                              background: item.category_id ? 'rgba(74, 158, 255, 0.15)' : 'transparent',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              border: item.category_id ? '1px solid rgba(74, 158, 255, 0.3)' : '1px solid transparent'
                            }}>
                              {getCategoryName(item.category_id)}
                            </span>
                          )}
                        </td>

                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editData.quantity || 0}
                              onChange={e => setEditData({ ...editData, quantity: parseFloat(e.target.value) || 0 })}
                              style={styles.editInput}
                              min="0"
                            />
                          ) : (
                            <div style={styles.quantityControl}>
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                style={styles.qtyButton}
                                disabled={parseFloat(item.quantity) === 0}
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
                            <select
                              value={editData.unit || 'шт.'}
                              onChange={e => setEditData({ ...editData, unit: e.target.value })}
                              style={styles.editSelect}
                            >
                              {units.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={styles.unit}>
                              {item.unit || 'шт.'}
                            </span>
                          )}
                        </td>

                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editData.min_quantity || ''}
                              onChange={e => setEditData({ 
                                ...editData, 
                                min_quantity: e.target.value ? parseFloat(e.target.value) : null 
                              })}
                              style={styles.editInput}
                              min="0"
                              placeholder="Не задано"
                            />
                          ) : (
                            <span style={{ 
                              color: item.min_quantity ? '#aaa' : '#666',
                              fontSize: '13px'
                            }}>
                              {item.min_quantity ? `${item.min_quantity} ${item.unit || 'шт.'}` : '—'}
                            </span>
                          )}
                        </td>

                        <td style={styles.td}>
                          {isLowStock ? (
                            <span style={styles.statusWarning}>⚠️ Мало</span>
                          ) : parseFloat(item.quantity) === 0 ? (
                            <span style={styles.statusOut}>● Нет</span>
                          ) : (
                            <span style={styles.statusOk}>✓ Норма</span>
                          )}
                        </td>

                        <td style={styles.td}>
                          {isEditing ? (
                            <div style={styles.actionButtons}>
                              <button onClick={saveEdit} style={styles.saveButton} title="Сохранить">
                                ✓
                              </button>
                              <button onClick={cancelEdit} style={styles.cancelButton} title="Отмена">
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div style={styles.actionButtons}>
                              <button onClick={() => startEdit(item)} style={styles.editButton} title="Редактировать">
                                ✎
                              </button>
                              <button onClick={() => remove(item.id)} style={styles.deleteButton} title="Удалить в архив">
                                🗑
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
            
            {(groupedItems['uncategorized'] && groupedItems['uncategorized'].length > 0) && (
              <Fragment>
                <tr style={styles.categoryRow}>
                  <td colSpan={8} style={styles.categoryCell}>
                    <div style={styles.categoryHeader}>
                      <span>📁 Без категории</span>
                      <span style={styles.categoryCount}>
                        {groupedItems['uncategorized'].length} поз.
                      </span>
                    </div>
                  </td>
                </tr>
                
                {groupedItems['uncategorized'].map((item, index) => {
                  const isLowStock = item.min_quantity && parseFloat(item.quantity) <= parseFloat(item.min_quantity);
                  const isEditing = editingId === item.id;
                  
                  return (
                    <tr 
                      key={item.id} 
                      style={{
                        ...styles.tr,
                        background: isLowStock ? 'rgba(255, 0, 0, 0.15)' : 'transparent',
                        borderLeft: isLowStock ? '4px solid #ff4444' : '4px solid transparent'
                      }}
                    >
                      <td style={{ ...styles.td, color: "#888", textAlign: "center", width: "50px" }}>
                        {index + 1}
                      </td>
                      
                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            value={editData.name || ''}
                            onChange={e => setEditData({ ...editData, name: e.target.value })}
                            style={styles.editInput}
                            autoFocus
                          />
                        ) : (
                          <span style={{
                            color: isLowStock ? '#ff6666' : '#fff',
                            fontWeight: isLowStock ? 'bold' : 'normal'
                          }}>
                            {item.name}
                          </span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <select
                            value={editData.category_id || ''}
                            onChange={e => setEditData({ ...editData, category_id: e.target.value || null })}
                            style={styles.editSelect}
                          >
                            <option value="">Без категории</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{
                            color: '#666',
                            padding: '4px 8px',
                            fontSize: '13px'
                          }}>
                            Без категории
                          </span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData.quantity || 0}
                            onChange={e => setEditData({ ...editData, quantity: parseFloat(e.target.value) || 0 })}
                            style={styles.editInput}
                            min="0"
                          />
                        ) : (
                          <div style={styles.quantityControl}>
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              style={styles.qtyButton}
                              disabled={parseFloat(item.quantity) === 0}
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
                          <select
                            value={editData.unit || 'шт.'}
                            onChange={e => setEditData({ ...editData, unit: e.target.value })}
                            style={styles.editSelect}
                          >
                            {units.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={styles.unit}>
                            {item.unit || 'шт.'}
                          </span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData.min_quantity || ''}
                            onChange={e => setEditData({ 
                              ...editData, 
                              min_quantity: e.target.value ? parseFloat(e.target.value) : null 
                            })}
                            style={styles.editInput}
                            min="0"
                            placeholder="Не задано"
                          />
                        ) : (
                          <span style={{ 
                            color: item.min_quantity ? '#aaa' : '#666',
                            fontSize: '13px'
                          }}>
                            {item.min_quantity ? `${item.min_quantity} ${item.unit || 'шт.'}` : '—'}
                          </span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {isLowStock ? (
                          <span style={styles.statusWarning}>⚠️ Мало</span>
                        ) : parseFloat(item.quantity) === 0 ? (
                          <span style={styles.statusOut}>● Нет</span>
                        ) : (
                          <span style={styles.statusOk}>✓ Норма</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <div style={styles.actionButtons}>
                            <button onClick={saveEdit} style={styles.saveButton} title="Сохранить">
                              ✓
                            </button>
                            <button onClick={cancelEdit} style={styles.cancelButton} title="Отмена">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={styles.actionButtons}>
                            <button onClick={() => startEdit(item)} style={styles.editButton} title="Редактировать">
                              ✎
                            </button>
                            <button onClick={() => remove(item.id)} style={styles.deleteButton} title="Удалить в архив">
                              🗑
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            )}
            
            {items.length === 0 && (
              <tr>
                <td colSpan={8} style={styles.emptyMessage}>
                  Нет расходников. Нажмите "Добавить расходник" для создания.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    height: '100%',
    color: '#fff'
  },
  notifications: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  notification: {
    background: 'linear-gradient(135deg, rgba(255, 50, 50, 0.2), rgba(200, 0, 0, 0.2))',
    border: '1px solid rgba(255, 0, 0, 0.3)',
    color: '#ff6666',
    padding: '12px 15px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px'
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
    fontSize: '24px',
    fontWeight: 'bold'
  },
  headerButtons: {
    display: 'flex',
    gap: '10px'
  },
  categoryButton: {
    background: '#444',
    color: '#fff',
    border: '1px solid #555',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  addButton: {
    background: '#b30000',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  categoryManager: {
    background: '#2a2a2a',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #444'
  },
  categoryTitle: {
    color: '#fff',
    margin: '0 0 15px 0',
    fontSize: '16px'
  },
  addCategoryForm: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  categoryInput: {
    flex: 1,
    background: '#1e1e1e',
    border: '1px solid #555',
    padding: '8px 12px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px'
  },
  addCategoryButton: {
    background: '#006600',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  categoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  noCategories: {
    color: '#666',
    fontSize: '14px',
    padding: '10px'
  },
  categoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#333',
    borderRadius: '4px'
  },
  categoryItemName: {
    color: '#fff',
    fontSize: '14px'
  },
  deleteCategoryButton: {
    background: 'none',
    border: 'none',
    color: '#ff6666',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #444'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#2a2a2a',
    minWidth: '1000px'
  },
  th: {
    background: '#333',
    color: '#fff',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #b30000',
    fontSize: '14px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  categoryRow: {
    background: '#252525'
  },
  categoryCell: {
    padding: '12px',
    borderBottom: '2px solid #b30000'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  categoryCount: {
    color: '#888',
    fontSize: '12px',
    fontWeight: 'normal'
  },
  tr: {
    transition: 'background 0.2s',
    borderBottom: '1px solid #3a3a3a'
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #3a3a3a',
    color: '#fff',
    fontSize: '14px'
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
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
  },
  quantity: {
    minWidth: '40px',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: '16px'
  },
  unit: {
    color: '#aaa',
    background: 'rgba(255,255,255,0.05)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    border: '1px solid #444'
  },
  editInput: {
    background: '#1e1e1e',
    color: '#fff',
    border: '1px solid #555',
    padding: '6px 8px',
    borderRadius: '4px',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px'
  },
  editSelect: {
    background: '#1e1e1e',
    color: '#fff',
    border: '1px solid #555',
    padding: '6px 8px',
    borderRadius: '4px',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
    cursor: 'pointer'
  },
  statusWarning: {
    color: '#ff4444',
    fontWeight: 'bold',
    background: 'rgba(255, 0, 0, 0.15)',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    border: '1px solid rgba(255, 0, 0, 0.3)'
  },
  statusOk: {
    color: '#44ff44',
    background: 'rgba(0, 255, 0, 0.1)',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    border: '1px solid rgba(0, 255, 0, 0.2)'
  },
  statusOut: {
    color: '#888',
    background: 'rgba(136, 136, 136, 0.1)',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    border: '1px solid rgba(136, 136, 136, 0.2)'
  },
  actionButtons: {
    display: 'flex',
    gap: '6px'
  },
  editButton: {
    background: '#444',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
  },
  deleteButton: {
    background: '#660000',
    color: '#ff6666',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
  },
  saveButton: {
    background: '#006600',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    background: '#666',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyMessage: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px'
  }
};
