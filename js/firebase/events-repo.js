/**
 * events-repo.js — Sorgente degli eventi per il sito pubblico.
 *
 * Strategia: Firestore quando è configurato e risponde, `js/data.js` in tutti
 * gli altri casi (config vuota, rete assente, permessi, collection vuota).
 * La bacheca non resta mai vuota per un problema di backend.
 */

import { EVENTS } from '../data.js';
import { COLLECTIONS, isConfigured } from './config.js';
import { runQuery } from './rest.js';

/** Documento Firestore → oggetto evento nella forma usata da events.js */
function toEvent(doc) {
  return {
    id: doc.id,
    title: doc.title || 'Evento',
    badge: doc.badge || '',
    date: doc.date || '',
    time: doc.time || '',
    description: doc.description || '',
    workout: Array.isArray(doc.workout) ? doc.workout : [],
    info: doc.info || '',
    featured: Boolean(doc.featured),
    sortIndex: typeof doc.sortIndex === 'number' ? doc.sortIndex : 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : null,
  };
}

/** In evidenza prima, poi per sortIndex crescente, poi per data di creazione. */
function byPriority(a, b) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
  return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
}

/**
 * @returns {Promise<{events: Array, source: 'remote'|'local'}>}
 */
export async function loadEvents() {
  if (!isConfigured()) return { events: EVENTS, source: 'local' };

  try {
    // L'ordinamento è lato client: un `orderBy` combinato con il filtro di
    // uguaglianza richiederebbe un indice composto da creare a mano, e per
    // una manciata di eventi non vale la complessità in più.
    const docs = await runQuery(COLLECTIONS.events, {
      equals: { field: 'published', value: true },
      limit: 50,
    });

    if (!docs.length) return { events: EVENTS, source: 'local' };

    return { events: docs.map(toEvent).sort(byPriority), source: 'remote' };
  } catch (error) {
    console.warn('[events] lettura da Firestore non riuscita, uso i dati locali:', error.message);
    return { events: EVENTS, source: 'local' };
  }
}
