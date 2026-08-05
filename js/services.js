/**
 * services.js — Card servizi + box convenzione medica.
 */

import { el, icon } from './dom.js';
import { SERVICES, PARTNER } from './data.js';

/** Card singolo servizio. */
export function serviceCard(service, index = 0) {
  return el(
    'article',
    { class: 'service-card reveal', dataset: { revealDelay: String(index * 90) } },
    [
      el('span', { class: 'service-icon' }, [icon(service.icon)]),
      el('h3', { text: service.title }),
      el('p', { text: service.text }),
      el(
        'div',
        { class: 'tag-row' },
        service.tags.map((t) => el('span', { class: 'tag', text: t }))
      ),
    ]
  );
}

export function renderServices(grid, list = SERVICES) {
  if (!grid) return;
  grid.replaceChildren(...list.map(serviceCard));
}

/** Box partnership / convenzione. */
export function renderPartner(root, partner = PARTNER) {
  if (!root) return;

  root.replaceChildren(
    el('div', {}, [
      el('span', { class: 'partner-badge' }, [icon('medical'), el('span', { text: partner.title })]),
      el('h3', { text: partner.name }),
      el(
        'div',
        { class: 'partner-services' },
        partner.services.map((s) => el('span', { class: 'tag', text: s }))
      ),
      el('p', {
        text:
          'Convenzione attiva per tutti i tesserati del box: valutazione funzionale, ' +
          'trattamenti fisioterapici e percorsi di riabilitazione a condizioni riservate.',
      }),
    ]),

    el(
      'div',
      { class: 'partner-phones' },
      partner.phones.map((phone) =>
        el('a', { class: 'phone-link', href: `tel:${phone.replace(/\s/g, '')}` }, [
          icon('phone'),
          el('span', { text: phone }),
        ])
      )
    )
  );
}
