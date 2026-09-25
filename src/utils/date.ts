const pad = (value: number) => String(value).padStart(2, '0');

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayKey() {
  return toDateKey(new Date());
}

export function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function addDaysKey(amount: number) {
  return toDateKey(addDays(new Date(), amount));
}

export function addDaysToKey(key: string, amount: number) {
  return toDateKey(addDays(fromDateKey(key), amount));
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = fromDateKey(value);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value;
}

export function formatLongDate(key: string) {
  return fromDateKey(key).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(key: string) {
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === addDaysKey(1)) return 'Tomorrow';
  return fromDateKey(key).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(time: string) {
  if (!time) return 'All day';
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export type TimePeriod = 'AM' | 'PM';

export function to12HourParts(time: string): { text: string; period: TimePeriod } {
  if (!time) return { text: '', period: 'PM' };
  const [hour, minute] = time.split(':').map(Number);
  const period: TimePeriod = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return { text: `${displayHour}:${pad(minute || 0)}`, period };
}

export function parse12HourTime(value: string, period: TimePeriod) {
  const match = value.trim().match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?$/);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (period === 'PM') hour += 12;
  return `${pad(hour)}:${match[2] ?? '00'}`;
}

export function weekdayForKey(key: string) {
  return fromDateKey(key).getDay();
}

export function monthTitle(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function buildMonthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function changeMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function daysUntil(key: string) {
  const start = fromDateKey(todayKey()).getTime();
  const target = fromDateKey(key).getTime();
  return Math.round((target - start) / 86400000);
}

export function sortEventDateTime<T extends { date: string; time: string }>(a: T, b: T) {
  return `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`);
}
