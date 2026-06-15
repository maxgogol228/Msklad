import React, { useEffect, useState, useRef } from "react";
import API from "../api";

const s = {
  wrap: { padding: '10px', height: '100%', color: '#ccc', overflow: 'auto', background: '#1a1a1a' },
  title: { margin: '0 0 12px', fontSize: '18px', fontWeight: 'bold', color: '#fff' },
  msg: (c) => ({ background: c==='green'?'rgba(0,255,0,0.08)':'rgba(255,0,0,0.08)', border: `1px solid ${c==='green'?'rgba(0,255,0,0.2)':'rgba(255,0,0,0.2)'}`, color: c==='green'?'#4CAF50':'#ff6666', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '12px' }),
  tabs: { display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' },
  tab: (a) => ({ color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', background: a ? '#b30000' : '#2a2a2a', whiteSpace: 'nowrap' }),
  tw: { borderRadius: '4px', border: '1px solid #333', overflow: 'hidden', overflowX: 'auto', marginBottom: '10px' },
  tbl: { width: '100%', borderCollapse: 'collapse', background: '#222', minWidth: '600px' },
  th: { background: '#2a2a2a', color: '#999', padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #b30000', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #333' },
  td: { padding: '8px 10px', borderBottom: '1px solid #333', color: '#bbb', fontSize: '12px' },
  badge: (c,t) => ({ padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', whiteSpace: 'nowrap', background: c, color: t||'#fff' }),
  btnS: (bg) => ({ background: bg, color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', minWidth: '28px' }),
  bc: { background: '#222', borderRadius: '6px', padding: '20px', border: '1px solid #333' },
  bt: { color: '#fff', margin: '0 0 12px', fontSize: '15px' },
  bBtn: (bg) => ({ background: bg||'#1a3a1a', color: bg==='#1a3a1a'?'#4CAF50':'#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', width: '100%' }),
  wb: { background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', color: '#ff6666', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '11px' }
};

export default function AdminPage({ user }) {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [backups, setBackups] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const fileRef = useRef(null);
  const [restoreLog, setRestoreLog] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const isSuperAdmin = user?.login?.toLowerCase() === 'admin';

  useEffect(() => { loadUsers(); if (isSuperAdmin) { loadLogs(); loadBackups(); } }, []);

  const loadUsers = async () => { try { setUsers((await API.get("/users")).data || []); } catch (e) {} };
  const loadLogs = async () => { try { setLogs((await API.get("/logs")).data || []); } catch (e) {} };
  const loadBackups = async () => { try { setBackups((await API.get("/backup/history")).data || []); } catch (e) {} };

  const showMsg = (text, color) => { setMsg({text,color}); setTimeout(()=>setMsg(null),3000); };

  const approveUser = async (id) => { try { await API.post(`/users/approve/${id}`,{adminLogin:user.login}); loadUsers(); showMsg('Approved','green'); } catch(e){} };
  const makeAdmin = async (id) => { try { await API.post(`/users/make-admin/${id}`,{adminLogin:user.login}); loadUsers(); showMsg('Admin','green'); } catch(e){} };
  const removeAdmin = async (id) => { try { await API.post(`/users/remove-admin/${id}`,{adminLogin:user.login}); loadUsers(); showMsg('Removed','green'); } catch(e){} };
  const removeUser = async (id) => { try { await API.delete(`/users/${id}`,{data:{adminLogin:user.login}}); loadUsers(); showMsg('Deleted','green'); } catch(e){} };
  const clearLogs = async () => { try { await API.delete("/logs/clear",{data:{user_login:user.login}}); loadLogs(); showMsg('Logs cleared','green'); } catch(e){} };
  const deleteLog = async (id) => { try { await API.delete(`/logs/${id}`); loadLogs(); } catch(e){} };

  const createBackup = async () => {
    try { setLoading(true); const r=await API.post("/backup/create",{user_login:user.login},{responseType:'blob'}); const u=window.URL.createObjectURL(new Blob([r.data])); const a=document.createElement('a'); a.href=u; a.download=`backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); a.remove(); window.URL.revokeObjectURL(u); showMsg('Backup downloaded','green'); } catch(e){} finally { setLoading(false); }
  };

  const importBackup = async (e) => {
    const f=e.target.files[0]; if(!f) return; e.target.value='';
    setRestoring(true); setRestoreLog(null);
    try {
      const text=await f.text(); const backup=JSON.parse(text); const tables=backup.tables||backup.data||{};
      const order=['users','categories','items','consumables','devices','device_items','assembly_tasks','task_items','subtask_components','routine_tasks','assembled_devices','notifications','chat_messages','online_users','typing_users','suggestions','snapshots','logs'];
      let ok=0,fail=0; const log=[];
      const token=localStorage.getItem('auth_token'); const BASE='https://m-sklad.onrender.com';
      try { await fetch(`${BASE}/restore-full/clear`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({user_login:user.login})}); } catch(e){}
      for(const table of order){const records=tables[table];if(!records||!Array.isArray(records)||records.length===0) continue;
        const chunks=[]; for(let j=0;j<records.length;j+=50) chunks.push(records.slice(j,j+50));
        log.push(`${table}: ${records.length} records (${chunks.length} parts)`);
        for(let c=0;c<chunks.length;c++){try{const r=await fetch(`${BASE}/restore-full`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({user_login:user.login,file_content:{tables:{[table]:chunks[c]}}})});const d=await r.json();if(d.totalOk)ok+=d.totalOk;if(d.totalFail)fail+=d.totalFail;}catch(err){fail+=chunks[c].length;}}
      }
      setRestoreLog({totalInserted:ok,totalFailed:fail,log}); showMsg(`Restored: ${ok} records${fail>0?` (errors: ${fail})`:''}`,fail>0?'red':'green');
      loadUsers(); loadLogs();
    } catch(er) { showMsg('Error: '+(er.response?.data?.error||er.message),'red'); } finally { setRestoring(false); }
  };

  const downloadBackup = async (id) => { try { const r=await API.get(`/backup/download/${id}`,{responseType:'blob'}); const u=window.URL.createObjectURL(new Blob([r.data])); const a=document.createElement('a'); a.href=u; a.download=`backup-${id}.json`; a.click(); a.remove(); window.URL.revokeObjectURL(u); } catch(e){} };
  const restoreBackup = async (id) => { try { setLoading(true); await API.post(`/backup/restore/${id}`,{user_login:user.login}); showMsg('Restored','green'); loadUsers(); loadLogs(); } catch(e){} finally { setLoading(false); } };
  const deleteBackup = async (id) => { try { await API.delete(`/backup/${id}`); loadBackups(); } catch(e){} };

  const isSA = (u) => u?.login?.toLowerCase()==='admin';
  const filteredUsers = showSuperAdmin ? users : users.filter(u => !isSA(u));
  const fmtSize = (b) => b ? (b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB') : '0 KB';

  return (
    <div style={s.wrap}>
      
      {msg && <div style={s.msg(msg.color)}>{msg.text}</div>}
      {loading && !restoring && <div style={{textAlign:'center',padding:'10px',color:'#aa6600'}}>Loading...</div>}

      <div style={s.tabs}>
        <button onClick={()=>setTab('users')} style={s.tab(tab==='users')}>Users ({filteredUsers.length})</button>
        {isSuperAdmin && <button onClick={()=>setTab('logs')} style={s.tab(tab==='logs')}>Logs ({logs.length})</button>}
        {isSuperAdmin && <button onClick={()=>setTab('backup')} style={s.tab(tab==='backup')}>Backups</button>}
      </div>

      {tab==='users' && (
        <div style={s.tw}>
          {isSuperAdmin && <div style={{display:'flex',gap:'15px',marginBottom:'8px',padding:'8px',background:'rgba(255,136,0,0.03)',borderRadius:'4px'}}><label style={{color:'#999',fontSize:'12px',display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}><input type="checkbox" checked={showPasswords} onChange={e=>setShowPasswords(e.target.checked)}/> Passwords</label><label style={{color:'#999',fontSize:'12px',display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}><input type="checkbox" checked={showSuperAdmin} onChange={e=>setShowSuperAdmin(e.target.checked)}/> Super Admin</label></div>}
          <table style={s.tbl}><thead><tr><th style={s.th}>ID</th><th style={s.th}>Login</th><th style={s.th}>Status</th>{isSuperAdmin&&showPasswords&&<th style={s.th}>Password</th>}<th style={s.th}>Role</th><th style={s.th}>Date</th><th style={s.th}>Actions</th></tr></thead><tbody>
            {filteredUsers.map(u => {
              const sa = isSA(u);
              return (<tr key={u.id} style={{...s.tr,background:sa?'rgba(255,136,0,0.05)':'transparent',borderLeft:sa?'2px solid #aa6600':'2px solid transparent'}}>
                <td style={s.td}>{u.id}{sa&&<span style={{color:'#aa6600',marginLeft:'4px'}}>*</span>}</td>
                <td style={s.td}><b>{u.login}</b>{sa&&<span style={s.badge('#aa6600','#000')}>SUPER</span>}</td>
                <td style={s.td}>{u.approved?<span style={s.badge('rgba(0,255,0,0.1)','#4CAF50')}>OK</span>:<span style={s.badge('rgba(255,170,68,0.1)','#aa6600')}>Pending</span>}</td>
                {isSuperAdmin&&showPasswords&&<td style={{...s.td,color:'#ff6666',fontFamily:'monospace',fontSize:'11px'}}>{u.access_key}</td>}
                <td style={s.td}>{sa?<span style={s.badge('rgba(255,136,0,0.15)','#aa6600')}>Super Admin</span>:u.is_admin?<span style={s.badge('rgba(255,0,0,0.1)','#ff4444')}>Admin</span>:<span style={s.badge('rgba(170,170,170,0.1)','#888')}>User</span>}</td>
                <td style={{...s.td,color:'#777',fontSize:'11px'}}>{u.created_at?new Date(u.created_at).toLocaleString('ru-RU'):'—'}</td>
                <td style={s.td}><div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>{sa?<span style={{color:'#aa6600',fontSize:'11px'}}>Protected</span>:<>{!u.approved&&<button onClick={()=>approveUser(u.id)} style={s.btnS('#1a3a1a')}>OK</button>}{isSuperAdmin&&u.approved&&!u.is_admin&&<button onClick={()=>makeAdmin(u.id)} style={s.btnS('#1a2a3a')}>Up</button>}{isSuperAdmin&&u.is_admin&&<button onClick={()=>removeAdmin(u.id)} style={s.btnS('#3a2a1a')}>Down</button>}{isSuperAdmin&&<button onClick={()=>removeUser(u.id)} style={s.btnS('#3a1a1a')}>Del</button>}</>}</div></td>
              </tr>);
            })}
          </tbody></table>
        </div>
      )}

      {tab==='logs' && isSuperAdmin && (
        <div style={s.tw}>
          {logs.length>0 && <div style={{marginBottom:'8px',textAlign:'right'}}><button onClick={clearLogs} style={{background:'#3a1a1a',color:'#ff6666',border:'1px solid #5a2d2d',padding:'6px 12px',borderRadius:'4px',cursor:'pointer',fontSize:'11px'}}>Clear All</button></div>}
          <table style={s.tbl}><thead><tr><th style={s.th}>ID</th><th style={s.th}>Action</th><th style={s.th}>Date</th><th style={s.th}></th></tr></thead><tbody>
            {logs.map(l=>(<tr key={l.id} style={s.tr}><td style={{...s.td,color:'#555'}}>{l.id}</td><td style={s.td}>{l.action}</td><td style={{...s.td,color:'#777',fontSize:'11px'}}>{new Date(l.created_at).toLocaleString('ru-RU')}</td><td style={{...s.td,textAlign:'center'}}><button onClick={()=>deleteLog(l.id)} style={{background:'none',border:'none',color:'#ff6666',cursor:'pointer',fontSize:'13px'}}>X</button></td></tr>))}
          </tbody></table>
        </div>
      )}

      {tab==='backup' && isSuperAdmin && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'15px',marginBottom:'15px'}}>
            <div style={s.bc}><h3 style={s.bt}>Create Backup</h3><button onClick={createBackup} style={s.bBtn()} disabled={loading}>Create & Download</button></div>
            <div style={s.bc}><h3 style={s.bt}>Restore from File</h3><div style={s.wb}>All data will be replaced!</div><input ref={fileRef} type="file" accept=".json" onChange={importBackup} style={{display:'none'}}/><button onClick={()=>fileRef.current?.click()} style={s.bBtn('#3a2a1a')} disabled={loading||restoring}>Choose File</button></div>
          </div>

          {restoring && <div style={{...s.bc,textAlign:'center'}}><div style={{fontSize:'30px',marginBottom:'8px',opacity:0.5}}>...</div><p style={{color:'#888'}}>Restoring...</p></div>}

          {restoreLog && (
            <div style={{...s.bc,maxHeight:'400px',overflow:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}><h3 style={{color:restoreLog.totalFailed>0?'#aa6600':'#4CAF50',margin:0,fontSize:'14px'}}>Restored: {restoreLog.totalInserted} records{restoreLog.totalFailed>0&&` (errors: ${restoreLog.totalFailed})`}</h3><button onClick={()=>setRestoreLog(null)} style={{background:'#333',color:'#888',border:'none',padding:'4px 10px',borderRadius:'3px',cursor:'pointer',fontSize:'11px'}}>Hide</button></div>
              <div style={{fontSize:'11px',fontFamily:'monospace',whiteSpace:'pre-wrap',color:'#888'}}>{restoreLog.log?.map((l,i)=><div key={i} style={{padding:'1px 0',color:l.includes('Error')?'#ff6666':l.includes('OK')?'#4CAF50':'#888'}}>{l}</div>)}</div>
            </div>
          )}

          <div style={s.tw}><h3 style={{...s.bt,padding:'12px',margin:0}}>Backup History ({backups.length})</h3>
            <table style={s.tbl}><thead><tr><th style={s.th}>ID</th><th style={s.th}>Created by</th><th style={s.th}>Size</th><th style={s.th}>Date</th><th style={s.th}>Actions</th></tr></thead><tbody>
              {backups.map(b=>(<tr key={b.id} style={s.tr}><td style={s.td}>#{b.id}</td><td style={s.td}>{b.created_by}</td><td style={s.td}>{fmtSize(b.size_bytes)}</td><td style={{...s.td,color:'#777',fontSize:'11px'}}>{new Date(b.created_at).toLocaleString('ru-RU')}</td><td style={s.td}><div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}><button onClick={()=>downloadBackup(b.id)} style={s.btnS('#1a2a3a')}>DL</button><button onClick={()=>restoreBackup(b.id)} style={s.btnS('#3a2a1a')}>Restore</button><button onClick={()=>deleteBackup(b.id)} style={s.btnS('#3a1a1a')}>Del</button></div></td></tr>))}
            </tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
