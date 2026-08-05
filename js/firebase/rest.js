/**
 * rest.js — Client Firestore minimale via REST API.
 *
 * Perché non l'SDK sulla home?
 * L'SDK Firestore pesa ~110 KB gzip: su una landing page che oggi spedisce
 * ~15 KB di JS sarebbe il singolo elemento più pesante del sito. Le REST API
 * fanno le due cose che servono qui (leggere gli eventi, scrivere un lead)
 * con ~60 righe di codice e zero dipendenze.
 *
 * Le Security Rules valgono identiche su REST e su SDK: è lo stesso backend.
 * L'SDK completo viene caricato solo da `admin.html`, dove serve davvero
 * (Auth, realtime, scritture).
 */

import { FIREBASE_CONFIG } from './config.js';

const HOST = 'https://firestore.googleapis.com/v1';

function baseUrl() {
  return `${HOST}/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
}

/* ------------------------------------------------------------------ *
 * Conversione JS ⇄ formato "typed values" di Firestore
 * ------------------------------------------------------------------ */

/** JS → Firestore Value */
export function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}

/** Oggetto JS → mappa di Value */
export function toFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}

/** Firestore Value → JS */
export function fromValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromValue);
  if ('mapValue' in value) return fromFields(value.mapValue.fields);
  return null;
}

/** Mappa di Value → oggetto JS */
export function fromFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]));
}

/* ------------------------------------------------------------------ *
 * Chiamate
 * ------------------------------------------------------------------ */

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = body?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Firestore: ${message}`);
  }

  return body;
}

/**
 * Esegue una query strutturata su una collection.
 *
 * Si usa `:runQuery` invece del semplice GET perché le Security Rules non
 * filtrano i risultati: le valutano. Con una regola tipo
 * `allow read: if resource.data.published == true` una lista non filtrata
 * verrebbe rifiutata in blocco, mentre la query con il `where` corrispondente
 * passa. È così che le bozze restano davvero invisibili al pubblico.
 *
 * @param {string} collectionId
 * @param {Object} [opts]
 * @param {{field: string, value: any}} [opts.equals] filtro di uguaglianza
 * @param {number} [opts.limit]
 * @returns {Promise<Array<{id: string, ...}>>}
 */
export async function runQuery(collectionId, { equals, limit = 50 } = {}) {
  const structuredQuery = {
    from: [{ collectionId }],
    limit,
  };

  if (equals) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: equals.field },
        op: 'EQUAL',
        value: toValue(equals.value),
      },
    };
  }

  const rows = await request(`${baseUrl()}:runQuery?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    body: JSON.stringify({ structuredQuery }),
  });

  // runQuery restituisce anche righe senza `document` (es. readTime): vanno scartate.
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row.document)
    .map((row) => ({
      id: row.document.name.split('/').pop(),
      ...fromFields(row.document.fields),
    }));
}

/**
 * Crea un documento in una collection.
 * @param {string} collectionId
 * @param {Object} data
 */
export async function createDocument(collectionId, data) {
  const doc = await request(`${baseUrl()}/${collectionId}?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    body: JSON.stringify({ fields: toFields(data) }),
  });

  return { id: doc.name.split('/').pop(), ...fromFields(doc.fields) };
}
