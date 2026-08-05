/**
 * main.js — Entry point: monta i componenti e avvia i comportamenti UI.
 */

import { qs } from './dom.js';
import { renderServices, renderPartner } from './services.js';
import { renderEvents } from './events.js';
import { createSchedule } from './schedule.js';
import { initContact } from './contact.js';
import { initHeader, initScrollSpy, initReveal, initYear } from './ui.js';

function boot() {
  // 1. Contenuti generati dai dati
  renderServices(qs('#servicesGrid'));
  renderPartner(qs('#partnerCard'));
  renderEvents(qs('#eventsGrid'));

  const scheduleView = qs('#scheduleView');
  if (scheduleView) {
    createSchedule({
      view: scheduleView,
      typeFilters: qs('#typeFilters'),
      dayFilters: qs('#dayFilters'),
      empty: qs('#scheduleEmpty'),
    });
  }

  // 2. Contatti (link WhatsApp/Instagram + form)
  initContact();

  // 3. UI
  initHeader();
  initScrollSpy();
  initYear();
  initReveal().refresh(); // include i nodi appena generati
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
