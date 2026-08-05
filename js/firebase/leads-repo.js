/**
 * leads-repo.js — Salvataggio delle richieste dal form di contatto.
 *
 * Difese antispam (tutte gratuite, nessuna dipendenza):
 *  1. honeypot     — campo invisibile: se è compilato, è un bot
 *  2. rate limit   — un invio ogni 60s per browser (localStorage)
 *  3. rules        — la validazione vera sta in `firestore.rules`: chiavi
 *                    esatte, lunghezze massime, formato email, timestamp
 *                    coerente con l'ora del server
 *
 * I punti 1 e 2 sono aggirabili da chi sa quello che fa: servono a filtrare i
 * bot automatici. Il punto 3 è l'unico che il client non può scavalcare.
 */

import { COLLECTIONS, isConfigured } from './config.js';
import { createDocument } from './rest.js';

const RATE_LIMIT_KEY = 'cfbs:lastLeadAt';
const RATE_LIMIT_MS = 60_000;

/** @returns {boolean} true se l'invio è consentito adesso */
export function canSubmit() {
  try {
    const last = Number(localStorage.getItem(RATE_LIMIT_KEY) || 0);
    return Date.now() - last > RATE_LIMIT_MS;
  } catch {
    return true; // localStorage bloccato (navigazione privata): non blocchiamo l'utente
  }
}

function markSubmitted() {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
  } catch {
    /* ignorato */
  }
}

/**
 * Registra un lead su Firestore.
 * @param {{name: string, email: string, message: string}} lead
 * @returns {Promise<{saved: boolean, reason?: string}>} non lancia mai:
 *   il salvataggio non deve impedire all'utente di finire su WhatsApp.
 */
export async function saveLead({ name, email, message }) {
  if (!isConfigured()) return { saved: false, reason: 'not-configured' };
  if (!canSubmit()) return { saved: false, reason: 'rate-limited' };

  try {
    await createDocument(COLLECTIONS.leads, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      source: 'sito-web',
      createdAt: new Date(),
    });

    markSubmitted();
    return { saved: true };
  } catch (error) {
    console.warn('[leads] salvataggio non riuscito:', error.message);
    return { saved: false, reason: 'error' };
  }
}
