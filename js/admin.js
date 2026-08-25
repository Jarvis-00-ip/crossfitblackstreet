/**
 * admin.js — Pannello di amministrazione.
 *
 * Unico punto del sito che carica l'SDK Firebase completo, e lo fa con
 * `import()` dinamico: la home resta a zero dipendenze.
 *
 * Cosa permette di fare:
 *  - login staff con Google oppure email + password
 *  - CRUD degli eventi in bacheca, in tempo reale
 *  - consultazione delle richieste arrivate dal form di contatto
 *  - gestione del team: inviti per email e revoca degli accessi
 *  - approvazione dei soci e apertura delle classi prenotabili
 *
 * Nota sull'autorizzazione: autenticarsi non significa essere autorizzati.
 * Con il login Google chiunque abbia un account può completare l'accesso; per
 * entrare serve in più un documento in /admins con il proprio UID, creato a
 * mano dalla console. Il controllo qui
 * sotto è solo per l'interfaccia — quello che conta è in `firestore.rules`,
 * perché il client è sempre manipolabile.
 */

import { qs, el } from './dom.js';
import {
  FIREBASE_CONFIG, FIREBASE_SDK_VERSION, COLLECTIONS, isConfigured, isOwner,
  SESSION_CAPACITY, WEEKS_TO_GENERATE,
} from './firebase/config.js';
import { SCHEDULE, CLASS_TYPES } from './data.js';
import { expandSchedule, asDate } from './session-id.js';
import { toDataUrl, humanSize } from './upload.js';
import { redirectOnce, clearBounce } from './redirect.js';

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

const views = {
  setup: qs('#setupView'),
  login: qs('#loginView'),
  app: qs('#appView'),
};

function showView(name) {
  Object.entries(views).forEach(([key, node]) => {
    if (node) node.hidden = key !== name;
  });
}

function showError(message) {
  const box = qs('#globalError');
  box.textContent = message;
  box.hidden = !message;
}

/** Messaggi di errore Firebase → italiano comprensibile. */
function authMessage(code) {
  const map = {
    'auth/invalid-email': 'Indirizzo email non valido.',
    'auth/user-disabled': 'Questo account è stato disabilitato.',
    'auth/user-not-found': 'Email o password non corretti.',
    'auth/wrong-password': 'Email o password non corretti.',
    'auth/invalid-credential': 'Email o password non corretti.',
    'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
    'auth/network-request-failed': 'Connessione assente. Controlla la rete.',
    'auth/unauthorized-domain':
      'Dominio non autorizzato: aggiungilo in Firebase → Authentication → Settings → Authorized domains.',
    'auth/popup-blocked':
      'Il browser ha bloccato la finestra di Google. Consenti i popup per questo sito e riprova.',
    'auth/popup-closed-by-user': 'Finestra di Google chiusa prima di completare l\'accesso.',
    'auth/cancelled-popup-request': '',
    'auth/account-exists-with-different-credential':
      'Questo indirizzo è già registrato con email e password: usa il form qui sotto.',
    'auth/operation-not-allowed':
      'Provider non attivo: abilitalo in Firebase → Authentication → Sign-in method.',
  };
  return map[code] || 'Accesso non riuscito. Riprova.';
}

const dateFmt = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const sessionFmt = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});

/* ------------------------------------------------------------------ *
 * Bootstrap
 * ------------------------------------------------------------------ */

async function boot() {
  if (!isConfigured()) {
    showView('setup');
    return;
  }

  let sdk;
  try {
    sdk = await loadSdk();
  } catch (error) {
    showView('setup');
    showError(
      `Impossibile caricare l'SDK Firebase ${FIREBASE_SDK_VERSION} dal CDN (${error.message}). ` +
        'Verifica la connessione, o aggiorna FIREBASE_SDK_VERSION in js/firebase/config.js.'
    );
    return;
  }

  const { initializeApp, auth: A, store: S } = sdk;
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = A.getAuth(app);
  const db = S.getFirestore(app);

  initLogin(auth, A);
  watchAuth({ auth, db, A, S });
}

async function loadSdk() {
  const [appMod, authMod, storeMod] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);
  return { initializeApp: appMod.initializeApp, auth: authMod, store: storeMod };
}

/* ------------------------------------------------------------------ *
 * Autenticazione
 * ------------------------------------------------------------------ */

function initLogin(auth, A) {
  const form = qs('#loginForm');
  const status = qs('#loginStatus');
  const button = qs('#loginBtn');
  const googleBtn = qs('#googleBtn');

  // Ogni nuovo tentativo riparte pulito. Il reset avviene qui e non nel
  // callback di onAuthStateChanged: quel callback scatta anche durante il
  // signOut di un account non autorizzato, e cancellerebbe l'UID appena
  // mostrato prima che l'utente riesca a copiarlo.
  function startAttempt(message) {
    qs('#uidBox').hidden = true;
    status.className = 'form-status';
    status.textContent = message;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    startAttempt('Accesso in corso…');
    button.disabled = true;

    try {
      await A.signInWithEmailAndPassword(auth, qs('#loginEmail').value.trim(), qs('#loginPassword').value);
      status.textContent = '';
    } catch (error) {
      status.classList.add('err');
      status.textContent = authMessage(error.code);
    } finally {
      button.disabled = false;
    }
  });

  googleBtn.addEventListener('click', async () => {
    startAttempt('Apertura di Google…');
    googleBtn.disabled = true;

    try {
      const provider = new A.GoogleAuthProvider();
      // `prompt: select_account` evita che il browser riusi in automatico
      // l'unico account già collegato: al box il PC è spesso condiviso.
      provider.setCustomParameters({ prompt: 'select_account' });
      await A.signInWithPopup(auth, provider);
      status.textContent = '';
    } catch (error) {
      const message = authMessage(error.code);
      status.classList.add('err');
      status.textContent = message; // stringa vuota = popup sostituito da un altro
    } finally {
      googleBtn.disabled = false;
    }
  });

  // L'UID è il dato da incollare in Firestore per abilitare un account:
  // averlo dietro un click evita errori di trascrizione.
  qs('#uidCopy').addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(qs('#uidValue').textContent);
      e.target.textContent = 'Copiato ✓';
      setTimeout(() => { e.target.textContent = 'Copia UID'; }, 2000);
    } catch {
      // Clipboard negata (contesto non sicuro): resta selezionabile a mano.
      window.getSelection()?.selectAllChildren(qs('#uidValue'));
    }
  });

  qs('#logoutBtn').addEventListener('click', () => A.signOut(auth));
}

function watchAuth({ auth, db, A, S }) {
  let unsubscribers = [];

  const stopListeners = () => {
    unsubscribers.forEach((fn) => fn());
    unsubscribers = [];
  };

  A.onAuthStateChanged(auth, async (user) => {
    stopListeners();
    showError('');

    if (!user) {
      qs('#adminUser').hidden = true;
      qs('#loginPassword').value = '';
      showView('login');
      return;
    }

    // Autorizzazione: serve il documento /admins/{uid}.
    let authorized = false;
    try {
      const snap = await S.getDoc(S.doc(db, COLLECTIONS.admins, user.uid));
      authorized = snap.exists();
    } catch {
      authorized = false;
    }

    // Non è ancora admin: potrebbe però avere un invito in attesa intestato
    // alla sua email. Provare a crearsi il documento è anche il modo più
    // affidabile di verificarlo: se l'invito non esiste sono le regole a
    // rifiutare, e nessuno può fingere il contrario dal client.
    if (!authorized) {
      authorized = await claimInvite({ db, S, user });
    }

    if (!authorized) {
      // Autenticato ma non autorizzato: sono due cose diverse, ed è voluto.
      // Chiunque abbia un account Google può arrivare fin qui; solo un UID
      // presente in /admins supera le rules.
      //
      // Chi non è staff è quasi sempre un socio che ha sbagliato indirizzo:
      // il suo posto è l'area soci, non una schermata con un UID che non gli
      // serve. Nessun signOut prima di mandarlo là — la sessione Firebase è
      // condivisa fra le pagine, e disconnetterlo lo costringerebbe a
      // rifare il login appena arrivato.
      //
      // Il riquadro con l'UID resta raggiungibile con `admin.html?staff=1`:
      // serve solo a creare il primissimo amministratore di un progetto
      // nuovo, quando ancora non c'è nessuno che possa mandare un invito.
      const wantsStaffInfo = new URLSearchParams(window.location.search).has('staff');

      if (!wantsStaffInfo && redirectOnce('area.html')) return;

      const { email, uid } = user;
      await A.signOut(auth);
      showView('login');

      qs('#loginStatus').className = 'form-status';
      qs('#loginStatus').textContent = '';
      qs('#uidEmail').textContent = email || 'Questo account';
      qs('#uidValue').textContent = uid;
      qs('#uidBox').hidden = false;
      return;
    }

    // Arrivato a destinazione: la guardia anti-rimbalzo può azzerarsi.
    clearBounce();

    qs('#adminEmail').textContent = user.email;
    qs('#adminUser').hidden = false;
    showView('app');

    unsubscribers = [
      initEvents({ db, S }),
      initLeads({ db, S }),
      initTeam({ db, S, A, auth, user }),
      initMembers({ db, S }),
      initSessions({ db, S }),
    ];
  });
}

/* ------------------------------------------------------------------ *
 * Eventi
 * ------------------------------------------------------------------ */

function initEvents({ db, S }) {
  const form = qs('#eventForm');
  const list = qs('#eventsList');
  const status = qs('#eventStatus');
  const resetBtn = qs('#resetEventBtn');
  const saveBtn = qs('#saveEventBtn');

  const fields = {
    id: qs('#eventId'),
    title: qs('#eventTitle'),
    badge: qs('#eventBadge'),
    date: qs('#eventDate'),
    time: qs('#eventTime'),
    description: qs('#eventDescription'),
    workout: qs('#eventWorkout'),
    info: qs('#eventInfo'),
    sortIndex: qs('#eventSort'),
    featured: qs('#eventFeatured'),
    published: qs('#eventPublished'),
  };

  function resetForm() {
    form.reset();
    fields.id.value = '';
    fields.published.checked = true;
    qs('#eventFormTitle').textContent = 'Nuovo evento';
    resetBtn.hidden = true;
    status.className = 'form-status';
    status.textContent = '';
  }

  function fillForm(event) {
    fields.id.value = event.id;
    fields.title.value = event.title || '';
    fields.badge.value = event.badge || '';
    fields.date.value = event.date || '';
    fields.time.value = event.time || '';
    fields.description.value = event.description || '';
    fields.workout.value = (event.workout || []).join('\n');
    fields.info.value = event.info || '';
    fields.sortIndex.value = event.sortIndex ?? 0;
    fields.featured.checked = Boolean(event.featured);
    fields.published.checked = Boolean(event.published);

    qs('#eventFormTitle').textContent = 'Modifica evento';
    resetBtn.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fields.title.focus();
  }

  resetBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = fields.title.value.trim();
    if (title.length < 1) {
      status.className = 'form-status err';
      status.textContent = 'Il titolo è obbligatorio.';
      fields.title.focus();
      return;
    }

    // Le chiavi devono corrispondere esattamente a quelle ammesse dalle
    // Security Rules (`hasOnly`), altrimenti la scrittura viene rifiutata.
    const payload = {
      title,
      badge: fields.badge.value.trim(),
      date: fields.date.value.trim(),
      time: fields.time.value.trim(),
      description: fields.description.value.trim(),
      workout: fields.workout.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 20),
      info: fields.info.value.trim(),
      featured: fields.featured.checked,
      published: fields.published.checked,
      sortIndex: Number.parseInt(fields.sortIndex.value, 10) || 0,
      updatedAt: S.serverTimestamp(),
    };

    saveBtn.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Salvataggio…';

    try {
      if (fields.id.value) {
        await S.updateDoc(S.doc(db, COLLECTIONS.events, fields.id.value), payload);
      } else {
        await S.addDoc(S.collection(db, COLLECTIONS.events), {
          ...payload,
          createdAt: S.serverTimestamp(),
        });
      }
      resetForm();
      status.className = 'form-status ok';
      status.textContent = 'Evento salvato.';
    } catch (error) {
      status.className = 'form-status err';
      status.textContent = `Salvataggio non riuscito: ${error.message}`;
    } finally {
      saveBtn.disabled = false;
    }
  });

  async function remove(event) {
    if (!window.confirm(`Eliminare definitivamente «${event.title}»?`)) return;
    try {
      await S.deleteDoc(S.doc(db, COLLECTIONS.events, event.id));
      if (fields.id.value === event.id) resetForm();
    } catch (error) {
      showError(`Eliminazione non riuscita: ${error.message}`);
    }
  }

  async function togglePublished(event) {
    try {
      await S.updateDoc(S.doc(db, COLLECTIONS.events, event.id), {
        published: !event.published,
        updatedAt: S.serverTimestamp(),
      });
    } catch (error) {
      showError(`Aggiornamento non riuscito: ${error.message}`);
    }
  }

  function row(event) {
    const classes = ['admin-row', event.published ? '' : 'is-draft', event.featured ? 'is-featured' : '']
      .filter(Boolean)
      .join(' ');

    return el('article', { class: classes }, [
      el('div', { class: 'admin-row-head' }, [
        el('h3', { class: 'admin-row-title', text: event.title }),
        el('div', { class: 'pill-row' }, [
          event.featured ? el('span', { class: 'pill on', text: 'In evidenza' }) : null,
          el('span', {
            class: `pill${event.published ? '' : ' warn'}`,
            text: event.published ? 'Pubblicato' : 'Bozza',
          }),
        ]),
      ]),
      el('p', {
        class: 'admin-row-meta',
        text: [event.date, event.time].filter(Boolean).join(' · ') || 'Data non indicata',
      }),
      event.description ? el('p', { class: 'admin-row-body', text: event.description }) : null,
      el('div', { class: 'admin-row-actions' }, [
        el('button', { class: 'mini-btn', type: 'button', text: 'Modifica', onClick: () => fillForm(event) }),
        el('button', {
          class: 'mini-btn',
          type: 'button',
          text: event.published ? 'Metti in bozza' : 'Pubblica',
          onClick: () => togglePublished(event),
        }),
        el('button', { class: 'mini-btn danger', type: 'button', text: 'Elimina', onClick: () => remove(event) }),
      ]),
    ]);
  }

  // Realtime: la lista si aggiorna da sola, anche se modifica un collega.
  return S.onSnapshot(
    S.collection(db, COLLECTIONS.events),
    (snapshot) => {
      const events = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));

      qs('#eventsCount').textContent = String(events.length);
      list.replaceChildren(
        ...(events.length
          ? events.map(row)
          : [el('p', { class: 'admin-empty', text: 'Nessun evento. Creane uno dal form a fianco.' })])
      );
    },
    (error) => showError(`Lettura eventi non riuscita: ${error.message}`)
  );
}

/* ------------------------------------------------------------------ *
 * Richieste dal form
 * ------------------------------------------------------------------ */

function initLeads({ db, S }) {
  const list = qs('#leadsList');

  async function setHandled(lead, handled) {
    try {
      await S.updateDoc(S.doc(db, COLLECTIONS.leads, lead.id), { handled });
    } catch (error) {
      showError(`Aggiornamento non riuscito: ${error.message}`);
    }
  }

  async function remove(lead) {
    if (!window.confirm(`Eliminare la richiesta di ${lead.name}?`)) return;
    try {
      await S.deleteDoc(S.doc(db, COLLECTIONS.leads, lead.id));
    } catch (error) {
      showError(`Eliminazione non riuscita: ${error.message}`);
    }
  }

  function row(lead) {
    const when = lead.createdAt?.toDate ? dateFmt.format(lead.createdAt.toDate()) : '—';

    return el('article', { class: `admin-row${lead.handled ? '' : ' is-new'}` }, [
      el('div', { class: 'admin-row-head' }, [
        el('h3', { class: 'admin-row-title', text: lead.name }),
        el('span', {
          class: `pill${lead.handled ? '' : ' warn'}`,
          text: lead.handled ? 'Gestita' : 'Da gestire',
        }),
      ]),
      el('p', { class: 'admin-row-meta', text: `${lead.email} · ${when}` }),
      el('p', { class: 'admin-row-body', text: lead.message }),
      el('div', { class: 'admin-row-actions' }, [
        el('a', {
          class: 'mini-btn',
          href: `mailto:${lead.email}?subject=${encodeURIComponent('CrossFit Black Street')}`,
          text: 'Rispondi via email',
        }),
        el('button', {
          class: 'mini-btn',
          type: 'button',
          text: lead.handled ? 'Segna da gestire' : 'Segna gestita',
          onClick: () => setHandled(lead, !lead.handled),
        }),
        el('button', { class: 'mini-btn danger', type: 'button', text: 'Elimina', onClick: () => remove(lead) }),
      ]),
    ]);
  }

  return S.onSnapshot(
    S.query(S.collection(db, COLLECTIONS.leads), S.orderBy('createdAt', 'desc'), S.limit(100)),
    (snapshot) => {
      const leads = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pending = leads.filter((l) => !l.handled).length;

      qs('#leadsCount').textContent = String(pending);
      list.replaceChildren(
        ...(leads.length
          ? leads.map(row)
          : [el('p', { class: 'admin-empty', text: 'Nessuna richiesta ricevuta finora.' })])
      );
    },
    (error) => showError(`Lettura richieste non riuscita: ${error.message}`)
  );
}

/* ------------------------------------------------------------------ *
 * Soci
 * ------------------------------------------------------------------ */

const STATUS_LABEL = {
  pending: 'In attesa',
  active: 'Attivo',
  blocked: 'Sospeso',
};

function initMembers({ db, S }) {
  const list = qs('#membersList');
  const filters = qs('#memberFilters');
  const state = { filter: 'pending', members: [] };

  [
    { value: 'pending', label: 'Da attivare' },
    { value: 'active', label: 'Attivi' },
    { value: 'blocked', label: 'Sospesi' },
    { value: 'ALL', label: 'Tutti' },
  ].forEach((opt) => {
    filters.append(el('button', {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(state.filter === opt.value),
      dataset: { value: opt.value },
      text: opt.label,
      onClick: () => {
        state.filter = opt.value;
        [...filters.children].forEach((c) =>
          c.setAttribute('aria-pressed', String(c.dataset.value === opt.value)));
        render();
      },
    }));
  });

  async function setStatus(member, status) {
    try {
      await S.updateDoc(S.doc(db, COLLECTIONS.users, member.id), { status });
    } catch (error) {
      showError(`Aggiornamento non riuscito: ${error.message}`);
    }
  }

  const CERT_LABEL = {
    none: 'Nessun certificato',
    pending: 'Certificato da verificare',
    approved: 'Certificato approvato',
    rejected: 'Certificato respinto',
  };

  /**
   * Carica il certificato SOLO quando serve.
   *
   * Il blob base64 pesa centinaia di KB: tenerlo in un listener sull'intera
   * collection significherebbe scaricare decine di megabyte ogni volta che si
   * apre l'elenco soci. Nella lista viaggiano solo i metadati sul profilo.
   */
  async function showCertificate(member, container) {
    container.replaceChildren(el('p', { class: 'admin-row-meta', text: 'Caricamento del documento…' }));

    let cert;
    try {
      const snap = await S.getDoc(S.doc(db, COLLECTIONS.certificates, member.id));
      cert = snap.exists() ? snap.data() : null;
    } catch (error) {
      container.replaceChildren(el('p', { class: 'admin-row-meta', text: `Documento non leggibile: ${error.message}` }));
      return;
    }

    if (!cert) {
      container.replaceChildren(el('p', { class: 'admin-row-meta', text: 'Il socio non ha ancora caricato nulla.' }));
      return;
    }

    const url = toDataUrl(cert.contentType, cert.data);
    const meta = [cert.fileName, humanSize(cert.size || 0),
      asDate(cert.uploadedAt) ? `caricato il ${dateFmt.format(asDate(cert.uploadedAt))}` : null]
      .filter(Boolean).join(' · ');

    container.replaceChildren(
      el('p', { class: 'admin-row-meta', text: meta }),
      cert.contentType.startsWith('image/')
        ? el('a', { class: 'cert-figure', href: url, target: '_blank', rel: 'noopener' }, [
            el('img', { src: url, alt: `Certificato di ${member.name || member.id}` }),
          ])
        // I browser bloccano la navigazione verso un data: URL in una nuova
        // scheda, quindi il PDF passa da un blob temporaneo.
        : el('button', {
            type: 'button', class: 'mini-btn', text: 'Apri il PDF',
            onClick: () => {
              const bytes = Uint8Array.from(atob(cert.data), (c) => c.charCodeAt(0));
              const blobUrl = URL.createObjectURL(new Blob([bytes], { type: cert.contentType }));
              window.open(blobUrl, '_blank', 'noopener');
              setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            },
          }),
      el('div', { class: 'admin-row-actions' }, [
        el('button', {
          type: 'button', class: 'mini-btn', text: 'Approva certificato',
          onClick: () => reviewCertificate(member, 'approved'),
        }),
        el('button', {
          type: 'button', class: 'mini-btn danger', text: 'Respingi',
          onClick: () => reviewCertificate(member, 'rejected'),
        }),
      ])
    );
  }

  async function reviewCertificate(member, verdict) {
    const patch = { certStatus: verdict };

    if (verdict === 'approved') {
      // La scadenza è il dato che rende utile l'archivio: senza, fra un anno
      // nessuno sa più quali certificati siano ancora validi.
      const answer = window.prompt(
        'Data di scadenza del certificato (gg/mm/aaaa). Lascia vuoto se non la sai:', ''
      );
      if (answer === null) return;
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(answer.trim());
      if (answer.trim() && !match) {
        showError('Data non valida: usa il formato gg/mm/aaaa.');
        return;
      }
      if (match) patch.certExpiresAt = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));

      // Certificato approvato e socio ancora in attesa sono due cose diverse:
      // il certificato medico non è il tesseramento. Ma chi approva un
      // documento quasi sempre vuole anche far entrare la persona, e senza
      // questa domanda il socio resterebbe bloccato su "richiesta inviata"
      // senza che nessuno capisca perché.
      if ((member.status || 'pending') !== 'active') {
        const alsoActivate = window.confirm(
          `Certificato approvato.\n\nAttivare anche il profilo di ${member.name || member.email}, ` +
            'così può prenotare le classi?\n\n' +
            'Annulla se il tesseramento non è ancora in regola: il socio resterà in attesa.'
        );
        if (alsoActivate) patch.status = 'active';
      }
    } else {
      const reason = window.prompt('Motivo del rifiuto (lo vedrà il socio):', 'documento illeggibile');
      if (reason === null) return;
      patch.certNote = reason.slice(0, 200);
    }

    try {
      await S.updateDoc(S.doc(db, COLLECTIONS.users, member.id), patch);
    } catch (error) {
      showError(`Aggiornamento non riuscito: ${error.message}`);
    }
  }

  function row(member) {
    const status = member.status || 'pending';
    const certStatus = member.certStatus || 'none';

    // I comandi mostrati sono solo quelli che cambiano davvero qualcosa:
    // riproporre "Attiva" a un socio già attivo è rumore.
    const actions = [];
    if (status !== 'active') {
      actions.push(el('button', {
        type: 'button', class: 'mini-btn', text: 'Attiva',
        onClick: () => setStatus(member, 'active'),
      }));
    }
    if (status !== 'blocked') {
      actions.push(el('button', {
        type: 'button', class: 'mini-btn danger', text: 'Sospendi',
        onClick: () => setStatus(member, 'blocked'),
      }));
    }
    if (status === 'blocked') {
      actions.push(el('button', {
        type: 'button', class: 'mini-btn', text: 'Rimetti in attesa',
        onClick: () => setStatus(member, 'pending'),
      }));
    }

    const certBox = el('div', { class: 'cert-review' });

    actions.push(el('button', {
      type: 'button',
      class: 'mini-btn',
      text: certStatus === 'none' ? 'Nessun documento' : 'Vedi certificato',
      disabled: certStatus === 'none',
      onClick: () => showCertificate(member, certBox),
    }));

    return el('article', {
      class: `admin-row${status === 'pending' ? ' is-new' : status === 'blocked' ? ' is-draft' : ''}`,
    }, [
      el('div', { class: 'admin-row-head' }, [
        el('h3', { class: 'admin-row-title', text: member.name || member.email || member.id }),
        el('div', { class: 'pill-row' }, [
          el('span', {
            class: `pill${status === 'active' ? ' on' : status === 'pending' ? ' warn' : ''}`,
            text: STATUS_LABEL[status] || status,
          }),
          el('span', {
            class: `pill${certStatus === 'approved' ? ' on' : certStatus === 'none' ? '' : ' warn'}`,
            text: CERT_LABEL[certStatus] || certStatus,
          }),
        ]),
      ]),
      status === 'pending' && certStatus === 'approved'
        ? el('p', { class: 'admin-row-hint', text: '→ Certificato approvato: manca solo l\'attivazione del profilo.' })
        : null,
      el('p', {
        class: 'admin-row-meta',
        text: [
          member.email,
          member.phone,
          asDate(member.createdAt) ? `iscritto il ${dateFmt.format(asDate(member.createdAt))}` : null,
        asDate(member.certExpiresAt)
          ? `certificato valido fino al ${asDate(member.certExpiresAt).toLocaleDateString('it-IT')}`
          : null,
        ].filter(Boolean).join(' · '),
      }),
      el('div', { class: 'admin-row-actions' }, actions),
      certBox,
    ]);
  }

  function render() {
    const rows = state.members.filter((m) => state.filter === 'ALL' || (m.status || 'pending') === state.filter);
    list.replaceChildren(
      ...(rows.length
        ? rows.map(row)
        : [el('p', { class: 'admin-empty', text: 'Nessun socio in questo stato.' })])
    );
  }

  return S.onSnapshot(
    S.collection(db, COLLECTIONS.users),
    (snapshot) => {
      state.members = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // Il contatore mostra chi aspetta una risposta, non il totale: è
      // l'unico numero su cui c'è qualcosa da fare.
      qs('#membersCount').textContent =
        String(state.members.filter((m) => (m.status || 'pending') === 'pending').length);
      render();
    },
    (error) => showError(`Lettura soci non riuscita: ${error.message}`)
  );
}

/* ------------------------------------------------------------------ *
 * Classi prenotabili
 * ------------------------------------------------------------------ */

function initSessions({ db, S }) {
  const list = qs('#sessionsList');
  const status = qs('#generateStatus');
  const button = qs('#generateBtn');
  const state = { sessions: [], open: null, roster: [] };
  let stopRoster = null;

  qs('#capCF').textContent = String(SESSION_CAPACITY.CF);
  qs('#capHYROX').textContent = String(SESSION_CAPACITY.HYROX);

  /* ---------- generazione del calendario ---------- */

  button.addEventListener('click', async () => {
    button.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Generazione…';

    try {
      const slots = expandSchedule(SCHEDULE, WEEKS_TO_GENERATE * 7)
        .filter((slot) => slot.startsAt > new Date());

      // Le classi già esistenti si saltano: sovrascriverle azzererebbe il
      // contatore dei posti e cancellerebbe di fatto le prenotazioni.
      const existing = new Set(state.sessions.map((s) => s.id));
      const missing = slots.filter((slot) => !existing.has(slot.id));

      if (!missing.length) {
        status.classList.add('ok');
        status.textContent = 'Calendario già completo: nessuna nuova classe da aprire.';
        return;
      }

      // Batch da 400: il limite di Firestore è 500 operazioni.
      for (let i = 0; i < missing.length; i += 400) {
        const batch = S.writeBatch(db);
        missing.slice(i, i + 400).forEach((slot) => {
          batch.set(S.doc(db, COLLECTIONS.sessions, slot.id), {
            startsAt: slot.startsAt,
            type: slot.type,
            capacity: SESSION_CAPACITY[slot.type] ?? 12,
            booked: 0,
            createdAt: S.serverTimestamp(),
          });
        });
        await batch.commit();
      }

      status.classList.add('ok');
      status.textContent = `Aperte ${missing.length} classi nelle prossime ${WEEKS_TO_GENERATE} settimane.`;
    } catch (error) {
      status.classList.add('err');
      status.textContent = `Generazione non riuscita: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  });

  /* ---------- iscritti a una classe ---------- */

  function openRoster(session) {
    if (stopRoster) stopRoster();
    state.open = state.open === session.id ? null : session.id;
    state.roster = [];

    if (!state.open) {
      stopRoster = null;
      render();
      return;
    }

    stopRoster = S.onSnapshot(
      S.query(S.collection(db, COLLECTIONS.bookings), S.where('sessionId', '==', session.id)),
      (snapshot) => {
        state.roster = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        render();
      },
      (error) => showError(`Iscritti non leggibili: ${error.message}`)
    );
    render();
  }

  /** Rimuove un iscritto restituendo il posto, nella stessa transazione. */
  async function removeBooking(booking) {
    if (!window.confirm(`Rimuovere ${booking.userName} da questa classe?`)) return;
    try {
      await S.runTransaction(db, async (tx) => {
        const sessionRef = S.doc(db, COLLECTIONS.sessions, booking.sessionId);
        const bookingRef = S.doc(db, COLLECTIONS.bookings, booking.id);
        const sessionSnap = await tx.get(sessionRef);
        if (sessionSnap.exists()) {
          tx.update(sessionRef, { booked: Math.max(0, sessionSnap.data().booked - 1) });
        }
        tx.delete(bookingRef);
      });
    } catch (error) {
      showError(`Rimozione non riuscita: ${error.message}`);
    }
  }

  function rosterBlock() {
    if (!state.roster.length) {
      return el('p', { class: 'admin-empty', text: 'Nessun iscritto.' });
    }
    return el('div', { class: 'roster' },
      state.roster
        .sort((a, b) => (a.userName || '').localeCompare(b.userName || ''))
        .map((booking) =>
          el('div', { class: 'roster-row' }, [
            el('span', {}, [
              el('strong', { text: booking.userName || '—' }),
              el('em', { text: booking.userEmail || '' }),
            ]),
            el('button', {
              type: 'button', class: 'mini-btn danger', text: 'Rimuovi',
              onClick: () => removeBooking(booking),
            }),
          ])
        )
    );
  }

  function row(session) {
    const start = asDate(session.startsAt);
    const left = Math.max(0, (session.capacity || 0) - (session.booked || 0));
    const isOpen = state.open === session.id;

    return el('article', { class: `admin-row${session.booked > 0 ? ' is-featured' : ''}` }, [
      el('button', {
        type: 'button',
        class: 'session-head',
        'aria-expanded': String(isOpen),
        onClick: () => openRoster(session),
      }, [
        el('span', { class: 'session-when', text: start ? sessionFmt.format(start) : session.id }),
        el('span', { class: 'pill-row' }, [
          el('span', {
            class: `pill${session.type === 'HYROX' ? ' warn' : ' on'}`,
            text: CLASS_TYPES[session.type]?.short || session.type,
          }),
          el('span', {
            class: 'pill',
            text: `${session.booked || 0}/${session.capacity || 0}${left === 0 ? ' · completo' : ''}`,
          }),
        ]),
      ]),
      isOpen ? rosterBlock() : null,
    ]);
  }

  function render() {
    list.replaceChildren(
      ...(state.sessions.length
        ? state.sessions.map(row)
        : [el('p', {
            class: 'admin-empty',
            text: 'Nessuna classe aperta. Usa «Genera calendario» per aprire le prenotazioni.',
          })])
    );
  }

  const stopSessions = S.onSnapshot(
    S.query(S.collection(db, COLLECTIONS.sessions), S.where('startsAt', '>', new Date())),
    (snapshot) => {
      state.sessions = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (asDate(a.startsAt)?.getTime() || 0) - (asDate(b.startsAt)?.getTime() || 0));

      qs('#sessionsCount').textContent = String(state.sessions.length);
      render();
    },
    (error) => showError(`Lettura classi non riuscita: ${error.message}`)
  );

  return () => {
    stopSessions();
    if (stopRoster) stopRoster();
  };
}

/* ------------------------------------------------------------------ *
 * Inviti e team
 * ------------------------------------------------------------------ */

/**
 * Tenta di trasformare un invito in accesso effettivo.
 * Fallisce silenziosamente se l'invito non esiste: è il caso normale per
 * chiunque capiti sulla pagina senza essere stato invitato.
 * @returns {Promise<boolean>} true se l'accesso è stato concesso
 */
async function claimInvite({ db, S, user }) {
  const email = (user.email || '').toLowerCase();
  if (!email) return false;

  try {
    await S.setDoc(S.doc(db, COLLECTIONS.admins, user.uid), {
      email,
      createdAt: S.serverTimestamp(),
    });
  } catch {
    return false; // nessun invito per questa email, o email non verificata
  }

  // Un invito vale una volta sola: consumarlo evita che un accesso revocato
  // possa essere riottenuto semplicemente rientrando.
  try {
    await S.deleteDoc(S.doc(db, COLLECTIONS.invites, email));
  } catch {
    /* l'accesso è già stato concesso: un invito residuo non lo compromette */
  }

  return true;
}

function initTeam({ db, S, A, auth, user }) {
  const owner = isOwner(user.uid);
  const teamList = qs('#teamList');
  const invitesList = qs('#invitesList');
  const form = qs('#inviteForm');
  const status = qs('#inviteStatus');
  const button = qs('#inviteBtn');
  const error = qs('[data-error-for="inviteEmail"]');

  // Chi non è proprietario vede il team ma non i comandi: le regole lo
  // bloccherebbero comunque, tanto vale non mostrargli pulsanti inutili.
  form.hidden = !owner;
  qs('#ownerOnlyNote').hidden = owner;

  /* ---------- invio di un invito ---------- */

  if (owner) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = qs('#inviteEmail');
      const email = input.value.trim().toLowerCase();

      error.textContent = '';
      status.className = 'form-status';
      status.textContent = '';

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
        error.textContent = 'Inserisci un indirizzo email valido.';
        input.focus();
        return;
      }

      button.disabled = true;
      status.textContent = 'Invio…';

      try {
        // L'ID del documento È l'email: è così che le regole di /admins
        // ritrovano l'invito con exists() al primo accesso dell'invitato.
        await S.setDoc(S.doc(db, COLLECTIONS.invites, email), {
          email,
          invitedBy: user.email || user.uid,
          createdAt: S.serverTimestamp(),
        });
        form.reset();
        status.className = 'form-status ok';
        status.textContent = `Invito creato per ${email}. Avrà accesso al primo login con Google.`;
      } catch (err) {
        status.className = 'form-status err';
        status.textContent = `Invito non riuscito: ${err.message}`;
      } finally {
        button.disabled = false;
      }
    });
  }

  /* ---------- elenco del team ---------- */

  async function revokeAdmin(admin) {
    if (!window.confirm(`Revocare l'accesso a ${admin.email}?`)) return;
    try {
      await S.deleteDoc(S.doc(db, COLLECTIONS.admins, admin.id));
      // Elimina anche un eventuale invito residuo, altrimenti la persona
      // rientrerebbe da sola al prossimo accesso.
      if (admin.email) {
        await S.deleteDoc(S.doc(db, COLLECTIONS.invites, admin.email)).catch(() => {});
      }
    } catch (err) {
      showError(`Revoca non riuscita: ${err.message}`);
    }
  }

  async function revokeInvite(invite) {
    if (!window.confirm(`Annullare l'invito a ${invite.id}?`)) return;
    try {
      await S.deleteDoc(S.doc(db, COLLECTIONS.invites, invite.id));
    } catch (err) {
      showError(`Annullamento non riuscito: ${err.message}`);
    }
  }

  function adminRow(admin) {
    const isThisOwner = isOwner(admin.id);
    const isMe = admin.id === user.uid;

    return el('article', { class: `admin-row${isThisOwner ? ' is-featured' : ''}` }, [
      el('div', { class: 'admin-row-head' }, [
        el('h3', { class: 'admin-row-title', text: admin.email || admin.id }),
        el('div', { class: 'pill-row' }, [
          isThisOwner ? el('span', { class: 'pill on', text: 'Proprietario' }) : null,
          isMe ? el('span', { class: 'pill', text: 'Tu' }) : null,
        ]),
      ]),
      el('p', {
        class: 'admin-row-meta',
        text: isThisOwner
          ? 'Accesso permanente: non revocabile da nessuno.'
          : `Accesso attivo${admin.createdAt?.toDate ? ` dal ${dateFmt.format(admin.createdAt.toDate())}` : ''}.`,
      }),
      owner && !isThisOwner
        ? el('div', { class: 'admin-row-actions' }, [
            el('button', {
              class: 'mini-btn danger',
              type: 'button',
              text: 'Revoca accesso',
              onClick: () => revokeAdmin(admin),
            }),
          ])
        : null,
    ]);
  }

  function inviteRow(invite) {
    return el('article', { class: 'admin-row is-new' }, [
      el('div', { class: 'admin-row-head' }, [
        el('h3', { class: 'admin-row-title', text: invite.id }),
        el('span', { class: 'pill warn', text: 'In attesa' }),
      ]),
      el('p', {
        class: 'admin-row-meta',
        text: `Invitato da ${invite.invitedBy || '—'}${
          invite.createdAt?.toDate ? ` il ${dateFmt.format(invite.createdAt.toDate())}` : ''
        }`,
      }),
      owner
        ? el('div', { class: 'admin-row-actions' }, [
            el('button', {
              class: 'mini-btn danger',
              type: 'button',
              text: 'Annulla invito',
              onClick: () => revokeInvite(invite),
            }),
          ])
        : null,
    ]);
  }

  const stopAdmins = S.onSnapshot(
    S.collection(db, COLLECTIONS.admins),
    (snapshot) => {
      const admins = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        // Il proprietario sempre in cima.
        .sort((a, b) => Number(isOwner(b.id)) - Number(isOwner(a.id)));

      // Se il proprio accesso è stato revocato, uscire subito è più onesto che
      // lasciare aperto un pannello che fallirà a ogni click.
      //
      // Ma solo su dati confermati dal server: Firestore può consegnare uno
      // snapshot dalla cache, anche vuoto, prima di aver risposto davvero.
      // Fidarsi di quello significherebbe espellere un admin legittimo per il
      // solo fatto di avere una connessione lenta. In dubbio non si esce.
      const fromServer = snapshot.metadata?.fromCache === false;
      if (fromServer && !admins.some((a) => a.id === user.uid)) {
        A.signOut(auth);
        return;
      }

      qs('#teamCount').textContent = String(admins.length);
      teamList.replaceChildren(...admins.map(adminRow));
    },
    (err) => showError(`Lettura team non riuscita: ${err.message}`)
  );

  const stopInvites = S.onSnapshot(
    S.collection(db, COLLECTIONS.invites),
    (snapshot) => {
      const invites = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      invitesList.replaceChildren(
        ...(invites.length
          ? invites.map(inviteRow)
          : [el('p', { class: 'admin-empty', text: 'Nessun invito in attesa.' })])
      );
    },
    (err) => showError(`Lettura inviti non riuscita: ${err.message}`)
  );

  return () => {
    stopAdmins();
    stopInvites();
  };
}

/* ------------------------------------------------------------------ *
 * Tabs
 * ------------------------------------------------------------------ */

function initTabs() {
  const tabs = [
    { tab: qs('#tabEvents'), panel: qs('#panelEvents') },
    { tab: qs('#tabLeads'), panel: qs('#panelLeads') },
    { tab: qs('#tabMembers'), panel: qs('#panelMembers') },
    { tab: qs('#tabSessions'), panel: qs('#panelSessions') },
    { tab: qs('#tabTeam'), panel: qs('#panelTeam') },
  ];

  tabs.forEach(({ tab }, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t, i) => {
        t.tab.setAttribute('aria-selected', String(i === index));
        t.panel.hidden = i !== index;
      });
    });
  });
}

initTabs();
boot();
