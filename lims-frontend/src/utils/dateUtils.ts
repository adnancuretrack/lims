import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
/**
 * Formats a date string or timestamp into DD/MM/YYYY format.
 * Returns '-' if value is null or undefined.
 * Preserves pre-formatted DD/MM/YYYY strings to avoid double offset parsing.
 */
export const formatDate = (dateValue: any): string => {
  if (!dateValue) return '-';
  const str = String(dateValue).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    return str.split(' ')[0];
  }
  const d = dayjs(dateValue);
  return d.isValid() ? d.format('DD/MM/YYYY') : str;
};

/**
 * Formats a date-time string or timestamp into DD/MM/YYYY HH:mm (24-hour) format.
 * Returns '-' if value is null or undefined.
 * Preserves pre-formatted DD/MM/YYYY HH:mm strings to avoid double offset parsing.
 */
export const formatDateTime = (dateValue: any): string => {
  console.log('[formatDateTime] Raw input:', dateValue);
  if (!dateValue) return '-';
  // const str = String(dateValue).trim();
  // if (/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}/.test(str)) {
  //   return str;
  // }
  // const d = dayjs.utc ? dayjs.utc(dateValue).local() : dayjs(dateValue);
  const inputFormat = 'DD/MM/YYYY HH:mm';
  const d = dayjs.utc
    ? dayjs.utc(dateValue, inputFormat).local()
    : dayjs(dateValue, inputFormat);
  console.log('[formatDateTime] Formated output:', d);
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : "failed";
};
