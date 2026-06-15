import React, { useState, useEffect } from "react";
import API from "../api";

const s = {
  wrap: { padding: '10px', maxWidth: '700px', color: '#ccc', height: '100%', overflow: 'auto', background: '#1a1a1a' },
  title: { margin: '0 0 15px', fontSize: '18px', fontWeight: 'bold', color: '#fff' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '15px', flexWrap: 'wrap' },
  tab: (active) => ({ color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', background: active ? '#b30000' : '#2a2a2a' }),
  form: { background: '#222', padding: '15px', borderRadius: '6px', border: '1px solid #333', marginBottom: '15px' },
  ft: { color: '#fff', margin: '0 0 12px', fontSize: '14px', fontWeight: 'bold' },
  fd: { marginBottom: '12px' },
  lb: { display: 'block', color: '#999', marginBottom: '5px', fontSize: '12px' },
  inp: { width: '100%', padding: '8px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '4px', color: '#ccc', fontSize: '13px', boxSizing: 'border-box' },
  ta: { width: '100%', padding: '8px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '4px', color: '#ccc', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
  btn: { background: '#b30000', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', width: '100%' },
  msg: (c) => ({ background: c==='green'?'rgba(0,255,0,0.08)':'rgba(255,0,0,0.08)', border: `1px solid ${c==='green'?'rgba(0,255,0,0.2)':'rgba(255,0,0,0.2)'}`, color: c==='green'?'#4CAF50':'#ff6666', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }),
  card: { background: '#222', borderRadius: '6px', padding: '12px', border: '1px solid #333', marginBottom: '8px' },
  cardTitle: { color: '#aa6600', fontWeight: 'bold', fontSize: '13px', marginBottom: '3px' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' },
  cardUser: { color: '#5a9eff', fontSize: '11px' },
  cardDate: { color: '#777', fontSize: '10px' },
  cardBody: { color: '#999', fontSize: '12px', lineHeight: 1.4 },
  badge: (st) => { const b={new:'#aa6600',reviewed:'#4CAF50',testing:'#aa6600',planned:'#5a9eff',completed:'#9C27B0',declined:'#ff4444'}; const t={new:'Новое',reviewed:'Рассмотрено',testing:'Тестируется',planned:'Запланировано',completed:'Выполнено',declined:'Отклонено'}; return <span style={{background:b[st]||'#333',color:'#fff',padding:'2px 6px',borderRadius:'3px',fontSize:'9px',fontWeight:'bold'}}>{t[st]||st}</span>; },
  sel: { background: '#1a1a1a', color: '#ccc', border: '1px solid #444', padding: '3px 6px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' },
  del: { background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }
};

export default function SettingsPage({ user, setUser }) {
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ login: user.login || '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [sending, setSending] = useState(false);

  const isSuperAdmin = user?.login?.toLowerCase() === 'admin';
  const isAdmin = user?.is_admin || isSuperAdmin;

  useEffect(() => { loadSuggestions(); }, []);
  const loadSuggestions = async () => { try { const r = await API.get("/suggestions"); setSuggestions(r.data || []); } catch (e) {} };
  const visible = isAdmin ? suggestions : suggestions.filter(s => s.user_id === user.id);

  const updateLogin = async () => {
    if (!form.login.trim()) { setMsg({text:'Логин не может быть пустым',type:'error'}); return; }
    try { await API.put(`/users/${user.id}/login`, { newLogin: form.login, adminLogin: user.login }); setUser({...user, login: form.login}); setMsg({text:'Логин изменён',type:'green'}); setTimeout(()=>setMsg(null),3000); } catch (e) { setMsg({text:e.response?.data?.error||'Ошибка',type:'error'}); }
  };

  const updatePassword = async () => {
    if (!form.currentPassword||!form.newPassword||form.newPassword.length<6||form.newPassword!==form.confirmPassword) { setMsg({text:'Проверьте поля',type:'error'}); return; }
    try { await API.put(`/users/${user.id}/password`, { currentPassword: form.currentPassword, newPassword: form.newPassword }); setForm({...form,currentPassword:'',newPassword:'',confirmPassword:''}); setMsg({text:'Пароль изменён',type:'green'}); setTimeout(()=>setMsg(null),3000); } catch (e) { setMsg({text:e.response?.data?.error||'Ошибка',type:'error'}); }
  };

  const send = async () => {
    if (!title.trim()||!desc.trim()) { setMsg({text:'Заполните поля',type:'error'}); return; }
    setSending(true);
    try { await API.post("/suggestions", { title:title.trim(), description:desc.trim(), user_login:user.login, user_id:user.id }); setTitle(''); setDesc(''); setMsg({text:'Предложение отправлено',type:'green'}); loadSuggestions(); setTimeout(()=>setMsg(null),3000); } catch (e) { setMsg({text:e.response?.data?.error||'Ошибка',type:'error'}); } finally { setSending(false); }
  };

  const del = async (id) => { try { await API.delete(`/suggestions/${id}`, { data: { user_login: user.login } }); loadSuggestions(); } catch (e) {} };
  const updStatus = async (id, status) => { if (!isSuperAdmin) return; try { await API.put(`/suggestions/${id}/status`, { status, admin_login: user.login }); loadSuggestions(); } catch (e) {} };

  return (
    <div style={s.wrap}>
      
      {msg && <div style={s.msg(msg.type)}>{msg.text}</div>}
      <div style={s.tabs}>
        <button onClick={()=>setTab('profile')} style={s.tab(tab==='profile')}>Профиль</button>
        <button onClick={()=>setTab('password')} style={s.tab(tab==='password')}>Пароль</button>
        <button onClick={()=>setTab('suggestions')} style={s.tab(tab==='suggestions')}>Предложения ({visible.length})</button>
      </div>

      {tab==='profile'&&(<div style={s.form}><h3 style={s.ft}>Изменение логина</h3><div style={s.fd}><label style={s.lb}>Текущий:</label><input value={user.login} disabled style={{...s.inp,background:'#111',color:'#777'}}/></div><div style={s.fd}><label style={s.lb}>Новый:</label><input value={form.login} onChange={e=>setForm({...form,login:e.target.value})} style={s.inp} maxLength={50}/></div><button onClick={updateLogin} style={s.btn}>Сохранить</button></div>)}

      {tab==='password'&&(<div style={s.form}><h3 style={s.ft}>Изменение пароля</h3><div style={s.fd}><label style={s.lb}>Текущий:</label><input type="password" value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})} style={s.inp}/></div><div style={s.fd}><label style={s.lb}>Новый:</label><input type="password" value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})} style={s.inp}/></div><div style={s.fd}><label style={s.lb}>Подтвердите:</label><input type="password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} style={s.inp}/></div><button onClick={updatePassword} style={s.btn}>Изменить</button></div>)}

      {tab==='suggestions'&&(<div>
        <div style={s.form}><h3 style={s.ft}>Отправить предложение</h3><div style={s.fd}><label style={s.lb}>Заголовок:</label><input value={title} onChange={e=>setTitle(e.target.value)} style={s.inp} maxLength={100}/></div><div style={s.fd}><label style={s.lb}>Описание:</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} style={s.ta} rows={4} maxLength={1000}/></div><button onClick={send} style={{...s.btn,opacity:sending?0.7:1}} disabled={sending}>{sending?'Отправка...':'Отправить'}</button></div>
        <h3 style={s.ft}>{isAdmin?'Все предложения':'Мои предложения'} ({visible.length})</h3>
        {visible.length===0?<div style={{textAlign:'center',padding:'30px',color:'#555'}}>Нет предложений</div>:
          visible.map(sug=>(
            <div key={sug.id} style={s.card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'10px',flexWrap:'wrap',marginBottom:'6px'}}>
                <div style={{flex:1}}><div style={s.cardTitle}>{sug.title}</div><div style={s.cardMeta}><span style={s.cardUser}>{sug.user_login}</span><span style={s.cardDate}>{new Date(sug.created_at).toLocaleString('ru-RU')}</span></div></div>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  {s.badge(sug.status)}
                  {isSuperAdmin&&<select value={sug.status} onChange={e=>updStatus(sug.id,e.target.value)} style={s.sel}><option value="new">Новое</option><option value="reviewed">Рассмотрено</option><option value="testing">Тестируется</option><option value="planned">Запланировано</option><option value="completed">Выполнено</option><option value="declined">Отклонено</option></select>}
                  {(isAdmin||sug.user_id===user.id)&&<button onClick={()=>del(sug.id)} style={s.del}>X</button>}
                </div>
              </div>
              <div style={s.cardBody}>{sug.description}</div>
            </div>
          ))}
      </div>)}
    </div>
  );
}
