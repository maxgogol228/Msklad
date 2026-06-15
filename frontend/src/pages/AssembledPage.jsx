import React, { useEffect, useState } from "react";
import API from "../api";

const s = {
  wrap: { padding: '10px', height: '100%', color: '#ccc', overflow: 'auto', background: '#1a1a1a' },
  title: { margin: '0 0 10px', fontSize: '18px', fontWeight: 'bold', color: '#fff' },
  btns: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' },
  btn1: { background: '#b30000', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  btn2: { background: '#1a3a5a', color: '#5a9eff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  form: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', background: '#222', padding: '8px', borderRadius: '4px', alignItems: 'center' },
  inp: { padding: '6px 8px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '3px', color: '#ccc', fontSize: '12px', flex: 1, minWidth: '100px' },
  btnS: { background: '#1a3a1a', color: '#4CAF50', border: 'none', padding: '6px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' },
  btnC: { background: '#333', color: '#888', border: 'none', padding: '6px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' },
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
  del: { background: '#3a1a1a', color: '#ff6666', border: '1px solid #5a2d2d', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', whiteSpace: 'nowrap' }
};

export default function AssembledPage({ user }) {
  const [assembledItems, setAssembledItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showCompForm, setShowCompForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ device_id: '', quantity: 1 });
  const [componentForm, setComponentForm] = useState({ device_id: '', component_key: '', quantity: 1 });

  const isAdmin = user?.is_admin || user?.login?.toLowerCase() === 'admin';

  useEffect(() => { loadData(); const i = setInterval(loadData, 30000); return () => clearInterval(i); }, []);

  const loadData = async () => {
    try {
      const [a, d] = await Promise.all([API.get("/assembled"), API.get("/devices")]);
      setAssembledItems(a.data || []); setDevices(d.data || []);
    } catch (e) {} finally { setLoading(false); }
  };

  const getComponents = (deviceId) => {
    const d = devices.find(x => x.id === parseInt(deviceId));
    if (!d?.items) return [];
    return [...new Set(d.items.map(i => i.subtask_name).filter(Boolean))];
  };

  const addDevice = async () => {
    if (!deviceForm.device_id) return;
    const d = devices.find(x => x.id === parseInt(deviceForm.device_id));
    if (!d) return;
    try {
      await API.post("/assembled", { device_id: d.id, device_name: d.name, component_type: 'device', quantity: parseInt(deviceForm.quantity) || 1, assembled_by: user.login });
      setDeviceForm({ device_id: '', quantity: 1 }); setShowDeviceForm(false); loadData();
    } catch (e) {}
  };

  const addComponent = async () => {
    if (!componentForm.device_id || !componentForm.component_key) return;
    const d = devices.find(x => x.id === parseInt(componentForm.device_id));
    if (!d) return;
    try {
      await API.post("/assembled", { device_id: d.id, device_name: d.name, component_name: componentForm.component_key, component_type: 'component', quantity: parseInt(componentForm.quantity) || 1, assembled_by: user.login });
      setComponentForm({ device_id: '', component_key: '', quantity: 1 }); setShowCompForm(false); loadData();
    } catch (e) {}
  };

  const shipDevice = async (id, name) => {
    try { await API.post(`/assembled/${id}/ship`, { user_login: user.login }); loadData(); } catch (e) {}
  };

  const deleteComponent = async (id) => {
    try { await API.delete(`/assembled/${id}`, { data: { user_login: user.login } }); loadData(); } catch (e) {}
  };

  const devices_ = assembledItems.filter(i => i.component_type === 'device');
  const components_ = assembledItems.filter(i => i.component_type === 'component');

  if (loading) return <div style={s.wrap}><h2 style={s.title}>Собранные</h2><div style={{textAlign:'center',padding:'30px',color:'#555'}}>Загрузка...</div></div>;

  return (
    <div style={s.wrap}>
      

      {isAdmin && (
        <div style={s.btns}>
          <button onClick={() => { setShowDeviceForm(!showDeviceForm); setShowCompForm(false); }} style={s.btn1}>+ Прибор</button>
          <button onClick={() => { setShowCompForm(!showCompForm); setShowDeviceForm(false); }} style={s.btn2}>+ Компонент</button>
        </div>
      )}

      {showDeviceForm && (
        <div style={s.form}>
          <select value={deviceForm.device_id} onChange={e => setDeviceForm({...deviceForm, device_id: e.target.value})} style={s.inp}>
            <option value="">Выберите прибор</option>
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input type="number" value={deviceForm.quantity} onChange={e => setDeviceForm({...deviceForm, quantity: Math.max(1, parseInt(e.target.value) || 1)})} min="1" style={{...s.inp, width:'50px'}} />
          <button onClick={addDevice} style={s.btnS}>OK</button>
          <button onClick={() => setShowDeviceForm(false)} style={s.btnC}>X</button>
        </div>
      )}

      {showCompForm && (
        <div style={s.form}>
          <select value={componentForm.device_id} onChange={e => setComponentForm({...componentForm, device_id: e.target.value, component_key: ''})} style={s.inp}>
            <option value="">Выберите прибор</option>
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={componentForm.component_key} onChange={e => setComponentForm({...componentForm, component_key: e.target.value})} style={s.inp} disabled={!componentForm.device_id}>
            <option value="">Выберите компонент</option>
            {componentForm.device_id && getComponents(componentForm.device_id).map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
          <input type="number" value={componentForm.quantity} onChange={e => setComponentForm({...componentForm, quantity: Math.max(1, parseInt(e.target.value) || 1)})} min="1" style={{...s.inp, width:'50px'}} />
          <button onClick={addComponent} style={s.btnS}>OK</button>
          <button onClick={() => setShowCompForm(false)} style={s.btnC}>X</button>
        </div>
      )}

      <div style={s.row}>
        <div style={s.half}>
          <h3 style={s.sub}>Приборы ({devices_.length})</h3>
          <div style={s.tWrap}><table style={s.tbl}><thead><tr><th style={{...s.th,width:'30px'}}>#</th><th style={s.th}>Название</th><th style={s.th}>Кол-во</th>{isAdmin && <th style={{...s.th,width:'80px'}}></th>}</tr></thead><tbody>
            {devices_.length === 0 ? <tr><td colSpan={isAdmin?4:3} style={s.empty}>Нет приборов</td></tr> :
              devices_.map((item, i) => (
                <tr key={item.id} style={{...s.tr, background: selectedDevice === item.device_name ? 'rgba(90,158,255,0.05)' : 'transparent', cursor: 'pointer'}} onClick={() => setSelectedDevice(selectedDevice === item.device_name ? null : item.device_name)}>
                  <td style={{...s.td,color:'#555',textAlign:'center'}}>{i+1}</td>
                  <td style={{...s.td,color:'#5a9eff',fontWeight:'500'}}>{item.device_name}</td>
                  <td style={s.td}>{item.quantity}</td>
                  {isAdmin && <td style={s.td}><button onClick={e => { e.stopPropagation(); shipDevice(item.id, item.device_name); }} style={s.ship}>Отправить</button></td>}
                </tr>
              ))}
          </tbody></table></div>
        </div>

        <div style={s.half}>
          <h3 style={s.sub}>Компоненты {selectedDevice ? `(${selectedDevice})` : ''}</h3>
          <div style={s.tWrap}><table style={s.tbl}><thead><tr><th style={{...s.th,width:'30px'}}>#</th><th style={s.th}>Прибор</th><th style={s.th}>Компонент</th><th style={s.th}>Кол-во</th>{isAdmin && <th style={{...s.th,width:'60px'}}></th>}</tr></thead><tbody>
            {(() => { const dc = selectedDevice ? components_.filter(c => c.device_name === selectedDevice) : components_;
              if (dc.length === 0) return <tr><td colSpan={isAdmin?5:4} style={s.empty}>{selectedDevice ? 'Нет компонентов' : 'Выберите прибор слева'}</td></tr>;
              return dc.map((item, i) => (
                <tr key={item.id} style={s.tr}>
                  <td style={{...s.td,color:'#555',textAlign:'center'}}>{i+1}</td>
                  <td style={s.td}>{item.device_name}</td>
                  <td style={{...s.td,color:'#aa6600'}}>{item.component_name}</td>
                  <td style={s.td}>{item.quantity}</td>
                  {isAdmin && <td style={s.td}><button onClick={() => deleteComponent(item.id)} style={s.del}>Удалить</button></td>}
                </tr>
              ));
            })()}
          </tbody></table></div>
        </div>
      </div>
    </div>
  );
}
