/**
 * contact.js — Validazione del form, salvataggio del lead e invio via WhatsApp.
 *
 * Flusso di un invio valido:
 *   1. validazione dei campi + controllo honeypot
 *   2. apertura di WhatsApp col messaggio precompilato
 *   3. salvataggio del lead su Firestore, in background
 *
 * L'ordine non è casuale. `window.open()` deve partire in modo sincrono dentro
 * l'handler del submit, altrimenti il browser la considera una popup non
 * richiesta dall'utente e la blocca. Se il salvataggio del lead fosse atteso
 * prima, il "gesto utente" andrebbe perso e su Safari la finestra non si
 * aprirebbe. Il salvataggio quindi non blocca mai la conversione: se Firestore
 * non risponde, l'utente è comunque già su WhatsApp.
 */

import { qs, qsa } from './dom.js';
import { CONTACTS, whatsappLink } from './data.js';
import { saveLead } from './firebase/leads-repo.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RULES = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Inserisci il tuo nome (min. 2 caratteri).'),
  email: (v) => (EMAIL_RE.test(v.trim()) ? '' : 'Inserisci un indirizzo email valido.'),
  message: (v) => (v.trim().length >= 10 ? '' : 'Scrivi almeno 10 caratteri.'),
  // Il consenso non è un campo di testo: si valida sullo stato della casella,
  // non sul valore. Vedi `valore()` più sotto.
  privacyOk: (v) => (v === 'on' ? '' : 'Serve il consenso per poterti rispondere.'),
};

/**
 * Valore da validare per un campo.
 * Una casella non spuntata non compare affatto nei dati del modulo: senza
 * questa distinzione la validazione leggerebbe sempre 'on'.
 */
function valore(input) {
  return input.type === 'checkbox' ? (input.checked ? 'on' : '') : input.value;
}

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

  // Solo i campi con una regola di validazione: esclude l'honeypot, che non è
  // un campo utente e non deve finire nel ciclo di validazione.
  const inputs = qsa('input, textarea', form).filter((input) => RULES[input.name]);

  // Rivalida mentre l'utente corregge un campo già segnalato.
  inputs.forEach((input) => {
    input.addEventListener('blur', () => setFieldError(input, RULES[input.name](valore(input))));
    input.addEventListener('input', () => {
      if (input.closest('.field')?.classList.contains('invalid')) {
        setFieldError(input, RULES[input.name](valore(input)));
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';

    // Honeypot: campo invisibile agli umani, irresistibile per i bot.
    // Simuliamo il successo senza fare nulla, così il bot non capisce di
    // essere stato scartato e non riprova con un'altra strategia.
    if (qs('#website', form)?.value) {
      status.classList.add('ok');
      status.textContent = 'Messaggio inviato.';
      form.reset();
      return;
    }

    const results = inputs.map((input) => setFieldError(input, RULES[input.name](valore(input))));
    if (results.includes(false)) {
      status.classList.add('err');
      status.textContent = 'Controlla i campi evidenziati.';
      qs('.field.invalid input, .field.invalid textarea')?.focus();
      return;
    }

    const { name, email, message } = Object.fromEntries(new FormData(form));
    const text = `Ciao CrossFit Black Street!\n\nNome: ${name}\nEmail: ${email}\n\n${message}`;

    // 1. WhatsApp per primo: deve restare dentro il gesto utente (vedi sopra).
    window.open(whatsappLink(text), '_blank', 'noopener');

    status.classList.add('ok');
    status.textContent = 'Perfetto! Ti abbiamo aperto WhatsApp con il messaggio pronto.';

    // 2. Lead in archivio, senza far aspettare nessuno.
    saveLead({ name, email, message }).then(({ saved, reason }) => {
      if (saved) {
        status.textContent =
          'Perfetto! Ti abbiamo aperto WhatsApp e registrato la richiesta: ti rispondiamo a breve.';
      } else if (reason === 'rate-limited') {
        status.textContent =
          'Messaggio pronto su WhatsApp. Hai già inviato una richiesta poco fa: ti ricontattiamo noi.';
      }
      // 'not-configured' / 'error' → resta il messaggio di successo:
      // per l'utente la richiesta è comunque partita, su WhatsApp.
    });

    form.reset();
  });
}
