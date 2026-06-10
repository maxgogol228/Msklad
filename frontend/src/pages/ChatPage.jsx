import React, { useEffect, useState, useRef, useCallback } from "react";
import API from "../api";

const s = {
  outer: { display: 'flex', height: '100%', overflow: 'hidden', background: '#1a1a1a' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', color: '#ccc', position: 'relative', overflow: 'hidden' },
  sidebar: { background: '#1e1e1e', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', transition: 'width 0.3s', overflow: 'hidden', flexShrink: 0 },
  toggle: { background: '#2a2a2a', color: '#888', border: 'none', padding: '6px', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'center' },
  sidebarContent: { padding: '6px', overflowY: 'auto', flex: 1 },
  sideTitle: { color: '#5a9eff', fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' },
  userBtn: { display: 'flex', alignItems: 'center', width: '100%', padding: '6px 8px', background: '#222', color: '#888', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', marginBottom: '2px', textAlign: 'left' },
  userActive: { display: 'flex', alignItems: 'center', width: '100%', padding: '6px 8px', background: '#1a2a3a', color: '#5a9eff', border: '1px solid #2d4a6a', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', marginBottom: '2px', textAlign: 'left' },
  badge: { background: '#b30000', color: '#fff', padding: '1px 5px', borderRadius: '6px', fontSize: '9px', fontWeight: 'bold', marginLeft: '4px', flexShrink: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px', flexShrink: 0, padding: '4px 6px 0' },
  title: { margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#fff' },
  tabs: { display: 'flex', gap: '3px' },
  tab: { padding: '4px 8px', borderRadius: '3px', border: 'none', background: '#2a2a2a', color: '#888', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' },
  tabActive: { padding: '4px 8px', borderRadius: '3px', border: 'none', background: '#b30000', color: '#fff', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' },
  notifBlock: { display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px', flexShrink: 0, padding: '0 6px' },
  notif: { background: 'rgba(90,158,255,0.08)', border: '1px solid rgba(90,158,255,0.2)', color: '#5a9eff', padding: '4px 8px', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' },
  dismiss: { background: 'none', border: 'none', color: '#5a9eff', cursor: 'pointer', fontSize: '12px', padding: '1px 4px' },
  chat: { flex: 1, overflowY: 'auto', padding: '6px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #333', margin: '0 6px 4px', display: 'flex', flexDirection: 'column', gap: '3px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', gap: '6px' },
  msgWrap: { display: 'flex', width: '100%' },
  msg: { padding: '6px 10px', borderRadius: '12px', position: 'relative', wordBreak: 'break-word', maxWidth: '80%' },
  msgUser: { fontSize: '10px', color: '#5a9eff', fontWeight: 'bold', marginBottom: '1px' },
  msgText: { fontSize: '12px', lineHeight: 1.3, color: '#ccc' },
  msgFooter: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '2px' },
  msgTime: { fontSize: '9px', color: '#666' },
  readStatus: { fontSize: '9px' },
  delBtn: { background: 'rgba(80,0,0,0.5)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff6666', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, flexShrink: 0, padding: 0 },
  typing: { color: '#666', fontSize: '10px', fontStyle: 'italic', padding: '2px 4px' },
  scrollBtn: { position: 'absolute', bottom: '45px', left: '50%', transform: 'translateX(-50%)', background: '#b30000', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', fontSize: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', zIndex: 10 },
  inputRow: { display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center', padding: '0 6px 6px' },
  input: { flex: 1, padding: '7px 10px', background: '#222', border: '1px solid #444', borderRadius: '14px', color: '#ccc', fontSize: '12px', outline: 'none', minWidth: '0', boxSizing: 'border-box' },
  sendBtn: { background: '#b30000', color: '#fff', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
};

export default function ChatPage({ user, initialPrivateChat, onPrivateChatOpened }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [privateChat, setPrivateChat] = useState(null);
  const [adminChat, setAdminChat] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [chatNotifications, setChatNotifications] = useState([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);

  const isAdmin = user?.is_admin || user?.login?.toLowerCase() === 'admin';
  const chatType = adminChat ? 'admin' : privateChat ? 'private' : 'general';

  useEffect(() => {
    loadMessages(); loadUsers(); loadNotifications(); sendOnline();
    const m = setInterval(loadMessages, 2000);
    const t = setInterval(loadTyping, 3000);
    const n = setInterval(loadNotifications, 5000);
    const o = setInterval(sendOnline, 30000);
    return () => { clearInterval(m); clearInterval(t); clearInterval(n); clearInterval(o); };
  }, [chatType, privateChat]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const r = await API.get(`/chat/unread/${user.login}`); if (r.data&&active) { const pc = {...(r.data.private||{})}; if(privateChat) delete pc[privateChat.login]; setUnreadCounts(prev => JSON.stringify(prev)===JSON.stringify(pc)?prev:pc); } } catch (e) {}
    };
    load(); const i = setInterval(load, 3000); return () => { active=false; clearInterval(i); };
  }, [user.login, privateChat]);

  useEffect(() => {
    if (initialPrivateChat && allUsers.length > 0) {
      const tu = allUsers.find(u => u.login === initialPrivateChat);
      if (tu) { setPrivateChat(tu); setAdminChat(false); if (onPrivateChatOpened) onPrivateChatOpened(initialPrivateChat); }
    }
  }, [initialPrivateChat, allUsers]);

  const markRead = () => {
    if (chatType==='private'&&privateChat) API.put("/chat/read",{user_login:user.login,chat_type:'private',recipient_login:privateChat.login}).catch(()=>{});
    else if (chatType==='general') API.put("/chat/read",{user_login:user.login,chat_type:'general'}).catch(()=>{});
    else if (chatType==='admin') API.put("/chat/read",{user_login:user.login,chat_type:'admin'}).catch(()=>{});
  };

  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const {scrollTop,scrollHeight,clientHeight}=chatContainerRef.current;
      setShowScrollBtn((scrollHeight-scrollTop-clientHeight>60)&&messages.length>5);
    }
  }, [messages]);

  const scrollDown = () => { setTimeout(()=>{messagesEndRef.current?.scrollIntoView({behavior:"smooth",block:"end"});setShowScrollBtn(false)},50); };

  const loadMessages = async () => {
    try {
      let r;
      if(chatType==='admin') r=await API.get("/chat/admin");
      else if(chatType==='private'&&privateChat) r=await API.get(`/chat/private/${user.login}/${privateChat.login}`);
      else r=await API.get("/chat");
      setMessages(r.data||[]);
    } catch(e){}
  };

  const loadUsers = async () => { try { const r=await API.get("/users"); setAllUsers((r.data||[]).filter(u=>u.id!==user.id&&u.approved)); } catch(e){} };
  const loadTyping = async () => { try { const r=await API.get(`/chat/typing/${chatType}`); setTypingUsers((r.data||[]).map(t=>t.user_login).filter(l=>l!==user.login)); } catch(e){} };
  const loadNotifications = async () => { try { const r=await API.get(`/chat/notifications/${user.id}`); setChatNotifications(r.data||[]); } catch(e){} };
  const sendOnline = async () => { try { await API.post("/chat/online",{user_id:user.id,user_login:user.login}); } catch(e){} };

  const sendMessage = async (e) => {
    e.preventDefault();
    if(!newMessage.trim()) return;
    const msg = newMessage.trim().toLowerCase();
    if(msg==='/burmalda'||msg==='/бурмалда') { setNewMessage(""); window.open('https://apelsinka.vercel.app','_blank'); return; }
    try {
      setLoading(true);
      await API.post("/chat",{message:newMessage.trim(),user_login:user.login,user_id:user.id,chat_type:chatType,recipient_login:privateChat?.login||null,recipient_id:privateChat?.id||null});
      setNewMessage(""); loadMessages(); scrollDown(); inputRef.current?.focus();
    } catch(e){} finally { setLoading(false); }
  };

  const deleteMessage = async (id) => { try { await API.delete(`/chat/${id}`,{data:{user_login:user.login}}); loadMessages(); } catch(e){} };
  const handleTyping = () => { API.post("/chat/typing",{user_login:user.login,chat_type:chatType,recipient_login:privateChat?.login||null}).catch(()=>{}); clearTimeout(typingTimer.current); typingTimer.current=setTimeout(()=>{},5000); };
  const dismissNotif = async (id) => { try { await API.put(`/chat/notifications/${id}/read`); loadNotifications(); } catch(e){} };
  const switchChat = (type,u=null) => { setAdminChat(type==='admin'); setPrivateChat(u); setShowScrollBtn(false); markRead(); if(type==='private'&&u&&onPrivateChatOpened) onPrivateChatOpened(u.login); };

  const formatTime = (ts) => {
    if(!ts) return ''; const d=new Date(ts),n=new Date(),diff=n-d;
    if(diff<60000) return "сейчас"; if(diff<3600000) return `${Math.floor(diff/60000)}м`;
    if(diff<86400000) return d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'});
  };

  return (
    <div style={s.outer}>
      <div style={s.main}>
        <div style={s.header}>
          <h2 style={s.title}>{chatType==='admin'?'Админ чат':privateChat?`${privateChat.login}`:'Общий чат'}</h2>
          <div style={s.tabs}>
            <button onClick={()=>switchChat('general')} style={!adminChat&&!privateChat?s.tabActive:s.tab}>Общий</button>
            {isAdmin&&<button onClick={()=>switchChat('admin')} style={adminChat?s.tabActive:s.tab}>Админ</button>}
          </div>
        </div>

        {chatNotifications.length>0&&(
          <div style={s.notifBlock}>{chatNotifications.map(n=>(<div key={n.id} style={s.notif}><span style={{flex:1}}>{n.message}</span><button onClick={()=>dismissNotif(n.id)} style={s.dismiss}>X</button></div>))}</div>
        )}

        <div style={s.chat} ref={chatContainerRef} onScroll={handleScroll}>
          {messages.length===0?<div style={s.empty}><div style={{fontSize:'30px',opacity:0.3}}>...</div><p style={{fontSize:'12px'}}>Нет сообщений</p></div>:
            messages.map(msg=>{
              const isOwner=msg.user_login===user.login;
              return (<div key={msg.id} style={{...s.msgWrap,justifyContent:isOwner?'flex-end':'flex-start'}}><div style={{...s.msg,background:isOwner?'#b30000':'#2a2a2a',borderBottomRightRadius:isOwner?'3px':'12px',borderBottomLeftRadius:isOwner?'12px':'3px'}}>{!isOwner&&<div style={s.msgUser}>{msg.user_login}</div>}<div style={s.msgText}>{msg.message}</div><div style={s.msgFooter}><span style={s.msgTime}>{formatTime(msg.created_at)}</span>{isOwner&&<span style={{...s.readStatus,color:msg.is_read?'#4CAF50':'#555'}}>{msg.is_read?'..':'•'}</span>}{isOwner&&<button onClick={()=>deleteMessage(msg.id)} style={s.delBtn}>X</button>}</div></div></div>);
            })}
          {typingUsers.length>0&&<div style={s.typing}>{typingUsers.join(', ')} печатает...</div>}
          <div ref={messagesEndRef}/>
        </div>

        {showScrollBtn&&<button onClick={scrollDown} style={s.scrollBtn}>Новые</button>}

        <form onSubmit={sendMessage} style={s.inputRow}>
          <input ref={inputRef} value={newMessage} onChange={e=>{setNewMessage(e.target.value);handleTyping()}} placeholder="Сообщение..." style={s.input} maxLength={500} autoComplete="off"/>
          <button type="submit" disabled={loading||!newMessage.trim()} style={{...s.sendBtn,opacity:loading||!newMessage.trim()?0.5:1}}>+</button>
        </form>
      </div>

      <div style={{...s.sidebar,width:sidebarOpen?'180px':'35px'}}>
        <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={s.toggle}>{sidebarOpen?'<':'<>'}</button>
        {sidebarOpen&&(<div style={s.sidebarContent}><div style={s.sideTitle}>Пользователи</div><button onClick={()=>switchChat('general')} style={!privateChat?s.userActive:s.userBtn}>Общий</button>{allUsers.slice(0,20).map(u=>{const un=unreadCounts[u.login]||0;return(<button key={u.id} onClick={()=>switchChat('private',u)} style={privateChat?.id===u.id?s.userActive:s.userBtn}><span style={{flex:1}}>{u.login}</span>{un>0&&<span style={s.badge}>{un>99?'99+':un}</span>}</button>)})}</div>)}
      </div>
    </div>
  );
}
