import React, { useEffect, useState, useRef } from "react";
import API from "../api";

export default function GanttPage() {
  const [ganttData, setGanttData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadUser();
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Автоскролл к сегодняшней дате после загрузки
  useEffect(() => {
    if (!loading && ganttData.length > 0) {
      setTimeout(() => {
        if (scrollRef.current) {
          const todayEl = scrollRef.current.querySelector('[data-today="true"]');
          if (todayEl) {
            todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        }
      }, 300);
    }
  }, [loading, ganttData]);

  const loadUser = async () => {
    try {
      const res = await API.get("/auth/check-session");
      setCurrentUser(res.data.user);
    } catch (e) {}
  };

  const loadData = async () => {
    try {
      const res = await API.get("/tasks/gantt-data");
      // Показываем ВСЕ завершенные задачи (не фильтруем по времени)
      const completed = (res.data || []).filter(t => t.status === 'completed');
      setGanttData(completed);
    } catch (e) {} finally { setLoading(false); }
  };

  const isSuperAdmin = currentUser?.login?.toLowerCase() === 'admin';

  const removeTaskFromGantt = async (taskId, taskType) => {
    if (!isSuperAdmin) { alert("Только супер-админ может удалять отметки"); return; }
    if (!confirm("Удалить отметку о выполнении?")) return;
    try {
      if (taskType === 'routine') {
        await API.put(`/tasks/routine/${taskId}`, { status: 'in_progress' });
      }
      loadData();
    } catch (e) { alert("Ошибка"); }
  };

  if (loading) return <div style={st.container}><h2 style={st.title}>📊 Диаграмма Ганта</h2><div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Загрузка...</div></div>;

  if (!ganttData || ganttData.length === 0) {
    return (
      <div style={st.container}>
        <h2 style={st.title}>📊 Диаграмма Ганта</h2>
        <div style={st.emptyChart}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
          <p>Нет выполненных задач</p>
        </div>
      </div>
    );
  }

  // Определяем диапазон дат на основе ВСЕХ задач
  const allDates = [];
  ganttData.forEach(t => {
    if (t.start_date) allDates.push(new Date(t.start_date));
    if (t.completed_at) allDates.push(new Date(t.completed_at));
    if (t.created_at) allDates.push(new Date(t.created_at));
  });

  // Расширяем до полных лет
  const minYear = Math.min(...allDates.map(d => d.getFullYear()));
  const maxYear = Math.max(...allDates.map(d => d.getFullYear()), new Date().getFullYear());
  
  const rangeStart = new Date(minYear, 0, 1);
  const rangeEnd = new Date(maxYear, 11, 31);

  // Генерируем ВСЕ дни диапазона
  const allDays = [];
  const cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    allDays.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const cellW = 20;
  const taskColW = 220;
  const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

  // Группировка по месяцам
  const monthGroups = [];
  let cm = -1, cs = 0;
  allDays.forEach((d, i) => {
    if (d.getMonth() !== cm || d.getFullYear() !== (cm >= 0 ? allDays[cs].getFullYear() : 0)) {
      if (cm >= 0) monthGroups.push({ start: cs, end: i-1, label: months[cm] + ' ' + allDays[cs].getFullYear() });
      cm = d.getMonth(); cs = i;
    }
  });
  monthGroups.push({ start: cs, end: allDays.length-1, label: months[cm] + ' ' + allDays[cs].getFullYear() });

  const isDayFilled = (task, di) => {
    if (task.status !== 'completed') return false;
    const start = task.start_date ? new Date(task.start_date) : new Date(task.created_at);
    const end = task.completed_at ? new Date(task.completed_at) : new Date();
    const checkDate = allDays[di];
    if (!checkDate) return false;
    return checkDate >= start && checkDate <= end;
  };

  return (
    <div style={st.container}>
      <h2 style={st.title}>📊 Диаграмма Ганта</h2>
      
      <div style={st.legend}>
        <span style={st.legendItem}><span style={{...st.legendDot,background:'#4CAF50'}}/> Выполненные задачи</span>
        <span style={{fontSize:'11px',color:'#666',marginLeft:'20px'}}>📅 Диапазон: {rangeStart.toLocaleDateString('ru-RU')} – {rangeEnd.toLocaleDateString('ru-RU')}</span>
        {isSuperAdmin && <span style={{fontSize:'11px',color:'#888',marginLeft:'20px'}}>🔧 ✕ = удалить отметку</span>}
      </div>

      <div style={st.chartScroll} ref={scrollRef}>
        <div style={{ minWidth: allDays.length * cellW + taskColW + 30 }}>
          
          {/* Строка месяцев */}
          <div style={st.chartRow}>
            <div style={{...st.chartTaskCol, width: taskColW, fontWeight: 'bold', color: '#fff', fontSize: '11px', position: 'sticky', left: 0, background: '#1a1a1a', zIndex: 2 }}>
              Задача / Месяц
            </div>
            {monthGroups.map((mg, i) => (
              <div key={i} style={{
                ...st.chartHeaderCell,
                width: (mg.end - mg.start + 1) * cellW,
                borderRight: '2px solid #555',
                fontWeight: 'bold',
                color: '#ddd',
                fontSize: '10px'
              }}>
                {mg.label}
              </div>
            ))}
          </div>

          {/* Строка дней недели */}
          <div style={st.chartRow}>
            <div style={{...st.chartTaskCol, width: taskColW, fontSize: '9px', color: '#aaa', position: 'sticky', left: 0, background: '#1a1a1a', zIndex: 2 }}>
              День
            </div>
            {allDays.map((d, i) => {
              const we = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} style={{...st.chartDayCell, width: cellW, background: we ? 'rgba(255,255,255,0.02)' : 'transparent', color: we ? '#555' : '#aaa', fontSize: '7px' }}>
                  {dayNames[d.getDay()]}
                </div>
              );
            })}
          </div>

          {/* Строка чисел */}
          <div style={st.chartRow}>
            <div style={{...st.chartTaskCol, width: taskColW, fontSize: '9px', color: '#aaa', position: 'sticky', left: 0, background: '#1a1a1a', zIndex: 2 }}>
              Число
            </div>
            {allDays.map((d, i) => {
              const we = d.getDay() === 0 || d.getDay() === 6;
              const today = new Date().toDateString() === d.toDateString();
              return (
                <div key={i} data-today={today ? "true" : "false"} style={{
                  ...st.chartDayCell, width: cellW,
                  background: today ? 'rgba(179,0,0,0.4)' : we ? 'rgba(255,255,255,0.01)' : 'transparent',
                  color: today ? '#fff' : we ? '#666' : '#ccc',
                  fontSize: '8px', fontWeight: today ? 'bold' : 'normal'
                }}>
                  {d.getDate()}
                </div>
              );
            })}
          </div>

          {/* Полосы задач */}
          {ganttData.map((task, ti) => (
            <div key={task.id} style={{...st.chartTaskRow, background: ti%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
              <div style={{...st.chartTaskCol, width: taskColW, display:'flex',alignItems:'center',gap:'4px',fontSize:'10px', position: 'sticky', left: 0, background: ti%2===0?'#1a1a1a':'#1c1c1c', zIndex: 1}}>
                <span>{task.task_type==='routine'?'📝':'🔧'}</span>
                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#fff'}}>{task.name}</span>
                {isSuperAdmin && (
                  <button onClick={()=>removeTaskFromGantt(task.id, task.task_type)} 
                    style={{background:'none',border:'none',color:'#ff6666',cursor:'pointer',fontSize:'10px',padding:'1px 4px',opacity:0.5}}
                    title="Удалить отметку">✕</button>
                )}
              </div>
              {allDays.map((d, di) => {
                const filled = isDayFilled(task, di);
                const we = d.getDay()===0||d.getDay()===6;
                return (
                  <div key={di} style={{
                    width: cellW, height: '20px',
                    borderRight: '1px solid #222',
                    background: filled ? '#4CAF50' : we ? 'rgba(255,255,255,0.01)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {filled && <span style={{fontSize:'7px',color:'#fff'}}>✓</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const st = {
  container: { padding: '20px', height: '100%', color: '#fff', overflow: 'auto' },
  title: { margin: '0 0 20px', fontSize: '22px', fontWeight: 'bold' },
  legend: { display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#aaa' },
  legendDot: { width: '10px', height: '10px', borderRadius: '2px', display: 'inline-block' },
  emptyChart: { textAlign: 'center', padding: '60px', color: '#888' },
  chartScroll: { overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' },
  chartRow: { display: 'flex', borderBottom: '1px solid #333', minHeight: '22px', alignItems: 'center' },
  chartTaskRow: { display: 'flex', borderBottom: '1px solid #2a2a2a', minHeight: '26px', alignItems: 'center' },
  chartTaskCol: { padding: '3px 8px', borderRight: '2px solid #444', flexShrink: 0 },
  chartHeaderCell: { padding: '3px 5px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chartDayCell: { textAlign: 'center', padding: '1px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
};
