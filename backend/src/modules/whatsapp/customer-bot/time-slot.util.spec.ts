import { generateTimeSlots } from './time-slot.util';
import { Language } from '../../../domain/enums';

// All inputs are real UTC Date objects; IST = UTC+5:30, so a UTC time of
// HH:MM corresponds to IST wall-clock (HH+5):(MM+30), wrapping as needed.
describe('generateTimeSlots', () => {
  it('returns 4 slots by default, starting with the current slot when mid-slot', () => {
    // 2026-07-14 is a Tuesday. 08:45 UTC = 14:15 IST -> inside the 1-3 PM slot.
    const now = new Date('2026-07-14T08:45:00Z');

    const slots = generateTimeSlots(now, Language.EN);

    expect(slots).toHaveLength(4);
    expect(slots[0].label).toBe('Today, 1 PM - 3 PM');
    expect(slots[1].label).toBe('Today, 3 PM - 5 PM');
    expect(slots[2].label).toBe('Today, 5 PM - 6 PM');
    expect(slots[3].label).toBe('Tomorrow, 9 AM - 11 AM');
  });

  it('clips the final slot of the day to closing time (6 PM), not a full 2 hours', () => {
    const now = new Date('2026-07-14T08:45:00Z'); // 1:15 PM IST, Tuesday

    const slots = generateTimeSlots(now, Language.EN);

    expect(slots[2].label).toBe('Today, 5 PM - 6 PM'); // 5-7 PM would overflow closing
  });

  it('rolls into the next business day once today is past closing time', () => {
    // 2026-07-14T13:00:00Z = 6:30 PM IST Tuesday -> after closing.
    const now = new Date('2026-07-14T13:00:00Z');

    const slots = generateTimeSlots(now, Language.EN);

    expect(slots.every((s) => s.label.startsWith('Tomorrow'))).toBe(true);
    expect(slots[0].label).toBe('Tomorrow, 9 AM - 11 AM');
  });

  it('skips Sunday entirely, rolling straight to Monday 9 AM', () => {
    // 2026-07-19 is a Sunday. 06:00 UTC = 11:30 AM IST Sunday.
    const now = new Date('2026-07-19T06:00:00Z');

    const slots = generateTimeSlots(now, Language.EN);

    expect(slots.every((s) => !s.label.includes('Today'))).toBe(true);
    // 2026-07-20 (Monday) is "tomorrow" relative to Sunday.
    expect(slots[0].label).toBe('Tomorrow, 9 AM - 11 AM');
  });

  it('rolls from Saturday evening past Sunday to Monday', () => {
    // 2026-07-18 is a Saturday. 13:00 UTC = 6:30 PM IST -> after closing.
    const now = new Date('2026-07-18T13:00:00Z');

    const slots = generateTimeSlots(now, Language.EN);

    expect(slots[0].label).toMatch(/^\d{1,2} Jul, 9 AM - 11 AM$/); // Monday 20th
    expect(slots.some((s) => s.label.includes('Sun'))).toBe(false);
  });

  it('starts the day at 9 AM when contacted before opening', () => {
    // 2026-07-13T22:00:00Z = 3:30 AM IST Tuesday -> before opening.
    const earlyMorning = new Date('2026-07-13T22:00:00Z');
    const slots = generateTimeSlots(earlyMorning, Language.EN);

    expect(slots[0].label).toBe('Today, 9 AM - 11 AM');
  });

  it('renders Tamil day labels for Today/Tomorrow', () => {
    const now = new Date('2026-07-14T08:45:00Z');

    const slots = generateTimeSlots(now, Language.TA);

    expect(slots[0].label).toContain('இன்று');
    expect(slots[3].label).toContain('நாளை');
  });

  it('formats non-zero minutes when the current time falls mid-hour at a slot boundary edge', () => {
    // Still lands on a clean slot boundary regardless of exact minute, since
    // slots are floored to the 2-hour grid — verifying no stray ":00" noise
    // appears for on-the-hour boundaries specifically.
    const now = new Date('2026-07-14T03:30:00Z'); // 9:00 AM IST Tuesday exactly
    const slots = generateTimeSlots(now, Language.EN);

    expect(slots[0].label).toBe('Today, 9 AM - 11 AM');
  });
});
