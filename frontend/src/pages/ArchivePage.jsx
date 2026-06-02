import { useEffect, useState } from "react";
import API from "../api";

export default function ArchivePage({ user }) {
  const [activeTab, setActiveTab] = useState('items');
  const [archivedItems, setArchivedItems] = useState([]);
  const [archivedConsumables, setArchivedConsumables] = useState([]);
  const [archivedDevices, setArchivedDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadArchive = async () => {
    setLoading(true);
    try {
      const [itemsRes, consumablesRes, devicesRes] = await Promise.all([
        API.get("/archive/items"), API.get("/archive/consumables"), API.get("/archive/devices")
      ]);
      setArchivedItems(itemsRes.data || []);
      setArchivedConsumables(consumablesRes.data || []);
      setArchivedDevices(devicesRes.data || []);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { loadArchive(); }, []);

  const restore = async (type, id) => {
    if (!confirm("Восстановить элемент?")) return;
    try { await API.post(`/archive/${type}/${id}/restore`, { user_login: user.login }); loadArchive(); }
    catch (e) { alert("Ошибка восстановления"); }
  };

  const permanentDelete = async (type, id) => {
    if (!confirm("Окончательно удалить?")) return;
    try { await API.delete(`/archive/${type}/${id}`, { data: { user_login: user.login } }); loadArchive(); }
    catch (e) { alert("Ошибка удаления"); }
  };

  const getData = () => { switch(activeTab) { case 'items': return archivedItems; case 'consumables': return archivedConsumables; case 'devices': return archivedDevices; default: return []; } };
  const getTypeName = () => { switch(activeTab) { case 'items': return 'items'; case 'consumables': return 'consumables'; case 'devices': return 'devices'; default: return ''; } };
  const data = getData(); const typeName = getTypeName();

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🗄️ Архив</h2>
      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('items')} style={{...styles.tab, background: activeTab === 'items' ? '#b30000' : '#333'}}>📦 Детали ({archivedItems.length})</button>
        <button onClick={() => setActiveTab('consumables')} style={{...styles.tab, background: activeTab === 'consumables' ? '#b30000' : '#333'}}>🔧 Расходники ({archivedConsumables.length})</button>
        <button onClick={() => setActiveTab('devices')} style={{...styles.tab, background: activeTab === 'devices' ? '#b30000' : '#333'}}>🔬 Приборы ({archivedDevices.length})</button>
      </div>
      {loading ? <div style={{color:'#aaa',textAlign:'center',padding:'40px'}}>Загрузка...</div> : data.length === 0 ? <div style={{color:'#666',textAlign:'center',padding:'40px'}}>Архив пуст</div> : (
        <div style={styles.tableContainer}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'50px'}}>№</th><th style={styles.th}>Название</th>{activeTab !== 'devices' && <><th style={styles.th}>Количество</th><th style={styles.th}>Мин. запас</th></>}<th style={styles.th}>Дата удаления</th><th style={styles.th}>Действия</th></tr></thead><tbody>{data.map((item, index) => (<tr key={item.id} style={styles.tr}><td style={{...styles.td,textAlign:'center',color:'#666'}}>{index + 1}</td><td style={styles.td}>{item.name}</td>{activeTab !== 'devices' && <><td style={styles.td}>{item.quantity}</td><td style={styles.td}>{item.min_quantity ? `${item.min_quantity} шт.` : '—'}</td></>}<td style={{...styles.td,color:'#888',fontSize:'13px'}}>{new Date(item.deleted_at).toLocaleString('ru-RU')}</td><td style={styles.td}><div style={{display:'flex',gap:'8px'}}><button onClick={() => restore(typeName, item.id)} style={styles.restoreBtn}>↩ Восстановить</button><button onClick={() => permanentDelete(typeName, item.id)} style={styles.deleteBtn}>✕ Удалить</button></div></td></tr>))}</tbody></table></div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', height: '100%' },
  title: { color: '#fff', marginBottom: '20px', fontSize: '24px' },
  tabs: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tab: { color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: 'background 0.3s' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#2a2a2a', borderRadius: '8px', overflow: 'hidden' },
  th: { background: '#333', color: '#fff', padding: '12px', textAlign: 'left', borderBottom: '2px solid #b30000', fontSize: '14px' },
  tr: { borderBottom: '1px solid #444' }, td: { padding: '12px', borderBottom: '1px solid #444', color: '#fff' },
  restoreBtn: { background: '#006600', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  deleteBtn: { background: '#660000', color: '#ff6666', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }
};
