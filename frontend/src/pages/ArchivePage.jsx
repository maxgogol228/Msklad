import { useEffect, useState } from "react";
import API from "../api";

const s = {
  wrap: { padding: '10px', height: '100%', color: '#ccc', overflow: 'auto', background: '#1a1a1a' },
  title: { color: '#fff', marginBottom: '12px', fontSize: '18px', fontWeight: 'bold' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '12px' },
  tab: (active) => ({ color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', background: active ? '#b30000' : '#2a2a2a', transition: 'background 0.2s' }),
  tWrap: { overflowX: 'auto', borderRadius: '4px', border: '1px solid #333' },
  tbl: { width: '100%', borderCollapse: 'collapse', background: '#222', minWidth: '500px' },
  th: { background: '#2a2a2a', color: '#999', padding: '7px 10px', textAlign: 'left', borderBottom: '1px solid #b30000', fontSize: '11px', fontWeight: 'bold' },
  tr: { borderBottom: '1px solid #333' },
  td: { padding: '7px 10px', borderBottom: '1px solid #333', color: '#bbb', fontSize: '12px' },
  btnR: { background: '#1a3a1a', color: '#4CAF50', border: 'none', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' },
  btnD: { background: '#3a1a1a', color: '#ff6666', border: 'none', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }
};

export default function ArchivePage({ user }) {
  const [tab, setTab] = useState('items');
  const [items, setItems] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [devs, setDevs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [i, c, d] = await Promise.all([API.get("/archive/items"), API.get("/archive/consumables"), API.get("/archive/devices")]);
      setItems(i.data || []); setConsumables(c.data || []); setDevs(d.data || []);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const restore = async (type, id) => {
    try { await API.post(`/archive/${type}/${id}/restore`, { user_login: user.login }); load(); } catch (e) {}
  };

  const permDelete = async (type, id) => {
    try { await API.delete(`/archive/${type}/${id}`, { data: { user_login: user.login } }); load(); } catch (e) {}
  };

  const data = tab==='items'?items:tab==='consumables'?consumables:devs;
  const typeName = tab==='items'?'items':tab==='consumables'?'consumables':'devices';

  return (
    <div style={s.wrap}>
      
      <div style={s.tabs}>
        <button onClick={() => setTab('items')} style={s.tab(tab==='items')}>Детали ({items.length})</button>
        <button onClick={() => setTab('consumables')} style={s.tab(tab==='consumables')}>Расходники ({consumables.length})</button>
        <button onClick={() => setTab('devices')} style={s.tab(tab==='devices')}>Приборы ({devs.length})</button>
      </div>
      {loading ? <div style={{textAlign:'center',padding:'30px',color:'#555'}}>Загрузка...</div> :
        data.length === 0 ? <div style={{textAlign:'center',padding:'30px',color:'#555'}}>Архив пуст</div> :
        <div style={s.tWrap}><table style={s.tbl}><thead><tr><th style={{...s.th,width:'40px'}}>#</th><th style={s.th}>Название</th>{tab!=='devices'&&<><th style={s.th}>Кол-во</th><th style={s.th}>Мин.</th></>}<th style={s.th}>Дата удаления</th><th style={s.th}>Действия</th></tr></thead><tbody>
          {data.map((item, i) => (
            <tr key={item.id} style={s.tr}>
              <td style={{...s.td,color:'#555',textAlign:'center'}}>{i+1}</td>
              <td style={s.td}>{item.name}</td>
              {tab!=='devices'&&<><td style={s.td}>{item.quantity}</td><td style={s.td}>{item.min_quantity?`${item.min_quantity} шт.`:'—'}</td></>}
              <td style={{...s.td,color:'#777',fontSize:'11px'}}>{new Date(item.deleted_at).toLocaleString('ru-RU')}</td>
              <td style={s.td}><div style={{display:'flex',gap:'6px'}}><button onClick={()=>restore(typeName,item.id)} style={s.btnR}>Восстановить</button><button onClick={()=>permDelete(typeName,item.id)} style={s.btnD}>Удалить</button></div></td>
            </tr>
          ))}
        </tbody></table></div>
      }
    </div>
  );
}
