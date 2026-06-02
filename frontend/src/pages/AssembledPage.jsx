import React, { useEffect, useState } from "react";
import API from "../api";

export default function AssembledPage({ user }) {
  const [assembledItems, setAssembledItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddDeviceForm, setShowAddDeviceForm] = useState(false);
  const [showAddComponentForm, setShowAddComponentForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ device_id: '', quantity: 1 });
  const [componentForm, setComponentForm] = useState({ device_id: '', component_key: '', quantity: 1 });

  const isAdmin = user?.is_admin || user?.login?.toLowerCase() === 'admin';

  useEffect(() => { loadData(); const i = setInterval(loadData, 15000); return () => clearInterval(i); }, []);

  const loadData = async () => {
    try {
      const [assembledRes, devicesRes] = await Promise.all([API.get("/assembled"), API.get("/devices")]);
      setAssembledItems(assembledRes.data || []);
      setDevices(devicesRes.data || []);
    } catch (e) {} finally { setLoading(false); }
  };

  const getDeviceComponents = (deviceId) => {
    const device = devices.find(d => d.id === parseInt(deviceId));
    if (!device?.items) return [];
    const components = new Set();
    device.items.forEach(item => {
      if (item.subtask_name) components.add(item.subtask_name);
    });
    return Array.from(components);
  };

  const addDevice = async () => {
    if (!deviceForm.device_id) { alert("Выберите прибор"); return; }
    const device = devices.find(d => d.id === parseInt(deviceForm.device_id));
    if (!device) return;
    try {
      await API.post("/assembled", {
        device_id: device.id,
        device_name: device.name,
        component_type: 'device',
        quantity: parseInt(deviceForm.quantity) || 1,
        assembled_by: user.login
      });
      setDeviceForm({ device_id: '', quantity: 1 });
      setShowAddDeviceForm(false);
      loadData();
    } catch (e) { alert("Ошибка"); }
  };

  const addComponent = async () => {
    if (!componentForm.device_id || !componentForm.component_key) { alert("Выберите прибор и компонент"); return; }
    const device = devices.find(d => d.id === parseInt(componentForm.device_id));
    if (!device) return;
    try {
      await API.post("/assembled", {
        device_id: device.id,
        device_name: device.name,
        component_name: componentForm.component_key,
        component_type: 'component',
        quantity: parseInt(componentForm.quantity) || 1,
        assembled_by: user.login
      });
      setComponentForm({ device_id: '', component_key: '', quantity: 1 });
      setShowAddComponentForm(false);
      loadData();
    } catch (e) { alert("Ошибка"); }
  };

  const shipDevice = async (id, name) => {
    if (!confirm(`Отправить покупателю 1 шт. "${name}"?`)) return;
    try {
      const res = await API.post(`/assembled/${id}/ship`);
      loadData();
      alert(res.data.message);
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const deleteComponent = async (id, name) => {
    if (!confirm(`Удалить 1 шт. "${name}"?`)) return;
    try {
      const res = await API.delete(`/assembled/${id}`);
      loadData();
      alert(res.data.message);
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const assembledDevices = assembledItems.filter(i => i.component_type === 'device');
  const assembledComponents = assembledItems.filter(i => i.component_type === 'component');

  if (loading) return <div style={st.container}><h2 style={st.title}>📦 Собранные приборы</h2><div style={{textAlign:'center',padding:'40px',color:'#888'}}>Загрузка...</div></div>;

  return (
    <div style={st.container}>
      <h2 style={st.title}>📦 Собранные приборы и компоненты</h2>

      {isAdmin && (
        <div style={st.btnRow}>
          <button onClick={() => { setShowAddDeviceForm(!showAddDeviceForm); setShowAddComponentForm(false); }} style={st.addBtn}>+ Прибор</button>
          <button onClick={() => { setShowAddComponentForm(!showAddComponentForm); setShowAddDeviceForm(false); }} style={{...st.addBtn, background: '#0066aa'}}>+ Компонент</button>
        </div>
      )}

      {showAddDeviceForm && (
        <div style={st.form}>
          <select value={deviceForm.device_id} onChange={e => setDeviceForm({...deviceForm, device_id: e.target.value})} style={st.input}>
            <option value="">Выберите прибор</option>
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input type="number" value={deviceForm.quantity} onChange={e => setDeviceForm({...deviceForm, quantity: Math.max(1, parseInt(e.target.value) || 1)})} min="1" style={{...st.input, width:'60px'}} />
          <button onClick={addDevice} style={st.saveBtn}>✅</button>
          <button onClick={() => setShowAddDeviceForm(false)} style={st.cancelBtn}>✕</button>
        </div>
      )}

      {showAddComponentForm && (
        <div style={st.form}>
          <select value={componentForm.device_id} onChange={e => setComponentForm({...componentForm, device_id: e.target.value, component_key: ''})} style={st.input}>
            <option value="">Выберите прибор</option>
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={componentForm.component_key} onChange={e => setComponentForm({...componentForm, component_key: e.target.value})} style={st.input} disabled={!componentForm.device_id}>
            <option value="">Выберите компонент</option>
            {componentForm.device_id && getDeviceComponents(componentForm.device_id).map((c, i) => (<option key={i} value={c}>{c}</option>))}
          </select>
          <input type="number" value={componentForm.quantity} onChange={e => setComponentForm({...componentForm, quantity: Math.max(1, parseInt(e.target.value) || 1)})} min="1" style={{...st.input, width:'60px'}} />
          <button onClick={addComponent} style={st.saveBtn}>✅</button>
          <button onClick={() => setShowAddComponentForm(false)} style={st.cancelBtn}>✕</button>
        </div>
      )}

      <div style={st.tablesRow}>
        {/* Приборы */}
        <div style={st.tableHalf}>
          <h3 style={st.tableTitle}>🔬 Приборы ({assembledDevices.length})</h3>
          <div style={st.tableWrap}>
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={{...st.th, width:'40px'}}>№</th>
                  <th style={st.th}>Название</th>
                  <th style={st.th}>Кол-во</th>
                  {isAdmin && <th style={{...st.th, width:'100px'}}></th>}
                </tr>
              </thead>
              <tbody>
                {assembledDevices.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 4 : 3} style={st.empty}>Нет приборов</td></tr>
                ) : assembledDevices.map((item, i) => (
                  <tr key={item.id} style={{...st.tr, background: selectedDevice === item.device_name ? 'rgba(74,158,255,0.1)' : 'transparent', cursor: 'pointer'}} onClick={() => setSelectedDevice(selectedDevice === item.device_name ? null : item.device_name)}>
                    <td style={{...st.td, color:'#888', textAlign:'center'}}>{i + 1}</td>
                    <td style={{...st.td, color:'#4a9eff', fontWeight:'500'}}>{item.device_name}</td>
                    <td style={st.td}>{item.quantity}</td>
                    {isAdmin && (
                      <td style={st.td}>
                        <button onClick={e => { e.stopPropagation(); shipDevice(item.id, item.device_name); }} style={st.shipBtn}>📤 Отправлен</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Компоненты */}
        <div style={st.tableHalf}>
          <h3 style={st.tableTitle}>🔩 Компоненты {selectedDevice ? `(${selectedDevice})` : ''}</h3>
          <div style={st.tableWrap}>
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={{...st.th, width:'40px'}}>№</th>
                  <th style={st.th}>Прибор</th>
                  <th style={st.th}>Компонент</th>
                  <th style={st.th}>Кол-во</th>
                  {isAdmin && <th style={{...st.th, width:'60px'}}></th>}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const dc = selectedDevice ? assembledComponents.filter(c => c.device_name === selectedDevice) : assembledComponents;
                  if (dc.length === 0) return (
                    <tr><td colSpan={isAdmin ? 5 : 4} style={st.empty}>{selectedDevice ? 'Нет компонентов' : 'Выберите прибор слева'}</td></tr>
                  );
                  return dc.map((item, i) => (
                    <tr key={item.id} style={st.tr}>
                      <td style={{...st.td, color:'#888', textAlign:'center'}}>{i + 1}</td>
                      <td style={st.td}>{item.device_name}</td>
                      <td style={{...st.td, color:'#ffaa44'}}>{item.component_name}</td>
                      <td style={st.td}>{item.quantity}</td>
                      {isAdmin && (
                        <td style={st.td}>
                          <button onClick={() => deleteComponent(item.id, item.component_name)} style={st.delBtn}>🗑 Удалить</button>
                        </td>
                      )}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const st = {
  container: { padding: '15px', height: '100%', color: '#fff', overflow: 'auto' },
  title: { margin: '0 0 15px', fontSize: '22px', fontWeight: 'bold' },
  btnRow: { display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' },
  addBtn: { background: '#b30000', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' },
  form: { display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap', background: '#2a2a2a', padding: '10px', borderRadius: '8px', alignItems: 'center' },
  input: { padding: '8px 10px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '5px', color: '#fff', fontSize: '14px', flex: 1, minWidth: '120px' },
  saveBtn: { background: '#006600', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' },
  cancelBtn: { background: '#666', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' },
  tablesRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignItems: 'start' },
  tableHalf: { minWidth: 0 },
  tableTitle: { color: '#fff', fontSize: '15px', margin: '0 0 8px', fontWeight: 'bold' },
  tableWrap: { borderRadius: '8px', border: '1px solid #444', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#2a2a2a', minWidth: '250px' },
  th: { background: '#333', color: '#fff', padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #b30000', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #3a3a3a', transition: 'background 0.2s' },
  td: { padding: '8px 10px', borderBottom: '1px solid #3a3a3a', color: '#fff', fontSize: '13px' },
  empty: { textAlign: 'center', padding: '25px', color: '#666', fontSize: '13px' },
  shipBtn: { background: '#006600', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' },
  delBtn: { background: '#660000', color: '#ff6666', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }
};
