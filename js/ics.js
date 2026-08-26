/**
 * ics.js — Genera un evento di calendario per una prenotazione.
 *
 * Perché un file .ics invece delle notifiche push: spedire una notifica
 * richiede credenziali server, quindi una Cloud Function e il piano a
 * pagamento. Il calendario del socio fa la stessa cosa gratis — e la fa
 * meglio, perché funziona anche offline, non chiede permessi da concedere e
 * la gente il proprio calendario lo guarda già.
 *
 * Dentro il file c'è anche un promemoria (VALARM) a due ore dall'inizio, che
 * coincide con il termine per disdire: chi lo riceve è ancora in tempo.
 */

import { CANCEL_CUTOFF_HOURS } from './firebase/config.js';

/** Date → 20260826T093000Z, il formato che il calendario si aspetta. */
function toIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Le righe di un file .ics non possono superare i 75 ottetti: quelle più
 * lunghe vanno spezzate e continuate con uno spazio iniziale. Senza questo,
 * alcuni calendari scartano l'evento senza dire perché.
 */
function fold(line) {
  if (line.length <= 73) return line;
  const parts = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length > 72) {
    parts.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  parts.push(` ${rest}`);
  return parts.join('\r\n');
}

/** Punto e virgola, virgole e a capo hanno significato nel formato. */
function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * @param {Object} event
 * @param {string} event.uid       identificatore stabile: reimportare lo stesso
 *                                 evento lo aggiorna invece di duplicarlo
 * @param {Date}   event.start
 * @param {number} [event.minutes] durata, default 60
 * @param {string} event.title
 * @param {string} [event.description]
 * @param {string} [event.location]
 */
export function buildIcs(event) {
  const start = event.start;
  const end = new Date(start.getTime() + (event.minutes ?? 60) * 60000);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CrossFit Black Street//Prenotazioni//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@crossfitblackstreet`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    event.location ? `LOCATION:${escapeText(event.location)}` : null,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `TRIGGER:-PT${CANCEL_CUTOFF_HOURS}H`,
    `DESCRIPTION:${escapeText(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  // I calendari vogliono CRLF: con il solo \n alcuni client rifiutano il file.
  return lines.map(fold).join('\r\n');
}

/** Scarica il file. Su iOS l'apertura del calendario è automatica. */
export function downloadIcs(event, fileName = 'allenamento.ics') {
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
