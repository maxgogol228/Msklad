import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { formatTime, getTimeLeft, isWorkingTime } from '../utils';

const styles = {
  container: { padding: '15px', height: '100%', color: '#ccc', overflow: 'auto', background: '#1a1a1a' },
  title: { margin: '0 0 12px', fontSize: '20px', fontWeight: 'bold', color: '#fff' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' },
  tab: { color: '#999', border: '1px solid #444', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', background: '#2a2a2a' },
  tabActive: { color: '#fff', border: '1px solid #b30000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', background: '#b30000' },
  tableWrap: { borderRadius: '6px', border: '1px solid #333', overflowX: 'auto', marginBottom: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#222', minWidth: '600px' },
  th: { background: '#2a2a2a', color: '#999', padding: '7px 8px', textAlign: 'left', borderBottom: '1px solid #b30000', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #333' },
  td: { padding: '6px 8px', borderBottom: '1px solid #333', color: '#bbb', fontSize: '12px', verticalAlign: 'top' },
  empty: { textAlign: 'center', padding: '25px', color: '#555' },
  btnSuccess: { background: '#1a3a1a', color: '#4CAF50', border: '1px solid #2d5a2d', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' },
  btnDanger: { background: '#3a1a1a', color: '#ff6666', border: '1px solid #5a2d2d', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  btnPrimary: { background: '#1a2a3a', color: '#5a9eff', border: '1px solid #2d3a5a', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  btnWarn: { background: '#3a2a1a', color: '#ffaa44', border: '1px solid #5a3a2d', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  select: { background: '#1a1a1a', color: '#ccc', border: '1px solid #444', padding: '4px 6px', borderRadius: '3px', fontSize: '11px', maxWidth: '120px' },
  detail: { background: '#222', borderRadius: '8px', border: '1px solid #b30000', padding: '12px', marginTop: '8px' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' },
  badge: { padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  compItem: { fontSize: '10px', padding: '2px 5px', background: 'rgba(255,255,255,0.02)', borderRadius: '3px', color: '#999', borderLeft: '2px solid #444' }
};

// Компонент модального окна
function Modal({ title, message, onConfirm, onCancel, confirmText, cancelText, type }) {
  const colors = {
    danger: { bg: '#3a1a1a', border: '#b30000', btn: '#b30000' },
    warn: { bg: '#2a2a1a', border: '#aa6600', btn: '#aa6600' },
    info: { bg: '#1a2a2a', border: '#444', btn: '#444' }
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:2000}}>
      <div style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:'8px',padding:'20px',minWidth:'320px',maxWidth:'450px'}}>
        <h4 style={{margin:'0 0 8px',color:'#fff',fontSize:'16px'}}>{title}</h4>
        {message && <p style={{color:'#aaa',fontSize:'13px',margin:'0 0 15px'}}>{message}</p>}
        <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
          {onCancel && <button onClick={onCancel} style={{background:'#333',color:'#aaa',border:'1px solid #555',padding:'7px 14px',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>{cancelText || 'Отмена'}</button>}
          <button onClick={onConfirm} style={{background:c.btn,color:'#fff',border:'none',padding:'7px 14px',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>{confirmText || 'OK'}</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{position:'fixed',bottom:'20px',right:'20px',background:'#2a2a2a',border:'1px solid #b30000',padding:'12px 20px',borderRadius:'6px',color:'#fff',zIndex:3000,fontSize:'13px'}}>
      {message}
    </div>
  );
}

export default function TasksPage({ user }) {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskItems, setTaskItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('my');
  const [addTimeModal, setAddTimeModal] = useState(null);
  const [addHours, setAddHours] = useState(0);
  const [addMinutes, setAddMinutes] = useState(15);
  const [routineTasks, setRoutineTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timerTick, setTimerTick] = useState(0);
  const [reassignModal, setReassignModal] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const isAdmin = user && (user.is_admin || user.login?.toLowerCase() === 'admin');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    loadAll();
    if (isAdmin) loadUsers();
    const d = setInterval(loadAll, 30000); // Увеличил интервал
    const t = setInterval(() => { if (isWorkingTime(new Date())) setTimerTick(p => p + 1); }, 1000);
    return () => { clearInterval(d); clearInterval(t); };
  }, []);

  const loadAll = async () => {
    try {
      if (isAdmin) {
        const [t, m, r] = await Promise.all([API.get("/tasks"), API.get(`/tasks/my-tasks/${user.id}`), API.get("/tasks/routine")]);
        setTasks(t.data || []); setMyTasks(m.data || []); setRoutineTasks(r.data || []);
      } else {
        const m = await API.get(`/tasks/my-tasks/${user.id}`);
        setMyTasks(m.data || []);
      }
    } catch (e) {} finally { setLoading(false); }
  };

  const loadUsers = async () => { try { setUsers(((await API.get("/users")).data || []).filter(u => u.approved)); } catch (e) {} };

  const getStatusBadge = (s) => {
    const b = { pending: '#555', active: '#444', in_progress: '#aa6600', paused: '#666', completed: '#2d5a2d', cancelled: '#5a2d2d', skipped: '#333' };
    const t = { pending: 'Ожидает', active: 'Новая', in_progress: 'В работе', paused: 'Пауза', completed: 'Готово', cancelled: 'Отмена', skipped: 'Пропущено' };
    return <span style={{...styles.badge, background: b[s] || '#333', color: s==='completed'?'#4CAF50':s==='in_progress'?'#ffaa44':'#888'}}>{t[s] || s}</span>;
  };

  const formatEndTime = (deadline) => {
    if (!deadline) return '—';
    const d = new Date(deadline), n = new Date();
    if (d.toDateString() === n.toDateString()) return 'сегодня ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const tm = new Date(n); tm.setDate(tm.getDate() + 1);
    if (d.toDateString() === tm.toDateString()) return 'завтра ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const openTask = async (task) => {
    setSelectedTask(task); setTaskItems([]);
    try {
      const items = (await API.get(`/tasks/${task.id}/items`)).data || [];
      const w = await Promise.all(items.map(async (i) => {
        try { return { ...i, components: (await API.get(`/tasks/items/${i.id}/components`)).data || [] }; }
        catch (e) { return { ...i, components: [] }; }
      }));
      setTaskItems(w);
    } catch (e) {}
  };

  const assignItem = async (id, uid, ulogin) => {
    try {
      const item = taskItems.find(i => i.id === id);
      await API.put(`/tasks/items/${id}/assign`, { assigned_to: uid, assigned_login: ulogin, time_estimate: item?.time_estimate || 240 });
      if (selectedTask) openTask(selectedTask);
      loadAll();
    } catch (e) { showToast("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const reassignItem = async (id, uid, ulogin) => {
    try {
      await API.put(`/tasks/items/${id}/reassign`, { assigned_to: uid, assigned_login: ulogin });
      if (selectedTask) openTask(selectedTask);
      loadAll(); setReassignModal(null);
    } catch (e) { showToast("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const deleteAssemblyTask = async (tid) => {
    setModal({
      title: 'Удаление задачи',
      message: 'Вы уверены?',
      type: 'danger',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      onConfirm: async () => {
        try {
          await API.delete(`/tasks/${tid}`, { data: { user_id: user.id, user_login: user.login } });
          loadAll(); setSelectedTask(null); setTaskItems([]);
          showToast('Задача удалена');
        } catch (e) { showToast("Ошибка: " + (e.response?.data?.error || e.message)); }
        setModal(null);
      },
      onCancel: () => setModal(null)
    });
  };

  const addTime = async () => {
    const tm = (addHours * 60) + addMinutes;
    if (tm <= 0) { showToast("Укажите время"); return; }
    try {
      await API.put(`/tasks/items/${addTimeModal.id}/add-time`, { added_minutes: tm, admin_login: user.login, user_id: user.id });
      setAddTimeModal(null); if (selectedTask) openTask(selectedTask); loadAll();
    } catch (e) { showToast("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const requestTime = async (id) => {
    setModal({
      title: 'Запрос времени',
      message: 'Сколько минут добавить?',
      type: 'info',
      confirmText: 'Отправить',
      cancelText: 'Отмена',
      onConfirm: async () => {
        const mins = 30; // Пока фиксированное значение
        try {
          await API.put(`/tasks/items/${id}/request-time`, { requested_minutes: mins, user_id: user.id, user_login: user.login });
          showToast("Запрос отправлен");
        } catch (e) { showToast("Ошибка: " + (e.response?.data?.error || e.message)); }
        setModal(null);
      },
      onCancel: () => setModal(null)
    });
  };

  const completeMyTask = async (id) => {
    try {
      await API.put(`/tasks/items/${id}/complete`, { completed_by: user.id, completed_login: user.login });
      loadAll();
      showToast('Задача выполнена');
    } catch (e) { showToast("Ошибка"); }
  };

  // ... остальные функции (createTemplate, launchFromTemplate, etc.) остаются без изменений ...

  if (loading) return <div style={styles.container}><h2 style={styles.title}>Задачи</h2><div style={{textAlign:'center',padding:'40px',color:'#555'}}>Загрузка...</div></div>;

  // ИСПОЛНИТЕЛЬ
  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Мои задачи</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={{...styles.th,width:'35px'}}>#</th><th style={styles.th}>Задача</th><th style={styles.th}>Комплектующие</th><th style={styles.th}>Время</th><th style={styles.th}>Статус</th><th style={styles.th}>Срок</th><th style={{...styles.th,width:'100px'}}></th></tr></thead>
            <tbody>
              {myTasks.length === 0 ? <tr><td colSpan={7} style={styles.empty}>Нет задач</td></tr> :
                myTasks.map((ti, i) => {
                  const tl = ti.deadline ? getTimeLeft(ti.deadline) : null;
                  const isPaused = ti.task_status === 'paused';
                  let components = [];
                  try { components = typeof ti.components === 'string' ? JSON.parse(ti.components) : (ti.components || []); } catch (e) {}
                  return (
                    <tr key={ti.id} style={{...styles.tr, background: isPaused ? 'rgba(255,165,0,0.05)' : 'transparent'}}>
                      <td style={{...styles.td,color:'#555',textAlign:'center'}}>{i+1}</td>
                      <td style={styles.td}><div style={{color:'#5a9eff',fontWeight:'500'}}>{ti.device_name}</div><div style={{color:'#aa6600',fontSize:'11px'}}>{ti.subtask_name}</div></td>
                      <td style={styles.td}>{components.length > 0 ? <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>{components.map((c,ci)=>(<div key={ci} style={styles.compItem}>{c.item_type==='consumable'?'◆':'◇'} {c.component_name} x{c.quantity}</div>))}</div>:<span style={{color:'#555'}}>—</span>}</td>
                      <td style={styles.td}>{!ti.deadline?<span style={{color:'#aa6600'}}>ожидание</span>:tl?<span style={{color:tl.color,fontWeight:'bold'}}>{tl.text}</span>:'—'}</td>
                      <td style={styles.td}>{isPaused?<span style={{...styles.badge,background:'#3a2a1a',color:'#ffaa44'}}>Пауза</span>:<span style={{...styles.badge,background:'#1a3a1a',color:'#4CAF50'}}>В работе</span>}</td>
                      <td style={{...styles.td,fontSize:'11px',color:'#777'}}>{ti.deadline?formatEndTime(ti.deadline):'—'}</td>
                      <td style={styles.td}><div style={{display:'flex',gap:'4px'}}>{ti.deadline&&<button onClick={()=>completeMyTask(ti.id)} style={styles.btnSuccess}>Готово</button>}<button onClick={()=>requestTime(ti.id)} style={styles.btnWarn}>+Время</button></div></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {modal && <Modal {...modal} />}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // АДМИН
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Задачи</h2>
      <div style={styles.tabs}>
        <button onClick={()=>setActiveTab('my')} style={activeTab==='my'?styles.tabActive:styles.tab}>Мои ({myTasks.length})</button>
        <button onClick={()=>setActiveTab('all')} style={activeTab==='all'?styles.tabActive:styles.tab}>Сборочные ({tasks.length})</button>
        <button onClick={()=>setActiveTab('routine')} style={activeTab==='routine'?styles.tabActive:styles.tab}>Рутинные ({routineTasks.length})</button>
      </div>

      {activeTab==='my'&&(
        <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'35px'}}>#</th><th style={styles.th}>Прибор</th><th style={styles.th}>Задача</th><th style={styles.th}>Время</th><th style={styles.th}>Срок</th><th style={{...styles.th,width:'70px'}}></th></tr></thead><tbody>{myTasks.length===0?<tr><td colSpan={6} style={styles.empty}>Нет задач</td></tr>:myTasks.map((ti,i)=>{const tl=ti.deadline?getTimeLeft(ti.deadline):null;return(<tr key={ti.id}><td style={{...styles.td,color:'#555',textAlign:'center'}}>{i+1}</td><td style={styles.td}>{ti.device_name}</td><td style={{...styles.td,color:'#aa6600'}}>{ti.subtask_name}</td><td style={styles.td}>{!ti.deadline?<span style={{color:'#aa6600'}}>—</span>:tl?<span style={{color:tl.color,fontWeight:'bold'}}>{tl.text}</span>:'—'}</td><td style={{...styles.td,fontSize:'11px',color:'#777'}}>{ti.deadline?new Date(ti.deadline).toLocaleString('ru-RU'):'—'}</td><td style={styles.td}>{ti.deadline&&<button onClick={()=>completeMyTask(ti.id)} style={styles.btnSuccess}>Готово</button>}</td></tr>)})}</tbody></table></div>
      )}

      {activeTab==='all'&&(<>
        <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'35px'}}>#</th><th style={styles.th}>Прибор</th><th style={{...styles.th,width:'120px'}}>Прогресс</th><th style={styles.th}>Статус</th><th style={styles.th}>Создана</th><th style={{...styles.th,width:'100px'}}>Управление</th></tr></thead><tbody>{tasks.length===0?<tr><td colSpan={6} style={styles.empty}>Нет задач</td></tr>:tasks.map((t,i)=>(<tr key={t.id}><td style={{...styles.td,color:'#555',textAlign:'center'}}>{i+1}</td><td style={{...styles.td,cursor:'pointer',color:'#5a9eff'}} onClick={()=>openTask(t)}>{t.device_name}</td><td style={styles.td}><div style={{display:'flex',alignItems:'center',gap:'4px'}}><div style={{flex:1,height:'4px',background:'#333',borderRadius:'2px'}}><div style={{height:'100%',width:`${t.total_items>0?Math.round((t.completed_items/t.total_items)*100):0}%`,background:t.completed_items===t.total_items?'#4CAF50':'#aa6600',borderRadius:'2px'}}/></div><span style={{fontSize:'10px',color:'#777'}}>{t.completed_items}/{t.total_items}</span></div></td><td style={styles.td}>{getStatusBadge(t.status)}</td><td style={{...styles.td,fontSize:'11px',color:'#777'}}>{new Date(t.created_at).toLocaleString('ru-RU')}</td><td style={styles.td}><div style={{display:'flex',gap:'4px'}}>{(t.created_by===user.id||user.login?.toLowerCase()==='admin')&&(<><button onClick={()=>openTask(t)} style={styles.btnPrimary}>Открыть</button><button onClick={()=>deleteAssemblyTask(t.id)} style={styles.btnDanger}>Удалить</button></>)}</div></td></tr>))}</tbody></table></div>
        {selectedTask&&(<div style={styles.detail}><div style={styles.detailHeader}><h3 style={{margin:0,fontSize:'15px',color:'#fff'}}>{selectedTask.device_name} {getStatusBadge(selectedTask.status)}</h3><div style={{display:'flex',gap:'6px'}}>{(selectedTask.created_by===user.id||user.login?.toLowerCase()==='admin')&&<button onClick={()=>deleteAssemblyTask(selectedTask.id)} style={styles.btnDanger}>Удалить</button>}<button onClick={()=>{setSelectedTask(null);setTaskItems([])}} style={{...styles.btnPrimary,background:'#333',color:'#888'}}>Закрыть</button></div></div><div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'35px'}}>#</th><th style={styles.th}>Задача</th><th style={styles.th}>Комплектующие</th><th style={styles.th}>Время</th><th style={styles.th}>Срок</th><th style={styles.th}>Исполнитель</th><th style={{...styles.th,width:'80px'}}></th></tr></thead><tbody>{taskItems.map((ti,idx)=>(<tr key={ti.id} style={{...styles.tr,opacity:ti.status==='completed'||ti.status==='skipped'?0.4:1,background:ti.status==='skipped'?'#1a1a1a':'transparent'}}><td style={{...styles.td,color:'#555',textAlign:'center'}}>{idx+1}</td><td style={{...styles.td,color:'#aa6600'}}>{ti.subtask_name}{ti.status==='skipped'&&<span style={{color:'#555',fontSize:'10px',marginLeft:'4px'}}>(пропущено)</span>}</td><td style={styles.td}>{ti.components?.length>0?ti.components.map(c=>(<div key={c.id} style={styles.compItem}>{c.item_type==='consumable'?'◆':'◇'} {c.component_name} x{c.quantity}</div>)):<span style={{color:'#555'}}>—</span>}</td><td style={styles.td}>{formatTime(ti.time_estimate)}</td><td style={{...styles.td,fontSize:'11px',color:'#777'}}>{formatEndTime(ti.deadline)}</td><td style={styles.td}>{ti.assigned_login?<span style={{color:'#5a9eff'}}>{ti.assigned_login}</span>:(ti.status!=='completed'&&ti.status!=='skipped'&&(selectedTask.created_by===user.id||user.login?.toLowerCase()==='admin')&&<select onChange={e=>{if(e.target.value)assignItem(ti.id,e.target.value,users.find(u=>u.id===parseInt(e.target.value))?.login)}} style={styles.select} defaultValue=""><option value="">Назначить</option>{users.map(u=><option key={u.id} value={u.id}>{u.login}</option>)}</select>)}</td><td style={styles.td}>{ti.status==='in_progress'&&(selectedTask.created_by===user.id||user.login?.toLowerCase()==='admin')&&<button onClick={()=>{setAddTimeModal(ti);setAddHours(0);setAddMinutes(15)}} style={styles.btnPrimary}>+Время</button>}</td></tr>))}</tbody></table></div></div>)}
      </>)}

      {/* Рутинные задачи и модалки остаются без изменений */}
      
      {modal && <Modal {...modal} />}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
