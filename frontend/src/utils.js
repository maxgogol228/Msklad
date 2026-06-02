// src/utils.js

// Рабочее время (МСК: UTC+3)
const WORK_START_1 = { hours: 9, minutes: 30 };
const WORK_END_1 = { hours: 14, minutes: 0 };
const WORK_START_2 = { hours: 14, minutes: 30 };
const WORK_END_2 = { hours: 18, minutes: 0 };
const MSK_OFFSET = 3;

function getMskTime(date) {
  const d = new Date(date || Date.now());
  return new Date(d.getTime() + MSK_OFFSET * 3600000);
}

export function isWorkingTime(date) {
  const d = date ? new Date(date) : getMskTime();
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;

  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const start1 = WORK_START_1.hours * 60 + WORK_START_1.minutes;
  const end1 = WORK_END_1.hours * 60 + WORK_END_1.minutes;
  const start2 = WORK_START_2.hours * 60 + WORK_START_2.minutes;
  const end2 = WORK_END_2.hours * 60 + WORK_END_2.minutes;

  return (
    (timeInMinutes >= start1 && timeInMinutes < end1) ||
    (timeInMinutes >= start2 && timeInMinutes < end2)
  );
}

export function formatTime(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const totalMin = parseInt(minutes) || 0;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}ч ${m}м`;
  if (h > 0) return `${h}ч`;
  return `${m}м`;
}

export function formatTimeLong(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const totalMin = parseInt(minutes) || 0;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h} ч ${m} мин`;
  if (h > 0) return `${h} ч`;
  return `${m} мин`;
}

export function getTimeLeft(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;

  // Если нерабочее время и дедлайн ещё не наступил — заморозка таймера
  if (!isWorkingTime(now) && diff > 0) {
    const totalMin = Math.floor(diff / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return {
      text: h > 0 ? `${h}ч ${m}м` : `${m}м`,
      color: '#4CAF50',
      overdue: false,
      frozen: true
    };
  }

  // Просрочено в рабочее время
  if (diff <= 0 && isWorkingTime(now)) {
    return { text: 'ПРОСРОЧЕНО!', color: '#ff4444', overdue: true };
  }

  // Просрочено, но сейчас нерабочее время
  if (diff <= 0 && !isWorkingTime(now)) {
    return { text: 'Ожидание', color: '#ffaa44', overdue: true };
  }

  // Обычный отсчёт
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  let text = h > 0 ? `${h}ч ${m}м` : `${m}м`;
  let color = totalMin < 30 ? '#ff4444' : totalMin < 60 ? '#ffaa44' : '#4CAF50';

  return { text, color, overdue: false, totalMinutes: totalMin };
}
