const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function parseHm(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatTimeLabel(time: string) {
  const hm = parseHm(time);
  if (!hm) return time;
  const period = hm.hour >= 12 ? "PM" : "AM";
  const hour = hm.hour % 12 || 12;
  return `${hour}:${String(hm.minute).padStart(2, "0")} ${period}`;
}

function zonedParts(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = WEEKDAY_TO_INDEX[get("weekday")] ?? 0;
  return {
    weekday,
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function zoneOffsetMinutes(at: Date, timeZone: string) {
  const p = zonedParts(at, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - at.getTime()) / 60000);
}

function zonedDate(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = zoneOffsetMinutes(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset * 60000);
}

export type NextMeeting = {
  startsAtMs: number;
  minutesUntil: number;
  live: boolean;
};

const LIVE_GRACE_MIN = 45;

export function nextMeetingTiming(
  day: number,
  time: string,
  nowMs: number,
  timeZone: string,
  durationMin = 60,
): NextMeeting | null {
  if (day < 0 || day > 6) return null;
  const hm = parseHm(time);
  if (!hm) return null;
  const now = new Date(nowMs);
  const parts = zonedParts(now, timeZone);
  let addDays = day - parts.weekday;
  const startedToday =
    addDays === 0 &&
    (hm.hour < parts.hour || (hm.hour === parts.hour && hm.minute <= parts.minute));
  const elapsed = startedToday ? (parts.hour - hm.hour) * 60 + (parts.minute - hm.minute) : 0;
  const live = startedToday && elapsed < Math.max(durationMin, LIVE_GRACE_MIN);
  if (addDays < 0 || (startedToday && !live)) addDays += 7;
  if (live) addDays = 0;
  const start = zonedDate(timeZone, parts.year, parts.month, parts.day + addDays, hm.hour, hm.minute);
  const minutesUntil = Math.round((start.getTime() - nowMs) / 60000);
  return {
    startsAtMs: start.getTime(),
    minutesUntil,
    live: live || (minutesUntil <= 0 && minutesUntil > -durationMin),
  };
}

export function dayName(day: number) {
  return DAY_NAMES[day] ?? WEEKDAYS[day] ?? "";
}
