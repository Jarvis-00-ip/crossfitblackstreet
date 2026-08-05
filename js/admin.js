/**
 * admin.js — Pannello di amministrazione.
 *
 * Unico punto del sito che carica l'SDK Firebase completo, e lo fa con
 * `import()` dinamico: la home resta a zero dipendenze.
 *
 * Cosa permette di fare:
 *  - login staff (email + password)
 *  - CRUD degli eventi in bacheca, in tempo reale
 *  - consultazione delle richieste arrivate dal form di contatto
 *
 * Nota sull'autorizzazione: avere un account non basta. Serve un documento in
 * /admins con il proprio UID, creato a mano dalla console. Il controllo qui
 * sotto è solo per l'interfaccia — quello che conta è in `firestore.rules`,
 * perché il client è sempre manipolabile.
 */

import { qs, el } from './dom.js';
import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION, COLLECTIONS, isConfigured } from './firebase/config.js';

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
  };
  return map[code] || 'Accesso non riuscito. Riprova.';
}

const dateFmt = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = 'Accesso in corso…';
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

    if (!authorized) {
      await A.signOut(auth);
      showView('login');
      qs('#loginStatus').className = 'form-status err';
      qs('#loginStatus').textContent =
        `L'account ${user.email} non è abilitato. Crea il documento admins/${user.uid} dalla Console Firebase.`;
      return;
    }

    qs('#adminEmail').textContent = user.email;
    qs('#adminUser').hidden = false;
    showView('app');

    unsubscribers = [initEvents({ db, S }), initLeads({ db, S })];
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
        el('div', {}, [
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
 * Tabs
 * ------------------------------------------------------------------ */

function initTabs() {
  const tabs = [
    { tab: qs('#tabEvents'), panel: qs('#panelEvents') },
    { tab: qs('#tabLeads'), panel: qs('#panelLeads') },
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
