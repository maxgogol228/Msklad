import React, { useEffect, useState, useRef } from "react";
import API from "../api";

export default function AdminPage({ user }) {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [restoreRequests, setRestoreRequests] = useState([]);
  const [backups, setBackups] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const fileInputRef = useRef(null);
  const [restoreLog, setRestoreLog] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const isSuperAdmin = user?.login?.toLowerCase() === 'admin';
  const isAdmin = user?.is_admin || isSuperAdmin;

  useEffect(() => {
    loadUsers();
    if (isSuperAdmin) { loadLogs(); loadRestoreRequests(); loadBackups(); }
  }, []);

  const loadUsers = async () => { try { const r = await API.get("/users"); setUsers(r.data || []); } catch (e) {} };
  const loadLogs = async () => { try { const r = await API.get("/logs"); setLogs(r.data || []); } catch (e) {} };
  const loadRestoreRequests = async () => { try { const r = await API.get("/backup/restore-requests"); setRestoreRequests(r.data || []); } catch (e) {} };
  const loadBackups = async () => { try { const r = await API.get("/backup/history"); setBackups(r.data || []); } catch (e) {} };

  const isSuperAdminUser = (u) => u?.login?.toLowerCase() === 'admin';
  const filteredUsers = showSuperAdmin ? users : users.filter(u => !isSuperAdminUser(u));

  const approveUser = async (id) => { try { await API.post(`/users/approve/${id}`, { adminLogin: user.login }); setMessage("✅ Подтверждён"); loadUsers(); setTimeout(() => setMessage(""), 3000); } catch (e) { alert(e.response?.data?.error || "Ошибка"); } };
  const makeAdmin = async (id) => { try { await API.post(`/users/make-admin/${id}`, { adminLogin: user.login }); setMessage("✅ Админ"); loadUsers(); setTimeout(() => setMessage(""), 3000); } catch (e) { alert(e.response?.data?.error || "Ошибка"); } };
  const removeAdmin = async (id) => { try { await API.post(`/users/remove-admin/${id}`, { adminLogin: user.login }); setMessage("✅ Снят"); loadUsers(); setTimeout(() => setMessage(""), 3000); } catch (e) { alert(e.response?.data?.error || "Ошибка"); } };
  const removeUser = async (id) => { if (!confirm("Удалить?")) return; try { await API.delete(`/users/${id}`, { data: { adminLogin: user.login } }); setMessage("✅ Удалён"); loadUsers(); setTimeout(() => setMessage(""), 3000); } catch (e) { alert(e.response?.data?.error || "Ошибка"); } };
  const clearAllLogs = async () => { if (!confirm("Очистить все логи?")) return; try { await API.delete("/logs/clear", { data: { user_login: user.login } }); setMessage("✅ Очищено"); loadLogs(); setTimeout(() => setMessage(""), 3000); } catch (e) { alert("Ошибка"); } };
  const deleteLog = async (id) => { try { await API.delete(`/logs/${id}`); loadLogs(); } catch (e) {} };

  const exportBackup = async () => {
    try {
      setLoading(true);
      const r = await API.get("/backup/export", { responseType: 'blob' });
      const u = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = u;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(u);
      setMessage("✅ Скачан");
      setTimeout(() => setMessage(""), 3000);
    } catch (e) { alert("Ошибка"); } finally { setLoading(false); }
  };

  const createBackup = async () => {
    try {
      setLoading(true);
      const r = await API.post("/backup/create", { user_login: user.login }, { responseType: 'blob' });
      const u = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = u;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(u);
      setMessage("✅ Бекап скачан");
      setTimeout(() => setMessage(""), 3000);
    } catch (e) { alert("Ошибка"); } finally { setLoading(false); }
  };

 const importBackup = async (e) => {
  const f = e.target.files[0];
  if (!f) return;

  if (!confirm("⚠️ Восстановить базу?\n\nВСЕ ДАННЫЕ ЗАМЕНЯТСЯ!\n\nПродолжить?")) {
    e.target.value = '';
    return;
  }

  setRestoring(true);
  setRestoreLog(null);

  const reader = new FileReader();

  reader.onload = async (ev) => {
    try {
      let fileContent = JSON.parse(ev.target.result);

      // Разбиваем на части по таблицам
      const tables = fileContent.tables || fileContent.data || {};
      const tableNames = Object.keys(tables);

      let totalInserted = 0;
      let allLog = [];
      let allTableResults = {};

      for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        const partBackup = {
          version: "3.0",
          tables: { [tableName]: tables[tableName] }
        };

        try {
          const res = await API.post("/backup/restore", {
            user_login: user.login,
            file_content: partBackup,
            append: i !== 0
          });

          if (res.data.totalInserted) totalInserted += res.data.totalInserted;
          if (res.data.log) allLog = allLog.concat(res.data.log);
          if (res.data.tableResults) Object.assign(allTableResults, res.data.tableResults);

        } catch (err) {
          allLog.push(`❌ ${tableName}: ${err.response?.data?.error || err.message}`);
        }
      }

      setRestoreLog({
        success: true,
        totalInserted,
        log: allLog,
        tableResults: allTableResults
      });

      setMessage(`✅ Восстановлено ${totalInserted} записей`);
      setTimeout(() => setMessage(""), 5000);

      loadUsers();
      loadLogs();
      loadBackups();
    } catch (er) {
      alert("❌ Ошибка: " + (er.response?.data?.error || er.message));
      console.error(er);
    } finally {
      setRestoring(false);
    }
  };

  reader.onerror = () => {
    alert("❌ Ошибка чтения файла");
    setRestoring(false);
  };

  reader.readAsText(f);
  e.target.value = '';
};
  const requestRestore = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!confirm('Отправить заявку?')) { e.target.value = ''; return; }
    try {
      setLoading(true);
      const r = new FileReader();
      r.onload = async (ev) => {
        try {
          await API.post("/backup/request-restore", {
            user_login: user.login,
            user_id: user.id,
            file_data: JSON.parse(ev.target.result)
          });
          alert('✅ Заявка отправлена!');
        } catch (er) { alert('Ошибка'); } finally { setLoading(false); }
      };
      r.readAsText(f);
    } catch (er) { alert('Ошибка'); setLoading(false); }
    e.target.value = '';
  };

  const approveRestore = async (id) => {
    if (!confirm('Одобрить?')) return;
    try {
      await API.post(`/backup/approve-restore/${id}`, { admin_login: user.login });
      alert('✅ Восстановлено!');
      loadRestoreRequests();
      loadUsers();
      loadLogs();
    } catch (e) { alert('Ошибка'); }
  };

  const declineRestore = async (id) => {
    try {
      await API.post(`/backup/decline-restore/${id}`, { admin_login: user.login });
      loadRestoreRequests();
    } catch (e) {}
  };

  const downloadBackup = async (id) => {
    try {
      const r = await API.get(`/backup/download/${id}`, { responseType: 'blob' });
      const u = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = u;
      a.download = `backup-${id}.json`;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(u);
    } catch (e) {}
  };

  const restoreBackup = async (id) => {
    if (!confirm(`Восстановить бекап #${id}?`)) return;
    try {
      setLoading(true);
      await API.post(`/backup/restore/${id}`, { user_login: user.login });
      alert("✅ Восстановлено!");
      loadUsers();
      loadLogs();
      loadBackups();
    } catch (e) { alert("Ошибка"); } finally { setLoading(false); }
  };

  const deleteBackup = async (id) => {
    if (!confirm("Удалить?")) return;
    try { await API.delete(`/backup/${id}`); loadBackups(); } catch (e) {}
  };

  const formatSize = (b) => b ? (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB') : '0 KB';

  return (
    <div style={s.c}>
      <h2 style={s.t}>⚙️ Админ панель</h2>
      {message && <div style={s.msg}>{message}</div>}
      {loading && <div style={s.load}>Выполняется...</div>}

      <div style={s.tabs}>
        <button onClick={() => setActiveTab('users')} style={activeTab === 'users' ? s.ta : s.tb}>👥 Пользователи ({filteredUsers.length})</button>
        {isSuperAdmin && <button onClick={() => setActiveTab('logs')} style={activeTab === 'logs' ? s.ta : s.tb}>📋 Логи ({logs.length})</button>}
        {isSuperAdmin && <button onClick={() => setActiveTab('restore')} style={activeTab === 'restore' ? s.ta : s.tb}>📥 Заявки ({restoreRequests.filter(r => r.status === 'pending').length})</button>}
        <button onClick={() => setActiveTab('backup')} style={activeTab === 'backup' ? s.ta : s.tb}>💾 Бекапы</button>
      </div>

      {/* Пользователи */}
      {activeTab === 'users' && (
        <div style={s.tw}>
          {isSuperAdmin && (
            <div style={s.toolbar}>
              <label style={s.tl}><input type="checkbox" checked={showPasswords} onChange={e => setShowPasswords(e.target.checked)} style={s.cb} /> Пароли</label>
              <label style={s.tl}><input type="checkbox" checked={showSuperAdmin} onChange={e => setShowSuperAdmin(e.target.checked)} style={s.cb} /> Супер-админ</label>
            </div>
          )}
          <table style={s.tbl}>
            <thead><tr><th style={s.th}>ID</th><th style={s.th}>Логин</th><th style={s.th}>Статус</th>{isSuperAdmin && showPasswords && <th style={s.th}>Пароль</th>}<th style={s.th}>Роль</th><th style={s.th}>Дата</th><th style={s.th}>Действия</th></tr></thead>
            <tbody>
              {filteredUsers.map(u => {
                const isSA = isSuperAdminUser(u);
                return (
                  <tr key={u.id} style={{...s.tr, background: isSA ? 'rgba(255,136,0,0.1)' : 'transparent', borderLeft: isSA ? '4px solid #ff8800' : '4px solid transparent'}}>
                    <td style={s.td}>{u.id}{isSA && <span style={{color:'#ff8800',marginLeft:'5px'}}>⭐</span>}</td>
                    <td style={s.td}><b>{u.login}</b>{isSA && <span style={s.sal}>СУПЕР-АДМИН</span>}</td>
                    <td style={s.td}>{u.approved ? <span style={s.ap}>✓</span> : <span style={s.pn}>⏳</span>}</td>
                    {isSuperAdmin && showPasswords && <td style={s.td}><span style={{color:'#ff6666',fontFamily:'monospace',fontSize:'12px'}}>{u.access_key}</span></td>}
                    <td style={s.td}>{isSA ? <span style={s.sar}>⭐ Супер-админ</span> : u.is_admin ? <span style={s.adr}>🛡️ Админ</span> : <span style={s.usr}>👤 Пользователь</span>}</td>
                    <td style={{...s.td,color:'#888',fontSize:'12px'}}>{u.created_at ? new Date(u.created_at).toLocaleString('ru-RU') : '—'}</td>
                    <td style={s.td}>
                      <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                        {isSA ? <span style={s.pt}>🔒 Защищено</span> : (
                          <>
                            {!u.approved && <button onClick={() => approveUser(u.id)} style={s.btnA}>✓</button>}
                            {isSuperAdmin && u.approved && !u.is_admin && <button onClick={() => makeAdmin(u.id)} style={s.btnM}>⬆</button>}
                            {isSuperAdmin && u.is_admin && <button onClick={() => removeAdmin(u.id)} style={s.btnR}>⬇</button>}
                            {isSuperAdmin && <button onClick={() => removeUser(u.id)} style={s.btnD}>🗑</button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Логи */}
      {activeTab === 'logs' && isSuperAdmin && (
        <div style={s.tw}>
          {logs.length > 0 && (
            <div style={{marginBottom:'10px',textAlign:'right'}}>
              <button onClick={clearAllLogs} style={{background:'#660000',color:'#ff6666',border:'1px solid #ff4444',padding:'8px 16px',borderRadius:'6px',cursor:'pointer'}}>🗑 Очистить все</button>
            </div>
          )}
          <table style={s.tbl}>
            <thead><tr><th style={s.th}>ID</th><th style={s.th}>Действие</th><th style={s.th}>Дата</th><th style={s.th}></th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} style={s.tr}>
                  <td style={{...s.td,color:'#888'}}>{l.id}</td>
                  <td style={s.td}>{l.action}</td>
                  <td style={{...s.td,color:'#888',fontSize:'12px'}}>{new Date(l.created_at).toLocaleString('ru-RU')}</td>
                  <td style={{...s.td,textAlign:'center'}}><button onClick={() => deleteLog(l.id)} style={{background:'none',border:'none',color:'#ff6666',cursor:'pointer',fontSize:'16px'}}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Заявки на восстановление */}
      {activeTab === 'restore' && isSuperAdmin && (
        <div style={s.tw}>
          <table style={s.tbl}>
            <thead><tr><th style={s.th}>ID</th><th style={s.th}>Пользователь</th><th style={s.th}>Дата</th><th style={s.th}>Статус</th><th style={s.th}>Действия</th></tr></thead>
            <tbody>
              {restoreRequests.map(req => (
                <tr key={req.id} style={s.tr}>
                  <td style={s.td}>#{req.id}</td>
                  <td style={s.td}>{req.user_login}</td>
                  <td style={{...s.td,fontSize:'12px',color:'#888'}}>{new Date(req.created_at).toLocaleString('ru-RU')}</td>
                  <td style={s.td}>{req.status === 'pending' ? <span style={{color:'#ffaa44'}}>⏳</span> : req.status === 'approved' ? <span style={{color:'#4CAF50'}}>✅</span> : <span style={{color:'#f44336'}}>❌</span>}</td>
                  <td style={s.td}>
                    {req.status === 'pending' && (
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={() => approveRestore(req.id)} style={{...s.btnA,background:'#4CAF50',fontSize:'12px'}}>✓</button>
                        <button onClick={() => declineRestore(req.id)} style={{...s.btnD,fontSize:'12px'}}>✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Бекапы */}
      {activeTab === 'backup' && (
        <div>
          {isSuperAdmin && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(350px,1fr))',gap:'20px',marginBottom:'20px'}}>
              <div style={s.bc}>
                <h3 style={s.bt}>📥 Создать бекап</h3>
                <button onClick={createBackup} style={s.bBtn} disabled={loading}>💾 Создать и скачать</button>
              </div>
              <div style={s.bc}>
                <h3 style={s.bt}>📤 Восстановить из файла</h3>
                <div style={s.wb}>⚠️ Все данные заменятся!</div>
                <input ref={fileInputRef} type="file" accept=".json" onChange={importBackup} style={{display:'none'}} />
                <button onClick={() => fileInputRef.current?.click()} style={{...s.bBtn,background:'#aa6600'}} disabled={loading}>📂 Выбрать файл</button>
              </div>
            </div>
          )}

          {!isSuperAdmin && (
            <div style={{maxWidth:'500px',marginBottom:'20px'}}>
              <div style={s.bc}>
                <h3 style={s.bt}>📥 Скачать бекап</h3>
                <button onClick={exportBackup} style={s.bBtn} disabled={loading}>💾 Скачать</button>
              </div>
              <div style={{...s.bc,marginTop:'15px'}}>
                <h3 style={s.bt}>📤 Запросить восстановление</h3>
                <div style={{...s.wb,background:'rgba(74,158,255,0.1)',borderColor:'rgba(74,158,255,0.3)',color:'#4a9eff'}}>ℹ️ Требуется подтверждение супер-админа</div>
                <input ref={fileInputRef} type="file" accept=".json" onChange={requestRestore} style={{display:'none'}} />
                <button onClick={() => fileInputRef.current?.click()} style={{...s.bBtn,background:'#0066aa'}} disabled={loading}>📂 Отправить заявку</button>
              </div>
            </div>
          )}

          {/* Прогресс восстановления */}
          {restoring && (
            <div style={{...s.bc, marginTop: '15px', textAlign: 'center'}}>
              <div style={{fontSize: '40px', marginBottom: '10px'}}>⏳</div>
              <p style={{color: '#aaa'}}>Восстановление выполняется...</p>
              <p style={{color: '#666', fontSize: '12px'}}>Это может занять несколько минут</p>
            </div>
          )}

          {/* Результат восстановления */}
          {restoreLog && (
            <div style={{...s.bc, marginTop: '15px', maxHeight: '500px', overflow: 'auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <h3 style={{color: '#4CAF50', margin: 0}}>✅ Восстановлено {restoreLog.totalInserted} записей</h3>
                <button onClick={() => setRestoreLog(null)} style={{background: '#444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer'}}>✕ Скрыть</button>
              </div>

              <div style={{fontSize: '12px', color: '#aaa', marginBottom: '15px'}}>
                {restoreLog.log?.map((l, i) => (
                  <div key={i} style={{padding: '1px 0'}}>{l}</div>
                ))}
              </div>

              {restoreLog.tableResults && Object.entries(restoreLog.tableResults).map(([table, info]) => (
                <div key={table} style={{marginBottom: '8px', padding: '10px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #333'}}>
                  <div style={{fontWeight: 'bold', color: info.inserted === info.total ? '#4CAF50' : '#ffaa44', fontSize: '14px'}}>
                    📊 {table}: {info.inserted}/{info.total}
                    {info.inserted < info.total && <span style={{color: '#ff4444', marginLeft: '8px', fontSize: '12px'}}>(пропущено {info.total - info.inserted})</span>}
                  </div>
                  {info.errors?.length > 0 && (
                    <div style={{marginTop: '8px'}}>
                      {info.errors.map((err, i) => (
                        <div key={i} style={{fontSize: '11px', color: '#ff6666', marginBottom: '6px', padding: '6px', background: 'rgba(255,0,0,0.1)', borderRadius: '4px', border: '1px solid rgba(255,0,0,0.2)'}}>
                          <div style={{fontWeight: 'bold', marginBottom: '3px'}}>❌ Запись #{err.index}: {err.message}</div>
                          <div style={{color: '#888', fontSize: '10px', wordBreak: 'break-all'}}>Данные: {err.record}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* История бекапов */}
          {isSuperAdmin && (
            <div style={s.tw}>
              <h3 style={{...s.bt, padding: '15px', margin: 0}}>📋 История бекапов ({backups.length})</h3>
              <table style={s.tbl}>
                <thead><tr><th style={s.th}>ID</th><th style={s.th}>Создал</th><th style={s.th}>Размер</th><th style={s.th}>Дата</th><th style={s.th}>Действия</th></tr></thead>
                <tbody>
                  {backups.map(b => (
                    <tr key={b.id} style={s.tr}>
                      <td style={s.td}>#{b.id}</td>
                      <td style={s.td}>{b.created_by}</td>
                      <td style={s.td}>{formatSize(b.size_bytes)}</td>
                      <td style={{...s.td,color:'#888',fontSize:'12px'}}>{new Date(b.created_at).toLocaleString('ru-RU')}</td>
                      <td style={s.td}>
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                          <button onClick={() => downloadBackup(b.id)} style={{...s.btnA,background:'#2196F3',fontSize:'12px'}}>📥</button>
                          <button onClick={() => restoreBackup(b.id)} style={{...s.btnA,background:'#FF9800',fontSize:'12px'}}>↩</button>
                          <button onClick={() => deleteBackup(b.id)} style={{...s.btnD,fontSize:'12px'}}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  c: { padding: '20px', height: '100%', color: '#fff', overflow: 'auto' },
  t: { margin: '0 0 20px', fontSize: '24px', fontWeight: 'bold' },
  msg: { background: 'rgba(0,255,0,0.1)', border: '1px solid rgba(0,255,0,0.3)', color: '#44ff44', padding: '12px', borderRadius: '8px', marginBottom: '15px' },
  load: { background: 'rgba(255,255,0,0.1)', border: '1px solid rgba(255,255,0,0.3)', color: '#ffff44', padding: '12px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center' },
  tabs: { display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' },
  tb: { color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', background: '#333' },
  ta: { color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', background: '#b30000' },
  toolbar: { display: 'flex', gap: '20px', marginBottom: '10px', padding: '10px', background: 'rgba(255,136,0,0.05)', borderRadius: '8px' },
  tl: { color: '#aaa', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  cb: { width: '18px', height: '18px' },
  tw: { borderRadius: '8px', border: '1px solid #444', overflow: 'hidden', overflowX: 'auto', marginBottom: '15px' },
  tbl: { width: '100%', borderCollapse: 'collapse', background: '#2a2a2a', minWidth: '700px' },
  th: { background: '#333', color: '#fff', padding: '12px', textAlign: 'left', borderBottom: '2px solid #b30000', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #3a3a3a' },
  td: { padding: '12px', borderBottom: '1px solid #3a3a3a', color: '#fff', fontSize: '14px' },
  sal: { background: '#ff8800', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', marginLeft: '8px', fontWeight: 'bold' },
  ap: { color: '#44ff44', background: 'rgba(0,255,0,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' },
  pn: { color: '#ffaa44', background: 'rgba(255,170,68,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' },
  sar: { color: '#ff8800', background: 'rgba(255,136,0,0.15)', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', border: '1px solid rgba(255,136,0,0.3)', whiteSpace: 'nowrap' },
  adr: { color: '#ff4444', background: 'rgba(255,0,0,0.15)', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  usr: { color: '#aaa', background: 'rgba(170,170,170,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', whiteSpace: 'nowrap' },
  pt: { color: '#ff8800', fontSize: '13px', fontWeight: 'bold', padding: '6px 10px', background: 'rgba(255,136,0,0.15)', borderRadius: '4px', border: '1px solid rgba(255,136,0,0.3)' },
  btnA: { background: '#006600', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnM: { background: '#0066aa', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnR: { background: '#aa6600', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnD: { background: '#660000', color: '#ff6666', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', width: '38px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bc: { background: '#2a2a2a', borderRadius: '8px', padding: '25px', border: '1px solid #444' },
  bt: { color: '#fff', margin: '0 0 15px', fontSize: '18px' },
  bBtn: { background: '#006600', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', width: '100%' },
  wb: { background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', color: '#ff6666', padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px' }
};
