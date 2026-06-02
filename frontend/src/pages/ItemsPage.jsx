import React, { Fragment, useEffect, useState, useCallback } from "react";
import API from "../api";

export default function ItemsPage({ user }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("category");

  const load = useCallback(async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([API.get("/items"), API.get("/categories?type=item")]);
      const loadedItems = itemsRes.data || [];
      setCategories(categoriesRes.data || []);
      await checkNeedsFromDevices(loadedItems);
    } catch (e) {}
  }, []);

  const checkNeedsFromDevices = async (itemsList) => {
    try {
      const devicesRes = await API.get("/devices");
      const devices = devicesRes.data || [];
      const componentNeeds = {};
      for (const device of devices) {
        if (device.items && device.items.length > 0) {
          for (const item of device.items) {
            if (item.item_type === 'item' && item.item_id && parseFloat(item.quantity) > 0) {
              const key = item.item_id;
              if (!componentNeeds[key]) componentNeeds[key] = { needed: 0 };
              componentNeeds[key].needed += parseFloat(item.quantity) || 0;
            }
          }
        }
      }
      const updatedItems = itemsList.map(item => {
        const need = componentNeeds[item.id];
        const needed = need ? Math.ceil(need.needed) : 0;
        const suggestedMin = needed > 0 ? Math.ceil(needed * 2) : null;
        const hasShortage = needed > 0 && parseInt(item.quantity || 0) < needed;
        return { ...item, needed_for_devices: needed, suggested_min: suggestedMin, has_shortage: hasShortage };
      });
      setItems(updatedItems);
    } catch (e) { setItems(itemsList); }
  };

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const add = async () => {
    const name = prompt("Название детали:"); if (!name) return;
    const tempId = Date.now();
    const tempItem = { id: tempId, name, quantity: 0, min_quantity: null, category_id: null, shelf: '', shelf_position: '', needed_for_devices: 0, suggested_min: null, has_shortage: false, _temp: true };
    setItems(prev => [tempItem, ...prev]); setEditingId(tempId); setEditData(tempItem);
    try {
      const res = await API.post("/items", { name, quantity: 0, min_quantity: null, category_id: null, shelf: '', shelf_position: '', user_login: user.login });
      setItems(prev => prev.map(i => i.id === tempId ? { ...res.data, needed_for_devices: 0, suggested_min: null, has_shortage: false, _temp: false } : i));
      setEditingId(res.data.id); setEditData({ ...res.data, needed_for_devices: 0, suggested_min: null, has_shortage: false, _temp: false });
    } catch (e) { setItems(prev => prev.filter(i => i.id !== tempId)); setEditingId(null); }
  };

  const addCategory = async () => { if (!newCategoryName.trim()) return; try { await API.post("/categories", { name: newCategoryName, type: "item", user_login: user.login }); setNewCategoryName(""); load(); } catch (e) {} };
  const deleteCategory = async (id) => { if (!confirm("Удалить категорию?")) return; try { await API.delete(`/categories/${id}`, { data: { user_login: user.login } }); load(); } catch (e) {} };
  const startEdit = (item) => { setEditingId(item.id); setEditData({ ...item }); };

  const saveEdit = async () => {
    try {
      const updated = { ...editData, category_id: editData.category_id || null, min_quantity: editData.min_quantity ? parseInt(editData.min_quantity) : null, quantity: parseInt(editData.quantity) || 0, user_login: user.login };
      setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...updated, _temp: false } : i));
      setEditingId(null); setEditData({});
      await API.put(`/items/${editingId}`, updated);
    } catch (e) { load(); }
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); setItems(prev => prev.filter(i => !i._temp)); };
  const remove = async (id) => { if (!confirm("Удалить деталь в архив?")) return; setItems(prev => prev.filter(i => i.id !== id)); try { await API.delete(`/items/${id}`, { data: { user_login: user.login } }); } catch (e) { load(); } };

  const updateQuantityDirect = async (id, value) => {
    const item = items.find(i => i.id === id);
    if (!item || item._temp) return;
    const cleanValue = String(value).replace(/[^\d-]/g, '');
    if (cleanValue === '' || cleanValue === '-') { setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: cleanValue } : i)); return; }
    const newQty = Math.max(0, parseInt(cleanValue) || 0);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    try { await API.put(`/items/${id}`, { ...item, quantity: newQty, user_login: user.login }); } catch (e) { load(); }
  };

  const quickUpdate = async (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item || item._temp) return;
    const newQty = Math.max(0, (parseInt(item.quantity) || 0) + delta);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    try { await API.put(`/items/${id}`, { ...item, quantity: newQty, user_login: user.login }); } catch (e) { load(); }
  };

  const updateShelf = async (id, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, shelf: value } : i));
    const item = items.find(i => i.id === id);
    if (item && !item._temp) {
      try { await API.put(`/items/${id}`, { ...item, shelf: value, user_login: user.login }); } catch (e) {}
    }
  };

  const updateShelfPosition = async (id, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, shelf_position: value } : i));
    const item = items.find(i => i.id === id);
    if (item && !item._temp) {
      try { await API.put(`/items/${id}`, { ...item, shelf_position: value, user_login: user.login }); } catch (e) {}
    }
  };

  const formatQty = (val) => {
    if (val === '' || val === null || val === undefined) return '0';
    const num = parseInt(val);
    if (isNaN(num)) return '0';
    return num.toString();
  };

  const getCategoryName = (id) => { if (!id) return "Без категории"; const c = categories.find(x => x.id === id); return c ? c.name : "Без категории"; };

  const filteredItems = searchQuery.trim()
    ? items.filter(item => {
        const q = searchQuery.toLowerCase();
        const catName = getCategoryName(item.category_id).toLowerCase();
        return item.name.toLowerCase().includes(q) || catName.includes(q);
      })
    : items;

  const renderRow = (item, idx) => {
    const low = item.min_quantity && parseInt(item.quantity) <= parseInt(item.min_quantity);
    const edit = editingId === item.id;
    return (
      <tr key={item.id} style={{...st.tr, background: item.has_shortage ? 'rgba(255,0,0,0.15)' : low ? 'rgba(255,0,0,0.07)' : 'transparent', borderLeft: item.has_shortage ? '4px solid #ff0000' : low ? '4px solid #ff4444' : '4px solid transparent'}}>
        <td style={{...st.td, color: '#888', textAlign: 'center'}}>{idx + 1}</td>
        <td style={st.td}>{edit ? (<input value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} style={st.eInp} autoFocus />) : (<span style={{color: item.has_shortage ? '#ff4444' : low ? '#ff6666' : '#fff', fontWeight: item.has_shortage ? 'bold' : 'normal'}}>{item.name}</span>)}</td>
        <td style={st.td}>{edit ? (<select value={editData.category_id || ''} onChange={e => setEditData({...editData, category_id: e.target.value || null})} style={st.eSel}><option value="">Без категории</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>) : (<span style={{color: item.category_id ? '#4a9eff' : '#666', padding: '2px 6px', borderRadius: '3px', fontSize: '11px'}}>{getCategoryName(item.category_id)}</span>)}</td>
        <td style={st.td}><input value={item.shelf || ''} onChange={e => updateShelf(item.id, e.target.value)} style={st.stInp} placeholder="—" /></td>
        <td style={st.td}><input value={item.shelf_position || ''} onChange={e => updateShelfPosition(item.id, e.target.value)} style={st.stInp} placeholder="—" /></td>
        <td style={st.td}>{edit ? (<input type="number" value={editData.quantity || 0} onChange={e => setEditData({...editData, quantity: parseInt(e.target.value) || 0})} style={st.eInp} min="0" step="1" />) : (<div style={st.qCtrl}><button onClick={() => quickUpdate(item.id, -1)} style={st.qBtn} disabled={parseInt(item.quantity) === 0}>−</button><input type="number" value={formatQty(item.quantity)} onChange={e => updateQuantityDirect(item.id, e.target.value)} style={st.qInp} min="0" step="1" /><button onClick={() => quickUpdate(item.id, 1)} style={st.qBtn}>+</button></div>)}</td>
        <td style={st.td}>{item.needed_for_devices > 0 ? (<div><span style={{color: item.has_shortage ? '#ff4444' : '#ffaa44', fontWeight: 'bold', fontSize: '13px'}}>{item.needed_for_devices} шт.</span>{item.has_shortage && <div style={{fontSize: '9px', color: '#ff4444', marginTop: '2px'}}>Нехватка: {item.needed_for_devices - parseInt(item.quantity || 0)}</div>}{item.suggested_min && !item.min_quantity && <div style={{fontSize: '9px', color: '#4a9eff', marginTop: '2px'}}>Рек. мин: {item.suggested_min} шт.</div>}</div>) : (<span style={{color: '#666'}}>—</span>)}</td>
        <td style={st.td}>{edit ? (<input type="number" value={editData.min_quantity || ''} onChange={e => { const val = e.target.value; setEditData({...editData, min_quantity: val === '' ? null : (parseInt(val) || 0)}); }} style={st.eInp} min="0" step="1" placeholder="Не задано" />) : (<span style={{color: item.min_quantity ? '#aaa' : '#666', fontSize: '13px'}}>{item.min_quantity ? `${formatQty(item.min_quantity)} шт.` : '—'}</span>)}</td>
        <td style={st.td}>{item.has_shortage ? <span style={st.sDanger}>🔴 Нехватка</span> : low ? <span style={st.sWarn}>⚠️ Мало</span> : parseInt(item.quantity) === 0 ? <span style={st.sOut}>● Нет</span> : <span style={st.sOk}>✓ Норма</span>}</td>
        <td style={st.td}>{edit ? (<div style={st.acts}><button onClick={saveEdit} style={st.svBtn}>✓</button><button onClick={cancelEdit} style={st.clBtn}>✕</button></div>) : (<div style={st.acts}><button onClick={() => startEdit(item)} style={st.edBtn}>✎</button><button onClick={() => remove(item.id)} style={st.dlBtn}>🗑</button></div>)}</td>
      </tr>
    );
  };

  const renderTable = () => {
    if (sortMode === 'category') {
      const grouped = {};
      categories.forEach(cat => { grouped[cat.id] = []; });
      grouped['uncategorized'] = [];
      filteredItems.forEach(item => {
        const key = item.category_id || 'uncategorized';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });
      return (
        <>
          {categories.map(cat => {
            const ci = grouped[cat.id] || [];
            if (ci.length === 0) return null;
            return (<Fragment key={cat.id}><tr style={st.cRow}><td colSpan={10} style={st.cCell}><div style={st.cHead}><span>📁 {cat.name}</span><span style={st.cCnt}>{ci.length} поз.</span></div></td></tr>{ci.map((item, idx) => renderRow(item, idx))}</Fragment>);
          })}
          {(grouped['uncategorized']?.length > 0) && (
            <Fragment><tr style={st.cRow}><td colSpan={10} style={st.cCell}><div style={st.cHead}><span>📁 Без категории</span><span style={st.cCnt}>{grouped['uncategorized'].length} поз.</span></div></td></tr>{grouped['uncategorized'].map((item, idx) => renderRow(item, idx))}</Fragment>
          )}
        </>
      );
    } else {
      const grouped = {};
      filteredItems.forEach(item => {
        const key = item.shelf || 'Без стеллажа';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });
      const sortedKeys = Object.keys(grouped).sort((a, b) => {
        if (a === 'Без стеллажа') return 1;
        if (b === 'Без стеллажа') return -1;
        const na = parseInt(a), nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        if (!isNaN(na)) return -1;
        if (!isNaN(nb)) return 1;
        return a.localeCompare(b);
      });
      return (
        <>
          {sortedKeys.map(key => {
            const shelfItems = grouped[key];
            return (<Fragment key={key}><tr style={st.cRow}><td colSpan={10} style={st.cCell}><div style={{...st.cHead, color: '#4a9eff'}}><span>📦 Стеллаж: {key}</span><span style={st.cCnt}>{shelfItems.length} поз.</span></div></td></tr>{shelfItems.map((item, idx) => renderRow(item, idx))}</Fragment>);
          })}
        </>
      );
    }
  };

  return (
    <div style={st.container}>
      <div style={st.header}><h2 style={st.title}>📦 Детали</h2><div style={st.hBtns}><button onClick={() => setShowCategoryManager(!showCategoryManager)} style={st.cBtn}>📁 Категории ({categories.length})</button><button onClick={add} style={st.aBtn}>+ Добавить деталь</button></div></div>
      <div style={st.toolbar}>
        <div style={st.searchRow}><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Поиск по названию или категории..." style={st.searchInput} />{searchQuery && <button onClick={() => setSearchQuery("")} style={st.clearSearchBtn}>✕</button>}</div>
        <div style={st.sortRow}><button onClick={() => setSortMode('category')} style={sortMode === 'category' ? st.sortActive : st.sortBtn}>📁 По категориям</button><button onClick={() => setSortMode('shelf')} style={sortMode === 'shelf' ? st.sortActive : st.sortBtn}>📦 По стеллажам</button></div>
      </div>
      {searchQuery && <div style={st.searchInfo}>Найдено: {filteredItems.length} поз.</div>}
      {showCategoryManager && (<div style={st.cMan}><h3 style={st.cTit}>Управление категориями</h3><div style={st.cForm}><input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Название категории" style={st.cInp} onKeyPress={e => e.key === 'Enter' && addCategory()} /><button onClick={addCategory} style={st.cAdd}>+ Добавить</button></div><div style={st.cList}>{categories.map(c => (<div key={c.id} style={st.cItem}><span>📁 {c.name}</span><button onClick={() => deleteCategory(c.id)} style={st.cDel}>🗑</button></div>))}</div></div>)}
      <div style={st.tWrap}><table style={st.tbl}><thead><tr><th style={{...st.th, width: '30px'}}>№</th><th style={st.th}>Название</th><th style={st.th}>Категория</th><th style={{...st.th, width: '70px'}}>Стеллаж</th><th style={{...st.th, width: '60px'}}>Место</th><th style={st.th}>Кол-во</th><th style={st.th}>Нужно</th><th style={st.th}>Мин.</th><th style={st.th}>Статус</th><th style={st.th}>Действия</th></tr></thead><tbody>{renderTable()}{filteredItems.length === 0 && (<tr><td colSpan={10} style={st.empty}>{searchQuery ? 'Ничего не найдено' : 'Нет деталей. Нажмите "Добавить деталь".'}</td></tr>)}</tbody></table></div>
    </div>
  );
}

const st = {
  container: { padding: '10px', height: '100%', color: '#fff', overflow: 'auto', WebkitOverflowScrolling: 'touch' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' },
  title: { color: '#fff', margin: 0, fontSize: 'clamp(16px, 4vw, 24px)', fontWeight: 'bold' },
  hBtns: { display: 'flex', gap: '5px', flexWrap: 'wrap' },
  cBtn: { background: '#444', color: '#fff', border: '1px solid #555', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: 'clamp(11px, 2vw, 14px)', whiteSpace: 'nowrap' },
  aBtn: { background: '#b30000', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: 'clamp(11px, 2vw, 14px)', fontWeight: '500', whiteSpace: 'nowrap' },
  toolbar: { display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' },
  searchRow: { display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '200px' },
  searchInput: { flex: 1, padding: '8px 12px', background: '#2a2a2a', border: '1px solid #555', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none', maxWidth: '350px' },
  clearSearchBtn: { background: '#444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  sortRow: { display: 'flex', gap: '6px' },
  sortBtn: { background: '#333', color: '#aaa', border: '1px solid #555', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  sortActive: { background: '#b30000', color: '#fff', border: '1px solid #ff3333', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  searchInfo: { color: '#4a9eff', fontSize: '12px', marginBottom: '8px' },
  cMan: { background: '#2a2a2a', borderRadius: '6px', padding: '12px', marginBottom: '10px', border: '1px solid #444' },
  cTit: { color: '#fff', margin: '0 0 8px', fontSize: '13px' },
  cForm: { display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' },
  cInp: { flex: 1, minWidth: '100px', background: '#1e1e1e', border: '1px solid #555', padding: '6px 8px', borderRadius: '4px', color: '#fff', fontSize: '12px' },
  cAdd: { background: '#006600', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  cList: { display: 'flex', flexDirection: 'column', gap: '5px' },
  cItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#333', borderRadius: '4px', fontSize: '12px' },
  cDel: { background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '13px' },
  tWrap: { overflowX: 'auto', borderRadius: '6px', border: '1px solid #444', WebkitOverflowScrolling: 'touch' },
  tbl: { width: '100%', borderCollapse: 'collapse', background: '#2a2a2a', minWidth: '700px', fontSize: 'clamp(10px, 2vw, 13px)' },
  th: { background: '#333', color: '#fff', padding: '6px 4px', textAlign: 'left', borderBottom: '2px solid #b30000', fontSize: 'clamp(10px, 2vw, 12px)', fontWeight: 'bold', whiteSpace: 'nowrap' },
  cRow: { background: '#252525' },
  cCell: { padding: '6px', borderBottom: '2px solid #b30000' },
  cHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ff4444', fontWeight: 'bold', fontSize: 'clamp(10px, 2vw, 12px)' },
  cCnt: { color: '#888', fontSize: '10px', fontWeight: 'normal' },
  tr: { borderBottom: '1px solid #3a3a3a' },
  td: { padding: '5px 3px', borderBottom: '1px solid #3a3a3a', color: '#fff', fontSize: 'clamp(10px, 2vw, 12px)' },
  stInp: { width: '100%', padding: '3px 4px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '3px', color: '#fff', textAlign: 'center', fontSize: '11px', boxSizing: 'border-box' },
  qCtrl: { display: 'flex', alignItems: 'center', gap: '3px' },
  qBtn: { background: '#444', color: '#fff', border: 'none', padding: '2px 7px', borderRadius: '3px', cursor: 'pointer', fontSize: '14px', minWidth: '24px' },
  qInp: { width: '55px', padding: '3px 4px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '3px', color: '#fff', textAlign: 'center', fontSize: '12px' },
  eInp: { background: '#1e1e1e', color: '#fff', border: '1px solid #555', padding: '3px 5px', borderRadius: '3px', width: '100%', boxSizing: 'border-box', fontSize: '11px', minWidth: '40px' },
  eSel: { background: '#1e1e1e', color: '#fff', border: '1px solid #555', padding: '3px 5px', borderRadius: '3px', width: '100%', boxSizing: 'border-box', fontSize: '11px', cursor: 'pointer' },
  sDanger: { color: '#ff4444', fontWeight: 'bold', background: 'rgba(255,0,0,0.15)', padding: '2px 5px', borderRadius: '3px', fontSize: '9px', whiteSpace: 'nowrap', border: '1px solid rgba(255,0,0,0.3)' },
  sWarn: { color: '#ff6666', background: 'rgba(255,0,0,0.1)', padding: '2px 5px', borderRadius: '3px', fontSize: '9px', whiteSpace: 'nowrap' },
  sOk: { color: '#44ff44', background: 'rgba(0,255,0,0.1)', padding: '2px 5px', borderRadius: '3px', fontSize: '9px', whiteSpace: 'nowrap' },
  sOut: { color: '#888', background: 'rgba(136,136,136,0.1)', padding: '2px 5px', borderRadius: '3px', fontSize: '9px', whiteSpace: 'nowrap' },
  acts: { display: 'flex', gap: '2px' },
  edBtn: { background: '#444', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' },
  dlBtn: { background: '#660000', color: '#ff6666', border: 'none', padding: '3px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' },
  svBtn: { background: '#006600', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' },
  clBtn: { background: '#666', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' },
  empty: { textAlign: 'center', padding: '25px', color: '#666', fontSize: '13px' }
};
