# CrossFit Black Street — Sito web

Sito one-page (SPA statica) per **CrossFit Black Street** — CrossFit® Box e HYROX® Official Gym.
Nessun build step, nessuna dipendenza: HTML + CSS + JavaScript ES Modules, pronto per GitHub Pages.

---

## 1. Struttura del progetto

```
.
├── index.html              # markup di tutte le sezioni
├── .nojekyll               # disattiva Jekyll su GitHub Pages
├── css/
│   └── styles.css          # design tokens + stili (organizzato in 15 blocchi commentati)
├── js/
│   ├── main.js             # entry point: monta i componenti
│   ├── data.js             # ⭐ TUTTI I CONTENUTI (orari, eventi, contatti, partner)
│   ├── dom.js              # helper el() / icon() / qs()
│   ├── schedule.js         # componente calendario interattivo
│   ├── events.js           # componente card evento
│   ├── services.js         # card servizi + box convenzione
│   ├── contact.js          # validazione form + invio WhatsApp
│   └── ui.js               # header, menu mobile, scrollspy, reveal on scroll
└── assets/
    └── img/                # immagini (hero, foto box, favicon)
```

## 2. Avvio in locale

I moduli ES richiedono un server HTTP: aprire `index.html` con doppio clic (`file://`) **non funziona**.

```bash
# Python (già presente su macOS/Linux)
python3 -m http.server 8000

# oppure Node
npx serve .
```

Poi apri <http://localhost:8000>.

## 3. Pubblicazione su GitHub Pages

Il sito vive su `main`, nella root del repository.

1. Repository → **Settings** → **Pages**
2. *Source*: **Deploy from a branch**
3. *Branch*: `main` — *Folder*: `/ (root)` → **Save**

Dopo 1–2 minuti il sito è online su
`https://<utente>.github.io/crossfitblackstreet/`.

## 4. Sezioni

| # | Sezione | Contenuto |
|---|---------|-----------|
| 1 | Hero | Titolo, payoff, CTA WhatsApp, placeholder immagine/video di sfondo |
| 2 | Chi siamo | Box certificato, badge CrossFit®/HYROX®, avviso tesseramento e certificato medico |
| 3 | Servizi | CrossFit Class, HYROX, Area Open Box + box Convenzione 2025/26 |
| 4 | Palinsesto | Calendario interattivo con filtri per giorno e disciplina |
| 5 | Eventi | Card evento (demo: APERI MURPH) |
| 6 | Contatti | WhatsApp, Instagram, placeholder mappa, form di contatto |

## 5. Come modificare i contenuti

**Tutto il testo dinamico sta in `js/data.js`.** Non serve toccare HTML o CSS.

### Orari

```js
export const SCHEDULE = [
  {
    id: 'lun', day: 'Lunedì', short: 'LUN',
    openBox: '07.00 – 21.00',
    slots: [
      { time: '07.00', type: 'HYROX' },   // type: 'CF' | 'HYROX'
      { time: '09.30', type: 'CF' },
      // …
    ],
  },
  // …
];
```

Il calendario si rigenera da solo: filtri, griglia desktop e accordion mobile.

### Eventi

Aggiungi un oggetto all'array `EVENTS`; la card viene creata automaticamente.

```js
{
  title: 'NOME EVENTO',
  badge: 'Etichetta',              // opzionale
  date: 'Sabato 11 Luglio',
  time: 'Ore 09:00',
  description: 'Descrizione…',
  workout: ['1,6 km Run', '100 Pull up'],   // opzionale
  info: 'Prenotazioni in app o al box.',    // opzionale
  featured: true,                            // opzionale
}
```

Array vuoto → compare il messaggio "Nessun evento in programma".

### Contatti

```js
export const CONTACTS = {
  whatsappNumber: '375 6164681',   // come viene mostrato
  whatsappIntl: '393756164681',    // formato internazionale per wa.me
  instagram: 'https://www.instagram.com/crossfitblackstreet/',
  // …
};
```

Ogni link WhatsApp del sito (hero, header, footer, CTA flottante, card evento) usa questi valori.

## 6. Placeholder da sostituire

| Dove | Cosa fare |
|------|-----------|
| `index.html` → `.hero-media` | Sostituire `.hero-placeholder` con `<img class="hero-bg" …>` o `<video class="hero-bg" …>`. Lo snippet pronto è nel commento sopra il blocco. |
| `index.html` → `.about-media` | Sostituire `.media-placeholder` con la foto del box. |
| `index.html` → `.map-placeholder` | Sostituire con l'iframe di Google Maps (`<iframe class="map-frame" …>`). Lo snippet è nel commento sopra. |
| `js/data.js` → `CONTACTS.email` | Inserire l'indirizzo reale se serve. |

## 7. Note tecniche

- **Responsive**: il calendario passa da griglia settimanale a **accordion** sotto i 860px, e si ridisegna al cambio di breakpoint. Sotto gli 860px compare anche una CTA WhatsApp flottante.
- **Accessibilità**: skip link, `aria-pressed` sui filtri, `aria-expanded` su menu e accordion, `aria-live` su calendario e stato del form, focus visibile.
- **Motion**: le animazioni allo scroll usano `IntersectionObserver` e vengono disattivate con `prefers-reduced-motion: reduce`.
- **Form di contatto**: essendo un sito statico non c'è backend. Il form valida i campi e apre WhatsApp con il messaggio precompilato. Per passare a un invio via email, sostituire l'handler di submit in `js/contact.js` con una `fetch` verso Formspree, Netlify Forms o un endpoint proprio.
- **Font**: Barlow Condensed (titoli) e Inter (testo), caricati da Google Fonts.
