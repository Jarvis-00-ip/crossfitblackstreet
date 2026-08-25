/**
 * redirect.js — Smistamento fra area soci e pannello admin.
 *
 * Le due pagine si rimandano l'utente a vicenda: `area.html` manda lo staff
 * al pannello, `admin.html` manda i soci all'area. È il comportamento giusto,
 * ma se entrambe sbagliassero contemporaneamente il verdetto — per esempio
 * durante un errore di lettura di /admins — si rimbalzerebbero all'infinito
 * e il browser resterebbe bloccato in un ciclo di caricamenti.
 *
 * Da qui la guardia: un solo rimbalzo per sessione. Al secondo tentativo la
 * pagina resta dov'è e mostra il proprio contenuto di ripiego, che è sempre
 * qualcosa di utilizzabile.
 */

const KEY = 'cfbs:bounce';

/** Nome del file corrente, es. 'admin.html'. */
function currentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

/**
 * Manda l'utente a un'altra pagina, una volta sola.
 *
 * La sessione di Firebase è condivisa fra le pagine dello stesso dominio:
 * chi viene reindirizzato resta autenticato e non deve rifare il login.
 *
 * @param {string} target es. 'area.html'
 * @returns {boolean} false se il rimbalzo è stato evitato: chi chiama deve
 *   allora mostrare la propria schermata di ripiego.
 */
export function redirectOnce(target) {
  try {
    // Se veniamo proprio da lì, tornarci significherebbe iniziare un ciclo.
    if (sessionStorage.getItem(KEY) === target) {
      sessionStorage.removeItem(KEY);
      return false;
    }
    sessionStorage.setItem(KEY, currentPage());
  } catch {
    // sessionStorage negato (navigazione privata su alcuni browser):
    // si procede comunque, il rimbalzo infinito resta un caso di errore raro.
  }

  // replace() e non href: il tasto Indietro non deve riportare alla pagina
  // sbagliata, da cui si verrebbe rimandati qui di nuovo.
  window.location.replace(target);
  return true;
}

/** Da chiamare quando l'utente è arrivato dove doveva: la guardia si azzera. */
export function clearBounce() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignorato */
  }
}
