/**
 * consent.js — Banner privacy e blocco dei servizi di terze parti.
 *
 * Il sito, per funzionare, non ha bisogno di nessun servizio esterno: nessuna
 * statistica, nessun tracciamento pubblicitario, nessun cookie di profilazione.
 * Restano però due appoggi a terzi che, pur innocui nell'intenzione, fanno
 * arrivare l'indirizzo IP del visitatore a un'altra società:
 *
 *   - i caratteri tipografici serviti da Google Fonts;
 *   - i post di Instagram, cioè Meta.
 *
 * Un indirizzo IP è un dato personale, e quei due trasferimenti non servono a
 * erogare il servizio richiesto: vanno quindi chiesti, non dati per scontati.
 * Per questo il collegamento ai font NON sta nell'HTML — dove partirebbe prima
 * di qualsiasi scelta — ma viene aggiunto da qui, e solo dopo un sì.
 *
 * Senza consenso il sito resta identico nella sostanza: i caratteri ricadono
 * su quelli di sistema, dichiarati come alternativa in `styles.css`. Si perde
 * un po' di carattere, non una funzione.
 *
 * Quello che serve a far funzionare l'area soci — l'accesso e il salvataggio
 * della sessione — è invece tecnicamente necessario: senza, non si potrebbe
 * prenotare. Per quello non si chiede un permesso che non avrebbe senso
 * negare, esattamente come non lo si chiede per il carrello di un negozio.
 */

const CHIAVE = 'cbs-consenso';

/** Cambiare questo numero fa ricomparire il banner a tutti. */
export const VERSIONE_CONSENSO = 1;

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800'
  + '&family=Inter:wght@400;500;600;700&display=swap';

/**
 * Legge la scelta salvata.
 * Un browser in navigazione privata, o con i dati dei siti bloccati, fa
 * fallire l'accesso all'archivio locale: in quel caso si comporta come se la
 * scelta non fosse mai stata fatta, che è la risposta prudente.
 */
export function leggiConsenso() {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const dati = JSON.parse(grezzo);
    if (dati?.versione !== VERSIONE_CONSENSO) return null;
    return dati;
  } catch {
    return null;
  }
}

/** Il visitatore ha accettato i contenuti di terze parti? */
export function consensoEsterni() {
  return leggiConsenso()?.esterni === true;
}

function salvaConsenso(esterni) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify({
      versione: VERSIONE_CONSENSO,
      esterni,
      data: new Date().toISOString(),
    }));
  } catch {
    // Se non si può scrivere, la scelta vale per questa visita e basta.
  }
}

/** Aggiunge i caratteri di Google. Chiamata solo dopo un consenso esplicito. */
function caricaFont() {
  if (document.querySelector('link[data-font-esterni]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_URL;
  link.setAttribute('data-font-esterni', '');
  document.head.append(link);
}

/**
 * Avvisa il resto della pagina che il consenso è cambiato.
 * La sezione Instagram, per esempio, può mostrare i post senza far ricaricare
 * niente a chi ha appena detto di sì.
 */
function annuncia(esterni) {
  document.dispatchEvent(new CustomEvent('consenso-cambiato', { detail: { esterni } }));
}

function chiudiBanner() {
  document.getElementById('consentBanner')?.remove();
}

function decidi(esterni) {
  salvaConsenso(esterni);
  if (esterni) caricaFont();
  chiudiBanner();
  annuncia(esterni);
}

/**
 * Costruisce il banner.
 *
 * I due pulsanti hanno lo stesso peso visivo di proposito: un «rifiuta»
 * nascosto o scolorito rispetto all'«accetta» rende il consenso non libero, e
 * quindi non valido. Costa poco farlo bene.
 */
function creaBanner() {
  const box = document.createElement('div');
  box.id = 'consentBanner';
  box.className = 'consent-banner';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-live', 'polite');
  box.setAttribute('aria-label', 'Preferenze sulla privacy');

  box.innerHTML = `
    <div class="consent-inner">
      <div class="consent-text">
        <strong>Questo sito usa solo ciò che serve a funzionare.</strong>
        Nessuna statistica, nessun tracciamento pubblicitario. Per i caratteri
        tipografici e per i post di Instagram si appoggia però a Google e Meta,
        che ricevono il tuo indirizzo IP. Puoi scegliere tu.
        <a href="privacy.html">Informativa privacy</a>
      </div>
      <div class="consent-actions">
        <button type="button" class="btn btn-ghost" data-consenso="no">Solo il necessario</button>
        <button type="button" class="btn btn-primary" data-consenso="si">Accetta i contenuti esterni</button>
      </div>
    </div>
  `;

  box.querySelector('[data-consenso="no"]').addEventListener('click', () => decidi(false));
  box.querySelector('[data-consenso="si"]').addEventListener('click', () => decidi(true));
  return box;
}

function mostraBanner() {
  if (document.getElementById('consentBanner')) return;
  document.body.append(creaBanner());
}

/**
 * Avvio. Da chiamare su ogni pagina.
 *
 * Chi ha già scelto non rivede niente; chi aveva accettato si ritrova i
 * caratteri giusti senza altre domande.
 */
export function initConsent() {
  // L'anno nel piè di pagina: sta qui perché il piè di pagina legale esiste su
  // tutte e tre le pagine, e questa è l'unica funzione che girano tutte e tre.
  const anno = document.getElementById('year');
  if (anno && !anno.textContent) anno.textContent = String(new Date().getFullYear());

  const scelta = leggiConsenso();

  if (scelta?.esterni) caricaFont();
  if (!scelta) mostraBanner();

  // Ripensarci dev'essere facile quanto scegliere: un consenso che non si può
  // ritirare non è un consenso. Il collegamento sta nel piè di pagina.
  document.querySelectorAll('[data-riapri-consenso]').forEach((nodo) => {
    nodo.addEventListener('click', (e) => {
      e.preventDefault();
      try { localStorage.removeItem(CHIAVE); } catch { /* niente da fare */ }
      chiudiBanner();
      mostraBanner();
      document.getElementById('consentBanner')?.scrollIntoView({ block: 'nearest' });
    });
  });
}
