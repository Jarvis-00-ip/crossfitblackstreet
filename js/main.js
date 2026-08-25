/**
 * main.js — Entry point: monta i componenti e avvia i comportamenti UI.
 */

import { qs } from './dom.js';
import { renderServices, renderPartner } from './services.js';
import { renderEvents } from './events.js';
import { createSchedule } from './schedule.js';
import { initContact } from './contact.js';
import { initHeader, initScrollSpy, initReveal, initYear, initPhotoFallback } from './ui.js';
import { renderSenzaRespiro, renderInstagram } from './senza-respiro.js';
import { loadEvents } from './firebase/events-repo.js';

function boot() {
  // 1. Contenuti generati dai dati
  renderServices(qs('#servicesGrid'));
  renderPartner(qs('#partnerCard'));
  renderEvents(qs('#eventsGrid')); // primo paint immediato da data.js
  renderSenzaRespiro(qs('#senzaRespiro'));
  renderInstagram(qs('#instagramFeed'));

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
  initPhotoFallback();
  const reveal = initReveal(); // include i nodi appena generati
  reveal.refresh();

  // 4. Eventi da Firestore, se configurato.
  //    Il primo paint è già avvenuto con i dati locali: qui si sostituisce il
  //    contenuto solo se il backend risponde davvero, così la bacheca non
  //    lampeggia vuota e un errore di rete non lascia la sezione spoglia.
  loadEvents().then(({ events, source }) => {
    if (source !== 'remote') return;
    renderEvents(qs('#eventsGrid'), events);
    reveal.refresh();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
