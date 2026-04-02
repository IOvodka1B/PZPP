import { fromZonedTime, toZonedTime, format } from "date-fns-tz";

/**
  Konwertuje lokalną datę użytkownika do UTC.
 */
export function toUTC(localDate, timeZone) {
  return fromZonedTime(localDate, timeZone);
}

/**
 * Konwertuje datę UTC z bazy na format lokalny użytkownika.
 * Pozwala na inteligentny wybór strefy czasowej w UI.
 */
export function toLocalTime(
  utcDate,
  timeZone,
  formatString = "yyyy-MM-dd HH:mm"
) {
  const zonedDate = toZonedTime(utcDate, timeZone);
  return format(zonedDate, formatString, { timeZone });
}
