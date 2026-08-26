# AGENTS.md — Istruzioni per chi lavora su questo progetto

> **Leggi questo file prima di toccare il codice.** Contiene lo stato reale del
> progetto, le decisioni già prese e il motivo per cui sono state prese così.
> Molte scelte sembrano strane finché non se ne conosce il vincolo.

**Se sei un'IA: alla fine del tuo lavoro devi aggiornare questo file.** Le regole
stanno in fondo, sezione «Manutenzione di questo file». Non è facoltativo: è
l'unico modo perché chi arriva dopo di te non rifaccia il lavoro o rompa
qualcosa che sembrava inutile.

---

## 1. Cos'è

Sito e web app per **CrossFit Black Street**, box CrossFit® e HYROX® Official
Gym a Genova. Tre pagine, un solo dominio:

| Pagina | A chi serve | Cosa fa |
|---|---|---|
| `index.html` | pubblico | vetrina: chi siamo, servizi, palinsesto, eventi, WOD Senza Respiro, Instagram, contatti |
| `area.html` | soci | registrazione, certificato medico, prenotazione classi |
| `admin.html` | staff | eventi, richieste, soci, classi, team |

**Stack:** HTML + CSS + JavaScript ES Modules. Nessun framework, nessun build
step, nessuna dipendenza npm. Backend Firebase (Firestore + Auth), piano
**Spark gratuito**.

**Deploy:** GitHub Pages dalla root di `main`. Ogni push è un deploy.
Non esistono ambienti di staging: quello che va su `main` è in produzione.

---

## 2. Le decisioni che non vanno cambiate senza capirle

Queste scelte sembrano contorte, ma ognuna risolve un vincolo preciso.
Semplificarle a cuor leggero rompe qualcosa.

### 2.1 La home NON carica l'SDK Firebase

L'SDK Firestore pesa ~110 KB gzip; tutta la home ne spedisce ~12. Sarebbe
diventato l'elemento più pesante del sito per fare due chiamate.

`index.html` parla con Firestore via **REST API** (`js/firebase/rest.js`, ~60
righe). L'SDK completo si carica in `import()` dinamico solo da `area.html` e
`admin.html`, dove servono Auth, realtime e transazioni.

Le Security Rules valgono identiche su REST e SDK: è lo stesso backend.

### 2.2 Il limite dei posti sta in un contatore, non in una query

Le Security Rules **non sanno contare documenti**. Non si può scrivere
«consenti se le prenotazioni di questo slot sono meno di 14», e le Cloud
Functions richiedono il piano a pagamento.

Quindi ogni sessione ha un campo `booked`, aggiornato **in transazione**
insieme alla prenotazione. Le regole legano i due documenti con
`existsAfter()` / `getAfter()`:

- senza quel vincolo si potrebbe gonfiare il contatore senza prenotare,
  facendo risultare pieno un corso vuoto;
- senza il vincolo speculare sulla cancellazione, si libererebbero posti altrui.

**Non sostituire la transazione con due scritture separate.**

### 2.3 Il certificato medico è base64 dentro Firestore

Firebase Storage richiede il piano a pagamento. Il documento è quindi una
stringa base64 in `certificates/{uid}`.

Vincolo insuperabile: **un documento Firestore non può superare 1 MiB**, e il
base64 gonfia i byte di ~33%. Da qui il limite di 700 KB e la compressione
delle immagini in `js/upload.js`.

**Il blob sta in una collection separata**, non sul profilo del socio: il
pannello elenca tutti i soci, e con i documenti sul profilo aprire l'elenco
scaricherebbe decine di megabyte. Sul profilo restano solo i metadati
(`certStatus`, `certExpiresAt`, …). Le regole vietano di elencare i
certificati (`allow list: if false`): si aprono uno alla volta.

### 2.4 Il proprietario è scritto dentro le regole

`ownerUid()` in `firestore.rules` contiene l'UID del titolare. Non è un campo
del database, quindi **nessuna scrittura può cambiarlo**. La riga che lo rende
inamovibile:

```
allow delete: if isOwner() && uid != ownerUid();
```

`OWNER_UID` in `js/firebase/config.js` serve **solo all'interfaccia**, per
nascondere i comandi inutilizzabili. Se i due divergono, l'interfaccia mente
ma la sicurezza regge. **Cambiando proprietario vanno aggiornati entrambi.**

### 2.5 Autenticarsi ≠ essere autorizzati

Con il login Google chiunque abbia un account può completare l'accesso: non è
impedibile. Il pannello si apre solo con un documento in `/admins`.

Gli inviti funzionano per email perché un UID non esiste finché la persona non
accede la prima volta: il titolare crea `invites/{email}`, e al primo accesso
il pannello prova a creare `admins/{uid}` — sono le regole a verificare
l'esistenza dell'invito e l'`email_verified`.

Senza `email_verified` chiunque conosca l'indirizzo di un invitato potrebbe
registrarsi con email/password e rubargli l'invito.

### 2.6 Smistamento fra le pagine

`area.html` manda lo staff al pannello; `admin.html` manda i soci all'area.
`js/redirect.js` impedisce che si rimbalzino all'infinito se entrambe
sbagliassero verdetto: **un solo rimbalzo per sessione**.

Chi viene reindirizzato **non viene disconnesso**: la sessione Firebase è
condivisa fra le pagine dello stesso dominio.

`admin.html?staff=1` mostra il riquadro con l'UID: serve solo a creare il
primissimo amministratore di un progetto nuovo.

### 2.7 Certificato approvato ≠ socio attivo

Sono due semafori distinti, e restano distinti: `certStatus` riguarda il
certificato medico, `status` riguarda il tesseramento. Un socio con certificato
valido ma quota non pagata non deve poter prenotare.

Approvando un certificato il pannello **chiede** se attivare anche il profilo,
perché nella pratica quasi sempre si vuole fare entrambe le cose — ma la
domanda resta, con la possibilità di rispondere no. Non unire i due campi:
si perderebbe la distinzione senza guadagnare nulla che la domanda non dia già.

### 2.8 Instagram: post scelti, non feed automatico

Mostrare «gli ultimi post» richiede la Graph API con account Business e un
access token da rinnovare ogni 60 giorni — quindi un backend che se ne occupi.
La Basic Display API, che bastava, è stata dismessa a fine 2024.

L'embed del singolo post (`instagram.com/p/{codice}/embed`) invece non ha
token né scadenze. Il carosello mostra quindi codici elencati in `data.js`.

Gli iframe si caricano **solo al click**: l'embed profila chi lo vede, e
caricarlo all'apertura significherebbe inviare i visitatori a Instagram senza
che l'abbiano chiesto. Vale anche come guadagno di velocità.

### 2.9 Immagini mancanti: segnaposto, mai icona rotta

Il sito viene pubblicato prima che tutte le foto esistano. `initPhotoFallback()`
in `ui.js` e il gestore in `senza-respiro.js` sostituiscono un'immagine non
trovata con un riquadro che dice quale file manca. Un'icona di file rotto fa
sembrare il sito abbandonato.

### 2.9bis La lista d'attesa non promuove nessuno: riserva il posto

Quando un posto si libera **non** viene assegnato al primo della coda.
Assegnarlo richiederebbe che un client scriva una prenotazione a nome di
qualcun altro, e aprire quel permesso sarebbe un buco molto più grande del
problema che risolve: chiunque potrebbe iscrivere chiunque.

Le regole fanno una cosa più semplice e altrettanto utile: finché
`waiting > 0`, il posto libero può prenderlo **solo** chi è in coda
(`takesSeat()` esige `waiting == 0`). Fra i presenti in coda vale l'ordine di
arrivo sul pulsante, non quello di iscrizione.

Il compromesso è consapevole: chi è quinto e sta guardando la pagina batte chi
è primo e non la sta guardando. Per un box da quattordici posti è accettabile,
e la pagina evidenzia il posto libero in tempo reale a tutti quelli in coda.
Una coda con ordine rigoroso richiede un server, quindi il piano Blaze.

**Un dettaglio di sicurezza che vale la pena non perdere:** `releasesSeat()`
esige `exists(bookingRef())`. Senza, chiunque potrebbe abbassare il contatore
di una classe a cui non è iscritto, farla risultare libera e mandarla in
overbooking. Era un buco presente fino alla Fase 1.

### 2.10 Niente notifiche push: il calendario del socio fa meglio

Le notifiche programmate («domani hai CrossFit alle 19.30») sembrano la cosa
ovvia, ma inviarle richiede credenziali server: un client non può spedire a
Firebase Cloud Messaging. Servirebbe una Cloud Function, quindi il piano a
pagamento.

L'alternativa non è un ripiego: un pulsante **«aggiungi al calendario»** che
genera un file `.ics`. Il promemoria lo dà il telefono, funziona anche offline,
non richiede permessi da concedere né infrastruttura da mantenere — e le
persone il proprio calendario lo guardano già.

Stesso ragionamento per le scadenze dei certificati: invece di email
automatiche, una lista nel pannello e un avviso sulla pagina del socio.

### 2.11 Degradazione graduale, sempre

Se Firestore non risponde, la bacheca eventi ricade su `js/data.js` e il
visitatore non se ne accorge. Se `apiKey` è vuota, il sito torna a essere
statico puro senza una sola chiamata di rete. **Ogni funzione nuova deve avere
un comportamento sensato quando il backend non c'è.**

---

## 3. Struttura

```
index.html · area.html · admin.html      pagine
firestore.rules                          ⭐ TUTTA la sicurezza
css/styles.css · admin.css · area.css    stili
js/
  data.js          ⭐ contenuti: orari, eventi di fallback, contatti
  main.js          entry della home
  area.js          area soci
  admin.js         pannello staff
  dom.js           helper el() / icon() / qs()
  schedule.js      calendario pubblico
  events.js        card evento
  services.js      card servizi + convenzione
  contact.js       form contatti
  ui.js            header, menu, scrollspy, reveal
  session-id.js    ID e date delle sessioni (condiviso area/admin)
  upload.js        compressione e codifica documenti
  redirect.js      smistamento fra le pagine
  ics.js           evento di calendario per le prenotazioni
  senza-respiro.js sezione progetto + carosello Instagram
  firebase/
    config.js      ⭐ credenziali, capienze, OWNER_UID
    rest.js        client Firestore senza SDK
    events-repo.js eventi con fallback
    leads-repo.js  richieste dal form
```

**Il grosso dei contenuti sta in `js/data.js`.** Orari, contatti e partner si
cambiano lì, senza toccare HTML o CSS.

---

## 4. Modello dati

| Collection | ID | Contenuto |
|---|---|---|
| `admins` | UID | chi può entrare nel pannello |
| `invites` | email | inviti in attesa; l'ID **è** l'email, serve a `exists()` |
| `users` | UID | soci: `status` (`pending`/`active`/`blocked`) + metadati certificato |
| `certificates` | UID | il documento in base64 |
| `sessions` | `2026-08-26_0930_CF` | occorrenza: `startsAt`, `type`, `capacity`, `booked`, `waiting`, `cancelled` |
| `bookings` | `{uid}_{sessionId}` | prenotazione; l'ID composto vieta i doppioni |
| `waitlist` | `{uid}_{sessionId}` | chi aspetta un posto; contatore `waiting` sulla sessione |
| `events` | auto | bacheca eventi, con bozze |
| `leads` | auto | richieste dal form contatti |

Gli **ID deterministici** non sono un vezzo: rendono la generazione del
calendario ripetibile e le prenotazioni non duplicabili senza alcuna query.

---

## 5. Stato attuale

### Fatto

- [x] Sito pubblico completo, responsive, con calendario interattivo filtrabile
- [x] Backend Firestore configurato (progetto `crossfit-black-street-website`)
- [x] Pannello admin: eventi (con bozze), richieste dal form
- [x] Login Google + email/password, con messaggi di errore in italiano
- [x] Team: inviti per email, revoca, proprietario inamovibile
- [x] Area soci: registrazione, prenotazione classi, disdetta
- [x] Certificato medico: caricamento con compressione, verifica, scadenza
- [x] Smistamento automatico soci ↔ staff, con guardia anti-rimbalzo
- [x] Approvazione certificato che propone anche l'attivazione del socio
- [x] Sfondo del hero disegnato in SVG animato, come segnaposto sostituibile
- [x] Sezione «WOD Senza Respiro» + carosello Instagram a caricamento differito
- [x] Foto reali: `senza-respiro-1.jpg`, `senza-respiro-2.jpg`, `box.jpg`
- [x] **Fase 1 completa**: lista d'attesa, termine di disdetta a 2 ore, vista
      presenze del giorno, certificati in scadenza, chiusure straordinarie
- [x] «Aggiungi al calendario» con file `.ics` e promemoria

### Da fare

Ordinato per quando fa male non averlo, non per quanto è divertente farlo.

#### Blocchi — prima di aprire ai soci

- [ ] **Pubblicare `firestore.rules` in console.** Finché non è fatto, area soci
      e prenotazioni non funzionano. È il blocco numero uno.
- [ ] **Privacy e GDPR.** Il sito archivia nome, email e **certificati medici**
      — dati sanitari, categoria particolare (art. 9). Servono informativa,
      consenso esplicito, politica di conservazione e cancellazione.

#### Fase 2 — far tornare le persone

- [ ] **Storico allenamenti** del socio: quante classi questo mese. Motiva e
      serve a chi controlla gli abbonamenti.
- [ ] **WOD del giorno**, pubblicato dal pannello. Trasforma il sito da vetrina
      a pagina che si apre ogni mattina.
- [ ] **PWA installabile**: manifest + service worker. Uno strumento che si usa
      tre volte a settimana merita un'icona sulla schermata iniziale.
- [ ] **Palinsesto editabile dal pannello** (oggi in `data.js`, serve un commit).

#### Fase 3 — farsi trovare e convertire

Richiedono contenuti della società, non codice.

- [ ] Contenuti reali: indirizzo del box, iframe Google Maps, evento in corso
      (quello in `data.js` è una demo con data passata). Lo sfondo del hero è
      ancora un disegno SVG.
- [ ] **Prezzi.** È la prima cosa che cerca chi valuta una palestra, e non c'è.
- [ ] **FAQ prima prova** e **sezione coach**: smontano le obiezioni di chi non
      ha mai fatto CrossFit.
- [ ] SEO locale: JSON-LD `SportsActivityLocation`, Google Business Profile.
- [ ] Font self-hosted (oggi da Google Fonts: l'IP dei visitatori va a Google).
- [ ] Notifica dei nuovi lead (EmailJS su Spark, o Cloud Function su Blaze).
- [ ] Capienze reali per tipo di classe (`SESSION_CAPACITY` in `config.js`).
- [ ] Testo di «WOD Senza Respiro» da confermare, e consenso di Lucia Dimola per
      nome e condizione di salute (dato particolare, art. 9).
- [ ] Codici dei post Instagram in `INSTAGRAM_POSTS` (`data.js`).

#### Fuori portata senza il piano Blaze

Non sono «da fare»: sono cose che richiedono un backend, quindi una decisione
di spesa prima che di codice.

- Pagamenti e abbonamenti online (servono un PSP e un webhook che lo ascolti).
- Notifiche push programmate — vedi §2.11.
- Email automatiche a soci e lead.

---

## 6. Convenzioni

- **Lingua:** italiano ovunque — interfaccia, commenti, messaggi di commit.
- **Nomi dei file immagine:** minuscoli, senza spazi né parentesi. Un nome come
  `WhatsApp Image 2026-08-26 at 01.03.39 (1).jpeg` va codificato negli
  indirizzi e si rompe con poco: rinominarlo con `git mv` appena arriva.
- **Commenti:** spiegano *perché*, non *cosa*. Un commento che ripete il codice
  è rumore; uno che spiega un vincolo invisibile vale oro. Guarda quelli
  esistenti prima di scriverne di nuovi.
- **Niente build step.** Non aggiungere bundler, TypeScript o npm senza un
  motivo forte: il valore di questo progetto è che chiunque lo apre e capisce.
- **Niente dipendenze runtime** oltre all'SDK Firebase da CDN.
- **Accessibilità:** `aria-*` sui componenti interattivi, focus visibile,
  rispetto di `prefers-reduced-motion`.
- **Errori:** mai ingoiarli. L'utente deve leggere cosa è andato storto e cosa
  può fare. I messaggi di Firebase vanno tradotti in italiano comprensibile.

---

## 7. Come si verifica

Non ci sono unit test formali. C'è un server statico e Playwright con l'SDK
Firebase **mockato**, che permette di provare i flussi senza toccare il
progetto reale.

```bash
python3 -m http.server 8000     # poi apri http://localhost:8000
```

Gli script di verifica usati finora vivono nella cartella di lavoro temporanea
della sessione, non nella repo. Il metodo, se serve rifarli:

1. intercetta `**/www.gstatic.com/firebasejs/**` e servi un modulo mock
2. intercetta `**/js/firebase/config.js` per iniettare una config finta
3. tieni un Firestore in memoria in `window.__db`
4. **il mock deve rispettare le regole** — se lascia passare scritture che
   Firestore rifiuterebbe, il test dà falsi positivi. È già successo: un mock
   troppo permissivo faceva auto-promuovere un socio ad admin.

Prima di ogni push: `node --check` su ogni file JS toccato, e nessun
`pageerror` nelle pagine provate.

---

## 8. Cose da sapere che fanno perdere tempo

- **Le regole non filtrano, valutano.** Una query non filtrata su una
  collection con regole per-documento viene rifiutata *in blocco*. Per questo
  la home interroga gli eventi con `where('published','==',true)`.
- **`[hidden]` non basta** se l'elemento ha un `display` esplicito. In
  `styles.css` c'è `[hidden] { display: none !important; }` proprio per questo.
- **`window.open()` va chiamata in modo sincrono** dentro l'handler del click,
  altrimenti il browser la blocca come popup. Per questo il form contatti apre
  WhatsApp *prima* di salvare il lead.
- **Uno snapshot di Firestore può arrivare dalla cache**, anche vuoto, prima
  della risposta del server. Non prendere decisioni distruttive senza aver
  controllato `snapshot.metadata.fromCache`.
- **`serverTimestamp()` è `null` localmente** finché il server non conferma.
- Il sandbox di sviluppo **blocca i domini Google**: font e Firestore reale non
  sono raggiungibili durante i test. Gli errori `ERR_TUNNEL_CONNECTION_FAILED`
  sono ambientali, non bug.

---

## 9. Manutenzione di questo file

**Chiunque lavori su questo progetto — persona o IA — deve aggiornare
`AGENTS.md` prima di chiudere il proprio intervento.** Il file è la memoria del
progetto: se non lo aggiorni, chi arriva dopo lavora su informazioni false.

Cosa aggiornare, ogni volta:

1. **Sezione 5** — sposta le voci completate in «Fatto», aggiungi il lavoro
   nuovo che hai scoperto necessario.
2. **Sezione 2** — se hai preso una decisione non ovvia, scrivila **con il
   vincolo che l'ha resa necessaria**. Senza il perché, chi arriva dopo la
   annulla pensando di semplificare.
3. **Sezione 8** — se hai perso mezz'ora su un comportamento inatteso,
   scrivilo: eviti a un altro di perderla.
4. **Sezione 3 e 4** — se hai aggiunto file o collection.

E scrivilo nel messaggio di commit, così resta traccia anche nella storia:

```
AGENTS.md aggiornato: chiunque lavori su questa repo, IA compresa,
deve mantenerlo allineato.
```

Se qualcosa in questo file è **sbagliato o superato**, correggilo: un documento
di cui non ci si fida è peggio di nessun documento.
