import React, { useEffect, useState, useRef } from "react";
import API from "../api";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadUsers();
    loadLogs();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(res.data || []);
    } catch (e) {
      console.error("Error loading users:", e);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await API.get("/logs");
      setLogs(res.data || []);
    } catch (e) {
      console.error("Error loading logs:", e);
    }
  };

  const approveUser = async (id) => {
    try {
      await API.post(`/users/approve/${id}`);
      setMessage("Пользователь подтверждён");
      loadUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      alert("Ошибка подтверждения пользователя");
    }
  };

  const makeAdmin = async (id) => {
    try {
      await API.post(`/users/make-admin/${id}`);
      setMessage("Права администратора выданы");
      loadUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      alert("Ошибка выдачи прав администратора");
    }
  };

  const removeAdmin = async (id) => {
    try {
      await API.post(`/users/remove-admin/${id}`);
      setMessage("Права администратора сняты");
      loadUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      alert("Ошибка снятия прав администратора");
    }
  };

  const removeUser = async (id) => {
    if (!confirm("Удалить пользователя? Это действие нельзя отменить!")) return;
    
    try {
      await API.delete(`/users/${id}`);
      setMessage("Пользователь удалён");
      loadUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      alert("Ошибка удаления пользователя");
    }
  };

  // Экспорт резервной копии
  const exportBackup = async () => {
    try {
      setLoading(true);
      const response = await API.get("/backup/export", {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setMessage("Резервная копия скачана");
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      console.error("Export error:", e);
      alert("Ошибка создания резервной копии");
    } finally {
      setLoading(false);
    }
  };

  // Импорт резервной копии
  const importBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("Восстановить базу данных из файла? Все текущие данные будут заменены!")) {
      event.target.value = '';
      return;
    }

    try {
      setLoading(true);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);
          await API.post("/backup/import", backupData);
          setMessage("База данных успешно восстановлена!");
          loadUsers();
          loadLogs();
          setTimeout(() => setMessage(""), 5000);
        } catch (error) {
          console.error("Import error:", error);
          alert("Ошибка восстановления: " + (error.response?.data?.error || error.message));
        } finally {
          setLoading(false);
        }
      };
      
      reader.readAsText(file);
    } catch (e) {
      console.error("File read error:", e);
      alert("Ошибка чтения файла");
      setLoading(false);
    }
    
    event.target.value = '';
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>⚙️ Админ панель</h2>

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      {loading && (
        <div style={styles.loading}>
          Выполняется операция...
        </div>
      )}

      {/* Вкладки */}
      <div style={styles.tabs}>
        <button 
          onClick={() => setActiveTab('users')}
          style={{
            ...styles.tab,
            background: activeTab === 'users' ? '#b30000' : '#333'
          }}
        >
          👥 Пользователи ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          style={{
            ...styles.tab,
            background: activeTab === 'logs' ? '#b30000' : '#333'
          }}
        >
          📋 Логи ({logs.length})
        </button>
        <button 
          onClick={() => setActiveTab('backup')}
          style={{
            ...styles.tab,
            background: activeTab === 'backup' ? '#b30000' : '#333'
          }}
        >
          💾 Резервное копирование
        </button>
      </div>

      {/* Таблица пользователей */}
      {activeTab === 'users' && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Логин</th>
                <th style={styles.th}>Статус</th>
                <th style={styles.th}>Админ</th>
                <th style={styles.th}>Дата регистрации</th>
                <th style={styles.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyMessage}>
                    Нет зарегистрированных пользователей
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>{user.id}</td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 'bold' }}>{user.login}</span>
                      {user.id === 1 && (
                        <span style={styles.badge}>Основатель</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {user.approved ? (
                        <span style={styles.statusApproved}>✓ Подтверждён</span>
                      ) : (
                        <span style={styles.statusPending}>⏳ Ожидает</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {user.is_admin ? (
                        <span style={styles.adminBadge}>Админ</span>
                      ) : (
                        <span style={styles.userBadge}>Пользователь</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, color: '#888', fontSize: '13px' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleString('ru-RU') : '—'}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        {!user.approved && (
                          <button 
                            onClick={() => approveUser(user.id)}
                            style={styles.approveButton}
                            title="Подтвердить"
                          >
                            ✓
                          </button>
                        )}
                        
                        {user.approved && !user.is_admin && user.id !== 1 && (
                          <button 
                            onClick={() => makeAdmin(user.id)}
                            style={styles.makeAdminButton}
                            title="Сделать админом"
                          >
                            ⬆
                          </button>
                        )}
                        
                        {user.is_admin && user.id !== 1 && (
                          <button 
                            onClick={() => removeAdmin(user.id)}
                            style={styles.removeAdminButton}
                            title="Снять админа"
                          >
                            ⬇
                          </button>
                        )}
                        
                        {user.id !== 1 && (
                          <button 
                            onClick={() => removeUser(user.id)}
                            style={styles.deleteButton}
                            title="Удалить пользователя"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Логи */}
      {activeTab === 'logs' && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '50px' }}>ID</th>
                <th style={styles.th}>Действие</th>
                <th style={{ ...styles.th, width: '200px' }}>Дата</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} style={styles.emptyMessage}>
                    Логи пусты
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={styles.tr}>
                    <td style={{ ...styles.td, color: '#888' }}>{log.id}</td>
                    <td style={styles.td}>{log.action}</td>
                    <td style={{ ...styles.td, color: '#888', fontSize: '13px' }}>
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Резервное копирование */}
      {activeTab === 'backup' && (
        <div style={styles.backupSection}>
          <div style={styles.backupCard}>
            <h3 style={styles.backupTitle}>📥 Скачать резервную копию</h3>
            <p style={styles.backupDescription}>
              Скачайте полную копию базы данных для переноса на другой сервер или создания резервной копии.
            </p>
            <button 
              onClick={exportBackup}
              style={styles.backupButton}
              disabled={loading}
            >
              💾 Скачать backup
            </button>
          </div>

          <div style={styles.backupCard}>
            <h3 style={styles.backupTitle}>📤 Восстановить из резервной копии</h3>
            <p style={styles.backupDescription}>
              Загрузите ранее сохранённый файл резервной копии для восстановления всех данных.
            </p>
            <div style={styles.warningBox}>
              ⚠️ Внимание! Все текущие данные будут заменены данными из файла резервной копии!
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importBackup}
              style={{ display: 'none' }}
              id="backup-file-input"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={styles.restoreButton}
              disabled={loading}
            >
              📂 Выбрать файл и восстановить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    height: '100%',
    color: '#fff'
  },
  title: {
    color: '#fff',
    margin: '0 0 20px 0',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  message: {
    background: 'rgba(0, 255, 0, 0.1)',
    border: '1px solid rgba(0, 255, 0, 0.3)',
    color: '#44ff44',
    padding: '12px 15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  loading: {
    background: 'rgba(255, 255, 0, 0.1)',
    border: '1px solid rgba(255, 255, 0, 0.3)',
    color: '#ffff44',
    padding: '12px 15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  tab: {
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.3s'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #444'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#2a2a2a',
    minWidth: '800px'
  },
  th: {
    background: '#333',
    color: '#fff',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #b30000',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  tr: {
    borderBottom: '1px solid #3a3a3a',
    transition: 'background 0.2s'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #3a3a3a',
    color: '#fff',
    fontSize: '14px'
  },
  badge: {
    background: '#b30000',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    marginLeft: '8px',
    fontWeight: 'normal'
  },
  statusApproved: {
    color: '#44ff44',
    background: 'rgba(0, 255, 0, 0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px'
  },
  statusPending: {
    color: '#ffaa44',
    background: 'rgba(255, 170, 68, 0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px'
  },
  adminBadge: {
    color: '#ff4444',
    background: 'rgba(255, 0, 0, 0.15)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  userBadge: {
    color: '#aaa',
    background: 'rgba(170, 170, 170, 0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px'
  },
  actionButtons: {
    display: 'flex',
    gap: '6px'
  },
  approveButton: {
    background: '#006600',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  makeAdminButton: {
    background: '#0066aa',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  removeAdminButton: {
    background: '#aa6600',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteButton: {
    background: '#660000',
    color: '#ff6666',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyMessage: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px'
  },
  backupSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px'
  },
  backupCard: {
    background: '#2a2a2a',
    borderRadius: '8px',
    padding: '25px',
    border: '1px solid #444'
  },
  backupTitle: {
    color: '#fff',
    margin: '0 0 15px 0',
    fontSize: '18px'
  },
  backupDescription: {
    color: '#aaa',
    fontSize: '14px',
    marginBottom: '15px',
    lineHeight: '1.5'
  },
  warningBox: {
    background: 'rgba(255, 0, 0, 0.1)',
    border: '1px solid rgba(255, 0, 0, 0.3)',
    color: '#ff6666',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '15px',
    fontSize: '13px'
  },
  backupButton: {
    background: '#006600',
    color: '#fff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%'
  },
  restoreButton: {
    background: '#aa6600',
    color: '#fff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%'
  }
};
