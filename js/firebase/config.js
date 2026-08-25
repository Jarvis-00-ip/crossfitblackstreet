/**
 * config.js — Configurazione Firebase.
 *
 * ⚠️  Questi valori sono PUBBLICI per definizione: finiscono nel JavaScript
 *     che chiunque può leggere. Non è un problema di sicurezza — è il modo in
 *     cui Firebase è progettato. La protezione dei dati sta interamente nelle
 *     Security Rules (vedi `firestore.rules`).
 *
 * Dove trovarli:
 *   Console Firebase → ⚙ Impostazioni progetto → Le tue app → App web → SDK setup
 *
 * Finché `apiKey` e `projectId` restano vuoti il sito funziona esattamente come
 * prima: eventi letti da `js/data.js`, form che apre solo WhatsApp.
 */

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAyipXOk_tfr2ljn_fo8PCVrhIjpHzmJYU',
  authDomain: 'crossfit-black-street-website.firebaseapp.com',
  projectId: 'crossfit-black-street-website',
  storageBucket: 'crossfit-black-street-website.firebasestorage.app',
  messagingSenderId: '730213113325',
  appId: '1:730213113325:web:db192ce6c9e1ef90195be4',

  // Presente nel progetto ma NON usato: il sito non inizializza Google
  // Analytics. Analytics scrive cookie di profilazione, che in UE
  // richiedono un banner di consenso preventivo — vedi README §9.
  // Resta qui pronto se un giorno si deciderà di attivarlo davvero.
  measurementId: 'G-157SFBH6WK',
};

/**
 * Versione dell'SDK caricata da CDN nel pannello admin.
 * Per aggiornarla: https://firebase.google.com/docs/web/setup
 */
export const FIREBASE_SDK_VERSION = '12.17.1';

/** Nomi delle collection Firestore. */
export const COLLECTIONS = {
  events: 'events',
  leads: 'leads',
  admins: 'admins',
  invites: 'invites',
  users: 'users',
  sessions: 'sessions',
  bookings: 'bookings',
  certificates: 'certificates',
};

/**
 * Posti disponibili per tipo di classe, usati quando l'admin genera il
 * calendario. La capienza è poi modificabile sessione per sessione.
 */
export const SESSION_CAPACITY = {
  CF: 14,
  HYROX: 10,
};

/** Quante settimane di calendario genera il pannello in un colpo solo. */
export const WEEKS_TO_GENERATE = 4;

/**
 * UID del proprietario. Serve solo all'interfaccia, per mostrare chi è
 * l'owner e per nascondere i comandi che non potrebbe usare comunque.
 *
 * ⚠️ La regola vera è la stessa costante dentro `firestore.rules`, funzione
 * `ownerUid()`: quella non è aggirabile, questa sì. Se cambi proprietario
 * devi aggiornare ENTRAMBE, altrimenti l'interfaccia mente.
 *
 * Non è un dato sensibile: identifica un account, non concede nulla.
 */
export const OWNER_UID = 'qWsn00kgiQb8ZbnSYOqcP6XvtFt2';

export const isOwner = (uid) => uid === OWNER_UID;

/** true quando la configurazione è stata compilata. */
export function isConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}
