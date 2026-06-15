import React, { Fragment, useEffect, useState, useCallback } from "react";
import API from "../api";

const s = {
  wrap: { padding: '10px', height: '100%', color: '#ccc', overflow: 'auto', background: '#1a1a1a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' },
  title: { color: '#fff', margin: 0, fontSize: '18px', fontWeight: 'bold' },
  btns: { display: 'flex', gap: '5px', flexWrap: 'wrap' },
  btn1: { background: '#b30000', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap' },
  toolbar: { display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' },
  search: { flex: 1, padding: '6px 10px', background: '#2a2a2a', border: '1px solid #444', borderRadius: '4px', color: '#ccc', fontSize: '12px', outline: 'none', maxWidth: '300px' },
  sortBtn: { background: '#2a2a2a', color: '#888', border: '1px solid #444', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  sortActive: { background: '#b30000', color: '#fff', border: '1px solid #b30000', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  tWrap: { overflowX: 'auto', borderRadius: '4px', border: '1px solid #333' },
  tbl: { width: '100%', borderCollapse: 'collapse', background: '#222', minWidth: '650px', fontSize: '11px' },
  th: { background: '#2a2a2a', color: '#999', padding: '5px 4px', textAlign: 'left', borderBottom: '1px solid #b30000', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #333' },
  td: { padding: '4px 3px', borderBottom: '1px solid #333', color: '#bbb', fontSize: '11px' },
  inp: { width: '100%', padding: '3px 4px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '3px', color: '#ccc', textAlign: 'center', fontSize: '10px', boxSizing: 'border-box' },
  qCtrl: { display: 'flex', alignItems: 'center', gap: '2px' },
  qBtn: { background: '#333', color: '#ccc', border: 'none', padding: '1px 5px', borderRadius: '2px', cursor: 'pointer', fontSize: '12px', minWidth: '20px' },
  qInp: { width: '45px', padding: '2px 3px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '3px', color: '#ccc', textAlign: 'center', fontSize: '11px' },
  badge: (c) => ({ padding: '1px 4px', borderRadius: '2px', fontSize: '9px', whiteSpace: 'nowrap', background: c==='red'?'rgba(255,0,0,0.15)':c==='yellow'?'rgba(255,165,0,0.1)':c==='green'?'rgba(0,255,0,0.1)':'rgba(136,136,136,0.1)', color: c==='red'?'#ff4444':c==='yellow'?'#ffaa44':c==='green'?'#4CAF50':'#888', border: `1px solid ${c==='red'?'rgba(255,0,0,0.3)':c==='yellow'?'rgba(255,165,0,0.3)':c==='green'?'rgba(0,255,0,0.3)':'rgba(136,136,136,0.3)'}` }),
  btnSm: (bg) => ({ background: bg, color: '#fff', border: 'none', padding: '2px 5px', borderRadius: '2px', cursor: 'pointer', fontSize: '10px' }),
  empty: { textAlign: 'center', padding: '20px', color: '#555', fontSize: '12px' },
  cRow: { background: '#252525' },
  cCell: { padding: '5px', borderBottom: '1px solid #b30000' },
  cHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '10px' },
  cCnt: { fontSize: '9px', fontWeight: 'normal' }
};

export default function ItemsPage({ user }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("category");

  const load = useCallback(async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([API.get("/items"), API.get("/categories?type=item")]);
      setCategories(categoriesRes.data || []);
      const its = itemsRes.data || [];
      const devicesRes = await API.get("/devices");
      const devices = devicesRes.data || [];
      const needs = {};
      devices.forEach(d => { if (d.items) d.items.forEach(i => { if (i.item_type==='item'&&i.item_id) { if (!needs[i.item_id]) needs[i.item_id]=0; needs[i.item_id]+=parseFloat(i.quantity)||0; } }); });
      setItems(its.map(i => { const n = Math.ceil(needs[i.id]||0); return {...i, needed_for_devices: n, suggested_min: n>0?Math.ceil(n*2):null, has_shortage: n>0&&parseInt(i.quantity||0)<n }; }));
    } catch (e) {}
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, [load]);

  const add = async () => {
    const name = prompt("Название:");
    if (!name) return;
    try { await API.post("/items", { name, quantity:0, user_login: user.login }); load(); } catch (e) {}
  };

  const startEdit = (item) => { setEditingId(item.id); setEditData({...item}); };
  const saveEdit = async () => {
    try { await API.put(`/items/${editingId}`, {...editData, user_login: user.login}); setEditingId(null); load(); } catch (e) {}
  };
  const cancelEdit = () => setEditingId(null);
  const remove = async (id) => { try { await API.delete(`/items/${id}`, { data: { user_login: user.login } }); load(); } catch (e) {} };

  const updateQty = async (id, val) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const v = parseInt(String(val).replace(/[^\d-]/g,'')) || 0;
    setItems(prev => prev.map(i => i.id===id?{...i,quantity:Math.max(0,v)}:i));
    try { await API.put(`/items/${id}`, {...item, quantity:Math.max(0,v), user_login:user.login}); } catch (e) {}
  };

  const quick = async (id, d) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const nq = Math.max(0, (parseInt(item.quantity)||0)+d);
    setItems(prev => prev.map(i => i.id===id?{...i,quantity:nq}:i));
    try { await API.put(`/items/${id}`, {...item, quantity:nq, user_login:user.login}); } catch (e) {}
  };

  const updateField = async (id, field, val) => {
    setItems(prev => prev.map(i => i.id===id?{...i,[field]:val}:i));
    const item = items.find(i => i.id === id);
    if (item) try { await API.put(`/items/${id}`, {...item, [field]:val, user_login:user.login}); } catch (e) {}
  };

  const getCat = (id) => { if (!id) return "Без категории"; const c = categories.find(x => x.id===id); return c?c.name:"Без категории"; };
  const filtered = searchQuery.trim() ? items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || getCat(i.category_id).toLowerCase().includes(searchQuery.toLowerCase())) : items;

  const renderRow = (item, idx) => {
    const edit = editingId === item.id;
    const low = item.min_quantity && parseInt(item.quantity) <= parseInt(item.min_quantity);
    const cols = sortMode === 'shelf' ? 10 : 9;
    return (
      <tr key={item.id} style={{...s.tr, background: item.has_shortage?'rgba(255,0,0,0.08)':low?'rgba(255,0,0,0.04)':'transparent', borderLeft: item.has_shortage?'3px solid #ff4444':low?'3px solid #aa6600':'3px solid transparent'}}>
        <td style={{...s.td,color:'#555',textAlign:'center'}}>{idx+1}</td>
        <td style={s.td}>{edit?<input value={editData.name||''} onChange={e=>setEditData({...editData,name:e.target.value})} style={s.inp} autoFocus/>:<span style={{color:item.has_shortage?'#ff6666':low?'#ffaa44':'#ccc'}}>{item.name}</span>}</td>
        {sortMode === 'shelf' && (
          <td style={s.td}>{edit?<select value={editData.category_id||''} onChange={e=>setEditData({...editData,category_id:e.target.value||null})} style={{...s.inp,cursor:'pointer'}}><option value="">Без категории</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>:<span style={{color:item.category_id?'#5a9eff':'#555',fontSize:'10px'}}>{getCat(item.category_id)}</span>}</td>
        )}
        <td style={s.td}><input value={item.shelf||''} onChange={e=>updateField(item.id,'shelf',e.target.value)} style={s.inp} placeholder="—"/></td>
        <td style={s.td}><input value={item.shelf_position||''} onChange={e=>updateField(item.id,'shelf_position',e.target.value)} style={s.inp} placeholder="—"/></td>
        <td style={s.td}>{edit?<input type="number" value={editData.quantity||0} onChange={e=>setEditData({...editData,quantity:parseInt(e.target.value)||0})} style={s.inp} min="0"/>:<div style={s.qCtrl}><button onClick={()=>quick(item.id,-1)} style={s.qBtn} disabled={parseInt(item.quantity)===0}>-</button><input type="number" value={parseInt(item.quantity)||0} onChange={e=>updateQty(item.id,e.target.value)} style={s.qInp} min="0"/><button onClick={()=>quick(item.id,1)} style={s.qBtn}>+</button></div>}</td>
        <td style={s.td}>{item.needed_for_devices>0?<span style={{color:item.has_shortage?'#ff4444':'#ffaa44',fontWeight:'bold'}}>{item.needed_for_devices} шт.</span>:<span style={{color:'#555'}}>—</span>}</td>
        <td style={s.td}>{edit?<input type="number" value={editData.min_quantity||''} onChange={e=>setEditData({...editData,min_quantity:e.target.value===''?null:parseInt(e.target.value)||0})} style={s.inp} placeholder="—"/>:<span style={{color:item.min_quantity?'#999':'#555'}}>{item.min_quantity?`${item.min_quantity} шт.`:'—'}</span>}</td>
        <td style={s.td}>{item.has_shortage?<span style={s.badge('red')}>Нехватка</span>:low?<span style={s.badge('yellow')}>Мало</span>:parseInt(item.quantity)===0?<span style={s.badge('gray')}>Нет</span>:<span style={s.badge('green')}>Норма</span>}</td>
        <td style={s.td}><div style={{display:'flex',gap:'2px'}}>{edit?<><button onClick={saveEdit} style={s.btnSm('#1a3a1a')}>OK</button><button onClick={cancelEdit} style={s.btnSm('#3a1a1a')}>X</button></>:<><button onClick={()=>startEdit(item)} style={s.btnSm('#333')}>Edit</button><button onClick={()=>remove(item.id)} style={s.btnSm('#3a1a1a')}>Del</button></>}</div></td>
      </tr>
    );
  };

  const renderTable = () => {
    const cols = sortMode === 'shelf' ? 10 : 9;
    if (sortMode === 'category') {
      const g = {}; categories.forEach(c=>{g[c.id]=[]}); g['_']=[];
      filtered.forEach(i=>{const k=i.category_id||'_';if(!g[k])g[k]=[];g[k].push(i)});
      return (<>
        {categories.map(c=>{const ci=g[c.id]||[];if(ci.length===0)return null;return(<Fragment key={c.id}><tr style={s.cRow}><td colSpan={cols} style={s.cCell}><div style={s.cHead}><span style={{color:'#ff4444'}}>{c.name}</span><span style={{...s.cCnt,color:'#555'}}>{ci.length} поз.</span></div></td></tr>{ci.map((item,idx)=>renderRow(item,idx))}</Fragment>)})}
        {(g['_']?.length>0)&&(<Fragment><tr style={s.cRow}><td colSpan={cols} style={s.cCell}><div style={s.cHead}><span style={{color:'#ff4444'}}>Без категории</span><span style={{...s.cCnt,color:'#555'}}>{g['_'].length} поз.</span></div></td></tr>{g['_'].map((item,idx)=>renderRow(item,idx))}</Fragment>)}
      </>);
    } else {
      const g = {};
      filtered.forEach(i=>{const k=i.shelf||'Без стеллажа';if(!g[k])g[k]=[];g[k].push(i)});
      const keys = Object.keys(g).sort((a,b)=>{if(a==='Без стеллажа')return 1;if(b==='Без стеллажа')return-1;const na=parseInt(a),nb=parseInt(b);if(!isNaN(na)&&!isNaN(nb))return na-nb;return a.localeCompare(b)});
      return (<>{keys.map(k=>(<Fragment key={k}><tr style={s.cRow}><td colSpan={cols} style={s.cCell}><div style={s.cHead}><span style={{color:'#5a9eff'}}>Стеллаж: {k}</span><span style={{...s.cCnt,color:'#555'}}>{g[k].length} поз.</span></div></td></tr>{g[k].map((item,idx)=>renderRow(item,idx))}</Fragment>))}</>);
    }
  };

  const cols = sortMode === 'shelf' ? 10 : 9;

  return (
    <div style={s.wrap}>
      <div style={s.header}><div style={s.btns}><button onClick={add} style={s.btn1}>+ Добавить</button></div></div>
      <div style={s.toolbar}>
        <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Поиск..." style={s.search}/>
        <button onClick={()=>setSortMode('category')} style={sortMode==='category'?s.sortActive:s.sortBtn}>По категориям</button>
        <button onClick={()=>setSortMode('shelf')} style={sortMode==='shelf'?s.sortActive:s.sortBtn}>По стеллажам</button>
      </div>
      <div style={s.tWrap}><table style={s.tbl}><thead><tr>
        <th style={{...s.th,width:'25px'}}>#</th>
        <th style={s.th}>Название</th>
        {sortMode === 'shelf' && <th style={s.th}>Категория</th>}
        <th style={{...s.th,width:'55px'}}>Стеллаж</th>
        <th style={{...s.th,width:'45px'}}>Место</th>
        <th style={s.th}>Кол-во</th>
        <th style={s.th}>Нужно</th>
        <th style={s.th}>Мин.</th>
        <th style={s.th}>Статус</th>
        <th style={s.th}>Действия</th>
      </tr></thead><tbody>{renderTable()}{filtered.length===0&&<tr><td colSpan={cols} style={s.empty}>{searchQuery?'Ничего не найдено':'Пусто'}</td></tr>}</tbody></table></div>
    </div>
  );
}
