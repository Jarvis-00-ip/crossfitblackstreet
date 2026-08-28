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
      alt: 'Lucia Dimola spinge un sled carico durante il WOD Senza Respiro a RiminiWellness',
    },
    {
      src: 'assets/img/senza-respiro-2.jpg',
      alt: 'Lucia Dimola solleva un bilanciere sopra la testa durante le testimonianze del progetto',
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
/**
 * SCHEDULE — palinsesto settimanale.
 *
 * ⚠️ Trascritto dal cartellone esposto in palestra (foto dell'agosto 2026).
 * Una tabella fotografata di lato non è una fonte perfetta: se una collocazione
 * non torna, vince il cartellone, non questo file.
 *
 * ⚠️ Da ottobre 2026 il palinsesto cambia. Quando arrivano gli orari nuovi si
 * aggiorna questo blocco e si toglie SCHEDULE_NOTICE qui sotto. Le classi già
 * generate su Firestore restano dove sono: dopo la modifica bisogna aprire la
 * scheda Classi del pannello, che rigenera le mancanti.
 */
export const SCHEDULE = [
  {
    id: 'lun',
    day: 'Lunedì',
    short: 'LUN',
    openBox: '07.00 – 21.00',
    slots: [
      { time: '07.00', type: 'CF' },
      { time: '09.30', type: 'HYROX' },
      { time: '13.00', type: 'CF' },
      { time: '16.30', type: 'CF' },
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
      { time: '09.30', type: 'CF' },
      { time: '13.00', type: 'CF' },
      { time: '16.30', type: 'CF' },
      { time: '17.30', type: 'HYROX' },
      { time: '18.30', type: 'CF' },
      { time: '19.30', type: 'CF' },
    ],
  },
  {
    // Il mercoledì è l'unico giorno con otto classi e con il pomeriggio
    // sull'ora tonda invece che alla mezza.
    id: 'mer',
    day: 'Mercoledì',
    short: 'MER',
    openBox: '07.00 – 21.00',
    slots: [
      { time: '07.00', type: 'CF' },
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
      { time: '18.30', type: 'CF' },
      { time: '19.30', type: 'HYROX' },
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

/**
 * Avviso sul palinsesto in scadenza.
 *
 * Un orario che sta per cambiare va detto prima, non dopo: chi organizza la
 * settimana su questi orari deve sapere che a ottobre non varranno più.
 * Mettere `null` fa sparire l'avviso senza toccare altro.
 */
export const SCHEDULE_NOTICE = {
  title: 'Da ottobre gli orari cambiano',
  text: 'Questo è il palinsesto in vigore adesso. Da ottobre cambia: teniti pronto — '
    + 'appena i nuovi orari sono definitivi li trovi qui, e le prenotazioni si '
    + 'aggiornano da sole.',
};


/**
 * PRICING — listino abbonamenti.
 *
 * Trascritto dal cartellone esposto in palestra. Due cose non ovvie, prese
 * dalla società e non deducibili dai numeri:
 *
 *   - i prezzi della colonna «con open box» comprendono **un ingresso in più
 *     a settimana in open box**, e non esistono per tutte le formule;
 *   - le tre ore di ON RAMP sono obbligatorie per chi non ha mai fatto
 *     CrossFit, ma sono **in omaggio con l'abbonamento annuale**: chi si
 *     iscrive per dodici mesi non le paga.
 *
 * Tutti gli importi sono in euro. Modificare qui aggiorna la sezione Prezzi.
 */
export const PRICING = {
  durations: [
    { id: 'm1', label: '1 mese' },
    { id: 'm3', label: '3 mesi' },
    { id: 'm6', label: '6 mesi' },
    { id: 'm12', label: '12 mesi' },
  ],

  plans: [
    {
      id: 'class2',
      name: '2 ingressi',
      detail: 'a settimana, alle classi',
      price: { m1: 80, m3: 210, m6: 360, m12: 600 },
      openBox: { m1: 100, m3: 270, m6: 480, m12: 840 },
      rate: { m6: 180, m12: 200 },
      rateOpenBox: { m6: 240, m12: 280 },
      finanziaria: 55,
      finanziariaOpenBox: 75,
    },
    {
      id: 'class3',
      name: '3 ingressi',
      detail: 'a settimana, alle classi',
      price: { m1: 90, m3: 240, m6: 420, m12: 720 },
      openBox: { m1: 110, m3: 300, m6: 540, m12: 960 },
      rate: { m6: 210, m12: 240 },
      rateOpenBox: { m6: 270, m12: 320 },
      finanziaria: 65,
      finanziariaOpenBox: 85,
    },
    {
      id: 'class4',
      name: '4 ingressi',
      detail: 'a settimana, alle classi',
      price: { m1: 95, m3: 255, m6: 450, m12: 780 },
      rate: { m6: 225, m12: 260 },
      finanziaria: 70,
    },
    {
      id: 'full',
      name: 'Full class',
      detail: 'ingressi illimitati alle classi',
      price: { m1: 105, m3: 285, m6: 510, m12: 900 },
      rate: { m6: 255, m12: 300 },
      finanziaria: 80,
      highlight: true,
    },
    {
      id: 'openbox',
      name: 'Open box',
      detail: 'sala aperta, senza classi',
      price: { m1: 100, m3: 270, m6: 480, m12: 840 },
      rate: { m6: 240, m12: 280 },
      finanziaria: 75,
    },
    {
      id: 'fullopen',
      name: 'Full class + open box',
      detail: 'tutto compreso, senza limiti',
      price: { m1: 120, m3: 335, m6: 610, m12: 1100 },
      rate: { m6: 305, m12: 367 },
      finanziaria: 97,
    },
    {
      id: 'under20',
      name: 'Under 20',
      detail: 'per chi non ha ancora vent\'anni',
      price: { m1: 80, m3: 210, m6: 380, m12: 710 },
      rate: { m6: 190, m12: 237 },
      finanziaria: 65,
    },
  ],

  // Voci che si pagano una volta sola, o che non sono abbonamenti.
  extra: {
    tesseramento: 30,
    onRamp: 60,
    dropIn: 15,
    dropIn10: 135,
    bollo: 16,
  },
};

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
