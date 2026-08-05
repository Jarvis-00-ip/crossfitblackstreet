/**
 * events.js — Card riutilizzabile per la bacheca eventi.
 */

import { el, icon } from './dom.js';
import { EVENTS, whatsappLink } from './data.js';

/**
 * Costruisce una singola card evento.
 * @param {Object} event
 */
export function eventCard(event) {
  return el('article', { class: `event-card reveal${event.featured ? ' featured' : ''}` }, [
    event.badge ? el('span', { class: 'event-badge', text: event.badge }) : null,
    el('h3', { text: event.title }),

    el('div', { class: 'event-meta' }, [
      el('span', {}, [icon('calendar'), el('span', { text: event.date })]),
      el('span', {}, [icon('clock'), el('span', { text: event.time })]),
    ]),

    el('p', { text: event.description }),

    event.workout?.length
      ? el('div', { class: 'wod-box' }, [
          el('h4', { text: 'IL WORKOUT' }),
          el('ul', { class: 'wod-list' }, event.workout.map((line) => el('li', { text: line }))),
        ])
      : null,

    event.info ? el('p', { class: 'event-info' }, [icon('info'), el('span', { text: event.info })]) : null,

    el('a', {
      class: 'btn btn-primary btn-sm',
      href: whatsappLink(`Ciao! Vorrei iscrivermi all'evento "${event.title}" del ${event.date}.`),
      target: '_blank',
      rel: 'noopener',
      text: 'Prenota il tuo posto',
    }),
  ]);
}

/**
 * Popola la griglia eventi.
 * @param {HTMLElement} grid
 * @param {Array} [list]
 */
export function renderEvents(grid, list = EVENTS) {
  if (!grid) return;

  if (!list.length) {
    grid.replaceChildren(
      el('p', { class: 'events-empty', text: 'Nessun evento in programma al momento. Torna presto!' })
    );
    return;
  }

  grid.replaceChildren(...list.map(eventCard));
}
