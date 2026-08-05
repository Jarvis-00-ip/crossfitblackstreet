# CrossFit Black Street — Sito web

Sito one-page (SPA statica) per **CrossFit Black Street** — CrossFit® Box e HYROX® Official Gym.
Nessun build step, nessuna dipendenza: HTML + CSS + JavaScript ES Modules, pronto per GitHub Pages.

---

## 1. Struttura del progetto

```
.
├── index.html              # markup di tutte le sezioni
├── admin.html              # pannello di amministrazione (non linkato dal sito)
├── .nojekyll               # disattiva Jekyll su GitHub Pages
├── firestore.rules         # ⭐ TUTTA la sicurezza del backend
├── firebase.json           # config per `firebase deploy`
├── css/
│   ├── styles.css          # design tokens + stili (organizzato in 15 blocchi commentati)
│   └── admin.css           # stili del pannello admin
├── js/
│   ├── main.js             # entry point: monta i componenti
│   ├── data.js             # ⭐ CONTENUTI (orari, eventi di fallback, contatti, partner)
│   ├── dom.js              # helper el() / icon() / qs()
│   ├── schedule.js         # componente calendario interattivo
│   ├── events.js           # componente card evento
│   ├── services.js         # card servizi + box convenzione
│   ├── contact.js          # validazione form + lead + invio WhatsApp
│   ├── ui.js               # header, menu mobile, scrollspy, reveal on scroll
│   ├── admin.js            # logica del pannello admin (unico file che usa l'SDK)
│   └── firebase/
│       ├── config.js       # ⭐ credenziali del progetto Firebase
│       ├── rest.js         # client Firestore via REST (senza SDK)
│       ├── events-repo.js  # eventi: Firestore con fallback su data.js
│       └── leads-repo.js   # salvataggio richieste dal form
└── assets/
    └── img/                # immagini (hero, foto box, favicon)
```

**Il backend è opzionale.** Finché `js/firebase/config.js` resta vuoto il sito funziona
esattamente come un sito statico: eventi da `data.js`, form che apre WhatsApp, zero
chiamate di rete verso Firebase.

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

> Se hai configurato Firebase (sezione 7), gli eventi si gestiscono dal **pannello admin**
> e l'array `EVENTS` resta come rete di sicurezza: viene usato quando Firestore non è
> raggiungibile o non contiene eventi pubblicati.

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

## 7. Backend Firebase

Il backend aggiunge due cose: le **richieste dal form vengono archiviate** invece di
sparire dentro WhatsApp, e gli **eventi si gestiscono da un pannello** invece che con un
commit. Il palinsesto resta in `data.js`.

Tutto sta nel piano **Spark (gratuito)**: nessuna Cloud Function, nessuna carta di credito.

### 7.1 Architettura

| | Sito pubblico (`index.html`) | Pannello admin (`admin.html`) |
|---|---|---|
| SDK Firebase | **nessuno** | SDK completo, da CDN in `import()` dinamico |
| Come parla con Firestore | REST API (`js/firebase/rest.js`) | SDK, in realtime |
| Peso aggiunto | ~2 KB di codice | irrilevante (pagina interna) |

L'SDK Firestore pesa ~110 KB gzip: su una landing page che spedisce ~15 KB di JS totali
sarebbe diventato l'elemento più pesante del sito, per fare due chiamate. Le REST API
rispondono alle stesse Security Rules — è lo stesso backend — quindi non si perde nulla
in sicurezza.

### 7.2 Setup passo per passo

**1. Crea il progetto**
[console.firebase.google.com](https://console.firebase.google.com) → *Aggiungi progetto*.
Google Analytics non serve.

**2. Registra l'app web**
Nel progetto → icona `</>` → dai un nome → **non** attivare Firebase Hosting (il sito
resta su GitHub Pages). Copia l'oggetto `firebaseConfig` che ti viene mostrato.

**3. Incolla la config**
In `js/firebase/config.js`, dentro `FIREBASE_CONFIG`. Questi valori sono pubblici per
definizione: finiscono nel JS visibile a tutti, ed è normale — la sicurezza sta nelle
regole del punto 6.

**4. Crea il database**
*Build → Firestore Database → Crea database* → modalità **produzione** → regione
`eur3 (europe-west)` o `europe-west8 (Milano)`.

**5. Attiva il login**
*Build → Authentication → Get started → Email/Password* → abilita. Poi *Users → Add user*:
crea l'account dello staff con una password robusta.

**6. Pubblica le Security Rules**
Copia il contenuto di `firestore.rules` in *Firestore → Regole → Pubblica*. Oppure, con la
CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # seleziona il progetto
firebase deploy --only firestore:rules
```

**7. Autorizza te stesso come admin**
Avere un account **non basta**: serve un documento in `/admins` con il tuo UID. È voluto —
così nessuno si promuove da solo creando un utente.

- Copia l'UID da *Authentication → Users*
- *Firestore → Avvia raccolta* → ID raccolta `admins`
- ID documento: **incolla l'UID** · aggiungi un campo qualsiasi (es. `email`, stringa)

**8. Autorizza il dominio**
*Authentication → Settings → Authorized domains* → aggiungi
`<utente>.github.io`. Senza questo passaggio il login non parte.

**9. Provalo**
Apri `https://<utente>.github.io/crossfitblackstreet/admin.html`, accedi, crea un evento
con **Pubblicato** attivo: comparirà nella bacheca del sito.

### 7.3 Modello dati

`events/{id}` — le chiavi sono vincolate dalle rules, non aggiungerne altre dal codice:

| campo | tipo | note |
|---|---|---|
| `title` | string | obbligatorio, max 80 |
| `badge` `date` `time` `info` | string | opzionali |
| `description` | string | max 600 |
| `workout` | array&lt;string&gt; | max 20 righe |
| `featured` | bool | mostrato per primo |
| `published` | bool | `false` = bozza, invisibile al pubblico |
| `sortIndex` | int | ordinamento crescente |
| `createdAt` `updatedAt` | timestamp | scritti dal pannello |

`leads/{id}` — `name`, `email`, `message`, `source`, `createdAt` (+ `handled`, aggiunto
dall'admin). Nessuno può rileggerli tranne gli admin: gli indirizzi dei clienti non sono
pubblici.

`admins/{uid}` — la sola esistenza del documento concede i privilegi. Scrittura vietata a
tutti: si aggiunge un admin solo dalla console.

### 7.4 Antispam

La collection `leads` è scrivibile da chiunque — è inevitabile, il form è pubblico. Difese
attive:

1. **Validazione nelle rules** — chiavi esatte, lunghezze massime, formato email,
   `createdAt` coerente con l'orologio del server. È l'unico livello che il client non può
   scavalcare.
2. **Honeypot** — campo invisibile nel form: se arriva compilato, è un bot.
3. **Rate limit** — un invio per minuto per browser.

**Se lo spam diventa un problema**, il passo successivo è
[App Check](https://firebase.google.com/docs/app-check) con reCAPTCHA v3 (gratuito). Va
però messo in conto un effetto collaterale: con App Check *enforced* ogni richiesta a
Firestore deve portare un token, quindi la lettura degli eventi non potrebbe più usare le
REST API e l'SDK tornerebbe sulla home. Per una bacheca eventi conviene solo se il form
viene davvero preso di mira.

### 7.5 Notifica email dei nuovi lead

Su Spark non ci sono Cloud Functions, quindi non c'è modo di mandare una email
automatica dal backend. Le opzioni:

- **così com'è** — le richieste si leggono nel pannello, tab *Richieste*, con contatore
  di quelle da gestire. Nessun costo, nessun servizio in più;
- **[EmailJS](https://www.emailjs.com)** — piano gratuito, 200 email/mese, chiamata dal
  browser dentro `saveLead()`;
- **piano Blaze** — Cloud Function su `onDocumentCreated('leads/{id}')`, oppure
  l'estensione *Trigger Email*. A questi volumi la spesa reale è vicina a zero, ma serve
  una carta.

## 8. Note tecniche

- **Responsive**: il calendario passa da griglia settimanale a **accordion** sotto i 860px, e si ridisegna al cambio di breakpoint. Sotto gli 860px compare anche una CTA WhatsApp flottante.
- **Accessibilità**: skip link, `aria-pressed` sui filtri, `aria-expanded` su menu e accordion, `aria-live` su calendario e stato del form, focus visibile.
- **Motion**: le animazioni allo scroll usano `IntersectionObserver` e vengono disattivate con `prefers-reduced-motion: reduce`.
- **Form di contatto**: valida i campi, apre WhatsApp col messaggio precompilato e — se Firebase è configurato — archivia la richiesta su Firestore. L'apertura di WhatsApp avviene **prima** del salvataggio, e non per caso: `window.open()` deve restare dentro il gesto utente, altrimenti il browser la blocca come popup. Il salvataggio quindi non blocca mai la conversione.
- **Eventi**: primo paint immediato da `data.js`, poi sostituzione con i dati di Firestore solo se il backend risponde. Se Firestore è vuoto, in errore o non configurato, la bacheca resta popolata invece di svuotarsi.
- **Font**: Barlow Condensed (titoli) e Inter (testo), caricati da Google Fonts.
