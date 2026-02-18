import { useState } from 'react';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'America/Detroit';

export function getTodayDate() {
  return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

export function useDateNavigation() {
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);

  const isReadOnly = selectedDate !== today;

  const goToPrevious = () => {
    const prev = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(prev);
  };

  const goToNext = () => {
    const next = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    // Don't navigate beyond today
    if (next <= today) {
      setSelectedDate(next);
    }
  };

  const canGoNext = selectedDate < today;

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
