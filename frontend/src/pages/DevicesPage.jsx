import React, { useEffect, useState } from "react";
import API from "../api";
import DeviceModal from "../components/DeviceModal";

export default function DevicesPage({ user }) {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskDevice, setTaskDevice] = useState(null);
  const [showComponentTaskModal, setShowComponentTaskModal] = useState(false);
  const [componentTaskData, setComponentTaskData] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [allConsumables, setAllConsumables] = useState([]);

  const isAdmin = user && (user.is_admin || user.login?.toLowerCase() === 'admin');

  const load = async () => {
    try {
      setLoading(true);
      const [devicesRes, itemsRes, consumablesRes] = await Promise.all([
        API.get("/devices"), API.get("/items"), API.get("/consumables")
      ]);
      setDevices(devicesRes.data || []);
      setAllItems(itemsRes.data || []);
      setAllConsumables(consumablesRes.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addDevice = async () => {
    try {
      const res = await API.post("/devices", { name: "Новый прибор", user_login: user.login });
      setCurrent(res.data); setOpen(true); load();
    } catch (e) { alert("Ошибка создания прибора"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить прибор в архив?")) return;
    try {
      await API.delete(`/devices/${id}`, { data: { user_login: user.login } });
      alert("Перемещён в архив"); load();
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const openTaskCreator = (device) => {
    if (device.items && device.items.length > 0) { setTaskDevice(device); setShowTaskModal(true); }
    else { alert("Сначала добавьте компоненты через 'Изменить'"); }
  };

  const openComponentTaskCreator = (device, componentName, subtaskName, timeEstimate) => {
    setComponentTaskData({ device_id: device.id, device_name: device.name, component_name: componentName, subtask_name: subtaskName, time_estimate: timeEstimate || 240 });
    setShowComponentTaskModal(true);
  };

  const createTask = async (subtasks) => {
    try {
      await API.post("/tasks", { device_id: taskDevice.id, device_name: taskDevice.name, created_by: user.id, created_by_login: user.login, subtasks });
      alert("✅ Задача создана!"); setShowTaskModal(false); setTaskDevice(null);
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const createComponentTask = async (hours, minutes) => {
    const totalMinutes = (hours || 0) * 60 + (minutes || 0);
    if (totalMinutes <= 0) { alert("Укажите время"); return; }
    try {
      const device = devices.find(d => d.id === componentTaskData.device_id);
      const subtaskComponents = [];
      if (device && device.items) {
        device.items.forEach(item => {
          const fullName = `${item.component_name || 'Основной компонент'} - ${item.subtask_name || 'Основная сборка'}`;
          if (fullName === componentTaskData.subtask_name || item.subtask_name === componentTaskData.subtask_name) {
            subtaskComponents.push({
              item_type: item.item_type || (item.item_id ? 'item' : 'consumable'),
              item_id: item.item_id || null, consumable_id: item.consumable_id || null,
              component_id: item.item_id || item.consumable_id || null,
              component_name: item.name || 'Компонент', quantity: item.quantity || 1, unit: item.unit || 'шт.'
            });
          }
        });
      }
      await API.post("/tasks", { device_id: componentTaskData.device_id, device_name: componentTaskData.device_name, created_by: user.id, created_by_login: user.login, task_type: 'component', subtasks: [{ name: componentTaskData.subtask_name, time_estimate: totalMinutes, components: subtaskComponents }] });
      alert("✅ Задача на сборку составляющей создана!"); setShowComponentTaskModal(false); setComponentTaskData(null);
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const getStockInfo = (item) => {
    if (item.item_type === 'item' && item.item_id) return allItems.find(i => i.id === item.item_id) || null;
    if (item.item_type === 'consumable' && item.consumable_id) return allConsumables.find(c => c.id === item.consumable_id) || null;
    return null;
  };

  const formatQuantity = (val) => { if (val === null || val === undefined) return '0'; const num = parseFloat(val); if (isNaN(num)) return '0'; if (num === Math.floor(num)) return num.toString(); return parseFloat(num.toFixed(3)).toString(); };
  const hasShortage = (item, stockInfo) => { if (!stockInfo) return true; return (parseFloat(stockInfo.quantity) || 0) < (parseFloat(item.quantity) || 0); };
  const isBelowMin = (stockInfo) => { if (!stockInfo || !stockInfo.min_quantity) return false; return (parseFloat(stockInfo.quantity) || 0) <= (parseFloat(stockInfo.min_quantity) || 0); };

  return (
    <div style={styles.container}>
      <div style={styles.header}><h2 style={styles.title}>🔬 Приборы</h2><button onClick={addDevice} style={styles.addBtn}>+ Добавить прибор</button></div>
      {loading && <div style={styles.loading}>Загрузка...</div>}
      <div style={styles.tableWrapper}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'40px'}}>№</th><th style={styles.th}>Название</th><th style={{...styles.th,width:'50%'}}>Состав</th><th style={{...styles.th,width:'220px'}}>Действия</th></tr></thead><tbody>
        {devices.length === 0 && !loading ? <tr><td colSpan={4} style={styles.empty}>Нет приборов</td></tr> :
          devices.map((device, idx) => (
            <tr key={device.id} style={styles.tr}>
              <td style={{...styles.td,color:'#888',textAlign:'center'}}>{idx + 1}</td>
              <td style={{...styles.td,fontWeight:'500'}}>{device.name || "Без названия"}</td>
              <td style={{...styles.td,verticalAlign:'top'}}>
                {device.items && device.items.length > 0 ? (
                  <details style={{color:'#aaa'}}><summary style={styles.summary}>Состав ({device.items.length} поз.)</summary>
                    <div style={styles.compList}>
                      {(() => { const g = {}; device.items.forEach(item => { const compKey = item.component_name || 'Основной компонент'; const subKey = item.subtask_name || 'Основная сборка'; const fullKey = `${compKey}|||${subKey}`; if (!g[fullKey]) g[fullKey] = { componentName: compKey, subtaskName: subKey, time: item.time_estimate || 240, items: [] }; g[fullKey].items.push(item); });
                        return Object.entries(g).map(([key, data]) => { const h = Math.floor(data.time / 60); const m = data.time % 60; const ts = h > 0 ? `${h}ч ${m}м` : `${m}м`; return (<div key={key} style={styles.sGroup}><div style={styles.sHeader}><span>📋</span><span style={styles.sName}>{data.subtaskName}</span>{data.time > 0 && <span style={styles.sTime}>⏱ {ts}</span>}{isAdmin && <button onClick={(e) => { e.stopPropagation(); openComponentTaskCreator(device, data.componentName, data.subtaskName, data.time); }} style={styles.componentTaskBtn}>🔨 Собрать</button>}</div><div style={styles.sComps}>{data.items.map((item, i) => { const stockInfo = getStockInfo(item); const shortage = hasShortage(item, stockInfo); const belowMin = isBelowMin(stockInfo); const needsHighlight = shortage || belowMin; return (<div key={i} style={{...styles.sItem,background:needsHighlight?'rgba(255,0,0,0.15)':'transparent',borderLeft:needsHighlight?'3px solid #ff4444':'3px solid transparent',padding:'4px 8px',borderRadius:'4px',marginBottom:'2px'}}><span>{item.item_type==='consumable'?'🔧':'🔩'}</span><span style={styles.sIName}>{item.name||'Компонент'}{shortage&&<span style={styles.shortageBadge}>🔴</span>}{!shortage&&belowMin&&<span style={styles.minWarnBadge}>🟡</span>}</span><span style={styles.sIQty}>нужно: x{formatQuantity(item.quantity)} {item.unit||'шт.'}</span>{stockInfo?<span style={{...styles.sStock,color:shortage?'#ff4444':belowMin?'#ffaa44':'#4CAF50',fontWeight:shortage?'bold':'normal'}}>склад: {formatQuantity(stockInfo.quantity)} {item.unit||'шт.'}{stockInfo.min_quantity&&<span style={{color:'#888',fontSize:'9px',marginLeft:'4px'}}>мин: {formatQuantity(stockInfo.min_quantity)}</span>}</span>:<span style={{color:'#ff4444',fontSize:'10px',fontWeight:'bold'}}>НЕТ НА СКЛАДЕ!</span>}</div>); })}</div></div>); }); })()}
                    </div>
                  </details>
                ) : <span style={{color:'#666',fontStyle:'italic'}}>Пусто</span>}
              </td>
              <td style={{...styles.td,verticalAlign:'top'}}><div style={styles.actions}><button onClick={() => {setCurrent(device);setOpen(true);}} style={styles.editBtn}>✎ Изменить</button>{isAdmin && device.items && device.items.length > 0 && <button onClick={() => openTaskCreator(device)} style={styles.taskBtn}>🔨 Задача</button>}<button onClick={() => remove(device.id)} style={styles.deleteBtn}>🗑</button></div></td>
            </tr>
          ))}
      </tbody></table></div>

      {open && current && <DeviceModal device={current} onClose={() => {setOpen(false);setCurrent(null);}} onSaved={() => {load();setOpen(false);setCurrent(null);}} user={user} />}
      {showTaskModal && taskDevice && <QuickTaskModal device={taskDevice} user={user} onClose={() => {setShowTaskModal(false);setTaskDevice(null);}} onCreate={createTask} />}
      {showComponentTaskModal && componentTaskData && <ComponentTaskModal data={componentTaskData} onClose={() => {setShowComponentTaskModal(false);setComponentTaskData(null);}} onCreate={createComponentTask} />}
    </div>
  );
}

function ComponentTaskModal({ data, onClose, onCreate }) {
  const [hours, setHours] = useState(Math.floor((data.time_estimate || 240) / 60));
  const [minutes, setMinutes] = useState((data.time_estimate || 240) % 60);
  const tm = (hours || 0) * 60 + (minutes || 0); const h = Math.floor(tm / 60); const m = tm % 60;
  return (<div style={cm.overlay}><div style={cm.modal}><div style={cm.header}><h3 style={cm.title}>🔨 Собрать составляющую</h3><button onClick={onClose} style={cm.closeBtn}>✕</button></div><div style={cm.content}><p style={cm.info}>Прибор: <b>{data.device_name}</b><br/>Составляющая: <b>{data.component_name}</b><br/>Подзадача: <b>{data.subtask_name}</b></p><div style={cm.timeRow}><span>⏱ Время на выполнение:</span><div style={cm.timeInputs}><input type="number" value={hours} onChange={e => setHours(Math.max(0, parseInt(e.target.value) || 0))} min="0" style={cm.timeInput} /><span>ч</span><input type="number" value={minutes} onChange={e => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} min="0" max="59" style={cm.timeInput} /><span>мин</span><span style={cm.timeDisplay}>({h > 0 ? `${h}ч ${m}м` : `${m}м`})</span></div></div></div><div style={cm.footer}><button onClick={() => onCreate(hours, minutes)} style={cm.createBtn}>✅ Создать задачу</button><button onClick={onClose} style={cm.cancelBtn}>Отмена</button></div></div></div>);
}

const cm = { overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:1001}, modal:{background:'#2a2a2a',borderRadius:'16px',width:'95%',maxWidth:'500px',maxHeight:'85vh',overflow:'auto',border:'1px solid #b30000'}, header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px',borderBottom:'1px solid #444'}, title:{color:'#fff',margin:0,fontSize:'18px',fontWeight:'bold'}, closeBtn:{background:'none',border:'none',color:'#888',fontSize:'22px',cursor:'pointer'}, content:{padding:'20px'}, info:{color:'#ccc',fontSize:'14px',lineHeight:1.6,marginBottom:'15px'}, timeRow:{display:'flex',flexDirection:'column',gap:'8px',color:'#aaa',fontSize:'14px'}, timeInputs:{display:'flex',alignItems:'center',gap:'6px'}, timeInput:{width:'55px',padding:'7px',background:'#1e1e1e',border:'1px solid #555',borderRadius:'5px',color:'#fff',textAlign:'center',fontSize:'15px'}, timeDisplay:{color:'#4CAF50',fontSize:'13px',fontWeight:'bold',marginLeft:'8px'}, footer:{display:'flex',gap:'10px',justifyContent:'flex-end',padding:'20px',borderTop:'1px solid #444'}, createBtn:{background:'#b30000',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:'500'}, cancelBtn:{background:'#555',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'} };

function QuickTaskModal({ device, user, onClose, onCreate }) {
  const [subtasks, setSubtasks] = useState([]);
  useEffect(() => { if (device?.items) { const g = {}; device.items.forEach(item => { const k = item.subtask_name || 'Основная сборка'; if (!g[k]) { const tm = item.time_estimate || 240; g[k] = { hours: Math.floor(tm / 60), minutes: tm % 60, components: [] }; } g[k].components.push({ item_type: item.item_type || (item.item_id ? 'item' : 'consumable'), item_id: item.item_id || null, consumable_id: item.consumable_id || null, component_id: item.item_id || item.consumable_id || null, component_name: item.name || 'Компонент', quantity: item.quantity || 1, unit: item.unit || 'шт.' }); }); setSubtasks(Object.entries(g).map(([name, data]) => ({ id: Date.now() + Math.random(), name, hours: data.hours, minutes: data.minutes, components: data.components }))); } }, [device]);
  const getTM = (s) => (s.hours || 0) * 60 + (s.minutes || 0);
  const updateH = (i, v) => { const u = [...subtasks]; u[i].hours = Math.max(0, parseInt(v) || 0); setSubtasks(u); };
  const updateM = (i, v) => { const u = [...subtasks]; u[i].minutes = Math.max(0, Math.min(59, parseInt(v) || 0)); setSubtasks(u); };
  const remComp = (si, ci) => { const u = [...subtasks]; u[si].components.splice(ci, 1); if (u[si].components.length === 0) u.splice(si, 1); setSubtasks(u); };
  const fmt = (h, m) => { if (h > 0 && m > 0) return `${h}ч ${m}м`; if (h > 0) return `${h}ч`; return `${m}м`; };
  const handle = () => { const v = subtasks.filter(s => s.components.length > 0).map(s => ({ name: s.name, time_estimate: getTM(s), components: s.components.map(c => ({ item_type: c.item_type, item_id: c.item_id, consumable_id: c.consumable_id, component_id: c.component_id, component_name: c.component_name, quantity: c.quantity, unit: c.unit })) })); if (v.length === 0) { alert("Нет подзадач"); return; } onCreate(v); };
  return (<div style={qm.overlay}><div style={qm.modal}><div style={qm.header}><h3 style={qm.title}>🔨 Создать задачу: {device.name}</h3><button onClick={onClose} style={qm.closeBtn}>✕</button></div><div style={qm.content}><p style={qm.info}>Укажите время на выполнение каждой подзадачи.</p>{subtasks.map((st, i) => (<div key={st.id} style={qm.card}><div style={qm.cardH}><span style={qm.cardT}>📋 {st.name}</span><div style={qm.timeR}><span>⏱</span><input type="number" value={st.hours} onChange={e => updateH(i, e.target.value)} style={qm.timeI} min="0" /><span>ч</span><input type="number" value={st.minutes} onChange={e => updateM(i, e.target.value)} style={qm.timeI} min="0" max="59" /><span>мин</span><span style={qm.timeT}>({fmt(st.hours, st.minutes)})</span></div></div><div style={qm.compL}>{st.components.map((c, ci) => (<div key={ci} style={qm.compI}><span>{c.item_type === 'consumable' ? '🔧' : '🔩'}</span><span style={{flex:1}}>{c.component_name}</span><span style={qm.compQ}>x{c.quantity} {c.unit}</span><button onClick={() => remComp(i, ci)} style={qm.remBtn}>✕</button></div>))}</div></div>))}</div><div style={qm.footer}><button onClick={handle} style={qm.createBtn}>✅ Создать задачу</button><button onClick={onClose} style={qm.cancelBtn}>Отмена</button></div></div></div>);
}

const qm = { overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:1001}, modal:{background:'#2a2a2a',borderRadius:'16px',width:'95%',maxWidth:'600px',maxHeight:'85vh',overflow:'auto',border:'1px solid #b30000'}, header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px',borderBottom:'1px solid #444'}, title:{color:'#fff',margin:0,fontSize:'18px',fontWeight:'bold'}, closeBtn:{background:'none',border:'none',color:'#888',fontSize:'22px',cursor:'pointer'}, content:{padding:'20px'}, info:{color:'#aaa',fontSize:'13px',marginBottom:'15px'}, card:{background:'#1a1a1a',borderRadius:'10px',padding:'15px',border:'1px solid #333',marginBottom:'12px'}, cardH:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px',flexWrap:'wrap',gap:'10px'}, cardT:{color:'#ffaa44',fontWeight:'bold',fontSize:'14px'}, timeR:{display:'flex',alignItems:'center',gap:'4px',color:'#aaa',fontSize:'13px'}, timeI:{width:'45px',padding:'4px',background:'#2a2a2a',border:'1px solid #555',borderRadius:'4px',color:'#fff',textAlign:'center',fontSize:'13px'}, timeT:{color:'#4CAF50',fontSize:'12px',fontWeight:'bold',marginLeft:'4px'}, compL:{display:'flex',flexDirection:'column',gap:'5px',paddingLeft:'10px',borderLeft:'2px solid #444'}, compI:{display:'flex',alignItems:'center',gap:'8px',color:'#ccc',fontSize:'13px',padding:'4px 0'}, compQ:{color:'#888',fontSize:'12px'}, remBtn:{background:'none',border:'none',color:'#ff6666',cursor:'pointer',fontSize:'14px'}, footer:{display:'flex',gap:'10px',justifyContent:'flex-end',padding:'20px',borderTop:'1px solid #444'}, createBtn:{background:'#b30000',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:'500'}, cancelBtn:{background:'#555',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'} };

const styles = {
  container:{padding:'15px',height:'100%',overflow:'auto'}, header:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px',flexWrap:'wrap',gap:'10px'},
  title:{color:'#fff',margin:0,fontSize:'clamp(18px,4vw,24px)',fontWeight:'bold'}, addBtn:{background:'#b30000',color:'#fff',border:'none',padding:'8px 16px',borderRadius:'6px',cursor:'pointer',fontSize:'clamp(12px,2vw,14px)',fontWeight:'500',whiteSpace:'nowrap'},
  loading:{color:'#aaa',textAlign:'center',padding:'20px'}, tableWrapper:{borderRadius:'8px',border:'1px solid #444',overflowX:'auto',WebkitOverflowScrolling:'touch'},
  table:{width:'100%',borderCollapse:'collapse',background:'#2a2a2a',minWidth:'650px'}, th:{background:'#333',color:'#fff',padding:'clamp(6px,2vw,10px) clamp(4px,1vw,8px)',textAlign:'left',borderBottom:'2px solid #b30000',fontSize:'clamp(11px,2vw,14px)',fontWeight:'bold',whiteSpace:'nowrap'},
  tr:{borderBottom:'1px solid #444'}, td:{padding:'clamp(6px,2vw,10px) clamp(4px,1vw,8px)',color:'#fff',fontSize:'clamp(11px,2vw,14px)',verticalAlign:'top'},
  empty:{textAlign:'center',padding:'40px',color:'#666'}, summary:{cursor:'pointer',color:'#4a9eff',fontSize:'clamp(12px,2vw,14px)',userSelect:'none'},
  compList:{marginTop:'6px',paddingLeft:'8px',maxHeight:'350px',overflowY:'auto'}, sGroup:{marginBottom:'10px',background:'#222',borderRadius:'6px',padding:'6px 8px'},
  sHeader:{display:'flex',alignItems:'center',gap:'5px',marginBottom:'4px',flexWrap:'wrap'}, sName:{color:'#ffaa44',fontSize:'clamp(11px,2vw,13px)',fontWeight:'bold'},
  sTime:{color:'#4CAF50',fontSize:'10px',marginLeft:'auto'}, sComps:{paddingLeft:'8px',display:'flex',flexDirection:'column',gap:'2px'},
  sItem:{display:'flex',alignItems:'center',gap:'5px',color:'#ccc',fontSize:'clamp(9px,2vw,11px)',flexWrap:'wrap'},
  sIName:{flex:1,minWidth:'80px',display:'flex',alignItems:'center',gap:'4px'}, sIQty:{color:'#fff',fontWeight:'500',whiteSpace:'nowrap'},
  sStock:{fontSize:'10px',whiteSpace:'nowrap'}, shortageBadge:{fontSize:'10px',marginLeft:'2px'}, minWarnBadge:{fontSize:'10px',marginLeft:'2px'},
  actions:{display:'flex',gap:'5px',flexWrap:'wrap'}, editBtn:{background:'#444',color:'#fff',border:'none',padding:'5px 10px',borderRadius:'4px',cursor:'pointer',fontSize:'clamp(11px,2vw,13px)',whiteSpace:'nowrap'},
  taskBtn:{background:'#b30000',color:'#fff',border:'none',padding:'5px 10px',borderRadius:'4px',cursor:'pointer',fontSize:'clamp(11px,2vw,13px)',whiteSpace:'nowrap',fontWeight:'500'},
  componentTaskBtn:{background:'#0066aa',color:'#fff',border:'none',padding:'3px 8px',borderRadius:'4px',cursor:'pointer',fontSize:'10px',whiteSpace:'nowrap',fontWeight:'500'},
  deleteBtn:{background:'#660000',color:'#ff6666',border:'none',padding:'5px 10px',borderRadius:'4px',cursor:'pointer',fontSize:'clamp(11px,2vw,13px)',whiteSpace:'nowrap'}
};
