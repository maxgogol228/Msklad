import React, { useEffect, useState } from "react";
import API from "../api";

export default function DeviceModal({ device, onClose, onSaved, user }) {
  const [items, setItems] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [components, setComponents] = useState([]);
  const [deviceName, setDeviceName] = useState(device?.name || "");
  const [newComponentName, setNewComponentName] = useState("");
  const [stockWarnings, setStockWarnings] = useState([]);
  const [assembledCheck, setAssembledCheck] = useState(null);
  const isAdmin = user && (user.is_admin || user.login?.toLowerCase() === 'admin');

  useEffect(() => {
    loadData();
    loadExistingComponents();
    if (device?.id) checkAssembledComponents();
  }, [device]);

  const loadData = async () => {
    try {
      const [i, c] = await Promise.all([API.get("/items"), API.get("/consumables")]);
      setItems(i.data || []);
      setConsumables(c.data || []);
    } catch (e) {}
  };

  const loadExistingComponents = () => {
    if (!device?.items || device.items.length === 0) {
      setComponents([]);
      return;
    }
    const grouped = {};
    device.items.forEach(item => {
      const componentKey = item.component_name || 'Основной компонент';
      const subtaskKey = item.subtask_name || 'Основная сборка';
      if (!grouped[componentKey]) grouped[componentKey] = {};
      if (!grouped[componentKey][subtaskKey]) {
        const totalMin = item.time_estimate || 240;
        grouped[componentKey][subtaskKey] = {
          hours: Math.floor(totalMin / 60),
          minutes: totalMin % 60,
          items: []
        };
      }
      grouped[componentKey][subtaskKey].items.push({
        id: Date.now() + Math.random(),
        item_id: item.item_id || null,
        consumable_id: item.consumable_id || null,
        component_id: item.item_id || item.consumable_id,
        quantity: item.quantity || 1,
        item_type: item.item_type || (item.item_id ? 'item' : 'consumable'),
        name: item.name || 'Компонент',
        unit: item.unit || 'шт.'
      });
    });
    const formatted = Object.entries(grouped).map(([compName, subtasks]) => ({
      id: Date.now() + Math.random(),
      name: compName,
      subtasks: Object.entries(subtasks).map(([subName, data]) => ({
        id: Date.now() + Math.random(),
        name: subName,
        hours: data.hours,
        minutes: data.minutes,
        items: data.items
      }))
    }));
    setComponents(formatted);
  };

  // Проверка собранных компонентов
  const checkAssembledComponents = async () => {
    try {
      const res = await API.get(`/assembled/check/${device.id}`);
      setAssembledCheck(res.data);
    } catch (e) {}
  };

  // Расчет минимального запаса
  const calculateMinimumStock = () => {
    const warnings = [];
    const componentNeeds = {};
    components.forEach(comp => {
      comp.subtasks.forEach(st => {
        st.items.forEach(item => {
          if (item.quantity > 0 && item.component_id) {
            const key = `${item.item_type}_${item.component_id}`;
            if (!componentNeeds[key]) {
              componentNeeds[key] = { type: item.item_type, id: item.component_id, name: item.name, unit: item.unit || 'шт.', totalNeeded: 0 };
            }
            componentNeeds[key].totalNeeded += parseFloat(item.quantity) || 0;
          }
        });
      });
    });
    Object.values(componentNeeds).forEach(need => {
      const stockItem = need.type === 'item' ? items.find(i => i.id === need.id) : consumables.find(c => c.id === need.id);
      if (stockItem) {
        const available = parseFloat(stockItem.quantity) || 0;
        const required = need.totalNeeded;
        const suggestedMin = Math.ceil(required * 2);
        if (available < required) {
          warnings.push({ id: need.id, message: `🔴 "${need.name}": не хватает! Нужно ${required} ${need.unit}, есть ${available}`, type: 'error' });
        } else if (available < required * 2) {
          warnings.push({ id: need.id, message: `🟡 "${need.name}": хватит на 1 прибор (${required} ${need.unit})`, type: 'warning' });
        }
        if (!stockItem.min_quantity || stockItem.min_quantity < suggestedMin) {
          warnings.push({ id: need.id + '_min', message: `💡 "${need.name}": рекомендуемый мин. запас ${suggestedMin} ${need.unit}`, type: 'info' });
        }
      }
    });
    setStockWarnings(warnings);
  };

  useEffect(() => { calculateMinimumStock(); }, [components, items, consumables]);

  const addComponent = () => {
    const name = newComponentName.trim() || `Составляющая ${components.length + 1}`;
    setComponents([...components, { id: Date.now(), name, subtasks: [{ id: Date.now(), name: 'Основная сборка', hours: 4, minutes: 0, items: [] }] }]);
    setNewComponentName("");
  };

  const removeComponent = (index) => setComponents(components.filter((_, i) => i !== index));
  const updateComponentName = (index, value) => { const u = [...components]; u[index].name = value; setComponents(u); };

  const addSubtask = (compIndex) => {
    const u = [...components];
    u[compIndex].subtasks.push({ id: Date.now(), name: `Подзадача ${u[compIndex].subtasks.length + 1}`, hours: 4, minutes: 0, items: [] });
    setComponents(u);
  };

  const removeSubtask = (compIndex, si) => {
    const u = [...components];
    u[compIndex].subtasks = u[compIndex].subtasks.filter((_, i) => i !== si);
    setComponents(u);
  };

  const updateSubtaskName = (ci, si, value) => { const u = [...components]; u[ci].subtasks[si].name = value; setComponents(u); };
  const updateSubtaskHours = (ci, si, value) => { const u = [...components]; u[ci].subtasks[si].hours = Math.max(0, parseInt(value) || 0); setComponents(u); };
  const updateSubtaskMinutes = (ci, si, value) => { const u = [...components]; u[ci].subtasks[si].minutes = Math.max(0, Math.min(59, parseInt(value) || 0)); setComponents(u); };
  const getTotalMinutes = (subtask) => (subtask.hours || 0) * 60 + (subtask.minutes || 0);

  const addItem = (compIndex, subtaskIndex, type, itemId) => {
    if (!itemId) return;
    const id = parseInt(itemId);
    const source = type === 'item' ? items : consumables;
    const existing = source.find(s => s.id === id);
    if (!existing) return;
    const subtask = components[compIndex].subtasks[subtaskIndex];
    if (subtask.items.some(i => (type === 'item' && i.item_id === id) || (type === 'consumable' && i.consumable_id === id))) {
      alert("Уже добавлен"); return;
    }
    const u = [...components];
    u[compIndex].subtasks[subtaskIndex].items.push({
      id: Date.now(), item_id: type === 'item' ? id : null, consumable_id: type === 'consumable' ? id : null,
      component_id: id, quantity: 1, item_type: type, name: existing.name, unit: existing.unit || 'шт.'
    });
    setComponents(u);
  };

  const removeItem = (ci, si, ii) => {
    const u = [...components];
    u[ci].subtasks[si].items.splice(ii, 1);
    setComponents(u);
  };

  const updateQuantity = (ci, si, ii, value) => {
    const u = [...components];
    u[ci].subtasks[si].items[ii].quantity = Math.max(0, parseFloat(value) || 0);
    setComponents(u);
  };

  // Сборка отдельного компонента
  const assembleComponent = async (compName, subtaskName) => {
    if (!confirm(`Отметить "${subtaskName}" как собранный компонент?`)) return;
    try {
      await API.post("/assembled/assemble-component", {
        device_id: device.id,
        device_name: deviceName,
        component_name: `${compName} - ${subtaskName}`,
        subtask_name: subtaskName,
        quantity: 1,
        assembled_by: user.login
      });
      alert("✅ Компонент отмечен как собранный!");
      checkAssembledComponents();
      onSaved();
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const saveComposition = async () => {
    if (!deviceName.trim()) { alert("Введите название"); return; }
    try {
      const allItems = [];
      components.forEach(comp => {
        comp.subtasks.forEach(st => {
          st.items.forEach(item => {
            if (item.quantity > 0) {
              allItems.push({
                item_id: item.item_id, consumable_id: item.consumable_id,
                quantity: item.quantity, item_type: item.item_type,
                component_name: comp.name, subtask_name: st.name,
                time_estimate: getTotalMinutes(st)
              });
            }
          });
        });
      });
      await API.put(`/devices/${device.id}`, { name: deviceName, items: allItems });
      // Установка минимальных запасов
      const minUpdates = [];
      for (const comp of components) {
        for (const st of comp.subtasks) {
          for (const item of st.items) {
            if (item.quantity > 0 && item.component_id) {
              const stockItem = item.item_type === 'item' ? items.find(i => i.id === item.component_id) : consumables.find(c => c.id === item.component_id);
              if (stockItem) {
                const suggestedMin = Math.ceil(item.quantity * 2);
                if (!stockItem.min_quantity || stockItem.min_quantity < suggestedMin) {
                  try {
                    if (item.item_type === 'item') await API.put(`/items/${stockItem.id}`, { ...stockItem, min_quantity: suggestedMin });
                    else await API.put(`/consumables/${stockItem.id}`, { ...stockItem, min_quantity: suggestedMin });
                    minUpdates.push(`${stockItem.name}: мин. запас ${suggestedMin} ${item.unit || 'шт.'}`);
                  } catch (e) {}
                }
              }
            }
          }
        }
      }
      if (minUpdates.length > 0) setTimeout(() => alert(`✅ Обновлены мин. запасы:\n${minUpdates.join('\n')}`), 500);
      onSaved();
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const createAssemblyTask = async () => {
    // Проверяем собранные компоненты
    const skippable = assembledCheck?.skippable_subtasks || [];
    // В функции createAssemblyTask, после определения skippable:
    if (skippable.length > 0) {
      // Списываем собранные компоненты
      for (const name of skippable) {
        try {
          await API.post("/assembled/use-component", {
            device_name: deviceName,
            component_name: name
          });
        } catch (e) {}
      }
    }
    const allSubtasks = [];
    let skippedCount = 0;
    components.forEach(comp => {
      comp.subtasks.forEach(st => {
        if (st.items.some(i => i.quantity > 0)) {
          const fullName = `${comp.name} - ${st.name}`;
          // Проверяем, собран ли уже этот компонент
          if (skippable.includes(fullName) || skippable.includes(st.name) || skippable.includes(comp.name)) {
            skippedCount++;
            return; // Пропускаем
          }
          allSubtasks.push({
            name: fullName,
            time_estimate: getTotalMinutes(st),
            components: st.items.filter(i => i.quantity > 0).map(i => ({
              item_type: i.item_type,
              component_id: i.item_id || i.consumable_id || i.component_id,
              item_id: i.item_id || null,
              consumable_id: i.consumable_id || null,
              component_name: i.name,
              quantity: i.quantity,
              unit: i.unit
            }))
          });
        }
      });
    });

    if (allSubtasks.length === 0 && skippedCount > 0) {
      alert("✅ Все компоненты уже собраны! Задача не требуется.");
      return;
    }
    if (allSubtasks.length === 0) {
      alert("Добавьте хотя бы одну подзадачу с компонентами");
      return;
    }

    let confirmMsg = `Создать задачу на сборку "${deviceName}"?\n\nПодзадач: ${allSubtasks.length}`;
    if (skippedCount > 0) confirmMsg += `\n\n⚠️ Пропущено собраных: ${skippedCount}`;
    if (!confirm(confirmMsg)) return;

    try {
      await API.post("/tasks", {
        device_id: device.id, device_name: deviceName,
        created_by: user.id, created_by_login: user.login,
        subtasks: allSubtasks
      });
      alert("✅ Задача создана!");
      onSaved();
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const formatTimeDisplay = (h, m) => {
    if (h > 0 && m > 0) return `${h}ч ${m}м`;
    if (h > 0) return `${h}ч`;
    return `${m}м`;
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}><h3 style={s.title}>{deviceName || 'Новый прибор'}</h3><button onClick={onClose} style={s.closeBtn}>✕</button></div>
        <div style={s.body}>
          {/* Предупреждения */}
          {stockWarnings.length > 0 && (
            <div style={s.warnings}>
              {stockWarnings.map(w => (
                <div key={w.id} style={{...s.warning, background: w.type==='error'?'rgba(255,0,0,0.15)':w.type==='warning'?'rgba(255,165,0,0.1)':'rgba(74,158,255,0.1)', borderColor: w.type==='error'?'rgba(255,0,0,0.4)':w.type==='warning'?'rgba(255,165,0,0.3)':'rgba(74,158,255,0.3)', color: w.type==='error'?'#ff6666':w.type==='warning'?'#ffaa44':'#4a9eff'}}>{w.message}</div>
              ))}
            </div>
          )}

          {/* Информация о собранных компонентах */}
          {assembledCheck && assembledCheck.assembled_components?.length > 0 && (
            <div style={s.assembledInfo}>
              <span>📦 Уже собрано: {assembledCheck.assembled_components.map(c => c.component_name).join(', ')}</span>
            </div>
          )}

          <div style={s.field}><label style={s.label}>Название прибора:</label><input value={deviceName} onChange={e => setDeviceName(e.target.value)} style={s.input} placeholder="Введите название" /></div>

          <div style={s.section}>
            <h4 style={s.sectionTitle}>Составляющие прибора ({components.length})</h4>
            <div style={s.addRow}><input value={newComponentName} onChange={e => setNewComponentName(e.target.value)} placeholder="Название составляющей" style={s.addInput} onKeyPress={e => e.key === 'Enter' && addComponent()} /><button onClick={addComponent} style={s.addBtn}>+ Добавить</button></div>

            {components.length === 0 ? <div style={s.empty}>Добавьте составляющие</div> :
              components.map((comp, ci) => (
                <div key={comp.id} style={s.compCard}>
                  <div style={s.compHeader}>
                    <input value={comp.name} onChange={e => updateComponentName(ci, e.target.value)} style={s.compNameInput} />
                    <button onClick={() => removeComponent(ci)} style={s.removeBtn}>🗑</button>
                  </div>
                  <div style={s.subtasksContainer}>
                    {comp.subtasks.map((st, si) => {
                      const subtaskFullName = `${comp.name} - ${st.name}`;
                      const isAssembled = assembledCheck?.skippable_subtasks?.includes(subtaskFullName) || 
                                          assembledCheck?.skippable_subtasks?.includes(st.name);
                      return (
                        <div key={st.id} style={{...s.subtaskCard, border: isAssembled ? '2px solid #4CAF50' : '1px solid #333'}}>
                          <div style={s.subtaskHeader}>
                            <input value={st.name} onChange={e => updateSubtaskName(ci, si, e.target.value)} style={s.subtaskNameInput} />
                            <div style={s.timeGroup}><span>⏱</span><input type="number" value={st.hours} onChange={e => updateSubtaskHours(ci, si, e.target.value)} style={s.timeInput} min="0" /><span>ч</span><input type="number" value={st.minutes} onChange={e => updateSubtaskMinutes(ci, si, e.target.value)} style={s.timeInput} min="0" max="59" /><span>мин</span></div>
                            <button onClick={() => removeSubtask(ci, si)} style={s.removeSmBtn}>✕</button>
                            {/* Кнопка сборки компонента */}
                            <button onClick={() => assembleComponent(comp.name, st.name)} style={s.assembleBtn} title="Отметить как собранный">🔧 Собрать</button>
                          </div>
                          {isAssembled && <div style={s.assembledBadge}>✅ Уже собран</div>}
                          {st.items.length > 0 && (
                            <div style={s.itemsList}>
                              {st.items.map((item, ii) => (
                                <div key={item.id} style={s.itemRow}>
                                  <span>{item.item_type === 'consumable' ? '🔧' : '🔩'}</span>
                                  <span style={s.itemName}>{item.name}</span>
                                  <span style={s.itemUnit}>({item.unit})</span>
                                  <button onClick={() => updateQuantity(ci, si, ii, item.quantity - 1)} style={s.qtyBtn}>−</button>
                                  <input type="number" value={item.quantity} onChange={e => updateQuantity(ci, si, ii, e.target.value)} style={s.qtyInput} min="0" step={item.item_type === 'consumable' ? '0.1' : '1'} />
                                  <button onClick={() => updateQuantity(ci, si, ii, item.quantity + 1)} style={s.qtyBtn}>+</button>
                                  <button onClick={() => removeItem(ci, si, ii)} style={s.removeSmBtn}>✕</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={s.addItems}>
                            <select onChange={e => { if(e.target.value){ addItem(ci, si, 'item', e.target.value); e.target.value=''; }}} style={s.sel} defaultValue=""><option value="">+ Деталь</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} шт.)</option>)}</select>
                            <select onChange={e => { if(e.target.value){ addItem(ci, si, 'consumable', e.target.value); e.target.value=''; }}} style={s.sel} defaultValue=""><option value="">+ Расходник</option>{consumables.map(c => <option key={c.id} value={c.id}>{c.name} ({c.quantity} {c.unit})</option>)}</select>
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => addSubtask(ci)} style={s.addSubtaskBtn}>+ Добавить подзадачу</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        <div style={s.footer}>
          <button onClick={saveComposition} style={s.saveBtn}>💾 Сохранить</button>
          {isAdmin && components.some(c => c.subtasks.some(st => st.items.length > 0)) && (
            <button onClick={createAssemblyTask} style={s.taskBtn}>🔨 Создать задачу</button>
          )}
          <button onClick={onClose} style={s.cancelBtn}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: '#2a2a2a', borderRadius: '16px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto', border: '1px solid #b30000' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #444' },
  title: { color: '#fff', margin: 0, fontSize: '20px' },
  closeBtn: { background: 'none', border: 'none', color: '#888', fontSize: '22px', cursor: 'pointer' },
  body: { padding: '20px' },
  warnings: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' },
  warning: { padding: '8px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid' },
  assembledInfo: { background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', color: '#4CAF50', padding: '8px 12px', borderRadius: '6px', marginBottom: '15px', fontSize: '12px' },
  field: { marginBottom: '20px' },
  label: { display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '14px' },
  input: { width: '100%', padding: '10px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' },
  section: { marginTop: '10px' },
  sectionTitle: { color: '#fff', margin: '0 0 15px', fontSize: '16px' },
  addRow: { display: 'flex', gap: '10px', marginBottom: '15px' },
  addInput: { flex: 1, padding: '10px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '8px', color: '#fff', fontSize: '14px' },
  addBtn: { background: '#006600', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', color: '#666', padding: '30px', fontStyle: 'italic' },
  compCard: { background: '#1a1a1a', borderRadius: '10px', padding: '15px', border: '1px solid #b30000', marginBottom: '15px' },
  compHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
  compNameInput: { flex: 1, padding: '10px', background: '#2a2a2a', border: '1px solid #555', borderRadius: '6px', color: '#ff8800', fontWeight: 'bold', fontSize: '15px' },
  removeBtn: { background: '#660000', color: '#ff6666', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  subtasksContainer: { paddingLeft: '15px', borderLeft: '2px solid #444' },
  subtaskCard: { background: '#222', borderRadius: '8px', padding: '12px', marginBottom: '10px', border: '1px solid #333' },
  subtaskHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' },
  subtaskNameInput: { flex: 1, minWidth: '120px', padding: '8px', background: '#2a2a2a', border: '1px solid #555', borderRadius: '6px', color: '#ffaa44', fontWeight: 'bold', fontSize: '13px' },
  timeGroup: { display: 'flex', alignItems: 'center', gap: '4px', color: '#aaa', fontSize: '13px' },
  timeInput: { width: '45px', padding: '6px', background: '#2a2a2a', border: '1px solid #555', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '13px' },
  removeSmBtn: { background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '14px' },
  assembleBtn: { background: '#4CAF50', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' },
  assembledBadge: { color: '#4CAF50', fontSize: '11px', fontWeight: 'bold', padding: '4px 0' },
  itemsList: { paddingLeft: '10px', borderLeft: '2px solid #444', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '5px' },
  itemRow: { display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: '#2a2a2a', borderRadius: '4px', flexWrap: 'wrap' },
  itemName: { flex: 1, color: '#fff', fontSize: '12px', minWidth: '80px' },
  itemUnit: { color: '#888', fontSize: '10px' },
  qtyBtn: { background: '#555', color: '#fff', border: 'none', width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qtyInput: { width: '40px', padding: '4px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '12px' },
  addItems: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  sel: { flex: 1, minWidth: '120px', padding: '6px', background: '#2a2a2a', border: '1px solid #555', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' },
  addSubtaskBtn: { background: '#333', color: '#4a9eff', border: '1px dashed #4a9eff', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', width: '100%', marginTop: '5px' },
  footer: { display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '20px', borderTop: '1px solid #444', flexWrap: 'wrap' },
  saveBtn: { background: '#006600', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer' },
  taskBtn: { background: '#b30000', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
  cancelBtn: { background: '#555', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer' }
};
