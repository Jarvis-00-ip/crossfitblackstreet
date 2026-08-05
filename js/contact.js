/**
 * contact.js — Validazione del form e invio via WhatsApp.
 *
 * Il sito è statico (GitHub Pages): non esiste un backend a cui fare POST.
 * Il form valida i campi e apre WhatsApp con il messaggio già composto.
 * Per un invio via email/servizio esterno, sostituire `handleSubmit`
 * con una fetch verso Formspree / Netlify Forms / API propria.
 */

import { qs, qsa } from './dom.js';
import { CONTACTS, whatsappLink } from './data.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RULES = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Inserisci il tuo nome (min. 2 caratteri).'),
  email: (v) => (EMAIL_RE.test(v.trim()) ? '' : 'Inserisci un indirizzo email valido.'),
  message: (v) => (v.trim().length >= 10 ? '' : 'Scrivi almeno 10 caratteri.'),
};

function setFieldError(input, message) {
  const field = input.closest('.field');
  const errorEl = qs(`[data-error-for="${input.name}"]`);
  field?.classList.toggle('invalid', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
  if (errorEl) errorEl.textContent = message;
  return !message;
}

/** Collega i link WhatsApp/Instagram e attiva il form. */
export function initContact() {
  // Link WhatsApp e Instagram generati dai dati (un solo punto di modifica).
  qsa('[data-wa-link]').forEach((a) => {
    a.href = whatsappLink();
    a.target = '_blank';
    a.rel = 'noopener';
  });
  qsa('[data-ig-link], #igLink').forEach((a) => {
    a.href = CONTACTS.instagram;
  });

  const waLabel = qs('#waNumberLabel');
  if (waLabel) waLabel.textContent = CONTACTS.whatsappNumber;
  const igLabel = qs('#igHandleLabel');
  if (igLabel) igLabel.textContent = CONTACTS.instagramHandle;

  const form = qs('#contactForm');
  if (!form) return;

  const status = qs('#formStatus');
  const inputs = qsa('input, textarea', form);

  // Rivalida mentre l'utente corregge un campo già segnalato.
  inputs.forEach((input) => {
    input.addEventListener('blur', () => setFieldError(input, RULES[input.name](input.value)));
    input.addEventListener('input', () => {
      if (input.closest('.field')?.classList.contains('invalid')) {
        setFieldError(input, RULES[input.name](input.value));
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';

    const results = inputs.map((input) => setFieldError(input, RULES[input.name](input.value)));
    if (results.includes(false)) {
      status.classList.add('err');
      status.textContent = 'Controlla i campi evidenziati.';
      qs('.field.invalid input, .field.invalid textarea')?.focus();
      return;
    }

    const { name, email, message } = Object.fromEntries(new FormData(form));
    const text = `Ciao CrossFit Black Street!\n\nNome: ${name}\nEmail: ${email}\n\n${message}`;

    window.open(whatsappLink(text), '_blank', 'noopener');

    status.classList.add('ok');
    status.textContent = 'Perfetto! Ti abbiamo aperto WhatsApp con il messaggio pronto.';
    form.reset();
  });
}
