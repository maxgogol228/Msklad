import React, { useEffect, useState } from "react";
import API from "../api";
import { formatTime, getTimeLeft, isWorkingTime } from '../utils';

const styles = {
  container: { padding: '15px', height: '100%', color: '#fff', overflow: 'auto' },
  title: { margin: '0 0 12px', fontSize: '22px' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' },
  tab: { color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', background: '#333' },
  tabActive: { color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', background: '#b30000' },
  tableWrap: { borderRadius: '8px', border: '1px solid #444', overflowX: 'auto', marginBottom: '15px' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#2a2a2a', minWidth: '600px' },
  th: { background: '#333', color: '#fff', padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #b30000', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #3a3a3a' },
  td: { padding: '8px 10px', borderBottom: '1px solid #3a3a3a', color: '#fff', fontSize: '13px', verticalAlign: 'top' },
  empty: { textAlign: 'center', padding: '25px', color: '#666' },
  completeBtn: { background: '#006600', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' },
  deleteBtn: { background: '#660000', color: '#ff6666', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  editBtn: { background: '#0066aa', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  launchBtn: { background: '#4CAF50', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  assignSelect: { background: '#1e1e1e', color: '#fff', border: '1px solid #555', padding: '5px', borderRadius: '4px', fontSize: '12px', maxWidth: '130px' },
  form: { background: '#2a2a2a', padding: '15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '8px 10px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '6px', color: '#fff', fontSize: '14px' },
  textarea: { padding: '8px 10px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '6px', color: '#fff', fontSize: '14px', resize: 'vertical' },
  timeRow: { display: 'flex', alignItems: 'center', gap: '5px', color: '#aaa', fontSize: '14px', flexWrap: 'wrap' },
  timeInput: { width: '50px', padding: '6px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '5px', color: '#fff', textAlign: 'center', fontSize: '14px' },
  closeBtn: { background: '#444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' },
  detail: { background: '#2a2a2a', borderRadius: '10px', border: '1px solid #b30000', padding: '15px', marginTop: '10px' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' },
  addTimeBtn: { background: '#0066aa', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  requestTimeBtn: { background: '#aa6600', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  reassignBtn: { background: '#444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  cancelBtn: { background: '#666', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  statusBadge: { padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  pausedStatus: { background: '#FF9800', color: '#000' },
  inProgressStatus: { background: '#4CAF50', color: '#fff' },
  compItem: { fontSize: '11px', padding: '3px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', color: '#ddd', borderLeft: '2px solid #444' },
  deviceName: { color: '#4a9eff', fontWeight: '500', marginBottom: '2px' },
  subtaskName: { color: '#ffaa44', fontSize: '12px' }
};

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: '#2a2a2a', borderRadius: '12px', padding: '20px', border: '1px solid #b30000', color: '#fff', minWidth: '320px' },
  input: { width: '55px', padding: '7px', background: '#1e1e1e', border: '1px solid #555', borderRadius: '5px', color: '#fff', textAlign: 'center', fontSize: '15px' }
};

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
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', hours: 0, minutes: 30 });
  const [loading, setLoading] = useState(true);
  const [timerTick, setTimerTick] = useState(0);
  const [reassignModal, setReassignModal] = useState(null);
  const isAdmin = user && (user.is_admin || user.login?.toLowerCase() === 'admin');

  useEffect(() => {
    loadAll();
    if (isAdmin) loadUsers();
    const d = setInterval(loadAll, 15000);
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
    const b = { pending: '#888', active: '#2196F3', in_progress: '#FF9800', paused: '#9E9E9E', completed: '#4CAF50', cancelled: '#f44336' };
    const t = { pending: 'Ожидает', active: 'Новая', in_progress: 'В работе', paused: '⏸ Пауза', completed: '✅', cancelled: '❌' };
    return <span style={{ background: b[s] || '#444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>{t[s] || s}</span>;
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
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const reassignItem = async (id, uid, ulogin) => {
    try {
      await API.put(`/tasks/items/${id}/reassign`, { assigned_to: uid, assigned_login: ulogin });
      if (selectedTask) openTask(selectedTask);
      loadAll(); setReassignModal(null);
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const deleteAssemblyTask = async (tid) => {
    if (!confirm("Удалить задачу?")) return;
    try {
      await API.delete(`/tasks/${tid}`, { data: { user_id: user.id, user_login: user.login } });
      loadAll(); setSelectedTask(null); setTaskItems([]);
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const addTime = async () => {
    const tm = (addHours * 60) + addMinutes;
    if (tm <= 0) { alert("Укажите время"); return; }
    try {
      await API.put(`/tasks/items/${addTimeModal.id}/add-time`, { added_minutes: tm, admin_login: user.login, user_id: user.id });
      setAddTimeModal(null); if (selectedTask) openTask(selectedTask); loadAll();
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const requestTime = async (id) => {
    const mins = prompt("Сколько минут нужно добавить?", "30");
    if (!mins) return;
    const m = parseInt(mins);
    if (isNaN(m) || m <= 0) { alert("Введите положительное число"); return; }
    try {
      await API.put(`/tasks/items/${id}/request-time`, { requested_minutes: m, user_id: user.id, user_login: user.login });
      alert("✅ Запрос отправлен!");
    } catch (e) { alert("Ошибка: " + (e.response?.data?.error || e.message)); }
  };

  const completeMyTask = async (id) => {
    if (!confirm("Выполнено?")) return;
    try { await API.put(`/tasks/items/${id}/complete`, { completed_by: user.id, completed_login: user.login }); loadAll(); }
    catch (e) { alert("Ошибка"); }
  };

  const createTemplate = async () => {
    if (!editForm.name.trim()) { alert("Введите название"); return; }
    const tm = (editForm.hours * 60) + editForm.minutes;
    if (tm <= 0) { alert("Укажите время"); return; }
    try {
      await API.post("/tasks/routine", { name: editForm.name, description: editForm.description, time_estimate: tm, created_by: user.id, created_by_login: user.login, status: 'pending' });
      setEditingRoutine(null); setEditForm({ name: '', description: '', hours: 0, minutes: 30 }); loadAll();
    } catch (e) { alert("Ошибка"); }
  };

  const launchFromTemplate = async (t) => {
    try { await API.post("/tasks/routine", { name: t.name, description: t.description, time_estimate: t.time_estimate, created_by: user.id, created_by_login: user.login, status: 'active' }); loadAll(); }
    catch (e) { alert("Ошибка"); }
  };

  const startEditRoutine = (t) => { const tm = t.time_estimate || 60; setEditingRoutine(t); setEditForm({ name: t.name, description: t.description || '', hours: Math.floor(tm / 60), minutes: tm % 60 }); };
  const saveEditRoutine = async () => {
    if (!editForm.name.trim()) return;
    const tm = (editForm.hours * 60) + editForm.minutes;
    try { await API.put(`/tasks/routine/${editingRoutine.id}`, { name: editForm.name, description: editForm.description, time_estimate: tm }); setEditingRoutine(null); loadAll(); }
    catch (e) { alert("Ошибка"); }
  };

  const assignRoutineTask = async (tid, uid, ulogin) => {
    try { const t = routineTasks.find(x => x.id === tid); if (!t) return;
      await API.put(`/tasks/routine/${tid}`, { ...t, assigned_to: uid, assigned_login: ulogin, status: 'in_progress' }); loadAll(); }
    catch (e) { alert("Ошибка"); }
  };

  const completeRoutineTask = async (tid) => {
    try { await API.put(`/tasks/routine/${tid}/complete`, { completed_by: user.id, completed_login: user.login }); loadAll(); }
    catch (e) { alert("Ошибка"); }
  };

  const deleteRoutineTask = async (tid) => { if (!confirm("Удалить?")) return; try { await API.delete(`/tasks/routine/${tid}`); loadAll(); } catch (e) {} };

  if (loading) return <div style={styles.container}><h2 style={styles.title}>📋 Задачи</h2><div style={{textAlign:'center',padding:'40px',color:'#888'}}>Загрузка...</div></div>;

  // ========================
  // ИСПОЛНИТЕЛЬ
  // ========================
  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>📋 Мои задачи</h2>
        {myTasks.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px',color:'#666'}}>Нет назначенных задач</div>
        ) : myTasks.map((ti, i) => {
          const tl = ti.deadline ? getTimeLeft(ti.deadline) : null;
          const isPaused = ti.task_status === 'paused';
          let components = [];
          try { components = typeof ti.components === 'string' ? JSON.parse(ti.components) : (ti.components || []); } catch (e) {}

          return (
            <div key={ti.id} style={{background:'#2a2a2a',borderRadius:'10px',padding:'15px',marginBottom:'12px',border:isPaused?'1px solid #FF9800':'1px solid #444'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'10px',marginBottom:'10px'}}>
                <div>
                  <div style={styles.deviceName}>{ti.device_name}</div>
                  <div style={styles.subtaskName}>{ti.subtask_name}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  {isPaused ? <span style={{...styles.statusBadge,...styles.pausedStatus}}>⏸ Пауза</span> : <span style={{...styles.statusBadge,...styles.inProgressStatus}}>▶ В работе</span>}
                  {ti.deadline && <span style={{fontSize:'13px',color:tl?.color||'#aaa',fontWeight:'bold'}}>{tl?.text||'—'}</span>}
                  <span style={{fontSize:'11px',color:'#888'}}>{formatEndTime(ti.deadline)}</span>
                </div>
              </div>

              <div style={{background:'#1a1a1a',borderRadius:'6px',padding:'10px',marginBottom:'10px'}}>
                <div style={{color:'#888',fontSize:'11px',marginBottom:'6px',fontWeight:'bold'}}>📦 Комплектующие:</div>
                {components.length > 0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                    {components.map((c, ci) => (
                      <div key={ci} style={styles.compItem}>
                        {c.item_type === 'consumable' ? '🔧' : '🔩'} <b>{c.component_name}</b> — {c.quantity} {c.unit || 'шт.'}
                      </div>
                    ))}
                  </div>
                ) : <span style={{color:'#666',fontSize:'11px'}}>Нет данных</span>}
              </div>

              <div style={{display:'flex',gap:'8px'}}>
                {ti.deadline && <button onClick={()=>completeMyTask(ti.id)} style={styles.completeBtn}>✅ Выполнено</button>}
                <button onClick={()=>requestTime(ti.id)} style={styles.requestTimeBtn}>⏰ Запросить время</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ========================
  // АДМИН
  // ========================
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📋 Задачи</h2>
      <div style={styles.tabs}>
        <button onClick={()=>setActiveTab('my')} style={activeTab==='my'?styles.tabActive:styles.tab}>Мои ({myTasks.length})</button>
        <button onClick={()=>setActiveTab('all')} style={activeTab==='all'?styles.tabActive:styles.tab}>Сборочные ({tasks.length})</button>
        <button onClick={()=>setActiveTab('routine')} style={activeTab==='routine'?styles.tabActive:styles.tab}>Рутинные ({routineTasks.length})</button>
      </div>

      {activeTab==='my'&&(
        <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'40px'}}>№</th><th style={styles.th}>Прибор</th><th style={styles.th}>Задача</th><th style={styles.th}>⏱</th><th style={styles.th}>Срок</th><th style={{...styles.th,width:'100px'}}></th></tr></thead><tbody>{myTasks.length===0?<tr><td colSpan={6} style={styles.empty}>Нет задач</td></tr>:myTasks.map((ti,i)=>{const tl=ti.deadline?getTimeLeft(ti.deadline):null;return(<tr key={ti.id}><td style={{...styles.td,color:'#888',textAlign:'center'}}>{i+1}</td><td style={styles.td}>{ti.device_name}</td><td style={{...styles.td,color:'#ffaa44'}}>{ti.subtask_name}</td><td style={styles.td}>{!ti.deadline?<span style={{color:'#FF9800'}}>⏳</span>:tl?<span style={{color:tl.color,fontWeight:'bold'}}>{tl.text}</span>:'—'}</td><td style={{...styles.td,fontSize:'11px',color:'#aaa'}}>{ti.deadline?new Date(ti.deadline).toLocaleString('ru-RU'):'—'}</td><td style={styles.td}>{ti.deadline&&<button onClick={()=>completeMyTask(ti.id)} style={styles.completeBtn}>✅</button>}</td></tr>)})}</tbody></table></div>
      )}

      {activeTab==='all'&&(<>
        <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'40px'}}>№</th><th style={styles.th}>Прибор</th><th style={{...styles.th,width:'160px'}}>Прогресс</th><th style={styles.th}>Статус</th><th style={styles.th}>Создана</th><th style={{...styles.th,width:'140px'}}>Управление</th></tr></thead><tbody>{tasks.length===0?<tr><td colSpan={6} style={styles.empty}>Нет задач</td></tr>:tasks.map((t,i)=>(<tr key={t.id}><td style={{...styles.td,color:'#888',textAlign:'center'}}>{i+1}</td><td style={{...styles.td,cursor:'pointer',color:'#4a9eff'}} onClick={()=>openTask(t)}>{t.device_name}</td><td style={styles.td}><div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{flex:1,height:'5px',background:'#444',borderRadius:'3px'}}><div style={{height:'100%',width:`${t.total_items>0?Math.round((t.completed_items/t.total_items)*100):0}%`,background:t.completed_items===t.total_items?'#4CAF50':'#FF9800',borderRadius:'3px'}}/></div><span style={{fontSize:'11px',color:'#aaa'}}>{t.completed_items}/{t.total_items}</span></div></td><td style={styles.td}>{getStatusBadge(t.status)}</td><td style={{...styles.td,fontSize:'11px',color:'#888'}}>{new Date(t.created_at).toLocaleString('ru-RU')}</td><td style={styles.td}><div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>{(t.created_by===user.id||user.login?.toLowerCase()==='admin')&&(<><button onClick={()=>openTask(t)} style={styles.editBtn}>✎</button><button onClick={()=>deleteAssemblyTask(t.id)} style={styles.deleteBtn}>🗑</button></>)}</div></td></tr>))}</tbody></table></div>
        {selectedTask&&(<div style={styles.detail}><div style={styles.detailHeader}><h3 style={{margin:0}}>📋 {selectedTask.device_name} {getStatusBadge(selectedTask.status)}</h3><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>{(selectedTask.created_by===user.id||user.login?.toLowerCase()==='admin')&&<button onClick={()=>deleteAssemblyTask(selectedTask.id)} style={styles.deleteBtn}>🗑</button>}<button onClick={()=>{setSelectedTask(null);setTaskItems([])}} style={styles.closeBtn}>✕</button></div></div><div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'40px'}}>№</th><th style={styles.th}>Задача</th><th style={styles.th}>Комплектующие</th><th style={styles.th}>⏱</th><th style={styles.th}>Срок</th><th style={styles.th}>Исполнитель</th><th style={{...styles.th,width:'140px'}}>Действия</th></tr></thead><tbody>{taskItems.map((ti,idx)=>(<tr key={ti.id} style={{...styles.tr,opacity:ti.status==='completed'?0.5:1}}><td style={{...styles.td,color:'#888',textAlign:'center'}}>{idx+1}</td><td style={{...styles.td,color:'#ffaa44'}}>{ti.subtask_name}</td><td style={styles.td}>{ti.components?.length>0?(<div style={{display:'flex',flexDirection:'column',gap:'4px'}}>{ti.components.map(c=>(<div key={c.id} style={styles.compItem}>{c.item_type==='consumable'?'🔧':'🔩'} <b>{c.component_name}</b> — {c.quantity} {c.unit||'шт.'}</div>))}</div>):<span style={{color:'#666'}}>—</span>}</td><td style={styles.td}>{formatTime(ti.time_estimate)}</td><td style={{...styles.td,fontSize:'11px',color:'#aaa'}}>{formatEndTime(ti.deadline)}</td><td style={styles.td}>{ti.assigned_login?(<div style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{color:'#4a9eff'}}>{ti.assigned_login}</span>{(selectedTask.created_by===user.id||user.login?.toLowerCase()==='admin')&&ti.status!=='completed'&&<button onClick={()=>setReassignModal(ti)} style={styles.reassignBtn}>↻</button>}</div>):((selectedTask.created_by===user.id||user.login?.toLowerCase()==='admin')&&ti.status!=='completed'&&<select onChange={e=>{if(e.target.value)assignItem(ti.id,e.target.value,users.find(u=>u.id===parseInt(e.target.value))?.login)}} style={styles.assignSelect} defaultValue=""><option value="">Назначить</option>{users.map(u=><option key={u.id} value={u.id}>{u.login}</option>)}</select>)}</td><td style={styles.td}>{ti.status==='in_progress'&&(selectedTask.created_by===user.id||user.login?.toLowerCase()==='admin')&&<button onClick={()=>{setAddTimeModal(ti);setAddHours(0);setAddMinutes(15)}} style={styles.addTimeBtn}>⏰+</button>}</td></tr>))}</tbody></table></div></div>)}
      </>)}

      {activeTab==='routine'&&(<div>
        <button onClick={()=>{setEditingRoutine('new');setEditForm({name:'',description:'',hours:0,minutes:30})}} style={{...styles.tab,marginBottom:'10px'}}>+ Новый шаблон</button>
        {editingRoutine!=null&&(<div style={styles.form}><h4 style={{color:'#fff',margin:0}}>{editingRoutine==='new'?'Новый шаблон':editingRoutine.name}</h4><input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} placeholder="Название" style={styles.input}/><textarea value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} placeholder="Описание" style={styles.textarea} rows={2}/><div style={styles.timeRow}><span>⏱</span><input type="number" value={editForm.hours} onChange={e=>setEditForm({...editForm,hours:Math.max(0,parseInt(e.target.value)||0)})} min="0" style={styles.timeInput}/><span>ч</span><input type="number" value={editForm.minutes} onChange={e=>setEditForm({...editForm,minutes:Math.max(0,Math.min(59,parseInt(e.target.value)||0))})} min="0" max="59" style={styles.timeInput}/><span>мин</span></div><div style={{display:'flex',gap:'8px'}}>{editingRoutine==='new'?<button onClick={createTemplate} style={styles.completeBtn}>✅ Создать</button>:<button onClick={saveEditRoutine} style={styles.completeBtn}>💾 Сохранить</button>}<button onClick={()=>setEditingRoutine(null)} style={styles.cancelBtn}>Закрыть</button></div></div>)}
        <h3 style={{color:'#fff',fontSize:'15px',margin:'15px 0 8px'}}>📋 Шаблоны</h3>
        <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'40px'}}>№</th><th style={styles.th}>Название</th><th style={styles.th}>⏱</th><th style={{...styles.th,width:'180px'}}></th></tr></thead><tbody>{routineTasks.filter(t=>t.status==='pending').length===0?<tr><td colSpan={4} style={styles.empty}>Нет</td></tr>:routineTasks.filter(t=>t.status==='pending').map((t,i)=>(<tr key={t.id}><td style={{...styles.td,color:'#888',textAlign:'center'}}>{i+1}</td><td style={styles.td}>{t.name}</td><td style={styles.td}>{formatTime(t.time_estimate)}</td><td style={styles.td}><button onClick={()=>launchFromTemplate(t)} style={styles.launchBtn}>▶ Создать</button><button onClick={()=>startEditRoutine(t)} style={{...styles.editBtn,background:'#444'}}>✎</button><button onClick={()=>deleteRoutineTask(t.id)} style={styles.deleteBtn}>🗑</button></td></tr>))}</tbody></table></div>
        <h3 style={{color:'#fff',fontSize:'15px',margin:'20px 0 8px'}}>🔄 Активные</h3>
        <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={{...styles.th,width:'40px'}}>№</th><th style={styles.th}>Название</th><th style={styles.th}>⏱</th><th style={styles.th}>Срок</th><th style={styles.th}>Исп.</th><th style={styles.th}>Статус</th><th style={{...styles.th,width:'100px'}}></th></tr></thead><tbody>{routineTasks.filter(t=>t.status!=='pending').length===0?<tr><td colSpan={7} style={styles.empty}>Нет</td></tr>:routineTasks.filter(t=>t.status!=='pending').map((t,i)=>(<tr key={t.id}><td style={{...styles.td,color:'#888',textAlign:'center'}}>{i+1}</td><td style={styles.td}>{t.name}</td><td style={styles.td}>{formatTime(t.time_estimate)}</td><td style={{...styles.td,fontSize:'11px'}}>{formatEndTime(t.deadline)}</td><td style={styles.td}>{t.assigned_login||<select onChange={e=>{const u=users.find(x=>x.id===parseInt(e.target.value));if(u)assignRoutineTask(t.id,u.id,u.login)}} style={styles.assignSelect} defaultValue=""><option value="">—</option>{users.map(u=><option key={u.id} value={u.id}>{u.login}</option>)}</select>}</td><td style={styles.td}>{getStatusBadge(t.status)}</td><td style={styles.td}>{t.status==='in_progress'&&<button onClick={()=>completeRoutineTask(t.id)} style={styles.completeBtn}>✅</button>}<button onClick={()=>deleteRoutineTask(t.id)} style={styles.deleteBtn}>🗑</button></td></tr>))}</tbody></table></div>
      </div>)}

      {addTimeModal&&(<div style={modalStyles.overlay}><div style={modalStyles.modal}><h4>Добавить время</h4><div style={{display:'flex',gap:'8px',margin:'15px 0'}}><input type="number" value={addHours} onChange={e=>setAddHours(Math.max(0,parseInt(e.target.value)||0))} min="0" style={modalStyles.input}/><span>ч</span><input type="number" value={addMinutes} onChange={e=>setAddMinutes(Math.max(0,Math.min(59,parseInt(e.target.value)||0)))} min="0" max="59" style={modalStyles.input}/><span>мин</span></div><button onClick={addTime} style={styles.completeBtn}>✅</button><button onClick={()=>setAddTimeModal(null)} style={styles.cancelBtn}>Отмена</button></div></div>)}
      {reassignModal&&(<div style={modalStyles.overlay}><div style={modalStyles.modal}><h4>Переназначить: {reassignModal.subtask_name}</h4><p style={{color:'#aaa'}}>Текущий: {reassignModal.assigned_login||'—'}</p><select style={{...styles.assignSelect,width:'100%',maxWidth:'100%',marginBottom:'15px',padding:'8px'}} defaultValue="" onChange={e=>{if(e.target.value)reassignItem(reassignModal.id,e.target.value,users.find(u=>u.id===parseInt(e.target.value))?.login)}}><option value="">Выбрать</option>{users.map(u=><option key={u.id} value={u.id}>{u.login}</option>)}</select><button onClick={()=>setReassignModal(null)} style={styles.cancelBtn}>Закрыть</button></div></div>)}
    </div>
  );
}
