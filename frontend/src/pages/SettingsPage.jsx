import React, { useState, useEffect } from "react";
import API from "../api";

export default function SettingsPage({ user, setUser }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({ login: user.login || '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

  const isSuperAdmin = user?.login?.toLowerCase() === 'admin';
  const isAdmin = user?.is_admin || isSuperAdmin;

  useEffect(() => { loadSuggestions(); }, []);
  const loadSuggestions = async () => { try { const res = await API.get("/suggestions"); setSuggestions(res.data || []); } catch (e) {} };
  const visibleSuggestions = isAdmin ? suggestions : suggestions.filter(s => s.user_id === user.id);

  const updateLogin = async () => { if (!form.login.trim()) { setError('Логин не может быть пустым'); return; } try { await API.put(`/users/${user.id}/login`, { newLogin: form.login, adminLogin: user.login }); setUser({ ...user, login: form.login, name: form.login }); setMessage('✅ Логин изменён'); setError(''); setTimeout(()=>setMessage(''),3000); } catch (e) { setError(e.response?.data?.error||'Ошибка'); } };
  const updatePassword = async () => { if (!form.currentPassword) { setError('Введите текущий пароль'); return; } if (!form.newPassword) { setError('Введите новый пароль'); return; } if (form.newPassword.length < 6) { setError('Минимум 6 символов'); return; } if (form.newPassword !== form.confirmPassword) { setError('Пароли не совпадают'); return; } try { await API.put(`/users/${user.id}/password`, { currentPassword: form.currentPassword, newPassword: form.newPassword }); setForm({...form,currentPassword:'',newPassword:'',confirmPassword:''}); setMessage('✅ Пароль изменён'); setError(''); setTimeout(()=>setMessage(''),3000); } catch (e) { setError(e.response?.data?.error||'Ошибка'); } };

  const sendSuggestion = async () => { if (!suggestionTitle.trim()) { setError('Введите заголовок'); return; } if (!newSuggestion.trim()) { setError('Введите описание'); return; } setSendingSuggestion(true); try { await API.post("/suggestions", { title: suggestionTitle.trim(), description: newSuggestion.trim(), user_login: user.login, user_id: user.id }); setSuggestionTitle(''); setNewSuggestion(''); setMessage('✅ Предложение отправлено!'); setError(''); loadSuggestions(); setTimeout(()=>setMessage(''),3000); } catch (e) { setError(e.response?.data?.error||'Ошибка'); } finally { setSendingSuggestion(false); } };

  const deleteSuggestion = async (id) => { if (!confirm('Удалить?')) return; try { await API.delete(`/suggestions/${id}`, { data: { user_login: user.login } }); loadSuggestions(); } catch (e) {} };
  const updateSuggestionStatus = async (id, status) => { if (!isSuperAdmin) return; try { await API.put(`/suggestions/${id}/status`, { status, admin_login: user.login }); loadSuggestions(); } catch (e) {} };
  const getStatusBadge = (s) => { const b={new:'#ffaa44',reviewed:'#4CAF50',testing:'#FF9800',planned:'#2196F3',completed:'#9C27B0',declined:'#f44336'}; const t={new:'Новое',reviewed:'Рассмотрено',testing:'Тестируется',planned:'Запланировано',completed:'Выполнено',declined:'Отклонено'}; return <span style={{background:b[s]||'#444',color:'#fff',padding:'2px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:'bold',whiteSpace:'nowrap'}}>{t[s]||s}</span>; };

  return (
    <div style={st.container}>
      <h2 style={st.title}>Настройки</h2>
      {message&&<div style={st.success}>{message}</div>}{error&&<div style={st.errorMsg}>{error}</div>}
      <div style={st.tabs}><button onClick={()=>setActiveTab('profile')} style={activeTab==='profile'?st.ta:st.tb}>👤 Профиль</button><button onClick={()=>setActiveTab('password')} style={activeTab==='password'?st.ta:st.tb}>🔒 Пароль</button><button onClick={()=>setActiveTab('suggestions')} style={activeTab==='suggestions'?st.ta:st.tb}>💡 Предложения ({visibleSuggestions.length})</button></div>

      {activeTab==='profile'&&(<div style={st.form}><h3 style={st.ft}>Изменение логина</h3><div style={st.fd}><label style={st.lb}>Текущий логин:</label><input value={user.login} disabled style={{...st.inp,background:'#1a1a1a',color:'#888'}}/></div><div style={st.fd}><label style={st.lb}>Новый логин:</label><input value={form.login} onChange={e=>setForm({...form,login:e.target.value})} style={st.inp} maxLength={50}/></div><button onClick={updateLogin} style={st.btn}>✓ Сохранить логин</button></div>)}
      {activeTab==='password'&&(<div style={st.form}><h3 style={st.ft}>Изменение пароля</h3><div style={st.fd}><label style={st.lb}>Текущий пароль:</label><input type="password" value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})} style={st.inp} autoComplete="current-password"/></div><div style={st.fd}><label style={st.lb}>Новый пароль:</label><input type="password" value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})} style={st.inp} autoComplete="new-password"/></div><div style={st.fd}><label style={st.lb}>Подтвердите:</label><input type="password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} style={st.inp} autoComplete="new-password"/></div><button onClick={updatePassword} style={st.btn}>✓ Изменить пароль</button></div>)}
      {activeTab==='suggestions'&&(<div>
        <div style={st.form}><h3 style={st.ft}>Отправить предложение</h3><p style={st.hint}>Опишите идею по улучшению системы.</p><div style={st.fd}><label style={st.lb}>Заголовок:</label><input value={suggestionTitle} onChange={e=>setSuggestionTitle(e.target.value)} style={st.inp} maxLength={100}/></div><div style={st.fd}><label style={st.lb}>Описание:</label><textarea value={newSuggestion} onChange={e=>setNewSuggestion(e.target.value)} style={st.ta} rows={4} maxLength={1000}/></div><button onClick={sendSuggestion} style={{...st.btn,opacity:sendingSuggestion?0.7:1}} disabled={sendingSuggestion}>{sendingSuggestion?'Отправка...':'📤 Отправить'}</button></div>
        <h3 style={st.ft}>{isAdmin?'Все предложения':'Мои предложения'} ({visibleSuggestions.length})</h3>
        {visibleSuggestions.length===0?<div style={st.empty}><div style={{fontSize:'40px',marginBottom:'10px'}}>💡</div><p>Нет предложений</p></div>:
          <div style={st.sList}>{visibleSuggestions.map(sug=>(<div key={sug.id} style={st.sCard}><div style={st.sHead}><div style={{flex:1}}><div style={st.sTitle}>{sug.title}</div><div style={st.sMeta}><span style={st.sAuthor}>👤 {sug.user_login}</span><span style={st.sDate}>{new Date(sug.created_at).toLocaleString('ru-RU')}</span></div></div><div style={{display:'flex',alignItems:'center',gap:'8px'}}>{getStatusBadge(sug.status)}{isSuperAdmin&&<select value={sug.status} onChange={e=>updateSuggestionStatus(sug.id,e.target.value)} style={st.sSel}><option value="new">Новое</option><option value="reviewed">Рассмотрено</option><option value="testing">Тестируется</option><option value="planned">Запланировано</option><option value="completed">Выполнено</option><option value="declined">Отклонено</option></select>}{(isAdmin||sug.user_id===user.id)&&<button onClick={()=>deleteSuggestion(sug.id)} style={st.sDel}>✕</button>}</div></div><div style={st.sBody}>{sug.description}</div></div>))}</div>}
      </div>)}
    </div>
  );
}

const st = {
  container:{padding:'20px',maxWidth:'800px',color:'#fff',height:'100%',overflow:'auto'}, title:{margin:'0 0 20px',fontSize:'24px',fontWeight:'bold'},
  success:{background:'rgba(0,255,0,0.1)',border:'1px solid rgba(0,255,0,0.3)',color:'#44ff44',padding:'12px',borderRadius:'8px',marginBottom:'15px',fontSize:'14px'},
  errorMsg:{background:'rgba(255,0,0,0.1)',border:'1px solid rgba(255,0,0,0.3)',color:'#ff4444',padding:'12px',borderRadius:'8px',marginBottom:'15px',fontSize:'14px'},
  tabs:{display:'flex',gap:'10px',marginBottom:'20px',flexWrap:'wrap'}, tb:{color:'#fff',border:'none',padding:'10px 18px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',background:'#333'},
  ta:{color:'#fff',border:'none',padding:'10px 18px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',background:'#b30000'},
  form:{background:'#2a2a2a',padding:'20px',borderRadius:'10px',border:'1px solid #444',marginBottom:'20px'}, ft:{color:'#fff',margin:'0 0 15px',fontSize:'16px',fontWeight:'bold'},
  fd:{marginBottom:'15px'}, lb:{display:'block',color:'#aaa',marginBottom:'6px',fontSize:'14px'},
  inp:{width:'100%',padding:'10px',background:'#1e1e1e',border:'1px solid #555',borderRadius:'6px',color:'#fff',fontSize:'14px',boxSizing:'border-box'},
  ta:{width:'100%',padding:'10px',background:'#1e1e1e',border:'1px solid #555',borderRadius:'6px',color:'#fff',fontSize:'14px',boxSizing:'border-box',resize:'vertical',fontFamily:'inherit'},
  btn:{background:'#b30000',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'6px',cursor:'pointer',fontSize:'14px',width:'100%'},
  hint:{color:'#888',fontSize:'13px',marginBottom:'15px'}, empty:{textAlign:'center',padding:'40px',color:'#666',background:'#2a2a2a',borderRadius:'10px',border:'1px solid #444'},
  sList:{display:'flex',flexDirection:'column',gap:'10px'}, sCard:{background:'#2a2a2a',borderRadius:'10px',padding:'15px',border:'1px solid #444'},
  sHead:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px',gap:'10px',flexWrap:'wrap'},
  sTitle:{color:'#ffaa44',fontWeight:'bold',fontSize:'14px',marginBottom:'4px'}, sMeta:{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'},
  sAuthor:{color:'#4a9eff',fontSize:'12px'}, sDate:{color:'#888',fontSize:'11px'}, sBody:{color:'#ccc',fontSize:'13px',lineHeight:1.5,whiteSpace:'pre-wrap'},
  sSel:{background:'#1e1e1e',color:'#fff',border:'1px solid #555',padding:'4px 8px',borderRadius:'4px',fontSize:'11px',cursor:'pointer'},
  sDel:{background:'none',border:'none',color:'#ff6666',cursor:'pointer',fontSize:'16px',padding:'2px 6px'}
};
