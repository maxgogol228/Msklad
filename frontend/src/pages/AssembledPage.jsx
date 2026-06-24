import React, { useEffect, useState, useRef, useCallback } from "react";
import API from "../api";

const s = {
  wrap: { padding: '10px', height: '100%', color: '#ccc', overflow: 'auto', background: '#1a1a1a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' },
  btns: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  btn1: { background: '#b30000', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  btn2: { background: '#1a3a5a', color: '#5a9eff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  btnEditMode: (active) => ({ background: active ? '#b30000' : '#333', color: active ? '#fff' : '#aaa', border: active ? '1px solid #b30000' : '1px solid #555', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }),
  form: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', background: '#222', padding: '8px', borderRadius: '4px', alignItems: 'center' },
  inp: { padding: '6px 8px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '3px', color: '#ccc', fontSize: '12px', flex: 1, minWidth: '100px' },
  qtyWrap: { display: 'flex', alignItems: 'center', gap: '4px' },
  qtyBtn: { background: '#333', color: '#888', border: '1px solid #444', width: '26px', height: '26px', borderRadius: '3px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  qtyInp: { width: '48px', padding: '6px 4px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '3px', color: '#ccc', textAlign: 'center', fontSize: '12px' },
  btnS: { background: '#1a3a1a', color: '#4CAF50', border: 'none', padding: '6px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  btnC: { background: '#333', color: '#888', border: 'none', padding: '6px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'start' },
  half: { minWidth: 0 },
  sub: { color: '#fff', fontSize: '13px', margin: '0 0 6px', fontWeight: 'bold' },
  tWrap: { borderRadius: '4px', border: '1px solid #333', overflowX: 'auto' },
  tbl: { width: '100%', borderCollapse: 'collapse', background: '#222', minWidth: '250px' },
  th: { background: '#2a2a2a', color: '#999', padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #b30000', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #333', transition: 'background 0.2s' },
  td: { padding: '6px 8px', borderBottom: '1px solid #333', color: '#bbb', fontSize: '12px' },
  empty: { textAlign: 'center', padding: '20px', color: '#555', fontSize: '12px' },
  ship: { background: '#1a3a1a', color: '#4CAF50', border: '1px solid #2d5a2d', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', whiteSpace: 'nowrap' },
  del: { background: '#3a1a1a', color: '#ff6666', border: '1px solid #5a2d2d', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', whiteSpace: 'nowrap' },
  reserveBtn: { background: '#b30000', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', whiteSpace: 'nowrap', fontWeight: 'bold' },
  unreserveBtn: { background: '#3a2a1a', color: '#ffaa44', border: '1px solid #5a3a2d', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', whiteSpace: 'nowrap' },
  resInp: { padding: '3px 5px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '2px', color: '#ccc', fontSize: '10px', width: '100%', boxSizing: 'border-box' },
  deviceName: { color: '#ff4444', fontWeight: 'bold' }
};

export default function AssembledPage({ user }) {
  const [assembledItems, setAssembledItems] = useState([]);
  const [reservedItems, setReservedItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showCompForm, setShowCompForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ device_id: '', quantity: 1 });
  const [componentForm, setComponentForm] = useState({ device_id: '', component_key: '', quantity: 1 });
  const [editMode, setEditMode] = useState(false);
  // Локальный кэш для полей ввода забронированных
  const [localFields, setLocalFields] = useState({});
  const timersRef = useRef({});

  useEffect(() => { loadData(); const i = setInterval(loadData, 30000); return () => clearInterval(i); }, []);

  const loadData = async () => {
    try {
      const [a, r, d] = await Promise.all([API.get("/assembled"), API.get("/assembled/reserved"), API.get("/devices")]);
      setAssembledItems(a.data||[]); setReservedItems(r.data||[]); setDevices(d.data||[]);
    } catch (e) {} finally { setLoading(false); }
  };

  const getComponents = (id) => { const d = devices.find(x=>x.id===parseInt(id)); if (!d?.items) return []; return [...new Set(d.items.map(i=>i.subtask_name).filter(Boolean))]; };

  const addDevice = async () => { if (!deviceForm.device_id) return; const d = devices.find(x=>x.id===parseInt(deviceForm.device_id)); if (!d) return; try { await API.post("/assembled", { device_id: d.id, device_name: d.name, component_type: 'device', quantity: parseInt(deviceForm.quantity)||1, assembled_by: user.login }); setDeviceForm({ device_id: '', quantity: 1 }); setShowDeviceForm(false); loadData(); } catch (e) {} };
  const addComponent = async () => { if (!componentForm.device_id||!componentForm.component_key) return; const d = devices.find(x=>x.id===parseInt(componentForm.device_id)); if (!d) return; try { await API.post("/assembled", { device_id: d.id, device_name: d.name, component_name: componentForm.component_key, component_type: 'component', quantity: parseInt(componentForm.quantity)||1, assembled_by: user.login }); setComponentForm({ device_id: '', component_key: '', quantity: 1 }); setShowCompForm(false); loadData(); } catch (e) {} };

  const reserveDevice = async (id) => { try { await API.post(`/assembled/${id}/reserve`, { user_login: user.login, order_number: '', customer: '' }); loadData(); } catch (e) {} };
  const shipReserved = async (id) => { try { await API.post(`/assembled/reserved/${id}/ship`, { user_login: user.login }); loadData(); } catch (e) {} };
  const unreserveDevice = async (id) => { try { await API.delete(`/assembled/reserved/${id}`, { data: { user_login: user.login } }); loadData(); } catch (e) {} };
  const deleteComponent = async (id) => { try { await API.delete(`/assembled/${id}`, { data: { user_login: user.login } }); loadData(); } catch (e) {} };

  // Отложенное сохранение с локальным состоянием
  const handleLocalChange = useCallback((id, field, value) => {
    setLocalFields(prev => ({ ...prev, [`${id}_${field}`]: value }));
    if (timersRef.current[`${id}_${field}`]) clearTimeout(timersRef.current[`${id}_${field}`]);
    timersRef.current[`${id}_${field}`] = setTimeout(async () => {
      try { await API.put(`/assembled/reserved/${id}`, { [field]: value }); } catch (e) {}
    }, 600);
  }, []);

  const getLocalValue = (id, field, serverValue) => {
    const key = `${id}_${field}`;
    return localFields[key] !== undefined ? localFields[key] : (serverValue || '');
  };

  const devs_ = assembledItems.filter(i=>i.component_type==='device');
  const comps_ = assembledItems.filter(i=>i.component_type==='component');

  if (loading) return <div style={s.wrap}><div style={{textAlign:'center',padding:'30px',color:'#555'}}>Загрузка...</div></div>;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <button onClick={()=>setEditMode(!editMode)} style={s.btnEditMode(editMode)}>{editMode?'Готово':'Изменить'}</button>
        <div style={s.btns}>
          <button onClick={()=>{setShowDeviceForm(!showDeviceForm);setShowCompForm(false)}} style={s.btn1}>+ Прибор</button>
          <button onClick={()=>{setShowCompForm(!showCompForm);setShowDeviceForm(false)}} style={s.btn2}>+ Компонент</button>
        </div>
      </div>

      {showDeviceForm&&(<div style={s.form}><select value={deviceForm.device_id} onChange={e=>setDeviceForm({...deviceForm,device_id:e.target.value})} style={s.inp}><option value="">Выберите прибор</option>{devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><div style={s.qtyWrap}><button onClick={()=>setDeviceForm({...deviceForm,quantity:Math.max(1,(deviceForm.quantity||1)-1)})} style={s.qtyBtn}>-</button><input type="number" value={deviceForm.quantity} onChange={e=>setDeviceForm({...deviceForm,quantity:Math.max(1,parseInt(e.target.value)||1)})} min="1" style={s.qtyInp}/><button onClick={()=>setDeviceForm({...deviceForm,quantity:(deviceForm.quantity||1)+1})} style={s.qtyBtn}>+</button></div><button onClick={addDevice} style={s.btnS}>OK</button><button onClick={()=>setShowDeviceForm(false)} style={s.btnC}>X</button></div>)}
      {showCompForm&&(<div style={s.form}><select value={componentForm.device_id} onChange={e=>setComponentForm({...componentForm,device_id:e.target.value,component_key:''})} style={s.inp}><option value="">Выберите прибор</option>{devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><select value={componentForm.component_key} onChange={e=>setComponentForm({...componentForm,component_key:e.target.value})} style={s.inp} disabled={!componentForm.device_id}><option value="">Выберите компонент</option>{componentForm.device_id&&getComponents(componentForm.device_id).map((c,i)=><option key={i} value={c}>{c}</option>)}</select><div style={s.qtyWrap}><button onClick={()=>setComponentForm({...componentForm,quantity:Math.max(1,(componentForm.quantity||1)-1)})} style={s.qtyBtn}>-</button><input type="number" value={componentForm.quantity} onChange={e=>setComponentForm({...componentForm,quantity:Math.max(1,parseInt(e.target.value)||1)})} min="1" style={s.qtyInp}/><button onClick={()=>setComponentForm({...componentForm,quantity:(componentForm.quantity||1)+1})} style={s.qtyBtn}>+</button></div><button onClick={addComponent} style={s.btnS}>OK</button><button onClick={()=>setShowCompForm(false)} style={s.btnC}>X</button></div>)}

      <div style={s.row}>
        <div style={s.half}>
          <h3 style={s.sub}>Приборы ({devs_.length})</h3>
          <div style={s.tWrap}><table style={s.tbl}><thead><tr><th style={{...s.th,width:'30px'}}>#</th><th style={s.th}>Название</th><th style={s.th}>Кол-во</th><th style={{...s.th,width:'55px'}}>Себест.</th>{editMode&&<th style={{...s.th,width:'60px'}}></th>}</tr></thead><tbody>
            {devs_.length===0?<tr><td colSpan={editMode?5:4} style={s.empty}>Нет приборов</td></tr>:
              devs_.map((item,i)=>(<tr key={item.id} style={{...s.tr,background:selectedDevice===item.device_name?'rgba(90,158,255,0.05)':'transparent',cursor:'pointer'}} onClick={()=>setSelectedDevice(selectedDevice===item.device_name?null:item.device_name)}><td style={{...s.td,color:'#555',textAlign:'center'}}>{i+1}</td><td style={{...s.td,fontWeight:'bold'}}><span style={s.deviceName}>{item.device_name}</span></td><td style={s.td}>{item.quantity}</td><td style={{...s.td,color:'#ffaa44',textAlign:'center'}}>{item.cost?`${item.cost} руб.`:'—'}</td>{editMode&&<td style={s.td}><button onClick={e=>{e.stopPropagation();reserveDevice(item.id)}} style={s.reserveBtn}>Бронь</button></td>}</tr>))}
          </tbody></table></div>
        </div>
        <div style={s.half}>
          <h3 style={s.sub}>Компоненты {selectedDevice?`(${selectedDevice})`:''}</h3>
          <div style={s.tWrap}><table style={s.tbl}><thead><tr><th style={{...s.th,width:'30px'}}>#</th><th style={s.th}>Прибор</th><th style={s.th}>Компонент</th><th style={s.th}>Кол-во</th>{editMode&&<th style={{...s.th,width:'60px'}}></th>}</tr></thead><tbody>
            {(()=>{const dc=selectedDevice?comps_.filter(c=>c.device_name===selectedDevice):comps_;if(dc.length===0)return<tr><td colSpan={editMode?5:4} style={s.empty}>{selectedDevice?'Нет компонентов':'Выберите прибор слева'}</td></tr>;return dc.map((item,i)=>(<tr key={item.id} style={s.tr}><td style={{...s.td,color:'#555',textAlign:'center'}}>{i+1}</td><td style={s.td}>{item.device_name}</td><td style={{...s.td,color:'#aa6600'}}>{item.component_name}</td><td style={s.td}>{item.quantity}</td>{editMode&&<td style={s.td}><button onClick={()=>deleteComponent(item.id)} style={s.del}>Удалить</button></td>}</tr>));})()}
          </tbody></table></div>
        </div>
      </div>

      <div style={{marginTop: '20px'}}>
        <h3 style={s.sub}>Забронированные ({reservedItems.length})</h3>
        <div style={s.tWrap}><table style={s.tbl}><thead><tr>
          <th style={{...s.th,width:'30px'}}>#</th><th style={s.th}>Название</th><th style={{...s.th,width:'240px'}}>Номер прибора</th><th style={{...s.th,width:'300px'}}>Заказчик</th><th style={{...s.th,width:'80px'}}>Дата</th><th style={{...s.th,width:'130px'}}>Действия</th>
        </tr></thead><tbody>
          {reservedItems.length===0?<tr><td colSpan={6} style={s.empty}>Нет забронированных</td></tr>:
            reservedItems.map((item,i)=>(<tr key={item.id} style={s.tr}>
              <td style={{...s.td,color:'#555',textAlign:'center'}}>{i+1}</td>
              <td style={{...s.td,fontWeight:'bold'}}><span style={s.deviceName}>{item.device_name}</span></td>
              <td style={s.td}>
                <input
                  value={getLocalValue(item.id, 'order_number', item.order_number)}
                  onChange={e => handleLocalChange(item.id, 'order_number', e.target.value)}
                  placeholder="—" style={s.resInp}
                />
              </td>
              <td style={s.td}>
                <input
                  value={getLocalValue(item.id, 'customer', item.customer)}
                  onChange={e => handleLocalChange(item.id, 'customer', e.target.value)}
                  placeholder="—" style={s.resInp}
                />
              </td>
              <td style={{...s.td,color:'#777',fontSize:'10px'}}>{new Date(item.reserved_at).toLocaleDateString('ru-RU')}</td>
              <td style={s.td}><div style={{display:'flex',gap:'3px',flexWrap:'wrap'}}><button onClick={()=>shipReserved(item.id)} style={s.ship}>Отправить</button><button onClick={()=>unreserveDevice(item.id)} style={s.unreserveBtn}>Вернуть</button></div></td>
            </tr>))}
        </tbody></table></div>
      </div>
    </div>
  );
}
