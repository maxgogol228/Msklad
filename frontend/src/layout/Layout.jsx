import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const isFirstCheckRef = useRef(true);
  const titleIntervalRef = useRef(null);
  const notificationAudioRef = useRef(null);
  const [privateNotifications, setPrivateNotifications] = useState({});
  const lastMarkReadRef = useRef({});
  const updateLockRef = useRef(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [activePrivateChat, setActivePrivateChat] = useState(null);

  const isSuperAdmin = currentUser?.login?.toLowerCase() === 'admin';
  const isAdmin = currentUser?.is_admin || isSuperAdmin;

  useEffect(() => {
    notificationAudioRef.current = new Audio('/notification.mp3');
    notificationAudioRef.current.volume = 0.4;
    const init = () => {
      if (notificationAudioRef.current) {
        notificationAudioRef.current.play().then(() => {
          notificationAudioRef.current.pause();
          notificationAudioRef.current.currentTime = 0;
        }).catch(() => {});
      }
      ['click', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, init));
    };
    ['click', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, init));
    return () => ['click', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, init));
  }, []);

  const playSound = useCallback(() => {
    try {
      if (notificationAudioRef.current) {
        notificationAudioRef.current.currentTime = 0;
        notificationAudioRef.current.play().catch(() => {});
      }
    } catch (e) {}
  }, []);

  const startTabFlash = useCallback(() => {
    if (titleIntervalRef.current) return;
    let f = true;
    titleIntervalRef.current = setInterval(() => {
      document.title = f ? '🔔 Новое уведомление!' : 'М Склад';
      f = !f;
    }, 800);
  }, []);

  const stopTabFlash = useCallback(() => {
    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
      document.title = 'М Склад';
    }
  }, []);

  useEffect(() => {
    window.addEventListener('focus', stopTabFlash);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) stopTabFlash();
    });
    return () => {
      window.removeEventListener('focus', stopTabFlash);
      document.removeEventListener('visibilitychange', () => {});
    };
  }, [stopTabFlash]);

  const startFlashing = () => {
    if (!flashIntervalRef.current) flashIntervalRef.current = setInterval(() => setFlashTask(p => !p), 500);
  };

  const stopFlashing = () => {
    if (flashIntervalRef.current) { clearInterval(flashIntervalRef.current); flashIntervalRef.current = null; }
    setFlashTask(false);
  };

  useEffect(() => {
    const h = () => {
      const m = window.innerWidth <= 768;
      setIsMobile(m);
      if (!m) setSidebarOpen(true);
    };
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (isMobile && sidebarOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, isMobile]);

  useEffect(() => {
    const c = async () => {
      try {
        const r = await API.get("/auth/check-session");
        setCurrentUser(r.data.user);
      } catch (e) { if (e.response?.status === 401) onLogout(); }
    };
    c();
    const i = setInterval(c, 30000);
    return () => clearInterval(i);
  }, [onLogout]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const checkWorkHours = async () => { try { await API.post("/tasks/check-working-hours"); } catch (e) {} };

    const check = async () => {
      if (updateLockRef.current) return;
      updateLockRef.current = true;
      let total = 0;

      try {
        const tc = await API.get(`/tasks/notifications/count/${currentUser.id}`);
        const nt = tc.data?.count || 0;
        setTaskNotifCount(nt);
        total += nt;
        if (nt > 0 && !tasksSeen && page !== 'tasks') startFlashing();
        if (nt === 0) stopFlashing();
      } catch (e) {}

      try {
        const unreadRes = await API.get(`/chat/unread/${currentUser.login}`);
        if (unreadRes.data) {
          const general = unreadRes.data.general || 0;
          const admin = unreadRes.data.admin || 0;
          const privateCounts = unreadRes.data.private || {};
          const now = Date.now();
          const filteredPrivate = {};
          for (const [login, count] of Object.entries(privateCounts)) {
            const lastMarked = lastMarkReadRef.current[login] || 0;
            if (activePrivateChat === login) continue;
            if (now - lastMarked > 3000) filteredPrivate[login] = count;
          }
          setChatNotifCount(general + admin + Object.values(filteredPrivate).reduce((a,b)=>a+b,0));
          setPrivateNotifications(prev => {
            const ps = JSON.stringify(prev), ns = JSON.stringify(filteredPrivate);
            if (ps === ns) return prev;
            return filteredPrivate;
          });
        }
      } catch (e) {}

      try {
        await API.post("/chat/online", { user_id: currentUser.id, user_login: currentUser.login });
        const o = await API.get("/chat/online-users");
        setOnlineUsers(o.data || []);
      } catch (e) {}

      if (!isFirstCheckRef.current && total > prevTotalRef.current) {
        playSound();
        if (!document.hasFocus()) startTabFlash();
      }
      prevTotalRef.current = total;
      isFirstCheckRef.current = false;
      updateLockRef.current = false;
    };

    checkWorkHours(); check();
    const workInterval = setInterval(checkWorkHours, 60000);
    const notifInterval = setInterval(check, 5000);
    return () => { clearInterval(workInterval); clearInterval(notifInterval); stopFlashing(); };
  }, [currentUser?.id, page, tasksSeen, playSound, startTabFlash, activePrivateChat]);

  const handlePageChange = async (np) => {
    if (np === 'chat' || np.startsWith('chat_private_')) {
      if (currentUser?.id) { try { await API.put(`/chat/notifications/read-all/${currentUser.id}`); } catch (e) {} }
      if (np.startsWith('chat_private_')) {
        const tl = np.replace('chat_private_', '');
        lastMarkReadRef.current[tl] = Date.now();
        setActivePrivateChat(tl);
        setPrivateNotifications(prev => { const u = {...prev}; delete u[tl]; return u; });
        setChatNotifCount(0);
      } else {
        setActivePrivateChat(null);
      }
    }
    if (np === 'tasks') { stopFlashing(); setTasksSeen(true); }
    setPage(np);
    if (isMobile) setSidebarOpen(false);
    stopTabFlash();
  };

  useEffect(() => {
    if (taskNotifCount > 0 && tasksSeen && page !== 'tasks') { setTasksSeen(false); startFlashing(); }
    if (taskNotifCount === 0) { stopFlashing(); setTasksSeen(true); }
  }, [taskNotifCount]);

  const formatLastSeen = (ts, status) => {
    if (!ts || status === 'online') return '';
    const d = new Date(ts), n = new Date();
    if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const y = new Date(n); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'вчера ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const renderBadge = (c) => c > 0 ? <span style={s.badge}>{c > 99 ? '99+' : c}</span> : null;
  const getButtonStyle = (pn) => {
    if (page === pn) return s.activeButton;
    if (pn === 'tasks' && flashTask) return s.flashButton;
    return s.button;
  };
  const hasPrivateNotifications = Object.keys(privateNotifications).filter(l => privateNotifications[l] > 0).length > 0;

  return (
    <div style={s.app}>
      {isMobile && sidebarOpen && <div style={s.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Основной сайдбар */}
      <div style={{...s.sidebar, transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)', position: isMobile ? 'fixed' : 'relative', zIndex: isMobile ? 1000 : 1}}>
        <div style={s.userInfo}><div style={s.userName}>{currentUser.name || currentUser.login}</div><div style={s.userRole}>{isSuperAdmin ? 'Супер-админ' : isAdmin ? 'Администратор' : 'Пользователь'}</div></div>
        <button style={getButtonStyle("items")} onClick={() => handlePageChange("items")}><span>📦 Детали</span></button>
        <button style={getButtonStyle("consumables")} onClick={() => handlePageChange("consumables")}><span>🔧 Расходники</span></button>
        <button style={getButtonStyle("devices")} onClick={() => handlePageChange("devices")}><span>🔬 Приборы</span></button>
        <button style={getButtonStyle("assembled")} onClick={() => handlePageChange("assembled")}><span>📦 Собранные</span></button>
        <button style={getButtonStyle("archive")} onClick={() => handlePageChange("archive")}><span>🗄️ Архив</span></button>
        <button style={page === "chat" || page.startsWith("chat_private_") ? s.activeButton : s.button} onClick={() => handlePageChange("chat")}>
          <span>💬 Чат</span>
          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
            {renderBadge(chatNotifCount)}
            {hasPrivateNotifications && <button onClick={(e)=>{e.stopPropagation();setChatSidebarOpen(true)}} style={s.toggleChatsBtn}>👥</button>}
          </div>
        </button>
        <button style={page === "tasks" ? s.activeButton : (flashTask ? s.flashButton : s.button)} onClick={() => handlePageChange("tasks")}>
          <span>📋 Задачи</span>{renderBadge(taskNotifCount)}
        </button>
        <div style={s.divider} />
        {isAdmin && <button style={page === "admin" ? s.activeAdminButton : s.adminButton} onClick={() => handlePageChange("admin")}><span>⚙️ Админ панель</span></button>}
        <button style={getButtonStyle("settings")} onClick={() => handlePageChange("settings")}><span>Настройки</span></button>
        <button onClick={onLogout} style={s.logoutButton}><span>🚪 Выйти</span></button>

        <div style={s.onlineSection}>
          <div style={s.onlineTitle}>Пользователи ({onlineUsers.length})</div>
          <div style={s.onlineList}>
            {onlineUsers.length === 0 ? <div style={{color:'#666',fontSize:'11px',padding:'5px'}}>Нет данных</div> :
              onlineUsers.slice(0,15).map(u => (
                <div key={u.user_id} style={s.onlineUser}>
                  <span style={{...s.onlineDot,background:u.status==='online'?'#4CAF50':u.status==='recent'?'#888':'#555'}}/>
                  <span style={{color:u.status==='online'?'#ddd':'#888',fontSize:'12px',flex:1}}>{u.user_login}</span>
                  {u.status!=='online'&&u.last_active&&<span style={{color:'#666',fontSize:'10px',marginLeft:'auto',whiteSpace:'nowrap'}}>{formatLastSeen(u.last_active,u.status)}</span>}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Шторка личных чатов */}
      {chatSidebarOpen && (
        <>
          <div style={s.chatSidebarOverlay} onClick={() => setChatSidebarOpen(false)} />
          <div style={s.chatSidebar}>
            <div style={s.chatSidebarHeader}>
              <span>💬 Личные чаты</span>
              <button onClick={()=>setChatSidebarOpen(false)} style={s.chatSidebarClose}>✕</button>
            </div>
            {Object.keys(privateNotifications).filter(l=>privateNotifications[l]>0).map(login=>(
              <button
                key={login}
                style={page===`chat_private_${login}`?s.activePrivateButton:s.privateButton}
                onClick={()=>{handlePageChange(`chat_private_${login}`);setChatSidebarOpen(false)}}
              >
                <span>👤 {login}</span>
                <span style={s.badge}>{privateNotifications[login]}</span>
              </button>
            ))}
            {Object.keys(privateNotifications).filter(l=>privateNotifications[l]>0).length===0&&(
              <div style={{color:'#666',fontSize:'12px',textAlign:'center',padding:'20px'}}>Нет новых сообщений</div>
            )}
          </div>
        </>
      )}

      {/* Контент */}
      <div style={s.content}>
        <div style={s.topbar}>
          {isMobile && <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={s.menuButton}>{sidebarOpen?'✕':'☰'}{(taskNotifCount+chatNotifCount)>0&&!sidebarOpen&&<span style={s.menuBadge}>{taskNotifCount+chatNotifCount}</span>}</button>}
          <h2 style={s.topbarTitle}>
            {page==="items"&&"📦 Детали"}
            {page==="consumables"&&"🔧 Расходники"}
            {page==="devices"&&"🔬 Приборы"}
            {page==="assembled"&&"📦 Собранные"}
            {page==="archive"&&"🗄️ Архив"}
            {page==="chat"&&"💬 Чат"}
            {page.startsWith("chat_private_")&&`💬 Личный чат: ${page.replace("chat_private_","")}`}
            {page==="tasks"&&"📋 Задачи"}
            {page==="admin"&&"⚙️ Админ панель"}
            {page==="settings"&&"Настройки"}
          </h2>
          <div style={s.topbarUser}>{currentUser.name || currentUser.login}</div>
        </div>
        <div style={s.pageContent}>
          {page==="items"&&<ItemsPage user={currentUser}/>}
          {page==="consumables"&&<ConsumablesPage user={currentUser}/>}
          {page==="devices"&&<DevicesPage user={currentUser}/>}
          {page==="assembled"&&<AssembledPage user={currentUser}/>}
          {page==="archive"&&<ArchivePage user={currentUser}/>}
          {(page==="chat"||page.startsWith("chat_private_"))&&(
            <ChatPage
              user={currentUser}
              initialPrivateChat={page.startsWith("chat_private_")?page.replace("chat_private_",""):null}
              onPrivateChatOpened={(login)=>{
                setActivePrivateChat(login);
                if(login){
                  lastMarkReadRef.current[login]=Date.now();
                  setPrivateNotifications(p=>{const u={...p};delete u[login];return u});
                }
              }}
            />
          )}
          {page==="tasks"&&<TasksPage user={currentUser}/>}
          {page==="admin"&&isAdmin&&<AdminPage user={currentUser}/>}
          {page==="settings"&&<SettingsPage user={currentUser} setUser={setCurrentUser}/>}
        </div>
      </div>
    </div>
  );
}

const s = {
  app:{display:"flex",height:"100%",background:"#1e1e1e",color:"#fff",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",overflow:"hidden",position:"absolute",inset:0},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:999},
  sidebar:{width:260,minWidth:260,background:"#2b2b2b",padding:"15px 12px",display:"flex",flexDirection:"column",gap:4,borderRight:"2px solid #b30000",overflowY:"auto",overflowX:"visible",height:"100%",transition:'transform 0.3s'},
  userInfo:{padding:"12px",borderBottom:"1px solid #444",marginBottom:"10px",textAlign:"center",background:"#333",borderRadius:"8px",flexShrink:0},
  userName:{fontSize:'16px',fontWeight:'bold',marginBottom:'3px'},
  userRole:{fontSize:'12px',color:'#888'},
  button:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"12px 12px",background:"#333",color:"#fff",border:"1px solid #444",borderRadius:"8px",cursor:"pointer",textAlign:"left",fontSize:"14px",transition:"all 0.2s",outline:"none",whiteSpace:"nowrap",flexShrink:0,boxSizing:"border-box"},
  activeButton:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"12px 12px",background:"#b30000",color:"#fff",border:"1px solid #ff3333",borderRadius:"8px",cursor:"pointer",textAlign:"left",fontSize:"14px",boxShadow:"0 0 15px rgba(179,0,0,0.5)",outline:"none",whiteSpace:"nowrap",flexShrink:0,boxSizing:"border-box"},
  flashButton:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"12px 12px",background:"#ff4444",color:"#fff",border:"2px solid #ff0000",borderRadius:"8px",cursor:"pointer",textAlign:"left",fontSize:"14px",boxShadow:"0 0 20px rgba(255,0,0,0.8)",outline:"none",whiteSpace:"nowrap",flexShrink:0,boxSizing:"border-box"},
  badge:{background:'#ff4444',color:'#fff',padding:'2px 7px',borderRadius:'10px',fontSize:'11px',fontWeight:'bold',minWidth:'20px',textAlign:'center',marginLeft:'8px',flexShrink:0},
  divider:{height:"1px",background:"#444",margin:"5px 0",flexShrink:0},
  adminButton:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"12px 12px",background:"#8b0000",color:"#fff",border:"1px solid #ff3333",borderRadius:"8px",cursor:"pointer",textAlign:"left",fontSize:"14px",flexShrink:0,boxSizing:"border-box"},
  activeAdminButton:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"12px 12px",background:"#ff0000",color:"#fff",border:"1px solid #ff6666",borderRadius:"8px",cursor:"pointer",textAlign:"left",fontSize:"14px",boxShadow:"0 0 20px rgba(255,0,0,0.5)",flexShrink:0,boxSizing:"border-box"},
  logoutButton:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"12px 12px",background:"#660000",color:"#ff6666",border:"1px solid #ff4444",borderRadius:"8px",cursor:"pointer",textAlign:"left",fontSize:"14px",marginTop:"15px",flexShrink:0,boxSizing:"border-box"},
  onlineSection:{marginTop:'auto',padding:'8px 0',borderTop:'1px solid #444',flexShrink:0},
  onlineTitle:{color:'#4CAF50',fontSize:'11px',fontWeight:'bold',marginBottom:'6px'},
  onlineList:{display:'flex',flexDirection:'column',gap:'3px',maxHeight:'150px',overflowY:'auto'},
  onlineUser:{display:'flex',alignItems:'center',gap:'5px',padding:'1px 0'},
  onlineDot:{width:'5px',height:'5px',borderRadius:'50%',flexShrink:0},
  toggleChatsBtn:{background:'#4a9eff',color:'#fff',border:'none',borderRadius:'50%',width:'22px',height:'22px',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:'bold'},
  chatSidebarOverlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1001},
  chatSidebar:{position:'fixed',right:0,top:0,width:'240px',height:'100%',background:'#1e1e1e',borderLeft:'2px solid #b30000',zIndex:1002,padding:'15px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'6px',boxShadow:'-5px 0 20px rgba(0,0,0,0.5)'},
  chatSidebarHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',color:'#4a9eff',fontWeight:'bold',fontSize:'14px',marginBottom:'10px',paddingBottom:'10px',borderBottom:'1px solid #333'},
  chatSidebarClose:{background:'none',border:'none',color:'#888',fontSize:'20px',cursor:'pointer',padding:'0 4px'},
  privateButton:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"10px 12px",background:"#2a2a2a",color:"#ccc",border:"1px solid #3a3a3a",borderRadius:"8px",cursor:"pointer",textAlign:"left",fontSize:"13px",flexShrink:0,boxSizing:"border-box",transition:'all 0.2s'},
  activePrivateButton:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"10px 12px",background:"#1a3a5c",color:"#4a9eff",border:"1px solid #4a9eff",borderRadius:"8px",cursor:"pointer",textAlign:"left",fontSize:"13px",boxShadow:"0 0 10px rgba(74,158,255,0.3)",flexShrink:0,boxSizing:"border-box"},
  content:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0},
  topbar:{height:50,minHeight:50,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px",borderBottom:"1px solid #444",background:"#2a2a2a",gap:"8px",zIndex:100},
  menuButton:{background:"none",border:"none",color:"#fff",fontSize:"22px",cursor:"pointer",padding:"6px 8px",borderRadius:"6px",position:"relative",minWidth:"40px",minHeight:"40px",display:"flex",alignItems:"center",justifyContent:"center"},
  menuBadge:{position:'absolute',top:'2px',right:'2px',background:'#ff4444',color:'#fff',padding:'1px 4px',borderRadius:'8px',fontSize:'9px',fontWeight:'bold'},
  topbarTitle:{margin:0,color:"#fff",fontSize:"16px",fontWeight:"bold",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  topbarUser:{color:"#aaa",fontSize:"12px",whiteSpace:"nowrap"},
  pageContent:{flex:1,overflow:"auto",background:"#1e1e1e",WebkitOverflowScrolling:'touch'}
};
