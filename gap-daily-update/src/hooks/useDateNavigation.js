import { useState } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'America/Detroit';

function isWeekend(dateStr) {
  const day = parseISO(dateStr).getDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

// Step backward one or more days, skipping Sat/Sun
export function prevWeekday(dateStr) {
  let d = subDays(parseISO(dateStr), 1);
  while (d.getDay() === 0 || d.getDay() === 6) d = subDays(d, 1);
  return format(d, 'yyyy-MM-dd');
}

// Step forward one or more days, skipping Sat/Sun
export function nextWeekday(dateStr) {
  let d = addDays(parseISO(dateStr), 1);
  while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1);
  return format(d, 'yyyy-MM-dd');
}

// Returns today's date in Detroit time; if today is a weekend, returns the previous Friday
export function getTodayDate() {
  let dateStr = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
  while (isWeekend(dateStr)) dateStr = prevWeekday(dateStr);
  return dateStr;
}

export function useDateNavigation() {
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);

  const isReadOnly = selectedDate !== today;

  const goToPrevious = () => setSelectedDate(prevWeekday(selectedDate));

  const goToNext = () => {
    const next = nextWeekday(selectedDate);
    if (next <= today) setSelectedDate(next);
  };

  const canGoNext = nextWeekday(selectedDate) <= today;

  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');

  return {
    selectedDate,
    setSelectedDate,
    isReadOnly,
    goToPrevious,
    goToNext,
    canGoNext,
    today,
    displayDate,
  };
}
