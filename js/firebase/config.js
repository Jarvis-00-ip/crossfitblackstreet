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
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
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
};

/** true quando la configurazione è stata compilata. */
export function isConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}
