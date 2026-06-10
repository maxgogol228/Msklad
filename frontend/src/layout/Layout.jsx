import React, { useState, useEffect, useRef } from "react";
import ItemsPage from "../pages/ItemsPage";
import ConsumablesPage from "../pages/ConsumablesPage";
import DevicesPage from "../pages/DevicesPage";
import AdminPage from "../pages/AdminPage";
import ArchivePage from "../pages/ArchivePage";
import SettingsPage from "../pages/SettingsPage";
import ChatPage from "../pages/ChatPage";
import TasksPage from "../pages/TasksPage";
import AssembledPage from "../pages/AssembledPage";
import API from "../api";

const st = {
  app: { display: "flex", height: "100%", background: "#111", color: "#ccc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflow: "hidden", position: "absolute", inset: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999 },
  sidebar: { width: 220, minWidth: 220, background: "#1a1a1a", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 3, borderRight: "1px solid #b30000", overflowY: "auto", overflowX: "visible", height: "100%", transition: 'transform 0.3s' },
  userInfo: { padding: "10px", borderBottom: "1px solid #333", marginBottom: "6px", textAlign: "center", background: "#222", borderRadius: "6px", flexShrink: 0 },
  userName: { fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '2px' },
  userRole: { fontSize: '10px', color: '#777' },
  btn: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 10px", background: "#222", color: "#aaa", border: "1px solid #333", borderRadius: "5px", cursor: "pointer", textAlign: "left", fontSize: "12px", transition: "all 0.15s", outline: "none", whiteSpace: "nowrap", flexShrink: 0, boxSizing: "border-box" },
  btnActive: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 10px", background: "#b30000", color: "#fff", border: "1px solid #ff3333", borderRadius: "5px", cursor: "pointer", textAlign: "left", fontSize: "12px", boxShadow: "0 0 10px rgba(179,0,0,0.3)", outline: "none", whiteSpace: "nowrap", flexShrink: 0, boxSizing: "border-box" },
  btnFlash: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 10px", background: "#cc0000", color: "#fff", border: "2px solid #ff0000", borderRadius: "5px", cursor: "pointer", textAlign: "left", fontSize: "12px", boxShadow: "0 0 15px rgba(255,0,0,0.6)", outline: "none", whiteSpace: "nowrap", flexShrink: 0, boxSizing: "border-box" },
  badge: { background: '#b30000', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', minWidth: '16px', textAlign: 'center', marginLeft: '6px', flexShrink: 0 },
  divider: { height: "1px", background: "#333", margin: "3px 0", flexShrink: 0 },
  adminBtn: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 10px", background: "#2a1a1a", color: "#ff6666", border: "1px solid #5a2d2d", borderRadius: "5px", cursor: "pointer", textAlign: "left", fontSize: "12px", flexShrink: 0, boxSizing: "border-box" },
  adminBtnActive: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 10px", background: "#b30000", color: "#fff", border: "1px solid #ff3333", borderRadius: "5px", cursor: "pointer", textAlign: "left", fontSize: "12px", flexShrink: 0, boxSizing: "border-box" },
  logout: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 10px", background: "#2a1a1a", color: "#ff6666", border: "1px solid #5a2d2d", borderRadius: "5px", cursor: "pointer", textAlign: "left", fontSize: "12px", marginTop: "10px", flexShrink: 0, boxSizing: "border-box" },
  onlineSection: { marginTop: 'auto', padding: '6px 0', borderTop: '1px solid #333', flexShrink: 0 },
  onlineTitle: { color: '#4CAF50', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' },
  onlineList: { display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '120px', overflowY: 'auto' },
  onlineUser: { display: 'flex', alignItems: 'center', gap: '4px', padding: '1px 0', fontSize: '11px' },
  onlineDot: (c) => ({ width: '4px', height: '4px', borderRadius: '50%', flexShrink: 0, background: c }),
  content: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  topbar: { height: 42, minHeight: 42, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", borderBottom: "1px solid #333", background: "#1a1a1a", gap: "6px", zIndex: 100 },
  menuBtn: { background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", padding: "4px 6px", borderRadius: "4px", position: "relative", minWidth: "32px", minHeight: "32px", display: "flex", alignItems: "center", justifyContent: "center" },
  menuBadge: { position: 'absolute', top: '0px', right: '0px', background: '#b30000', color: '#fff', padding: '1px 3px', borderRadius: '6px', fontSize: '8px', fontWeight: 'bold' },
  topbarTitle: { margin: 0, color: "#fff", fontSize: "14px", fontWeight: "bold", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  topbarUser: { color: "#777", fontSize: "11px", whiteSpace: "nowrap" },
  pageContent: { flex: 1, overflow: "auto", background: "#111" }
};

const pageTitles = {
  items: "Детали",
  consumables: "Расходники",
  devices: "Приборы",
  assembled: "Собранные",
  archive: "Архив",
  chat: "Чат",
  tasks: "Задачи",
  admin: "Админ панель",
  settings: "Настройки"
};

export default function Layout({ user, setUser, onLogout, initialPage = "items" }) {
  const [page, setPage] = useState(initialPage);
  const [currentUser, setCurrentUser] = useState(user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [taskNotifCount, setTaskNotifCount] = useState(0);
  const [chatNotifCount, setChatNotifCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [flashTask, setFlashTask] = useState(false);
  const [tasksSeen, setTasksSeen] = useState(true);
  const flashIntervalRef = useRef(null);
  const prevTotalRef = useRef(0);
  const notificationAudioRef = useRef(null);
  const [privateNotifications, setPrivateNotifications] = useState({});
  const [activePrivateChat, setActivePrivateChat] = useState(null);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);

  const isSuperAdmin = currentUser?.login?.toLowerCase() === 'admin';
  const isAdmin = currentUser?.is_admin || isSuperAdmin;

  useEffect(() => {
    notificationAudioRef.current = new Audio('/notification.mp3');
    notificationAudioRef.current.volume = 0.3;
  }, []);

  const startFlashing = () => { if (!flashIntervalRef.current) flashIntervalRef.current = setInterval(() => setFlashTask(p => !p), 500); };
  const stopFlashing = () => { if (flashIntervalRef.current) { clearInterval(flashIntervalRef.current); flashIntervalRef.current = null; } setFlashTask(false); };

  useEffect(() => {
    const h = () => { const m = window.innerWidth <= 768; setIsMobile(m); if (!m) setSidebarOpen(true); };
    h(); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => { document.body.style.overflow = (isMobile && sidebarOpen) ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [sidebarOpen, isMobile]);

  useEffect(() => {
    const c = async () => { try { const r = await API.get("/auth/check-session"); setCurrentUser(r.data.user); } catch (e) { if (e.response?.status === 401) onLogout(); } };
    c(); const i = setInterval(c, 60000); return () => clearInterval(i);
  }, [onLogout]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const check = async () => {
      let total = 0;
      try { const tc = await API.get(`/tasks/notifications/count/${currentUser.id}`); const nt = tc.data?.count || 0; setTaskNotifCount(nt); total += nt; if (nt > 0 && !tasksSeen && page !== 'tasks') startFlashing(); if (nt === 0) stopFlashing(); } catch (e) {}
      try {
        const unreadRes = await API.get(`/chat/unread/${currentUser.login}`);
        if (unreadRes.data) {
          const general = unreadRes.data.general || 0;
          const admin = unreadRes.data.admin || 0;
          const privateCounts = unreadRes.data.private || {};
          const filtered = {};
          for (const [login, count] of Object.entries(privateCounts)) { if (activePrivateChat !== login) filtered[login] = count; }
          setChatNotifCount(general + admin + Object.values(filtered).reduce((a,b)=>a+b,0));
          setPrivateNotifications(filtered);
        }
      } catch (e) {}
      try { await API.post("/chat/online", { user_id: currentUser.id, user_login: currentUser.login }); const o = await API.get("/chat/online-users"); setOnlineUsers(o.data || []); } catch (e) {}
      if (total > prevTotalRef.current && notificationAudioRef.current) { try { notificationAudioRef.current.play().catch(()=>{}); } catch(e){} }
      prevTotalRef.current = total;
    };
    check(); const i = setInterval(check, 8000); return () => clearInterval(i);
  }, [currentUser?.id, page, tasksSeen, activePrivateChat]);

  const handlePageChange = async (np) => {
    if (np === 'chat' || np.startsWith('chat_private_')) {
      if (np.startsWith('chat_private_')) { setActivePrivateChat(np.replace('chat_private_', '')); setPrivateNotifications(p => { const u={...p}; delete u[np.replace('chat_private_', '')]; return u; }); }
      else { setActivePrivateChat(null); }
    }
    if (np === 'tasks') { stopFlashing(); setTasksSeen(true); }
    setPage(np); if (isMobile) setSidebarOpen(false);
  };

  useEffect(() => { if (taskNotifCount > 0 && tasksSeen && page !== 'tasks') { setTasksSeen(false); startFlashing(); } if (taskNotifCount === 0) { stopFlashing(); setTasksSeen(true); } }, [taskNotifCount]);

  const formatLastSeen = (ts, status) => {
    if (!ts || status === 'online') return ''; const d = new Date(ts), n = new Date();
    if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const renderBadge = (c) => c > 0 ? <span style={st.badge}>{c > 99 ? '99+' : c}</span> : null;
  const bs = (pn) => page===pn?st.btnActive:(pn==='tasks'&&flashTask?st.btnFlash:st.btn);
  const hasPrivate = Object.keys(privateNotifications).filter(l => privateNotifications[l] > 0).length > 0;

  const getTitle = () => {
    if (page === "chat" || page.startsWith("chat_private_")) {
      if (page.startsWith("chat_private_")) return `Чат: ${page.replace("chat_private_", "")}`;
      return "Чат";
    }
    return pageTitles[page] || page;
  };

  return (
    <div style={st.app}>
      {isMobile && sidebarOpen && <div style={st.overlay} onClick={() => setSidebarOpen(false)} />}
      <div style={{...st.sidebar, transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)', position: isMobile ? 'fixed' : 'relative', zIndex: isMobile ? 1000 : 1}}>
        <div style={st.userInfo}><div style={st.userName}>{currentUser.name || currentUser.login}</div><div style={st.userRole}>{isSuperAdmin ? 'Супер-админ' : isAdmin ? 'Админ' : 'Пользователь'}</div></div>
        <button style={bs("items")} onClick={() => handlePageChange("items")}><span>Детали</span></button>
        <button style={bs("consumables")} onClick={() => handlePageChange("consumables")}><span>Расходники</span></button>
        <button style={bs("devices")} onClick={() => handlePageChange("devices")}><span>Приборы</span></button>
        <button style={bs("assembled")} onClick={() => handlePageChange("assembled")}><span>Собранные</span></button>
        <button style={bs("archive")} onClick={() => handlePageChange("archive")}><span>Архив</span></button>
        <button style={page==="chat"||page.startsWith("chat_private_")?st.btnActive:st.btn} onClick={() => handlePageChange("chat")}><span>Чат</span><div style={{display:'flex',alignItems:'center',gap:'3px'}}>{renderBadge(chatNotifCount)}{hasPrivate&&<button onClick={(e)=>{e.stopPropagation();setChatSidebarOpen(!chatSidebarOpen)}} style={{background:'#333',color:'#fff',border:'none',borderRadius:'50%',width:'16px',height:'16px',fontSize:'9px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>}</div></button>
        <button style={bs("tasks")} onClick={() => handlePageChange("tasks")}><span>Задачи</span>{renderBadge(taskNotifCount)}</button>
        <div style={st.divider} />
        {isAdmin && <button style={page==="admin"?st.adminBtnActive:st.adminBtn} onClick={() => handlePageChange("admin")}><span>Админ</span></button>}
        <button style={bs("settings")} onClick={() => handlePageChange("settings")}><span>Настройки</span></button>
        <button onClick={onLogout} style={st.logout}><span>Выйти</span></button>
        <div style={st.onlineSection}><div style={st.onlineTitle}>Онлайн ({onlineUsers.length})</div><div style={st.onlineList}>{onlineUsers.slice(0,15).map(u=>(<div key={u.user_id} style={st.onlineUser}><span style={st.onlineDot(u.status==='online'?'#4CAF50':u.status==='recent'?'#888':'#555')}/><span style={{color:u.status==='online'?'#ddd':'#888',flex:1}}>{u.user_login}</span>{u.status!=='online'&&<span style={{color:'#666',fontSize:'9px'}}>{formatLastSeen(u.last_active,u.status)}</span>}</div>))}</div></div>
      </div>

      {chatSidebarOpen && (
        <div style={{position:'fixed',right:0,top:0,width:'180px',height:'100%',background:'#1a1a1a',borderLeft:'1px solid #b30000',zIndex:1001,padding:'8px',overflowY:'auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}><span style={{color:'#5a9eff',fontWeight:'bold',fontSize:'12px'}}>Личные чаты</span><button onClick={()=>setChatSidebarOpen(false)} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',fontSize:'14px'}}>X</button></div>
          {Object.keys(privateNotifications).filter(l=>privateNotifications[l]>0).map(l=>(<button key={l} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'7px 10px',background:page===`chat_private_${l}`?'#1a2a3a':'#222',color:page===`chat_private_${l}`?'#5a9eff':'#888',border:'1px solid #333',borderRadius:'4px',cursor:'pointer',fontSize:'11px',marginBottom:'3px'}} onClick={()=>{handlePageChange(`chat_private_${l}`);setChatSidebarOpen(false)}}><span>{l}</span><span style={st.badge}>{privateNotifications[l]}</span></button>))}
        </div>
      )}

      <div style={st.content}>
        <div style={st.topbar}>
          {isMobile && <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={st.menuBtn}>{sidebarOpen?'X':'|||'}{(taskNotifCount+chatNotifCount)>0&&!sidebarOpen&&<span style={st.menuBadge}>{taskNotifCount+chatNotifCount}</span>}</button>}
          <h2 style={st.topbarTitle}>{getTitle()}</h2>
          <div style={st.topbarUser}>{currentUser.name || currentUser.login}</div>
        </div>
        <div style={st.pageContent}>
          {page==="items"&&<ItemsPage user={currentUser}/>}
          {page==="consumables"&&<ConsumablesPage user={currentUser}/>}
          {page==="devices"&&<DevicesPage user={currentUser}/>}
          {page==="assembled"&&<AssembledPage user={currentUser}/>}
          {page==="archive"&&<ArchivePage user={currentUser}/>}
          {(page==="chat"||page.startsWith("chat_private_"))&&<ChatPage user={currentUser} initialPrivateChat={page.startsWith("chat_private_")?page.replace("chat_private_",""):null} onPrivateChatOpened={(login)=>{setActivePrivateChat(login);if(login)setPrivateNotifications(p=>{const u={...p};delete u[login];return u})}}/>}
          {page==="tasks"&&<TasksPage user={currentUser}/>}
          {page==="admin"&&isAdmin&&<AdminPage user={currentUser}/>}
          {page==="settings"&&<SettingsPage user={currentUser} setUser={setCurrentUser}/>}
        </div>
      </div>
    </div>
  );
}
