# CrossFit Black Street — Sito web

Sito one-page (SPA statica) per **CrossFit Black Street** — CrossFit® Box e HYROX® Official Gym.
Nessun build step, nessuna dipendenza: HTML + CSS + JavaScript ES Modules, pronto per GitHub Pages.

---

## 1. Struttura del progetto

```
.
├── index.html              # markup di tutte le sezioni
├── area.html               # area soci: registrazione e prenotazioni
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
│   ├── area.js             # logica dell'area soci
│   ├── admin.js            # logica del pannello admin
│   ├── session-id.js       # identità e date delle sessioni (condiviso)
│   ├── upload.js           # compressione e codifica dei documenti
│   └── firebase/
│       ├── config.js       # ⭐ credenziali del progetto Firebase
│       ├── rest.js         # client Firestore via REST (senza SDK)
│       ├── events-repo.js  # eventi: Firestore con fallback su data.js
│       └── leads-repo.js   # salvataggio richieste dal form
└── assets/
    └── img/                # immagini (hero, foto box, favicon)
```

**Stato del backend:** `js/firebase/config.js` è compilato con il progetto
`crossfit-black-street-website`. Il sito prova quindi a leggere gli eventi da Firestore e
ad archiviare le richieste del form. Se Firestore non risponde — regole non ancora
pubblicate, database non creato, rete assente — tutto ricade sui dati locali di `data.js`
senza che il visitatore se ne accorga. Per spegnere il backend basta svuotare `apiKey`.

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
| 7 | Area soci (`area.html`) | Login Google, certificato medico, prenotazione classi |

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

**3. Incolla la config** ✅ *fatto*
In `js/firebase/config.js`, dentro `FIREBASE_CONFIG`. Questi valori sono pubblici per
definizione: finiscono nel JS visibile a tutti, ed è normale — la sicurezza sta nelle
regole del punto 6, non nella segretezza della chiave.

Una precauzione che vale comunque la pena: in
[Google Cloud Console → Credenziali](https://console.cloud.google.com/apis/credentials)
si può limitare la chiave per **referrer HTTP** (`jarvis-00-ip.github.io/*` e l'eventuale
dominio custom). Non protegge i dati — a quello pensano le rules — ma impedisce ad altri
siti di consumare la quota del progetto.

**4. Crea il database**
*Build → Firestore Database → Crea database* → modalità **produzione** → regione
`eur3 (europe-west)` o `europe-west8 (Milano)`.

**5. Attiva il login**
*Build → Authentication → Get started → Sign-in method*:

- **Google** → abilita, scegli un nome pubblico per il progetto e l'email di supporto.
  È il metodo consigliato: nessuna password da creare, distribuire o ricordare, e lo
  staff entra con l'account Google che già usa.
- **Email/Password** (facoltativo) → abilita solo se serve un accesso per chi non ha un
  account Google. In quel caso crea l'utente da *Users → Add user*.

Il pannello mostra entrambi i metodi: se ne attivi uno solo, l'altro restituisce un
errore esplicito che dice quale provider abilitare.

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
Questo è il passaggio che conta di più, ed è anche quello su cui ci si blocca.

**Autenticarsi ≠ essere autorizzati.** Con il login Google *chiunque* abbia un account
Google può completare l'accesso — non c'è modo di impedirlo, ed è normale. Ciò che apre
il pannello è un documento in `/admins` con il proprio UID, creabile solo dalla console.
Senza quel documento le rules bloccano ogni lettura e ogni scrittura.

La procedura è pensata per essere fatta al contrario, e va bene così:

1. apri `admin.html` e fai **Continua con Google**
2. il pannello ti rifiuta e ti mostra **il tuo UID con un pulsante «Copia UID»**
3. Console Firebase → *Firestore → Avvia raccolta* → ID raccolta `admins`
4. ID documento: **incolla l'UID** · aggiungi un campo qualsiasi (es. `email`, stringa)
5. torna sul pannello e riaccedi: adesso entri

Per aggiungere un collega si ripete dal punto 1 con il suo account.

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

`admins/{uid}` — `email`, `createdAt`. La sola esistenza del documento concede i
privilegi. Nasce in due modi: creato a mano dalla console (il primo, il proprietario)
oppure auto-creato da chi accetta un invito. Mai modificabile dopo la creazione.

`invites/{email}` — `email`, `invitedBy`, `createdAt`. **L'ID del documento è l'email
invitata**, in minuscolo: non è un vezzo, è ciò che permette alla regola di `/admins` di
ritrovarlo con `exists()`. Le Security Rules non sanno fare query, sanno solo controllare
se un percorso esiste.

### 7.3.1 Team e inviti

Le regole ragionano per **UID**, ma un UID non esiste finché la persona non fa il primo
accesso. Invitare per email richiede quindi un giro in due tempi:

1. il proprietario crea `invites/coach@gmail.com` dalla scheda **Team**
2. il collaboratore accede con Google usando quell'indirizzo
3. il pannello prova a creare `admins/{suo-uid}`; le regole verificano che esista un
   invito intestato alla sua **email verificata** e lasciano passare
4. l'invito viene consumato — vale una volta sola, così un accesso revocato non può
   essere riottenuto rientrando

Il punto 3 è anche il modo in cui il pannello *scopre* se esiste un invito: prova a
scrivere e guarda se le regole rifiutano. Non c'è un controllo lato client di cui fidarsi.

**Perché `email_verified` è obbligatorio.** Senza quel controllo, chiunque conosca
l'indirizzo di un invitato potrebbe registrarsi con email/password usando quel dominio e
rubargli l'invito senza avere accesso alla casella. Google verifica sempre l'email; un
account email/password no, finché non conferma il messaggio.

### 7.3.2 Prenotazioni

`users/{uid}` — `name`, `email`, `phone`, `status`, più i metadati del certificato
(`certStatus`, `certUploadedAt`, `certExpiresAt`, `certNote`). `status` è **l'unico
interruttore che abilita le prenotazioni**: nasce `pending` e solo un admin lo porta ad
`active`, dopo aver verificato tesseramento e certificato medico.

`sessions/{id}` — una singola occorrenza di classe. ID deterministico
`2026-08-26_0930_CF`, così rigenerare il calendario non crea doppioni.
Campi: `startsAt`, `type`, `capacity`, `booked`.

`bookings/{uid}_{sessionId}` — ID composto: rende **impossibile prenotare due volte** la
stessa classe, senza bisogno di alcuna query.

**Il problema dei posti limitati.** Le Security Rules non sanno contare documenti: non si
può scrivere «consenti se le prenotazioni di questo slot sono meno di 14». E le Cloud
Functions richiedono il piano a pagamento. La soluzione è un **contatore denormalizzato**
`booked` sulla sessione, aggiornato in **transazione** insieme alla prenotazione:

```
allow update: if request.resource.data.booked == resource.data.booked + 1
            && request.resource.data.booked <= resource.data.capacity
            && existsAfter(/…/bookings/$(uid + '_' + sessionId));
```

`existsAfter()` guarda lo stato **dopo** che la transazione ha commesso. Senza quella
riga si potrebbe gonfiare il contatore senza prenotare, facendo risultare pieno un corso
vuoto; e senza il vincolo speculare sulla cancellazione, si libererebbero posti altrui.
Due soci che premono «Prenota» sull'ultimo posto nello stesso istante: la transazione ne
fa passare uno solo.

**Aprire le prenotazioni.** Il pannello, scheda *Classi*, genera le sessioni dal
palinsesto per le prossime settimane (`WEEKS_TO_GENERATE` in `config.js`). È idempotente:
le classi già esistenti vengono saltate, non sovrascritte — sovrascriverle azzererebbe il
contatore e cancellerebbe di fatto le prenotazioni.

### 7.3.3 Certificato medico

Firebase Storage richiede il piano a pagamento, quindi il documento è salvato come
**stringa base64 dentro Firestore**. Il vincolo che governa tutto: **un documento non può
superare 1 MiB**, e il base64 gonfia i byte di circa un terzo.

| File | In base64 | Esito |
|---|---|---|
| 700 KB | ~933 KB | entra, con margine |
| 800 KB | ~1,07 MB | documento rifiutato |

Da qui i due comportamenti in `js/upload.js`:

- **le foto vengono ricompresse** (lato lungo max 1600px, JPEG a qualità calante finché
  non rientrano). Una foto da telefono passa da alcuni MB a poche centinaia di KB
  restando leggibile. Prima si abbassa la qualità, poi le dimensioni: sfocare è meglio
  che rimpicciolire un documento che va letto;
- **i PDF non si comprimono nel browser**: sopra i 700 KB l'unica risposta onesta è
  dirlo, suggerendo di fotografare il certificato.

**Perché il blob sta in una collection separata.** `certificates/{uid}` contiene il file;
sul profilo del socio resta solo `certStatus`. Il pannello elenca tutti i soci: se ogni
riga trascinasse con sé qualche centinaio di KB di base64, aprire l'elenco scaricherebbe
decine di megabyte. Il documento si carica **su richiesta**, quando l'admin lo apre — e
le rules vietano esplicitamente di elencare la collection (`allow list: if false`).

**Il ciclo.** Il socio carica (vede l'anteprima prima di inviare) → `certStatus: 'pending'`
→ l'admin apre il documento, lo approva registrando la scadenza, oppure lo respinge con
un motivo che il socio legge. Un nuovo caricamento sostituisce il precedente e rimette
tutto in verifica: le regole impediscono al socio di dichiarare approvato il proprio
certificato.

### 7.3.4 Il proprietario è inamovibile

L'UID del proprietario è **scritto dentro `firestore.rules`**, nella funzione
`ownerUid()`. Non è un campo del database, quindi nessuna scrittura può cambiarlo:

| Azione | Proprietario | Altri admin |
|---|---|---|
| Gestire eventi e richieste | ✅ | ✅ |
| Invitare un collaboratore | ✅ | ❌ |
| Revocare un accesso | ✅ | ❌ |
| Essere revocato | **❌ mai** | ✅ dal proprietario |

La riga che lo garantisce è `allow delete: if isOwner() && uid != ownerUid();` — il
proprietario non può cancellare nemmeno sé stesso. Anche se l'account di un collaboratore
venisse compromesso, il massimo danno possibile è sugli eventi e sulle richieste: il
controllo del pannello non si perde.

Una revoca ha **effetto immediato**, anche a sessione aperta: le rules si rivalutano a
ogni richiesta, e il pannello se ne accorge dal listener sul team e chiude la sessione da
solo.

> **Per cambiare proprietario** servono due modifiche allineate: `ownerUid()` in
> `firestore.rules` (quella che conta) e `OWNER_UID` in `js/firebase/config.js` (quella
> che serve solo a mostrare i comandi giusti). Se divergono, l'interfaccia mente.

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

## 9. Privacy e adempimenti

> **Da sistemare prima di promuovere il sito.** Non è un dettaglio formale: da quando
> Firebase è attivo, il form scrive nome ed email in un database.

### Cosa raccoglie il sito oggi

| Dato | Dove finisce | Base giuridica |
|---|---|---|
| Nome, email, messaggio | Firestore, collection `leads` | **da definire** (consenso) |
| Timestamp dell'ultimo invio | `localStorage` del visitatore | tecnico, nessun consenso |
| Indirizzo IP | Google Fonts, a ogni caricamento | da valutare |

Il `localStorage` serve solo al rate limit antispam: è strettamente necessario al
funzionamento, quindi non richiede banner.

### Cosa manca

1. **Informativa privacy** (`privacy.html`) — titolare, finalità, tempi di conservazione,
   diritti dell'interessato, e il fatto che i dati sono su Firebase (Google).
2. **Checkbox di consenso obbligatorio** nel form, con link all'informativa.
3. **Consenso archiviato** insieme al lead: va aggiunto alle chiavi ammesse in
   `firestore.rules` (`hasOnly`), altrimenti la scrittura viene rifiutata.

Finché questi tre punti mancano, l'opzione prudente è **svuotare `apiKey` in
`js/firebase/config.js`**: il form torna ad aprire solo WhatsApp e non si costruisce un
archivio di dati personali.

### Google Analytics: volutamente spento

Il progetto Firebase ha Analytics attivo (`measurementId` nella config), ma il sito **non
lo inizializza**. Analytics scrive cookie di profilazione: in UE servirebbe un banner con
consenso preventivo e blocco degli script prima del consenso. Per contare i visitatori
senza banner ci sono alternative cookieless (Plausible, Umami, Cloudflare Web Analytics).

### Google Fonts

I font arrivano dal CDN di Google, quindi l'IP dei visitatori raggiunge Google a ogni
caricamento. Scaricarli in `assets/fonts/` e servirli dal proprio dominio chiude la
questione e toglie anche una richiesta esterna dal percorso critico.
