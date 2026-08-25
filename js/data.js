/**
 * data.js — Single source of truth per contenuti del sito.
 * Modificando questo file si aggiornano automaticamente calendario, eventi e contatti.
 */

export const CONTACTS = {
  whatsappNumber: '375 6164681',
  whatsappIntl: '393756164681',
  instagram: 'https://www.instagram.com/crossfitblackstreet/',
  instagramHandle: '@crossfitblackstreet',
  email: 'info@crossfitblackstreet.it',
};

/**
 * WOD Senza Respiro — progetto sulla fibrosi cistica.
 *
 * ⚠️ Testo da rivedere insieme alla società: qui c'è solo ciò che risulta
 * dai post pubblici. Date, luogo e finalità vanno confermati prima di
 * pubblicare, e il nome di Lucia va usato con il suo consenso: uno stato di
 * salute è un dato particolare (art. 9 GDPR), anche quando la persona ne
 * parla apertamente sui propri canali.
 */
export const SENZA_RESPIRO = {
  eyebrow: 'Progetto',
  title: 'WOD Senza Respiro',
  claim: 'RiminiWellness 2026',
  lead:
    'Un WOD portato in gara da chi convive con la fibrosi cistica, per mostrare ' +
    'che la sala pesi non è un posto riservato a pochi.',
  body:
    'Il progetto nasce per dare visibilità a chi si allena nonostante una malattia ' +
    'respiratoria cronica, e per raccogliere le testimonianze di chi lo fa. ' +
    'Black Street partecipa e mette a disposizione il box per gli allenamenti.',
  athlete: {
    name: 'Lucia Dimola',
    handle: '@theciagram',
    url: 'https://www.instagram.com/theciagram/',
    note: 'Atleta e testimonial del progetto, affetta da fibrosi cistica.',
  },
  photos: [
    {
      src: 'assets/img/senza-respiro-1.jpg',
      alt: 'Lucia Dimola spinge un sled carico durante il WOD Senza Respiro',
      label: 'Il WOD',
    },
    {
      src: 'assets/img/senza-respiro-2.jpg',
      alt: 'Lucia Dimola in posizione overhead con bilanciere carico',
      label: 'Le testimonianze',
    },
  ],
};

/**
 * Post Instagram mostrati nel carosello, per codice.
 *
 * Il codice è la parte dell'indirizzo fra `/p/` e la barra finale:
 *   https://www.instagram.com/p/DK1xYzAbcDe/  →  'DK1xYzAbcDe'
 * Vanno bene anche i reel (`/reel/...`): il codice si prende allo stesso modo.
 *
 * Perché scelti a mano e non "gli ultimi automaticamente": un feed
 * automatico richiede la Graph API con account Business e un token da
 * rinnovare ogni 60 giorni, quindi un backend che se ne occupi. L'embed del
 * singolo post invece non ha scadenze e non richiede nulla.
 *
 * Con l'array vuoto la sezione mostra il solo invito a seguire il profilo.
 */
export const INSTAGRAM_POSTS = [];

/** Link WhatsApp con messaggio precompilato. */
export function whatsappLink(text = 'Ciao! Vorrei prenotare la mia PROVA gratuita.') {
  return `https://wa.me/${CONTACTS.whatsappIntl}?text=${encodeURIComponent(text)}`;
}

export const PARTNER = {
  title: 'Convenzione 2025/26',
  name: 'FisioMedical Center Giovanni Gerbino',
  services: ['Fisioterapia', 'Osteopatia', 'Riabilitazione'],
  phones: ['340 315 9839', '010 4070 745'],
};

export const CLASS_TYPES = {
  CF: { id: 'CF', label: 'CrossFit Class', short: 'CF Class' },
  HYROX: { id: 'HYROX', label: 'HYROX', short: 'HYROX' },
};

/**
 * Palinsesto settimanale.
 * `openBox` = fascia oraria in cui l'Area Open Box è accessibile liberamente.
 */
export const SCHEDULE = [
  {
    id: 'lun',
    day: 'Lunedì',
    short: 'LUN',
    openBox: '07.00 – 21.00',
    slots: [
      { time: '07.00', type: 'HYROX' },
      { time: '09.30', type: 'CF' },
      { time: '13.00', type: 'CF' },
      { time: '16.30', type: 'HYROX' },
      { time: '17.30', type: 'CF' },
      { time: '18.30', type: 'CF' },
      { time: '19.30', type: 'CF' },
    ],
  },
  {
    id: 'mar',
    day: 'Martedì',
    short: 'MAR',
    openBox: '07.00 – 21.00',
    slots: [
      { time: '07.00', type: 'CF' },
      { time: '09.30', type: 'HYROX' },
      { time: '13.00', type: 'CF' },
      { time: '16.30', type: 'CF' },
      { time: '17.30', type: 'HYROX' },
      { time: '18.30', type: 'CF' },
      { time: '19.30', type: 'CF' },
    ],
  },
  {
    id: 'mer',
    day: 'Mercoledì',
    short: 'MER',
    openBox: '09.30 – 21.00',
    slots: [
      { time: '09.30', type: 'CF' },
      { time: '13.00', type: 'HYROX' },
      { time: '16.00', type: 'CF' },
      { time: '17.00', type: 'CF' },
      { time: '18.00', type: 'CF' },
      { time: '19.00', type: 'CF' },
      { time: '20.00', type: 'CF' },
    ],
  },
  {
    id: 'gio',
    day: 'Giovedì',
    short: 'GIO',
    openBox: '07.00 – 21.00',
    slots: [
      { time: '07.00', type: 'CF' },
      { time: '09.30', type: 'CF' },
      { time: '13.00', type: 'CF' },
      { time: '16.30', type: 'CF' },
      { time: '17.30', type: 'CF' },
      { time: '18.30', type: 'CF' },
      { time: '19.30', type: 'HYROX' },
    ],
  },
  {
    id: 'ven',
    day: 'Venerdì',
    short: 'VEN',
    openBox: '07.00 – 21.00',
    slots: [
      { time: '07.00', type: 'CF' },
      { time: '09.30', type: 'CF' },
      { time: '13.00', type: 'CF' },
      { time: '16.30', type: 'CF' },
      { time: '17.30', type: 'CF' },
      { time: '18.30', type: 'HYROX' },
      { time: '19.30', type: 'CF' },
    ],
  },
  {
    id: 'sab',
    day: 'Sabato',
    short: 'SAB',
    openBox: '11.00 – 13.00',
    slots: [{ time: '10.00', type: 'CF' }],
  },
];

export const SERVICES = [
  {
    icon: 'barbell',
    title: 'CrossFit Class',
    text: 'Sessioni guidate da coach certificati: warm-up, tecnica, WOD e stretching. Ogni movimento è scalabile — dal primo giorno all\'atleta avanzato.',
    tags: ['Coach certificati', 'Scalabile', 'Ogni giorno'],
  },
  {
    icon: 'flame',
    title: 'HYROX',
    text: 'Siamo HYROX® Official Gym. Allenamenti specifici su corsa, sled, burpee broad jump, wall balls e tutte le stazioni ufficiali della gara.',
    tags: ['Official Gym', 'Race prep', 'Endurance'],
  },
  {
    icon: 'clock',
    title: 'Area Open Box',
    text: 'Spazio libero per il tuo lavoro personale: forza, accessori, skill o recupero. Sempre disponibile negli orari di apertura del box.',
    tags: ['Accesso libero', 'Strength', 'Skill work'],
  },
];

export const EVENTS = [
  {
    title: 'APERI MURPH',
    badge: 'Con aperitivo finale',
    date: 'Sabato 11 Luglio',
    time: 'Ore 09:00',
    description:
      'Murph a team, divisione in heat con giudice dedicato. Si chiude tutti insieme con l\'aperitivo al box.',
    workout: ['1,6 km Run', '100 Pull up', '200 Push up', '300 Air squat', '1,6 km Run'],
    info: 'Prenotazioni in app o al box.',
    featured: true,
  },
];
