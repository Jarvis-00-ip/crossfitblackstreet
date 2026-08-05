/**
 * schedule.js — Componente calendario interattivo e riutilizzabile.
 *
 * - Filtri per disciplina (CF / HYROX) e per giorno.
 * - Desktop: griglia settimanale a colonne.
 * - Mobile (<= 860px): accordion, una riga per giorno.
 * - Evidenzia automaticamente il giorno corrente.
 */

import { el, icon } from './dom.js';
import { SCHEDULE, CLASS_TYPES } from './data.js';

const MOBILE_QUERY = '(max-width: 860px)';

/** JS getDay(): 0=dom … 6=sab → id del giorno nel palinsesto. */
const WEEKDAY_IDS = [null, 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

function todayId() {
  return WEEKDAY_IDS[new Date().getDay()] ?? null;
}

/**
 * @param {Object} refs
 * @param {HTMLElement} refs.view       contenitore del calendario
 * @param {HTMLElement} refs.typeFilters
 * @param {HTMLElement} refs.dayFilters
 * @param {HTMLElement} refs.empty      messaggio "nessun risultato"
 */
export function createSchedule({ view, typeFilters, dayFilters, empty }) {
  const state = { type: 'ALL', day: 'ALL', openDay: todayId() ?? 'lun' };
  const mql = window.matchMedia(MOBILE_QUERY);

  /* ---------- filtri ---------- */

  function buildChips(container, options, key, extraClass = () => '') {
    container.replaceChildren(
      ...options.map((opt) =>
        el('button', {
          type: 'button',
          class: `chip ${extraClass(opt.value)}`.trim(),
          'aria-pressed': String(state[key] === opt.value),
          dataset: { value: opt.value },
          text: opt.label,
          onClick: () => {
            state[key] = opt.value;
            [...container.children].forEach((c) =>
              c.setAttribute('aria-pressed', String(c.dataset.value === opt.value))
            );
            render();
          },
        })
      )
    );
  }

  function renderFilters() {
    buildChips(
      typeFilters,
      [
        { value: 'ALL', label: 'Tutte' },
        { value: 'CF', label: CLASS_TYPES.CF.label },
        { value: 'HYROX', label: CLASS_TYPES.HYROX.label },
      ],
      'type',
      (v) => (v === 'HYROX' ? 'chip-hyrox' : '')
    );

    buildChips(
      dayFilters,
      [
        { value: 'ALL', label: 'Tutti' },
        ...SCHEDULE.map((d) => ({ value: d.id, label: d.short })),
      ],
      'day'
    );
  }

  /* ---------- dati filtrati ---------- */

  function filteredDays() {
    return SCHEDULE.filter((d) => state.day === 'ALL' || d.id === state.day).map((d) => ({
      ...d,
      slots: d.slots.filter((s) => state.type === 'ALL' || s.type === state.type),
    }));
  }

  /* ---------- pezzi riutilizzabili ---------- */

  function slotEl(slot) {
    return el('div', { class: `slot type-${slot.type}` }, [
      el('span', { class: 'slot-time', text: slot.time }),
      el('span', { class: 'slot-type', text: CLASS_TYPES[slot.type].short }),
    ]);
  }

  function openBoxEl(day) {
    return el('div', { class: 'day-openbox' }, [
      el('strong', { text: 'Open Box' }),
      el('span', { text: day.openBox }),
    ]);
  }

  /* ---------- vista desktop ---------- */

  function renderWeekGrid(days) {
    const today = todayId();
    const grid = el('div', { class: 'week-grid' });
    grid.style.setProperty('--cols', String(days.length));

    days.forEach((day) => {
      const isToday = day.id === today;
      grid.append(
        el('div', { class: `day-col${isToday ? ' is-today' : ''}` }, [
          el('div', { class: 'day-head' }, [
            el('h3', { text: day.short }),
            isToday ? el('span', { class: 'today-flag', text: 'Oggi' }) : null,
          ]),
          day.slots.length
            ? el('div', { class: 'slot-list' }, day.slots.map(slotEl))
            : el('div', { class: 'day-empty', text: '—' }),
          openBoxEl(day),
        ])
      );
    });

    return grid;
  }

  /* ---------- vista mobile ---------- */

  function renderAccordion(days) {
    const today = todayId();
    const wrap = el('div', { class: 'day-accordion' });

    days.forEach((day) => {
      const isOpen = day.id === state.openDay;
      const panelId = `acc-panel-${day.id}`;

      const item = el('div', {
        class: `acc-item${isOpen ? ' open' : ''}${day.id === today ? ' is-today' : ''}`,
      });

      const trigger = el(
        'button',
        {
          type: 'button',
          class: 'acc-trigger',
          'aria-expanded': String(isOpen),
          'aria-controls': panelId,
          onClick: () => {
            state.openDay = state.openDay === day.id ? null : day.id;
            render();
          },
        },
        [
          el('h3', { text: day.day }),
          el('span', { class: 'acc-meta' }, [
            el('span', {
              text: day.slots.length ? `${day.slots.length} class${day.slots.length === 1 ? 'e' : 'i'}` : 'nessuna',
            }),
            icon('chevron', 'acc-chevron'),
          ]),
        ]
      );

      const body = el('div', { class: 'acc-body' }, [
        ...(day.slots.length
          ? day.slots.map(slotEl)
          : [el('div', { class: 'day-empty', text: 'Nessuna classe con questo filtro.' })]),
        openBoxEl(day),
      ]);

      item.append(trigger, el('div', { class: 'acc-panel', id: panelId }, [el('div', {}, [body])]));
      wrap.append(item);
    });

    return wrap;
  }

  /* ---------- render ---------- */

  function render() {
    const days = filteredDays();
    const hasAnySlot = days.some((d) => d.slots.length > 0);

    empty.hidden = hasAnySlot;
    view.hidden = !hasAnySlot;
    if (!hasAnySlot) {
      view.replaceChildren();
      return;
    }

    view.replaceChildren(mql.matches ? renderAccordion(days) : renderWeekGrid(days));
  }

  /* ---------- init ---------- */

  renderFilters();
  render();

  const onBreakpoint = () => render();
  if (mql.addEventListener) mql.addEventListener('change', onBreakpoint);
  else mql.addListener(onBreakpoint); // Safari < 14

  return { render, state };
}
