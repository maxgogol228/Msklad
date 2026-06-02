import React, { useEffect, useState, useRef, useCallback } from "react";
import API from "../api";

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
  const [privateSidebarOpen, setPrivateSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);
  const isInitialMount = useRef(true);
  const prevChatKey = useRef(null);
  const markedReadRef = useRef(false);

  const isAdmin = user?.is_admin || user?.login?.toLowerCase() === 'admin';
  const chatType = adminChat ? 'admin' : privateChat ? 'private' : 'general';
  const currentChatKey = privateChat ? `private_${privateChat.login}` : chatType;

  useEffect(() => {
    loadMessages();
    loadUsers();
    loadChatNotifications();
    sendOnlineStatus();
    const msgInterval = setInterval(loadMessages, 2000);
    const typingInterval = setInterval(loadTyping, 3000);
    const notifInterval = setInterval(loadChatNotifications, 5000);
    const onlineInterval = setInterval(sendOnlineStatus, 30000);
    return () => {
      clearInterval(msgInterval); clearInterval(typingInterval);
      clearInterval(notifInterval); clearInterval(onlineInterval);
    };
  }, [chatType, privateChat]);

  useEffect(() => {
    if (prevChatKey.current !== currentChatKey) {
      prevChatKey.current = currentChatKey;
      markedReadRef.current = false;
      if (!isInitialMount.current) setTimeout(() => scrollToBottom(), 100);
      isInitialMount.current = false;
      markAsRead();
    }
  }, [currentChatKey]);

  useEffect(() => {
    if (messages.length > 0 && !markedReadRef.current) {
      markedReadRef.current = true;
      markAsRead();
    }
  }, [messages.length]);

  useEffect(() => {
    if (initialPrivateChat && allUsers.length > 0) {
      const targetUser = allUsers.find(u => u.login === initialPrivateChat);
      if (targetUser) {
        setPrivateChat(targetUser);
        setAdminChat(false);
        if (onPrivateChatOpened) onPrivateChatOpened(initialPrivateChat);
      }
    }
  }, [initialPrivateChat, allUsers]);

  const markAsRead = () => {
    if (chatType === 'private' && privateChat) {
      API.put("/chat/read", { user_login: user.login, chat_type: 'private', recipient_login: privateChat.login }).catch(() => {});
    } else if (chatType === 'general') {
      API.put("/chat/read", { user_login: user.login, chat_type: 'general' }).catch(() => {});
    } else if (chatType === 'admin') {
      API.put("/chat/read", { user_login: user.login, chat_type: 'admin' }).catch(() => {});
    }
  };

  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      setShowScrollBtn((scrollHeight - scrollTop - clientHeight > 80) && messages.length > 5);
    }
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); setShowScrollBtn(false); }, 50);
  };

  const loadMessages = async () => {
    try {
      let res;
      if (chatType === 'admin') res = await API.get("/chat/admin");
      else if (chatType === 'private' && privateChat) res = await API.get(`/chat/private/${user.login}/${privateChat.login}`);
      else res = await API.get("/chat");
      setMessages(res.data || []);
    } catch (e) {}
  };

  const loadUsers = async () => {
    try { const res = await API.get("/users"); setAllUsers((res.data || []).filter(u => u.id !== user.id && u.approved)); } catch (e) {}
  };

  const loadTyping = async () => {
    try { const res = await API.get(`/chat/typing/${chatType}`); setTypingUsers((res.data || []).map(t => t.user_login).filter(l => l !== user.login)); } catch (e) {}
  };

  const loadChatNotifications = async () => {
    try { const res = await API.get(`/chat/notifications/${user.id}`); setChatNotifications(res.data || []); } catch (e) {}
  };

  const sendOnlineStatus = async () => {
    try { await API.post("/chat/online", { user_id: user.id, user_login: user.login }); } catch (e) {}
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const trimmedMessage = newMessage.trim();
    const lowerMessage = trimmedMessage.toLowerCase();

    // Пасхалка: секретная команда
    if (lowerMessage === '/бурмалда' || lowerMessage === '/burmalda') {
      setNewMessage("");
      window.open('https://apelsinka.vercel.app', '_blank');
      return;
    }

    try {
      setLoading(true);
      await API.post("/chat", {
        message: trimmedMessage, user_login: user.login, user_id: user.id,
        chat_type: chatType, recipient_login: privateChat?.login || null, recipient_id: privateChat?.id || null
      });
      setNewMessage("");
      await loadMessages();
      scrollToBottom();
      inputRef.current?.focus();
    } catch (e) { alert("Ошибка отправки"); } finally { setLoading(false); }
  };

  const deleteMessage = async (msgId) => {
    if (!confirm("Удалить сообщение?")) return;
    try { await API.delete(`/chat/${msgId}`, { data: { user_login: user.login } }); loadMessages(); }
    catch (e) { alert(e.response?.data?.error || "Ошибка"); }
  };

  const handleTyping = () => {
    API.post("/chat/typing", { user_login: user.login, chat_type: chatType, recipient_login: privateChat?.login || null }).catch(() => {});
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {}, 5000);
  };

  const dismissNotif = async (id) => {
    try { await API.put(`/chat/notifications/${id}/read`); loadChatNotifications(); } catch (e) {}
  };

  const switchChat = (type, u = null) => {
    setAdminChat(type === 'admin');
    setPrivateChat(u);
    setShowScrollBtn(false);
    markedReadRef.current = false;
    if (type === 'private' && u && onPrivateChatOpened) onPrivateChatOpened(u.login);
    if (type === 'general' && onPrivateChatOpened) onPrivateChatOpened(null);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts), n = new Date(), diff = n - d;
    if (diff < 60000) return "сейчас";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}м`;
    if (diff < 86400000) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    let isActive = true;
    const loadUnreadCounts = async () => {
      try {
        const res = await API.get(`/chat/unread/${user.login}`);
        if (res.data && isActive) {
          const pc = { ...(res.data.private || {}) };
          if (privateChat) delete pc[privateChat.login];
          setUnreadCounts(prev => { const ps = JSON.stringify(prev), ns = JSON.stringify(pc); return ps === ns ? prev : pc; });
        }
      } catch (e) {}
    };
    loadUnreadCounts();
    const interval = setInterval(loadUnreadCounts, 3000);
    return () => { isActive = false; clearInterval(interval); };
  }, [user.login, privateChat]);

  return (
    <div style={s.outerContainer}>
      {/* Основной чат */}
      <div style={s.container}>
        <div style={s.header}>
          <h2 style={s.title}>{chatType === 'admin' ? '🛡️ Админ чат' : privateChat ? `💬 ${privateChat.login}` : '💬 Общий чат'}</h2>
          <div style={s.tabs}>
            <button onClick={() => switchChat('general')} style={!adminChat && !privateChat ? s.tabActive : s.tab}>Общий</button>
            {isAdmin && <button onClick={() => switchChat('admin')} style={adminChat ? s.tabActive : s.tab}>Админ</button>}
          </div>
        </div>

        {chatNotifications.length > 0 && (
          <div style={s.notifBlock}>
            {chatNotifications.map(n => (
              <div key={n.id} style={s.notif}><span style={{flex:1,fontSize:'12px'}}>{n.message}</span><button onClick={()=>dismissNotif(n.id)} style={s.dismissBtn}>✕</button></div>
            ))}
          </div>
        )}

        <div style={s.chatContainer} ref={chatContainerRef} onScroll={handleScroll}>
          {messages.length === 0 ? <div style={s.empty}><span style={{fontSize:'40px'}}>💬</span><p>Нет сообщений</p></div> :
            messages.map(msg => {
              const isOwner = msg.user_login === user.login;
              return (
                <div key={msg.id} style={{...s.msgWrap, justifyContent: isOwner ? 'flex-end' : 'flex-start'}}>
                  <div style={{...s.msg, background: isOwner ? '#b30000' : '#333', borderBottomRightRadius: isOwner ? '4px' : '16px', borderBottomLeftRadius: isOwner ? '16px' : '4px', maxWidth: '80%'}}>
                    {!isOwner && <div style={s.msgUser}>{msg.user_login}</div>}
                    <div style={s.msgText}>{msg.message}</div>
                    <div style={s.msgFooter}>
                      <span style={s.msgTime}>{formatTime(msg.created_at)}</span>
                      {isOwner && <span style={{...s.readStatus, color: msg.is_read ? '#4CAF50' : '#888'}}>{msg.is_read ? '✓✓' : '✓'}</span>}
                      {isOwner && <button onClick={()=>deleteMessage(msg.id)} style={s.delBtn}>✕</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          {typingUsers.length > 0 && <div style={s.typing}>{typingUsers.join(', ')} печатает...</div>}
          <div ref={messagesEndRef} />
        </div>

        {showScrollBtn && <button onClick={scrollToBottom} style={s.scrollDownBtn}>↓ Новые</button>}

        <form onSubmit={sendMessage} style={s.inputRow}>
          <input ref={inputRef} value={newMessage} onChange={e => {setNewMessage(e.target.value); handleTyping();}} placeholder="Сообщение..." style={s.input} maxLength={500} autoComplete="off" />
          <button type="submit" disabled={loading || !newMessage.trim()} style={{...s.sendBtn, opacity: loading || !newMessage.trim() ? 0.5 : 1}}>📤</button>
        </form>
      </div>

      {/* Правая панель с пользователями */}
      <div style={{...s.userSidebar, width: privateSidebarOpen ? '200px' : '40px'}}>
        <button onClick={() => setPrivateSidebarOpen(!privateSidebarOpen)} style={s.toggleSidebarBtn}>
          {privateSidebarOpen ? '▶' : '◀'}
        </button>
        {privateSidebarOpen && (
          <div style={s.userSidebarContent}>
            <div style={s.userSidebarTitle}>👥 Пользователи</div>
            <button onClick={() => switchChat('general')} style={!privateChat ? s.userActive : s.userBtn}>💬 Общий</button>
            {allUsers.slice(0, 20).map(u => {
              const unread = unreadCounts[u.login] || 0;
              return (
                <button key={u.id} onClick={() => switchChat('private', u)}
                  style={privateChat?.id === u.id ? s.userActive : s.userBtn}>
                  <span style={{flex:1}}>👤 {u.login}</span>
                  {unread > 0 && <span style={s.userBadge}>{unread > 99 ? '99+' : unread}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  outerContainer: { display: 'flex', height: '100%', overflow: 'hidden' },
  container: { flex: 1, display: 'flex', flexDirection: 'column', color: '#fff', position: 'relative', overflow: 'hidden' },
  userSidebar: { background: '#1e1e1e', borderLeft: '1px solid #444', display: 'flex', flexDirection: 'column', transition: 'width 0.3s', overflow: 'hidden', flexShrink: 0 },
  toggleSidebarBtn: { background: '#333', color: '#fff', border: 'none', padding: '8px', cursor: 'pointer', fontSize: '14px', width: '100%', textAlign: 'center' },
  userSidebarContent: { padding: '8px', overflowY: 'auto', flex: 1 },
  userSidebarTitle: { color: '#4a9eff', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' },
  userBtn: { display: 'flex', alignItems: 'center', width: '100%', padding: '8px 10px', background: '#2a2a2a', color: '#aaa', border: '1px solid #3a3a3a', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginBottom: '3px', textAlign: 'left', whiteSpace: 'nowrap' },
  userActive: { display: 'flex', alignItems: 'center', width: '100%', padding: '8px 10px', background: '#1a3a5c', color: '#4a9eff', border: '1px solid #4a9eff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginBottom: '3px', textAlign: 'left', whiteSpace: 'nowrap' },
  userBadge: { background: '#ff4444', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', marginLeft: '6px', flexShrink: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px', flexShrink: 0, padding: '6px 8px 0' },
  title: { margin: 0, fontSize: 'clamp(15px, 4vw, 20px)', fontWeight: 'bold' },
  tabs: { display: 'flex', gap: '4px' },
  tab: { padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#333', color: '#fff', cursor: 'pointer', fontSize: 'clamp(10px,2vw,13px)', whiteSpace: 'nowrap' },
  tabActive: { padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#b30000', color: '#fff', cursor: 'pointer', fontSize: 'clamp(10px,2vw,13px)', whiteSpace: 'nowrap' },
  badge: { background: '#ff4444', color: '#fff', padding: '1px 5px', borderRadius: '8px', fontSize: '9px', fontWeight: 'bold', marginLeft: '4px' },
  notifBlock: { display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '6px', flexShrink: 0, padding: '0 8px' },
  notif: { background: 'rgba(74,158,255,0.15)', border: '1px solid rgba(74,158,255,0.3)', color: '#4a9eff', padding: '6px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dismissBtn: { background: 'none', border: 'none', color: '#4a9eff', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', flexShrink: 0 },
  chatContainer: { flex: 1, overflowY: 'auto', padding: '8px', background: '#1a1a1a', borderRadius: '10px', border: '1px solid #333', margin: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: '5px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', gap: '8px' },
  msgWrap: { display: 'flex', width: '100%' },
  msg: { padding: '8px 12px', borderRadius: '16px', position: 'relative', wordBreak: 'break-word' },
  msgUser: { fontSize: 'clamp(9px,2vw,11px)', color: '#4a9eff', fontWeight: 'bold', marginBottom: '2px' },
  msgText: { fontSize: 'clamp(12px,2.5vw,14px)', lineHeight: 1.4, color: '#fff' },
  msgFooter: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '5px', marginTop: '2px' },
  msgTime: { fontSize: 'clamp(8px,1.5vw,10px)', color: '#888' },
  readStatus: { fontSize: '10px' },
  delBtn: { background: 'rgba(102,0,0,0.5)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff6666', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, flexShrink: 0, padding: 0 },
  typing: { color: '#888', fontSize: 'clamp(9px,2vw,11px)', fontStyle: 'italic', padding: '2px 6px' },
  scrollDownBtn: { position: 'absolute', bottom: '55px', left: '50%', transform: 'translateX(-50%)', background: '#b30000', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '16px', cursor: 'pointer', fontSize: 'clamp(10px,2vw,12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10, whiteSpace: 'nowrap' },
  inputRow: { display: 'flex', gap: '5px', flexShrink: 0, alignItems: 'center', padding: '0 8px 8px' },
  input: { flex: 1, padding: 'clamp(8px,2vw,10px) clamp(10px,3vw,15px)', background: '#2a2a2a', border: '1px solid #444', borderRadius: '18px', color: '#fff', fontSize: 'clamp(13px,2.5vw,14px)', outline: 'none', minWidth: '0', boxSizing: 'border-box' },
  sendBtn: { background: '#b30000', color: '#fff', border: 'none', width: 'clamp(34px,8vw,42px)', height: 'clamp(34px,8vw,42px)', borderRadius: '50%', cursor: 'pointer', fontSize: 'clamp(15px,3vw,18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
};
