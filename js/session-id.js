/**
 * session-id.js — Identità delle sessioni di allenamento.
 *
 * Una sessione è una singola occorrenza di una classe del palinsesto:
 * "mercoledì 26 agosto 2026, ore 09.30, CF Class".
 *
 * L'ID è deterministico — `2026-08-26_0930_CF` — e non casuale. Serve a due
 * cose che sarebbero altrimenti complicate: rigenerare il calendario senza
 * creare doppioni, e capire a colpo d'occhio quale documento corrisponde a
 * quale slot guardando la console Firestore.
 *
 * Condiviso fra area soci e pannello admin: se le due parti calcolassero l'ID
 * in modo anche solo leggermente diverso, prenoterebbero sessioni fantasma.
 */

/** JS getDay(): 0=dom … 6=sab → id del giorno usato in data.js */
export const WEEKDAY_IDS = [null, 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

/** '09.30' → { h: 9, m: 30 } */
export function parseTime(time) {
  const [h, m] = time.split('.').map(Number);
  return { h, m: m || 0 };
}

/** Date → '2026-08-26' (ora locale, non UTC: conta il giorno del box) */
export function dateKey(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/**
 * @param {Date} date  giorno della sessione
 * @param {string} time  '09.30'
 * @param {'CF'|'HYROX'} type
 */
export function sessionId(date, time, type) {
  const { h, m } = parseTime(time);
  const p = (n) => String(n).padStart(2, '0');
  return `${dateKey(date)}_${p(h)}${p(m)}_${type}`;
}

/** Istante di inizio della sessione, nel fuso orario locale. */
export function sessionStart(date, time) {
  const { h, m } = parseTime(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
}

/** Mezzanotte di oggi, punto di partenza per generare o elencare. */
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Elenca le occorrenze del palinsesto in una finestra di giorni.
 * @param {Array} schedule  SCHEDULE di data.js
 * @param {number} days     quanti giorni a partire da oggi
 * @returns {Array<{id, date, time, type, startsAt}>} ordinate nel tempo
 */
export function expandSchedule(schedule, days) {
  const byDay = Object.fromEntries(schedule.map((d) => [d.id, d]));
  const out = [];
  const start = startOfToday();

  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const day = byDay[WEEKDAY_IDS[date.getDay()]];
    if (!day) continue; // domenica: box chiuso

    day.slots.forEach((slot) => {
      out.push({
        id: sessionId(date, slot.time, slot.type),
        date: new Date(date),
        time: slot.time,
        type: slot.type,
        startsAt: sessionStart(date, slot.time),
      });
    });
  }

  return out.sort((a, b) => a.startsAt - b.startsAt);
}

/**
 * Normalizza un valore temporale che arriva dal database.
 *
 * Firestore restituisce un Timestamp, ma lo stesso campo può presentarsi come
 * Date (scrittura locale non ancora confermata, o documento creato a mano
 * dalla console) o come stringa ISO. Filtrare via i casi imprevisti farebbe
 * sparire dall'interfaccia prenotazioni che invece esistono: meglio
 * normalizzare e mostrare.
 *
 * @returns {Date|null} null solo se il valore non è interpretabile
 */
export function asDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Esegue una funzione alla mezzanotte successiva, e poi ogni giorno.
 *
 * Le viste sono ancorate a `new Date()` al momento della sottoscrizione: una
 * pagina lasciata aperta la notte continuerebbe a mostrare le classi di ieri.
 * Al box il pannello resta aperto per ore, quindi la rotazione va fatta
 * accadere, non sperata.
 *
 * @returns {() => void} per fermare la ripetizione
 */
export function onMidnight(callback) {
  let timer = null;

  const schedule = () => {
    const next = new Date();
    next.setHours(24, 0, 5, 0); // cinque secondi dopo, per non anticipare il giorno
    timer = setTimeout(() => {
      callback();
      schedule();
    }, next.getTime() - Date.now());
  };

  schedule();
  return () => clearTimeout(timer);
}

/** Mezzanotte di N giorni fa. */
export function daysAgo(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}
