import React, { useEffect, useState } from "react";
import API from "../api";
import DeviceModal from "../components/DeviceModal";

const s = {
  wrap: { padding: '10px', height: '100%', color: '#ccc', overflow: 'auto', background: '#1a1a1a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' },
  btn: { background: '#b30000', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' },
  btnEditMode: (active) => ({ background: active ? '#b30000' : '#333', color: active ? '#fff' : '#aaa', border: active ? '1px solid #b30000' : '1px solid #555', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }),
  tWrap: { borderRadius: '4px', border: '1px solid #333', overflowX: 'auto' },
  tbl: { width: '100%', borderCollapse: 'collapse', background: '#222', minWidth: '550px' },
  th: { background: '#2a2a2a', color: '#999', padding: '6px 6px', textAlign: 'left', borderBottom: '1px solid #b30000', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #333' },
  td: { padding: '6px 6px', borderBottom: '1px solid #333', color: '#bbb', fontSize: '11px', verticalAlign: 'top' },
  empty: { textAlign: 'center', padding: '25px', color: '#555' },
  summary: { cursor: 'pointer', color: '#ff4444', fontSize: '12px', userSelect: 'none', fontWeight: 'bold' },
  compList: { marginTop: '4px', paddingLeft: '6px', maxHeight: '250px', overflowY: 'auto' },
  sGroup: { marginBottom: '8px', background: '#1a1a1a', borderRadius: '4px', padding: '5px 6px' },
  sHeader: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px', flexWrap: 'wrap' },
  sName: { color: '#aa6600', fontSize: '11px', fontWeight: 'bold' },
  sTime: { color: '#4CAF50', fontSize: '9px', marginLeft: 'auto' },
  sCost: { color: '#ffaa44', fontSize: '9px', marginLeft: '6px' },
  sComps: { paddingLeft: '6px', display: 'flex', flexDirection: 'column', gap: '1px' },
  sItem: { display: 'flex', alignItems: 'center', gap: '4px', color: '#999', fontSize: '10px', flexWrap: 'wrap' },
  sIName: { flex: 1, minWidth: '60px' }, sIQty: { color: '#ccc', fontWeight: '500', whiteSpace: 'nowrap' }, sStock: { fontSize: '9px', whiteSpace: 'nowrap' },
  actions: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  btnSm: (bg) => ({ background: bg || '#b30000', color: '#fff', border: 'none', padding: '3px 7px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', whiteSpace: 'nowrap' }),
};

function ComponentTaskModal({ data, onClose, onCreate }) {
  const [hours, setHours] = useState(Math.floor((data.time_estimate || 240) / 60));
  const [minutes, setMinutes] = useState((data.time_estimate || 240) % 60);
  const tm = (hours || 0) * 60 + (minutes || 0);
  return (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:1001}}><div style={{background:'#222',borderRadius:'8px',width:'95%',maxWidth:'450px',border:'1px solid #b30000'}}><div style={{display:'flex',justifyContent:'space-between',padding:'15px',borderBottom:'1px solid #333'}}><h3 style={{color:'#fff',margin:0,fontSize:'15px'}}>Собрать составляющую</h3><button onClick={onClose} style={{background:'none',border:'none',color:'#888',fontSize:'18px',cursor:'pointer'}}>X</button></div><div style={{padding:'15px'}}><p style={{color:'#999',fontSize:'12px',marginBottom:'12px'}}>Прибор: <b style={{color:'#fff'}}>{data.device_name}</b><br/>Задача: <b style={{color:'#aa6600'}}>{data.subtask_name}</b></p><div style={{display:'flex',alignItems:'center',gap:'6px',color:'#999',fontSize:'13px'}}><span>Время:</span><input type="number" value={hours} onChange={e=>setHours(Math.max(0,parseInt(e.target.value)||0))} min="0" style={{width:'50px',padding:'6px',background:'#1a1a1a',border:'1px solid #444',borderRadius:'3px',color:'#ccc',textAlign:'center'}}/><span>ч</span><input type="number" value={minutes} onChange={e=>setMinutes(Math.max(0,Math.min(59,parseInt(e.target.value)||0)))} min="0" max="59" style={{width:'50px',padding:'6px',background:'#1a1a1a',border:'1px solid #444',borderRadius:'3px',color:'#ccc',textAlign:'center'}}/><span>мин</span><span style={{color:'#4CAF50',fontSize:'12px',marginLeft:'6px'}}>({Math.floor(tm/60)}ч {tm%60}м)</span></div></div><div style={{display:'flex',gap:'8px',justifyContent:'flex-end',padding:'15px',borderTop:'1px solid #333'}}><button onClick={()=>onCreate(hours,minutes)} style={{background:'#b30000',color:'#fff',border:'none',padding:'8px 16px',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Создать задачу</button><button onClick={onClose} style={{background:'#333',color:'#888',border:'none',padding:'8px 16px',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Отмена</button></div></div></div>);
}

function QuickTaskModal({ device, onClose, onCreate }) {
  const [subtasks, setSubtasks] = useState([]);
  useEffect(() => { if (device?.items) { const g = {}; device.items.forEach(item => { const k = item.subtask_name || 'Основная сборка'; if (!g[k]) { const tm = item.time_estimate || 240; g[k] = { hours: Math.floor(tm / 60), minutes: tm % 60, components: [] }; } g[k].components.push({ item_type: item.item_type || (item.item_id ? 'item' : 'consumable'), item_id: item.item_id || null, consumable_id: item.consumable_id || null, component_name: item.name || 'Компонент', quantity: item.quantity || 1, unit: item.unit || 'шт.' }); }); setSubtasks(Object.entries(g).map(([name, data]) => ({ id: Date.now() + Math.random(), name, hours: data.hours, minutes: data.minutes, components: data.components }))); } }, [device]);
  const updateH = (i, v) => { const u = [...subtasks]; u[i].hours = Math.max(0, parseInt(v) || 0); setSubtasks(u); };
  const updateM = (i, v) => { const u = [...subtasks]; u[i].minutes = Math.max(0, Math.min(59, parseInt(v) || 0)); setSubtasks(u); };
  const handle = () => { const v = subtasks.filter(s => s.components.length > 0).map(s => ({ name: s.name, time_estimate: (s.hours||0)*60+(s.minutes||0), components: s.components.map(c => ({ item_type: c.item_type, item_id: c.item_id, consumable_id: c.consumable_id, component_name: c.component_name, quantity: c.quantity, unit: c.unit })) })); if (v.length === 0) return; onCreate(v); };
  return (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:1001}}><div style={{background:'#222',borderRadius:'8px',width:'95%',maxWidth:'550px',maxHeight:'80vh',overflow:'auto',border:'1px solid #b30000'}}><div style={{display:'flex',justifyContent:'space-between',padding:'15px',borderBottom:'1px solid #333'}}><h3 style={{color:'#fff',margin:0,fontSize:'15px'}}>Создать задачу: {device.name}</h3><button onClick={onClose} style={{background:'none',border:'none',color:'#888',fontSize:'18px',cursor:'pointer'}}>X</button></div><div style={{padding:'15px'}}>{subtasks.map((st, i) => (<div key={st.id} style={{background:'#1a1a1a',borderRadius:'6px',padding:'10px',border:'1px solid #333',marginBottom:'8px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px',flexWrap:'wrap',gap:'8px'}}><span style={{color:'#aa6600',fontWeight:'bold',fontSize:'13px'}}>{st.name}</span><div style={{display:'flex',alignItems:'center',gap:'3px',color:'#999',fontSize:'12px'}}><span>Время:</span><input type="number" value={st.hours} onChange={e=>updateH(i,e.target.value)} style={{width:'40px',padding:'4px',background:'#2a2a2a',border:'1px solid #444',borderRadius:'3px',color:'#ccc',textAlign:'center'}} min="0"/><span>ч</span><input type="number" value={st.minutes} onChange={e=>updateM(i,e.target.value)} style={{width:'40px',padding:'4px',background:'#2a2a2a',border:'1px solid #444',borderRadius:'3px',color:'#ccc',textAlign:'center'}} min="0" max="59"/><span>мин</span></div></div><div style={{display:'flex',flexDirection:'column',gap:'3px',paddingLeft:'8px',borderLeft:'2px solid #333'}}>{st.components.map((c, ci) => (<div key={ci} style={{color:'#999',fontSize:'11px'}}>{c.item_type==='consumable'?'O':'-'} {c.component_name} x{c.quantity} {c.unit}</div>))}</div></div>))}</div><div style={{display:'flex',gap:'8px',justifyContent:'flex-end',padding:'15px',borderTop:'1px solid #333'}}><button onClick={handle} style={{background:'#b30000',color:'#fff',border:'none',padding:'8px 16px',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Создать</button><button onClick={onClose} style={{background:'#333',color:'#888',border:'none',padding:'8px 16px',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Отмена</button></div></div></div>);
}

export default function DevicesPage({ user }) {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskDevice, setTaskDevice] = useState(null);
  const [showCompModal, setShowCompModal] = useState(false);
  const [compData, setCompData] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [allConsumables, setAllConsumables] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const isAdmin = user && (user.is_admin || user.login?.toLowerCase() === 'admin');

  const load = async () => { try { setLoading(true); const [d, i, c] = await Promise.all([API.get("/devices"), API.get("/items"), API.get("/consumables")]); setDevices(d.data||[]); setAllItems(i.data||[]); setAllConsumables(c.data||[]); } catch (e) {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const addDevice = async () => { try { const r = await API.post("/devices", { name: "Новый прибор", user_login: user.login }); setCurrent(r.data); setOpen(true); load(); } catch (e) {} };
  const remove = async (id) => { try { await API.delete(`/devices/${id}`, { data: { user_login: user.login } }); load(); } catch (e) {} };
  const openTaskCreator = (device) => { if (device.items?.length) { setTaskDevice(device); setShowTaskModal(true); } };
  const openCompCreator = (device, compName, subName, time) => { setCompData({ device_id: device.id, device_name: device.name, component_name: compName, subtask_name: subName, time_estimate: time || 240 }); setShowCompModal(true); };
  const createTask = async (subtasks) => { try { await API.post("/tasks", { device_id: taskDevice.id, device_name: taskDevice.name, created_by: user.id, created_by_login: user.login, subtasks }); setShowTaskModal(false); setTaskDevice(null); } catch (e) {} };
  const createCompTask = async (h, m) => { const tm = (h||0)*60+(m||0); if (tm<=0) return; try { const device = devices.find(d => d.id === compData.device_id); const comps = []; if (device?.items) device.items.forEach(item => { if (item.subtask_name === compData.subtask_name) comps.push({ item_type: item.item_type||(item.item_id?'item':'consumable'), item_id: item.item_id||null, consumable_id: item.consumable_id||null, component_name: item.name||'Компонент', quantity: item.quantity||1, unit: item.unit||'шт.' }); }); await API.post("/tasks", { device_id: null, device_name: compData.device_name, created_by: user.id, created_by_login: user.login, task_type: 'component', subtasks: [{ name: compData.subtask_name, time_estimate: tm, components: comps }] }); setShowCompModal(false); setCompData(null); } catch (e) {} };
  const getStock = (item) => item.item_type==='item'&&item.item_id ? allItems.find(i=>i.id===item.item_id) : item.item_type==='consumable'&&item.consumable_id ? allConsumables.find(c=>c.id===item.consumable_id) : null;
  const fmt = (v) => { if (v===null||v===undefined) return '0'; const n=parseFloat(v); if(isNaN(n))return'0'; if(n===Math.floor(n))return n.toString(); return parseFloat(n.toFixed(3)).toString(); };
  const calcSubtaskCost = (items) => { let cost = 0; items.forEach(item => { const stock = getStock(item); if (stock && stock.price) cost += (parseFloat(stock.price)/parseFloat(stock.price_per||1))*parseFloat(item.quantity); }); return cost>0?`${Math.round(cost*100)/100} руб.`:'—'; };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <button onClick={()=>setEditMode(!editMode)} style={s.btnEditMode(editMode)}>{editMode?'Готово':'Изменить'}</button>
        <button onClick={addDevice} style={s.btn}>+ Добавить</button>
      </div>
      {loading ? <div style={{textAlign:'center',padding:'20px',color:'#555'}}>Загрузка...</div> :
        <div style={s.tWrap}><table style={s.tbl}><thead><tr>
          <th style={{...s.th,width:'30px'}}>#</th><th style={s.th}>Название</th><th style={{...s.th,width:'60px'}}>Себест.</th><th style={{...s.th,width:'45%'}}>Состав</th><th style={{...s.th,width:'180px'}}>Действия</th>
        </tr></thead><tbody>
          {devices.length===0 ? <tr><td colSpan={5} style={s.empty}>Нет приборов</td></tr> :
            devices.map((d, idx) => (
              <tr key={d.id} style={s.tr}>
                <td style={{...s.td,color:'#555',textAlign:'center'}}>{idx+1}</td>
                <td style={{...s.td,fontWeight:'500'}}>{d.name||"Без названия"}</td>
                <td style={{...s.td,color:'#ffaa44',fontWeight:'bold',textAlign:'center'}}>{d.cost?`${d.cost} руб.`:'—'}</td>
                <td style={s.td}>
                  {d.items?.length > 0 ? (
                    <details style={{color:'#999'}}><summary style={s.summary}>Состав ({d.items.length} поз.)</summary>
                      <div style={s.compList}>
                        {(() => { const g = {}; d.items.forEach(item => { const k = `${item.component_name||''}|||${item.subtask_name||''}`; if(!g[k]) g[k]={comp:item.component_name,sub:item.subtask_name,time:item.time_estimate||240,items:[]}; g[k].items.push(item); });
                          return Object.entries(g).map(([key,data]) => (
                            <div key={key} style={s.sGroup}>
                              <div style={s.sHeader}><span style={s.sName}>{data.sub}</span>{data.time>0&&<span style={s.sTime}>{Math.floor(data.time/60)}ч {data.time%60}м</span>}<span style={s.sCost}>{calcSubtaskCost(data.items)}</span>{isAdmin&&<button onClick={(e)=>{e.stopPropagation();openCompCreator(d,data.comp,data.sub,data.time)}} style={s.btnSm('#b30000')}>Собрать</button>}</div>
                              <div style={s.sComps}>{data.items.map((item,i)=>{const st=getStock(item);const sh=st&&(parseFloat(st.quantity)||0)<(parseFloat(item.quantity)||0);return(<div key={i} style={{...s.sItem,background:sh?'rgba(255,0,0,0.08)':'transparent',borderLeft:sh?'2px solid #ff4444':'2px solid transparent',padding:'2px 5px',borderRadius:'2px'}}><span>{item.item_type==='consumable'?'O':'-'}</span><span style={s.sIName}>{item.name||'Компонент'}</span><span style={s.sIQty}>x{fmt(item.quantity)} {item.unit||'шт.'}</span>{st?<span style={{...s.sStock,color:sh?'#ff4444':'#4CAF50'}}>склад: {fmt(st.quantity)}</span>:<span style={{color:'#ff4444',fontSize:'9px'}}>НЕТ</span>}</div>)})}</div>
                            </div>
                          ));
                        })()}
                      </div>
                    </details>
                  ) : <span style={{color:'#555'}}>Пусто</span>}
                </td>
                <td style={s.td}><div style={s.actions}>
                  <button onClick={()=>{setCurrent(d);setOpen(true)}} style={s.btnSm('#333')}>Изменить</button>
                  {isAdmin&&d.items?.length>0&&<button onClick={()=>openTaskCreator(d)} style={s.btnSm('#b30000')}>Задача</button>}
                  {editMode&&<button onClick={()=>remove(d.id)} style={s.btnSm('#3a1a1a')}>Удалить</button>}
                </div></td>
              </tr>
            ))}
        </tbody></table></div>
      }
      {open&&current&&<DeviceModal device={current} onClose={()=>{setOpen(false);setCurrent(null)}} onSaved={()=>{load();setOpen(false);setCurrent(null)}} user={user}/>}
      {showTaskModal&&taskDevice&&<QuickTaskModal device={taskDevice} onClose={()=>{setShowTaskModal(false);setTaskDevice(null)}} onCreate={createTask}/>}
      {showCompModal&&compData&&<ComponentTaskModal data={compData} onClose={()=>{setShowCompModal(false);setCompData(null)}} onCreate={createCompTask}/>}
    </div>
  );
}
