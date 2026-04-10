const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_PLATFORMS = ["meta", "google"];
const VALID_STATUSES = ["active", "paused", "completed"];
const MAX_DATE_RANGE_DAYS = 365;

export function isValidDate(str: string): boolean {
  if (!DATE_REGEX.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

export function isValidPlatform(str: string): boolean {
  return VALID_PLATFORMS.includes(str);
}

export function isValidStatus(str: string): boolean {
  return VALID_STATUSES.includes(str);
}

export function isDateRangeValid(start: string, end: string): boolean {
  const s = new Date(start);
  const e = new Date(end);
  if (s > e) return false;
  const diffDays = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= MAX_DATE_RANGE_DAYS;
}
