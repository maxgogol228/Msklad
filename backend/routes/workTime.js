const WORK_START_1 = { hours: 9, minutes: 30 };
const WORK_END_1 = { hours: 14, minutes: 0 };
const WORK_START_2 = { hours: 14, minutes: 30 };
const WORK_END_2 = { hours: 18, minutes: 0 };
const MSK_OFFSET = 3;

function getMskTime(date) {
  const d = new Date(date || Date.now());
  return new Date(d.getTime() + MSK_OFFSET * 3600000);
}

function isWorkingTime(date) {
  const d = date || getMskTime();
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  const start1 = WORK_START_1.hours * 60 + WORK_START_1.minutes;
  const end1 = WORK_END_1.hours * 60 + WORK_END_1.minutes;
  const start2 = WORK_START_2.hours * 60 + WORK_START_2.minutes;
  const end2 = WORK_END_2.hours * 60 + WORK_END_2.minutes;
  
  return (timeInMinutes >= start1 && timeInMinutes < end1) ||
         (timeInMinutes >= start2 && timeInMinutes < end2);
}

function getNextWorkingTime(fromDate) {
  const d = new Date(fromDate || getMskTime());
  d.setUTCSeconds(0, 0);
  
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(WORK_START_1.hours, WORK_START_1.minutes, 0, 0);
  }
  
  const timeInMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const start1 = WORK_START_1.hours * 60 + WORK_START_1.minutes;
  const end1 = WORK_END_1.hours * 60 + WORK_END_1.minutes;
  const start2 = WORK_START_2.hours * 60 + WORK_START_2.minutes;
  const end2 = WORK_END_2.hours * 60 + WORK_END_2.minutes;
  
  if (timeInMinutes < start1) { d.setUTCHours(WORK_START_1.hours, WORK_START_1.minutes, 0, 0); return d; }
  if (timeInMinutes >= start1 && timeInMinutes < end1) { return d; }
  if (timeInMinutes >= end1 && timeInMinutes < start2) { d.setUTCHours(WORK_START_2.hours, WORK_START_2.minutes, 0, 0); return d; }
  if (timeInMinutes >= start2 && timeInMinutes < end2) { return d; }
  
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(WORK_START_1.hours, WORK_START_1.minutes, 0, 0);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) { d.setUTCDate(d.getUTCDate() + 1); }
  return d;
}

function calculateWorkingDeadline(startDate, estimatedMinutes) {
  let remaining = estimatedMinutes;
  let current = new Date(startDate);
  
  while (remaining > 0) {
    if (!isWorkingTime(current)) { current = getNextWorkingTime(current); continue; }
    
    const hours = current.getUTCHours();
    const minutes = current.getUTCMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    const start1 = WORK_START_1.hours * 60 + WORK_START_1.minutes;
    const end1 = WORK_END_1.hours * 60 + WORK_END_1.minutes;
    const start2 = WORK_START_2.hours * 60 + WORK_START_2.minutes;
    const end2 = WORK_END_2.hours * 60 + WORK_END_2.minutes;
    
    let minutesUntilBreak;
    if (timeInMinutes >= start1 && timeInMinutes < end1) {
      minutesUntilBreak = end1 - timeInMinutes;
    } else if (timeInMinutes >= start2 && timeInMinutes < end2) {
      minutesUntilBreak = end2 - timeInMinutes;
    } else {
      current = getNextWorkingTime(current);
      continue;
    }
    
    if (remaining <= minutesUntilBreak) {
      current.setUTCMinutes(current.getUTCMinutes() + remaining);
      return current;
    }
    
    remaining -= minutesUntilBreak;
    current.setUTCMinutes(current.getUTCMinutes() + minutesUntilBreak);
    current = getNextWorkingTime(current);
  }
  
  return current;
}

function extendDeadline(currentDeadline, addedMinutes) {
  if (!currentDeadline) return calculateWorkingDeadline(new Date(), addedMinutes);
  const deadline = new Date(currentDeadline);
  if (!isWorkingTime(deadline)) {
    return calculateWorkingDeadline(getNextWorkingTime(deadline), addedMinutes);
  }
  return calculateWorkingDeadline(deadline, addedMinutes);
}

module.exports = { isWorkingTime, getNextWorkingTime, calculateWorkingDeadline, extendDeadline, getMskTime };
