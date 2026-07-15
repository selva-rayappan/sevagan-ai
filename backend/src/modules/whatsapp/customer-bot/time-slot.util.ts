import { Language } from '../../../domain/enums';

export interface TimeSlot {
  label: string;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;
const SLOT_HOURS = 2;
const MS_PER_HOUR = 3_600_000;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * All arithmetic below runs in a virtual "IST-shifted" space: add the IST
 * offset to the real UTC timestamp, then read UTC getters off the result as
 * if they were IST wall-clock values. This keeps business-hours logic
 * correct regardless of the server's actual system timezone (our containers
 * run in UTC) without depending on an IANA timezone database being present.
 */
function toIstShifted(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

function atHour(shifted: Date, hour: number): Date {
  const d = new Date(shifted);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

function startOfNextDay(shifted: Date): Date {
  const d = new Date(shifted);
  d.setUTCDate(d.getUTCDate() + 1);
  return atHour(d, WORK_START_HOUR);
}

function isSameIstDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function formatTime(shifted: Date): string {
  let hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  const minuteStr = minute === 0 ? '' : `:${String(minute).padStart(2, '0')}`;
  return `${hour}${minuteStr} ${period}`;
}

function dayLabel(slotStart: Date, todayShifted: Date, language: Language): string {
  if (isSameIstDay(slotStart, todayShifted)) {
    return language === Language.TA ? 'இன்று' : 'Today';
  }
  const tomorrow = startOfNextDay(atHour(todayShifted, WORK_START_HOUR));
  if (isSameIstDay(slotStart, tomorrow)) {
    return language === Language.TA ? 'நாளை' : 'Tomorrow';
  }
  return `${slotStart.getUTCDate()} ${MONTH_NAMES[slotStart.getUTCMonth()]}`;
}

/**
 * Generates upcoming 2-hour appointment slots within business hours
 * (9 AM-6 PM, Monday-Saturday), starting from the current time and rolling
 * into the next working day(s) as needed. The final slot of a day is
 * clipped to closing time rather than overflowing past it.
 */
export function generateTimeSlots(now: Date, language: Language, count = 4): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const nowShifted = toIstShifted(now);
  let cursor = new Date(nowShifted);

  // Safety bound: business-hours grid across at most 3 weeks of calendar days.
  for (let guard = 0; guard < 21 && slots.length < count; guard++) {
    const dayOfWeek = cursor.getUTCDay(); // 0 = Sunday
    if (dayOfWeek === 0) {
      cursor = startOfNextDay(cursor);
      continue;
    }

    const dayEnd = atHour(cursor, WORK_END_HOUR);
    if (cursor >= dayEnd) {
      cursor = startOfNextDay(cursor);
      continue;
    }

    const dayStart = atHour(cursor, WORK_START_HOUR);
    if (cursor < dayStart) cursor = dayStart;

    const elapsedHours = (cursor.getTime() - dayStart.getTime()) / MS_PER_HOUR;
    const slotIndex = Math.floor(elapsedHours / SLOT_HOURS);
    const slotStart = new Date(dayStart.getTime() + slotIndex * SLOT_HOURS * MS_PER_HOUR);

    if (slotStart >= dayEnd) {
      cursor = startOfNextDay(cursor);
      continue;
    }

    const slotEnd = new Date(Math.min(slotStart.getTime() + SLOT_HOURS * MS_PER_HOUR, dayEnd.getTime()));

    slots.push({
      label: `${dayLabel(slotStart, nowShifted, language)}, ${formatTime(slotStart)} - ${formatTime(slotEnd)}`,
    });
    cursor = slotEnd;
  }

  return slots;
}
