import React, { useEffect, useState, useRef } from "react";
import API from "../api";

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: '#1a1a1a', borderRadius: '8px', width: '95%', maxWidth: '800px', maxHeight: '85vh', overflow: 'auto', border: '1px solid #b30000' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #333' },
  title: { color: '#fff', margin: 0, fontSize: '16px', fontWeight: 'bold' },
  closeBtn: { background: 'none', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' },
  body: { padding: '16px 20px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', color: '#999', marginBottom: '6px', fontSize: '12px' },
  input: { width: '100%', padding: '8px 10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#ccc', fontSize: '13px', boxSizing: 'border-box' },
  section: { marginTop: '10px' },
  sectionTitle: { color: '#fff', margin: '0 0 10px', fontSize: '14px', fontWeight: 'bold' },
  addRow: { display: 'flex', gap: '8px', marginBottom: '10px' },
  addInput: { flex: 1, padding: '7px 10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#ccc', fontSize: '12px' },
  addBtn: { background: '#b30000', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', color: '#555', padding: '20px', fontSize: '12px' },
  compCard: { background: '#111', borderRadius: '6px', padding: '12px', border: '1px solid #b30000', marginBottom: '10px' },
  compHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  compNameInput: { flex: 1, padding: '7px 10px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '4px', color: '#aa6600', fontWeight: 'bold', fontSize: '13px' },
  removeBtn: { background: '#3a1a1a', color: '#ff6666', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  subtasksContainer: { paddingLeft: '12px', borderLeft: '2px solid #333' },
  subtaskCard: { background: '#1a1a1a', borderRadius: '6px', padding: '10px', marginBottom: '8px', border: '1px solid #333' },
  subtaskHeader: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' },
  subtaskNameInput: { flex: 1, minWidth: '100px', padding: '6px 8px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#aa6600', fontWeight: 'bold', fontSize: '12px' },
  timeGroup: { display: 'flex', alignItems: 'center', gap: '3px', color: '#999', fontSize: '11px' },
  timeInput: { width: '40px', padding: '5px', background: '#111', border: '1px solid #444', borderRadius: '3px', color: '#ccc', textAlign: 'center', fontSize: '12px' },
  removeSmBtn: { background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' },
  assembleBtn: { background: '#1a3a1a', color: '#4CAF50', border: '1px solid #2d5a2d', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', whiteSpace: 'nowrap' },
  assembledBadge: { color: '#4CAF50', fontSize: '10px', fontWeight: 'bold', padding: '2px 0' },
  itemsList: { paddingLeft: '8px', borderLeft: '2px solid #333', marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '3px' },
  itemRow: { display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 6px', background: '#111', borderRadius: '3px', flexWrap: 'wrap' },
  itemName: { flex: 1, color: '#ccc', fontSize: '11px', minWidth: '60px' },
  itemUnit: { color: '#777', fontSize: '9px' },
  qtyBtn: { background: '#333', color: '#ccc', border: 'none', width: '18px', height: '18px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qtyInput: { width: '38px', padding: '3px', background: '#111', border: '1px solid #444', borderRadius: '3px', color: '#ccc', textAlign: 'center', fontSize: '11px' },
  addItems: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  selWrap: { position: 'relative', flex: 1, minWidth: '120px' },
  sel: { width: '100%', padding: '5px 6px', background: '#111', border: '1px solid #444', borderRadius: '3px', color: '#ccc', fontSize: '10px', cursor: 'pointer', appearance: 'none' },
  searchInp: { width: '100%', padding: '5px 6px', background: '#111', border: '1px solid #5a9eff', borderRadius: '3px', color: '#ccc', fontSize: '10px', boxSizing: 'border-box', outline: 'none' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '180px', overflowY: 'auto', background: '#1a1a1a', border: '1px solid #5a9eff', borderRadius: '3px', zIndex: 10, marginTop: '2px' },
  dropdownItem: { padding: '6px 8px', cursor: 'pointer', color: '#ccc', fontSize: '11px', borderBottom: '1px solid #333' },
  dropdownItemActive: { padding: '6px 8px', cursor: 'pointer', color: '#fff', fontSize: '11px', background: '#1a3a5a', borderBottom: '1px solid #333' },
  addSubtaskBtn: { background: '#1a1a1a', color: '#5a9eff', border: '1px dashed #2d3a5a', padding: '7px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', width: '100%', marginTop: '4px' },
  footer: { display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid #333', flexWrap: 'wrap' },
  saveBtn: { background: '#b30000', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  taskBtn: { background: '#1a3a1a', color: '#4CAF50', border: 'none', padding: '9px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  cancelBtn: { background: '#333', color: '#888', border: 'none', padding: '9px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  warnings: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' },
  warning: { padding: '6px 10px', borderRadius: '3px', fontSize: '11px', border: '1px solid' },
  assembledInfo: { background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)', color: '#4CAF50', padding: '6px 10px', borderRadius: '3px', marginBottom: '10px', fontSize: '11px' }
};

function SearchableSelect({ options, value, onChange, placeholder, getLabel, getCategory }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(opt => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const label = (getLabel ? getLabel(opt) : opt.name || '').toLowerCase();
    const cat = (getCategory ? getCategory(opt) : '').toLowerCase();
    return label.includes(q) || cat.includes(q);
  });

  const selectedLabel = value ? (getLabel ? getLabel(options.find(o => o.id === parseInt(value))) : '') : '';

  return (
    <div ref={wrapRef} style={s.selWrap}>
      {open ? (
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }} placeholder="Поиск..." style={s.searchInp} />
      ) : (
        <button onClick={() => setOpen(true)} style={{...s.sel, textAlign: 'left', color: value ? '#ccc' : '#666' }}>
          {selectedLabel || placeholder || 'Выбрать...'}
        </button>
      )}
      {open && (
        <div style={s.dropdown}>
          {filtered.length === 0 ? <div style={{...s.dropdownItem, color: '#555'}}>Ничего не найдено</div> :
            filtered.map(opt => (
              <div key={opt.id} style={parseInt(value) === opt.id ? s.dropdownItemActive : s.dropdownItem}
                onClick={() => { onChange(opt.id); setOpen(false); setSearch(''); }}>
                {getLabel ? getLabel(opt) : opt.name}
                {getCategory && <span style={{color: '#666', fontSize: '9px', marginLeft: '6px'}}>{getCategory(opt)}</span>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function DeviceModal({ device, onClose, onSaved, user }) {
  const [items, setItems] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [components, setComponents] = useState([]);
  const [deviceName, setDeviceName] = useState(device?.name || "");
  const [newComponentName, setNewComponentName] = useState("");
  const [stockWarnings, setStockWarnings] = useState([]);
  const [assembledCheck, setAssembledCheck] = useState(null);
  const isAdmin = user && (user.is_admin || user.login?.toLowerCase() === 'admin');

  useEffect(() => { loadData(); loadExistingComponents(); if (device?.id) checkAssembledComponents(); }, [device]);

  const loadData = async () => {
    try {
      const [i, c, cat] = await Promise.all([API.get("/items"), API.get("/consumables"), API.get("/categories")]);
      setItems(i.data || []); setConsumables(c.data || []); setCategories(cat.data || []);
    } catch (e) {}
  };

  const loadExistingComponents = () => {
    if (!device?.items || device.items.length === 0) { setComponents([]); return; }
    const grouped = {};
    device.items.forEach(item => {
      const compKey = item.component_name || 'Основной компонент';
      const subKey = item.subtask_name || 'Основная сборка';
      if (!grouped[compKey]) grouped[compKey] = {};
      if (!grouped[compKey][subKey]) {
        const totalMin = item.time_estimate || 240;
        grouped[compKey][subKey] = { hours: Math.floor(totalMin / 60), minutes: totalMin % 60, items: [] };
      }
      grouped[compKey][subKey].items.push({
        id: Date.now() + Math.random(), item_id: item.item_id || null, consumable_id: item.consumable_id || null,
        quantity: item.quantity || 1, item_type: item.item_type || (item.item_id ? 'item' : 'consumable'),
        name: item.name || 'Компонент', unit: item.unit || 'шт.'
      });
    });
    setComponents(Object.entries(grouped).map(([compName, subtasks]) => ({
      id: Date.now() + Math.random(), name: compName,
      subtasks: Object.entries(subtasks).map(([subName, data]) => ({
        id: Date.now() + Math.random(), name: subName, hours: data.hours, minutes: data.minutes, items: data.items
      }))
    })));
  };

  const checkAssembledComponents = async () => { try { const res = await API.get(`/assembled/check/${device.id}`); setAssembledCheck(res.data); } catch (e) {} };

  const calculateMinimumStock = () => {
    const warnings = [];
    const needs = {};
    components.forEach(comp => { comp.subtasks.forEach(st => { st.items.forEach(item => { if (item.quantity > 0) {
      const key = `${item.item_type}_${item.item_id || item.consumable_id}`;
      if (!needs[key]) needs[key] = { type: item.item_type, id: item.item_id || item.consumable_id, name: item.name, unit: item.unit || 'шт.', total: 0 };
      needs[key].total += parseFloat(item.quantity) || 0;
    } }); }); });
    Object.values(needs).forEach(need => {
      const stock = need.type === 'item' ? items.find(i => i.id === need.id) : consumables.find(c => c.id === need.id);
      if (stock) {
        const avail = parseFloat(stock.quantity) || 0;
        const req = need.total;
        if (avail < req) warnings.push({ id: need.id, message: `"${need.name}": не хватает! Нужно ${req} ${need.unit}, есть ${avail}`, type: 'error' });
        else if (avail < req * 2) warnings.push({ id: need.id, message: `"${need.name}": хватит на 1 прибор (${req} ${need.unit})`, type: 'warning' });
        if (!stock.min_quantity || stock.min_quantity < Math.ceil(req * 2)) warnings.push({ id: need.id + '_min', message: `"${need.name}": рек. мин. запас ${Math.ceil(req * 2)} ${need.unit}`, type: 'info' });
      }
    });
    setStockWarnings(warnings);
  };

  useEffect(() => { calculateMinimumStock(); }, [components, items, consumables]);

  const addComponent = () => { const name = newComponentName.trim() || `Составляющая ${components.length + 1}`; setComponents([...components, { id: Date.now(), name, subtasks: [{ id: Date.now(), name: 'Основная сборка', hours: 4, minutes: 0, items: [] }] }]); setNewComponentName(""); };
  const removeComponent = (index) => setComponents(components.filter((_, i) => i !== index));
  const updateComponentName = (index, value) => { const u = [...components]; u[index].name = value; setComponents(u); };
  const addSubtask = (ci) => { const u = [...components]; u[ci].subtasks.push({ id: Date.now(), name: `Подзадача ${u[ci].subtasks.length + 1}`, hours: 4, minutes: 0, items: [] }); setComponents(u); };
  const removeSubtask = (ci, si) => { const u = [...components]; u[ci].subtasks = u[ci].subtasks.filter((_, i) => i !== si); setComponents(u); };
  const updateSubtaskName = (ci, si, value) => { const u = [...components]; u[ci].subtasks[si].name = value; setComponents(u); };
  const updateSubtaskHours = (ci, si, value) => { const u = [...components]; u[ci].subtasks[si].hours = Math.max(0, parseInt(value) || 0); setComponents(u); };
  const updateSubtaskMinutes = (ci, si, value) => { const u = [...components]; u[ci].subtasks[si].minutes = Math.max(0, Math.min(59, parseInt(value) || 0)); setComponents(u); };
  const getTotalMinutes = (st) => (st.hours || 0) * 60 + (st.minutes || 0);

  const addItem = (ci, si, type, itemId) => {
    if (!itemId) return;
    const id = parseInt(itemId);
    const source = type === 'item' ? items : consumables;
    const existing = source.find(s => s.id === id);
    if (!existing) return;
    const subtask = components[ci].subtasks[si];
    if (subtask.items.some(i => (type === 'item' && i.item_id === id) || (type === 'consumable' && i.consumable_id === id))) return;
    const u = [...components];
    u[ci].subtasks[si].items.push({ id: Date.now(), item_id: type === 'item' ? id : null, consumable_id: type === 'consumable' ? id : null, quantity: 1, item_type: type, name: existing.name, unit: existing.unit || 'шт.' });
    setComponents(u);
  };

  const removeItem = (ci, si, ii) => { const u = [...components]; u[ci].subtasks[si].items.splice(ii, 1); setComponents(u); };
  const updateQuantity = (ci, si, ii, value) => { const u = [...components]; u[ci].subtasks[si].items[ii].quantity = Math.max(0, parseFloat(value) || 0); setComponents(u); };

  const assembleComponent = async (compName, subtaskName) => { try { await API.post("/assembled/assemble-component", { device_id: device.id, device_name: deviceName, component_name: `${compName} - ${subtaskName}`, subtask_name: subtaskName, quantity: 1, assembled_by: user.login }); checkAssembledComponents(); onSaved(); } catch (e) {} };

  const getCategoryName = (id) => { const c = categories.find(x => x.id === id); return c ? c.name : ''; };
  const getItemLabel = (item) => `${item.name} (${item.quantity || 0} ${item.unit || 'шт.'})`;
  const getItemCategory = (item) => item.category_id ? getCategoryName(item.category_id) : '';

  const saveComposition = async () => {
    if (!deviceName.trim()) return;
    try {
      const allItems = [];
      components.forEach(comp => { comp.subtasks.forEach(st => { st.items.forEach(item => { if (item.quantity > 0) allItems.push({ item_id: item.item_id, consumable_id: item.consumable_id, quantity: item.quantity, item_type: item.item_type, component_name: comp.name, subtask_name: st.name, time_estimate: getTotalMinutes(st) }); }); }); });
      await API.put(`/devices/${device.id}`, { name: deviceName, items: allItems, user_login: user.login });
      onSaved();
    } catch (e) {}
  };

  const createAssemblyTask = async () => {
    const skippable = assembledCheck?.skippable_subtasks || [];
    if (skippable.length > 0) { for (const name of skippable) { try { await API.post("/assembled/use-component", { device_name: deviceName, component_name: name, user_login: user.login }); } catch (e) {} } }
    const allSubtasks = [];
    let skipped = 0;
    components.forEach(comp => { comp.subtasks.forEach(st => { if (st.items.some(i => i.quantity > 0)) { const fullName = `${comp.name} - ${st.name}`; if (skippable.includes(fullName) || skippable.includes(st.name) || skippable.includes(comp.name)) { skipped++; return; } allSubtasks.push({ name: fullName, time_estimate: getTotalMinutes(st), components: st.items.filter(i => i.quantity > 0).map(i => ({ item_type: i.item_type, item_id: i.item_id || null, consumable_id: i.consumable_id || null, component_name: i.name, quantity: i.quantity, unit: i.unit })) }); } }); });
    if (allSubtasks.length === 0 && skipped > 0) return;
    if (allSubtasks.length === 0) return;
    try { await API.post("/tasks", { device_id: device.id, device_name: deviceName, created_by: user.id, created_by_login: user.login, subtasks: allSubtasks }); onSaved(); } catch (e) {}
  };

  const formatTimeDisplay = (h, m) => { if (h > 0 && m > 0) return `${h}ч ${m}м`; if (h > 0) return `${h}ч`; return `${m}м`; };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}><h3 style={s.title}>{deviceName || 'Новый прибор'}</h3><button onClick={onClose} style={s.closeBtn}>X</button></div>
        <div style={s.body}>
          {stockWarnings.length > 0 && (<div style={s.warnings}>{stockWarnings.map(w => (<div key={w.id} style={{...s.warning, background: w.type==='error'?'rgba(255,0,0,0.08)':w.type==='warning'?'rgba(255,165,0,0.06)':'rgba(90,158,255,0.06)', borderColor: w.type==='error'?'rgba(255,0,0,0.2)':w.type==='warning'?'rgba(255,165,0,0.2)':'rgba(90,158,255,0.2)', color: w.type==='error'?'#ff6666':w.type==='warning'?'#ffaa44':'#5a9eff'}}>{w.message}</div>))}</div>)}
          {assembledCheck && assembledCheck.assembled_components?.length > 0 && (<div style={s.assembledInfo}>Уже собрано: {assembledCheck.assembled_components.map(c => c.component_name).join(', ')}</div>)}
          <div style={s.field}><label style={s.label}>Название прибора:</label><input value={deviceName} onChange={e => setDeviceName(e.target.value)} style={s.input} placeholder="Введите название" /></div>
          <div style={s.section}><h4 style={s.sectionTitle}>Составляющие прибора ({components.length})</h4>
            <div style={s.addRow}><input value={newComponentName} onChange={e => setNewComponentName(e.target.value)} placeholder="Название составляющей" style={s.addInput} onKeyPress={e => e.key === 'Enter' && addComponent()} /><button onClick={addComponent} style={s.addBtn}>+ Добавить</button></div>
            {components.length === 0 ? <div style={s.empty}>Добавьте составляющие</div> : components.map((comp, ci) => (<div key={comp.id} style={s.compCard}>
              <div style={s.compHeader}><input value={comp.name} onChange={e => updateComponentName(ci, e.target.value)} style={s.compNameInput} /><button onClick={() => removeComponent(ci)} style={s.removeBtn}>X</button></div>
              <div style={s.subtasksContainer}>{comp.subtasks.map((st, si) => { const fullName = `${comp.name} - ${st.name}`; const isAssembled = assembledCheck?.skippable_subtasks?.includes(fullName) || assembledCheck?.skippable_subtasks?.includes(st.name);
                return (<div key={st.id} style={{...s.subtaskCard, border: isAssembled ? '1px solid #4CAF50' : '1px solid #333'}}>
                  <div style={s.subtaskHeader}>
                    <input value={st.name} onChange={e => updateSubtaskName(ci, si, e.target.value)} style={s.subtaskNameInput} />
                    <div style={s.timeGroup}><span>Time:</span><input type="number" value={st.hours} onChange={e => updateSubtaskHours(ci, si, e.target.value)} style={s.timeInput} min="0" /><span>h</span><input type="number" value={st.minutes} onChange={e => updateSubtaskMinutes(ci, si, e.target.value)} style={s.timeInput} min="0" max="59" /><span>m</span></div>
                    <button onClick={() => removeSubtask(ci, si)} style={s.removeSmBtn}>X</button>
                    <button onClick={() => assembleComponent(comp.name, st.name)} style={s.assembleBtn}>Собрать</button>
                  </div>
                  {isAssembled && <div style={s.assembledBadge}>Уже собран</div>}
                  {st.items.length > 0 && (<div style={s.itemsList}>{st.items.map((item, ii) => (<div key={item.id} style={s.itemRow}><span style={{color:'#888',fontSize:'10px'}}>{item.item_type==='consumable'?'[C]':'[I]'}</span><span style={s.itemName}>{item.name}</span><span style={s.itemUnit}>({item.unit})</span><button onClick={() => updateQuantity(ci, si, ii, item.quantity - 1)} style={s.qtyBtn}>-</button><input type="number" value={item.quantity} onChange={e => updateQuantity(ci, si, ii, e.target.value)} style={s.qtyInput} min="0" step={item.item_type==='consumable'?'0.1':'1'} /><button onClick={() => updateQuantity(ci, si, ii, item.quantity + 1)} style={s.qtyBtn}>+</button><button onClick={() => removeItem(ci, si, ii)} style={s.removeSmBtn}>X</button></div>))}</div>)}
                  <div style={s.addItems}>
                    <SearchableSelect options={items} value={null} onChange={(id) => addItem(ci, si, 'item', id)} placeholder="+ Деталь" getLabel={getItemLabel} getCategory={getItemCategory} />
                    <SearchableSelect options={consumables} value={null} onChange={(id) => addItem(ci, si, 'consumable', id)} placeholder="+ Расходник" getLabel={getItemLabel} getCategory={getItemCategory} />
                  </div>
                </div>);
              })}<button onClick={() => addSubtask(ci)} style={s.addSubtaskBtn}>+ Подзадача</button></div>
            </div>))}</div>
        </div>
        <div style={s.footer}>
          <button onClick={saveComposition} style={s.saveBtn}>Сохранить</button>
          {isAdmin && components.some(c => c.subtasks.some(st => st.items.length > 0)) && (<button onClick={createAssemblyTask} style={s.taskBtn}>Создать задачу</button>)}
          <button onClick={onClose} style={s.cancelBtn}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
