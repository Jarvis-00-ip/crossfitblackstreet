/**
 * area.js — Area soci: registrazione e prenotazione delle classi.
 *
 * Vive su una pagina separata dalla home di proposito. La home resta senza
 * SDK Firebase (~110 KB gzip) e continua a caricare in fretta per chi arriva
 * da Instagram; chi deve prenotare è già intenzionato e può permettersi il
 * peso di una vera web app.
 *
 * Stati possibili, nell'ordine in cui li incontra un socio:
 *   non autenticato  → login con Google
 *   autenticato, nessun profilo → completamento profilo
 *   profilo 'pending' → in attesa che lo staff verifichi i documenti
 *   profilo 'blocked' → accesso sospeso
 *   profilo 'active'  → prenotazioni
 */

import { qs, qsa, el } from './dom.js';
import {
  FIREBASE_CONFIG, FIREBASE_SDK_VERSION, COLLECTIONS, isConfigured,
} from './firebase/config.js';
import { whatsappLink, SCHEDULE, CLASS_TYPES } from './data.js';
import { expandSchedule, asDate } from './session-id.js';
import { prepareDocument, toDataUrl, humanSize, MAX_BYTES } from './upload.js';

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
const DAYS_AHEAD = 14;

const views = ['setup', 'login', 'register', 'pending', 'blocked', 'booking'];

function showView(name) {
  views.forEach((v) => {
    const node = qs(`#${v}View`);
    if (node) node.hidden = v !== name;
  });
}

function showError(message) {
  const box = qs('#globalError');
  box.textContent = message;
  box.hidden = !message;
}

const dayFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

function authMessage(code) {
  const map = {
    'auth/popup-blocked': 'Il browser ha bloccato la finestra di Google. Consenti i popup e riprova.',
    'auth/popup-closed-by-user': 'Accesso annullato.',
    'auth/cancelled-popup-request': '',
    'auth/network-request-failed': 'Connessione assente. Controlla la rete.',
    'auth/unauthorized-domain': 'Dominio non autorizzato per l\'accesso. Segnalalo allo staff.',
    'auth/operation-not-allowed': 'Accesso con Google non attivo. Segnalalo allo staff.',
  };
  return map[code] ?? 'Accesso non riuscito. Riprova.';
}

/* ------------------------------------------------------------------ *
 * Bootstrap
 * ------------------------------------------------------------------ */

async function boot() {
  qsa('[data-wa-link]').forEach((a) => {
    a.href = whatsappLink('Ciao! Vi scrivo dall\'area soci del sito.');
    a.target = '_blank';
    a.rel = 'noopener';
  });

  if (!isConfigured()) {
    showView('setup');
    return;
  }

  let sdk;
  try {
    sdk = await loadSdk();
  } catch (error) {
    showView('setup');
    showError(`Servizio non raggiungibile (${error.message}).`);
    return;
  }

  const { initializeApp, auth: A, store: S } = sdk;
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = A.getAuth(app);
  const db = S.getFirestore(app);

  initLogin({ auth, A });
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
 * Autenticazione e profilo
 * ------------------------------------------------------------------ */

function initLogin({ auth, A }) {
  const button = qs('#googleBtn');
  const status = qs('#loginStatus');

  button.addEventListener('click', async () => {
    status.className = 'form-status';
    status.textContent = 'Apertura di Google…';
    button.disabled = true;
    try {
      const provider = new A.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await A.signInWithPopup(auth, provider);
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
  let stopBookings = null;
  let stopProfile = null;
  let certCards = null;

  const stopAll = () => {
    if (stopBookings) stopBookings();
    if (stopProfile) stopProfile();
    stopBookings = null;
    stopProfile = null;
  };

  A.onAuthStateChanged(auth, async (user) => {
    stopAll();
    showError('');

    if (!user) {
      qs('#memberBar').hidden = true;
      showView('login');
      return;
    }

    qs('#memberEmail').textContent = user.email || '';
    qs('#memberBar').hidden = false;

    // Lo staff non è un socio: chi è in /admins non ha nulla da fare qui e
    // finirebbe nel flusso di registrazione, certificato medico compreso.
    // Meglio mandarlo dove sta il suo lavoro.
    if (await isStaff({ db, S, user })) {
      qs('#loginStatus').className = 'form-status ok';
      qs('#loginStatus').textContent = 'Sei dello staff: apertura del pannello…';
      // replace() e non href: il tasto Indietro non deve riportare qui.
      window.location.replace('admin.html');
      return;
    }

    // I comandi del certificato si costruiscono una volta sola; a ogni
    // aggiornamento del profilo cambia solo ciò che mostrano.
    if (!certCards) {
      certCards = qsa('[data-cert-mount]').map((mount) => createCertificateCard({ db, S, user, mount }));
    }

    // Listener e non lettura singola: quando approvi un socio, la sua pagina
    // passa da "in attesa" alle prenotazioni senza che debba ricaricare, e
    // l'esito della verifica del certificato compare da solo.
    stopProfile = S.onSnapshot(
      S.doc(db, COLLECTIONS.users, user.uid),
      (snap) => {
        const profile = snap.exists() ? snap.data() : null;

        if (!profile) {
          initRegister({ db, S, user });
          showView('register');
          return;
        }

        certCards.forEach((card) => card.update(profile));

        if (profile.status === 'blocked') return showView('blocked');
        if (profile.status !== 'active') return showView('pending');

        showView('booking');
        if (!stopBookings) stopBookings = initBooking({ db, S, user, profile });
      },
      (error) => showError(`Profilo non leggibile: ${error.message}`)
    );
  });
}

/**
 * L'utente fa parte dello staff?
 * In caso di errore risponde "no": un problema di lettura non deve impedire
 * a un socio di usare la propria area.
 */
async function isStaff({ db, S, user }) {
  try {
    const snap = await S.getDoc(S.doc(db, COLLECTIONS.admins, user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

function initRegister({ db, S, user }) {
  const form = qs('#registerForm');
  const status = qs('#regStatus');
  const button = qs('#regBtn');
  const nameInput = qs('#regName');

  // Il nome di Google è un punto di partenza ragionevole, ma resta modificabile:
  // spesso è un nickname e allo staff serve il nome del tesseramento.
  if (!nameInput.value) nameInput.value = user.displayName || '';

  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const errorEl = qs('[data-error-for="regName"]');
    errorEl.textContent = '';
    status.className = 'form-status';

    if (name.length < 2) {
      errorEl.textContent = 'Inserisci nome e cognome.';
      nameInput.focus();
      return;
    }

    button.disabled = true;
    status.textContent = 'Invio…';

    try {
      await S.setDoc(S.doc(db, COLLECTIONS.users, user.uid), {
        name,
        email: (user.email || '').toLowerCase(),
        phone: qs('#regPhone').value.trim(),
        // Sempre 'pending': l'attivazione la decide lo staff dopo aver visto
        // tesseramento e certificato medico. Le rules rifiutano altri valori.
        status: 'pending',
        createdAt: S.serverTimestamp(),
      });
      showView('pending');
    } catch (error) {
      status.classList.add('err');
      status.textContent = `Invio non riuscito: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  };
}

/* ------------------------------------------------------------------ *
 * Certificato medico
 * ------------------------------------------------------------------ */

const CERT_LABEL = {
  none: 'Da caricare',
  pending: 'In verifica',
  approved: 'Approvato',
  rejected: 'Da rifare',
};

function certPillClass(status) {
  if (status === 'approved') return 'pill on';
  if (status === 'rejected') return 'pill warn';
  if (status === 'pending') return 'pill warn';
  return 'pill';
}

/**
 * Costruisce i comandi del certificato una volta sola e restituisce un
 * `update(profile)` da richiamare a ogni cambiamento.
 *
 * La separazione serve: il profilo è sotto listener e si aggiorna spesso, ma
 * riagganciare i gestori a ogni aggiornamento significherebbe inviare il
 * documento due, tre, dieci volte con un solo click.
 */
function createCertificateCard({ db, S, user, mount }) {
  const input = mount.querySelector('[data-cert-input]');
  const label = mount.querySelector('[data-cert-label]');
  const sendBtn = mount.querySelector('[data-cert-send]');
  const feedback = mount.querySelector('[data-cert-feedback]');
  const statusPill = mount.querySelector('[data-cert-status]');
  const note = mount.querySelector('[data-cert-note]');
  const preview = mount.querySelector('[data-cert-preview]');

  label.textContent = `Scegli foto o PDF · max ${humanSize(MAX_BYTES)}`;

  let prepared = null;

  /** Riquadro di esito, non una riga di testo che passa inosservata. */
  function say(kind, message) {
    feedback.className = `cert-feedback is-${kind}`;
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function resetPicker() {
    input.value = '';
    label.textContent = `Scegli foto o PDF · max ${humanSize(MAX_BYTES)}`;
    preview.hidden = true;
    prepared = null;
    sendBtn.disabled = true;
  }

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    preview.hidden = true;
    prepared = null;
    sendBtn.disabled = true;

    if (!file) {
      resetPicker();
      say('', '');
      return;
    }

    label.textContent = file.name;
    say('busy', 'Preparazione del file…');

    try {
      prepared = await prepareDocument(file);

      // Anteprima prima dell'invio: chi fotografa un foglio deve poter
      // vedere subito se è venuto storto o illeggibile.
      if (prepared.contentType.startsWith('image/')) {
        preview.replaceChildren(
          el('img', { src: toDataUrl(prepared.contentType, prepared.base64), alt: 'Anteprima del certificato' })
        );
        preview.hidden = false;
      }

      const ridotto = prepared.size < file.size
        ? ` (ridotto da ${humanSize(file.size)} a ${humanSize(prepared.size)})`
        : '';
      say('ok', `Documento pronto${ridotto}. Premi «Carica documento» per inviarlo.`);
      sendBtn.disabled = false;
    } catch (error) {
      say('err', error.message);
    }
  });

  sendBtn.addEventListener('click', async () => {
    if (!prepared) {
      say('err', 'Scegli prima un file da caricare.');
      return;
    }

    sendBtn.disabled = true;
    say('busy', 'Invio in corso…');

    try {
      // Documento e stato viaggiano insieme: se andassero separati, il
      // pannello potrebbe mostrare "in verifica" senza avere niente da
      // verificare, o viceversa un file che nessuno sa di dover guardare.
      const batch = S.writeBatch(db);
      batch.set(S.doc(db, COLLECTIONS.certificates, user.uid), {
        uid: user.uid,
        fileName: prepared.fileName,
        contentType: prepared.contentType,
        size: prepared.size,
        data: prepared.base64,
        status: 'pending',
        uploadedAt: S.serverTimestamp(),
      });
      batch.update(S.doc(db, COLLECTIONS.users, user.uid), {
        certStatus: 'pending',
        certUploadedAt: S.serverTimestamp(),
      });
      await batch.commit();

      resetPicker();
      say('ok', '✓ Documento caricato. Lo staff lo verifica appena possibile.');
      // Il riquadro può stare sotto la piega su schermo piccolo.
      feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      // Il caso di gran lunga più frequente al primo avvio: regole non ancora
      // pubblicate. Dirlo esplicitamente evita mezz'ora di ricerche a vuoto.
      const denied = /permission|insufficient/i.test(error.message || '');
      say('err', denied
        ? 'Caricamento rifiutato dal server: le regole di sicurezza non sono ancora pubblicate. Segnalalo allo staff.'
        : `Caricamento non riuscito: ${error.message}`);
      sendBtn.disabled = false;
    }
  });

  return {
    update(profile) {
      const status = profile.certStatus || 'none';
      statusPill.textContent = CERT_LABEL[status] || status;
      statusPill.className = certPillClass(status);

      const expires = asDate(profile.certExpiresAt);
      note.textContent = {
        none: `Carica il certificato di idoneità sportiva. Foto o PDF, massimo ${humanSize(MAX_BYTES)}: le foto vengono ridotte in automatico.`,
        pending: 'Documento ricevuto. Lo staff lo verifica appena possibile.',
        approved: expires
          ? `Approvato, valido fino al ${expires.toLocaleDateString('it-IT')}.`
          : 'Approvato.',
        rejected: profile.certNote
          ? `Documento respinto: ${profile.certNote}. Caricane uno nuovo.`
          : 'Documento respinto: caricane uno nuovo.',
      }[status] || '';
    },
  };
}

/* ------------------------------------------------------------------ *
 * Prenotazioni
 * ------------------------------------------------------------------ */

function initBooking({ db, S, user, profile }) {
  const listEl = qs('#calendarList');
  const mineEl = qs('#mineList');
  const state = { type: 'ALL', sessions: new Map(), mine: new Map(), busy: new Set() };

  /* ---------- filtri disciplina ---------- */

  const filters = qs('#areaTypeFilters');
  [
    { value: 'ALL', label: 'Tutte' },
    { value: 'CF', label: CLASS_TYPES.CF.label },
    { value: 'HYROX', label: CLASS_TYPES.HYROX.label },
  ].forEach((opt) => {
    filters.append(el('button', {
      type: 'button',
      class: `chip${opt.value === 'HYROX' ? ' chip-hyrox' : ''}`,
      'aria-pressed': String(state.type === opt.value),
      dataset: { value: opt.value },
      text: opt.label,
      onClick: () => {
        state.type = opt.value;
        qsa('button', filters).forEach((c) =>
          c.setAttribute('aria-pressed', String(c.dataset.value === opt.value)));
        renderCalendar();
      },
    }));
  });

  /* ---------- prenotazione e disdetta ---------- */

  /**
   * Prenota un posto.
   *
   * Transazione, non due scritture separate: il contatore della sessione e il
   * documento di prenotazione devono muoversi insieme, altrimenti due soci che
   * premono "Prenota" nello stesso istante occuperebbero lo stesso posto.
   * Le Security Rules verificano proprio questa simultaneità con getAfter().
   */
  async function book(slot) {
    const bookingId = `${user.uid}_${slot.id}`;

    await S.runTransaction(db, async (tx) => {
      const sessionRef = S.doc(db, COLLECTIONS.sessions, slot.id);
      const bookingRef = S.doc(db, COLLECTIONS.bookings, bookingId);

      const sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists()) {
        throw new Error('Questa classe non è ancora aperta alle prenotazioni.');
      }

      const data = sessionSnap.data();
      if (data.booked >= data.capacity) throw new Error('Posti esauriti.');
      if ((await tx.get(bookingRef)).exists()) throw new Error('Hai già prenotato questa classe.');

      tx.update(sessionRef, { booked: data.booked + 1 });
      tx.set(bookingRef, {
        uid: user.uid,
        sessionId: slot.id,
        userName: profile.name,
        userEmail: (user.email || '').toLowerCase(),
        startsAt: data.startsAt,
        type: data.type,
        createdAt: S.serverTimestamp(),
      });
    });
  }

  /** Disdice, restituendo il posto nella stessa transazione. */
  async function cancel(slotId) {
    await S.runTransaction(db, async (tx) => {
      const sessionRef = S.doc(db, COLLECTIONS.sessions, slotId);
      const bookingRef = S.doc(db, COLLECTIONS.bookings, `${user.uid}_${slotId}`);

      const [sessionSnap, bookingSnap] = await Promise.all([tx.get(sessionRef), tx.get(bookingRef)]);
      if (!bookingSnap.exists()) return;

      if (sessionSnap.exists()) {
        tx.update(sessionRef, { booked: Math.max(0, sessionSnap.data().booked - 1) });
      }
      tx.delete(bookingRef);
    });
  }

  async function run(slotId, action) {
    if (state.busy.has(slotId)) return;
    state.busy.add(slotId);
    renderCalendar();
    try {
      await action();
      showError('');
    } catch (error) {
      showError(error.message || 'Operazione non riuscita.');
    } finally {
      state.busy.delete(slotId);
      renderCalendar();
      renderMine();
    }
  }

  /* ---------- calendario ---------- */

  function renderCalendar() {
    const slots = expandSchedule(SCHEDULE, DAYS_AHEAD)
      .filter((s) => s.startsAt > new Date())
      .filter((s) => state.type === 'ALL' || s.type === state.type);

    if (!slots.length) {
      listEl.replaceChildren(el('p', { class: 'admin-empty', text: 'Nessuna classe in programma.' }));
      return;
    }

    // Raggruppate per giorno: un elenco piatto di 90 orari è illeggibile.
    const groups = new Map();
    slots.forEach((slot) => {
      const key = slot.startsAt.toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(slot);
    });

    listEl.replaceChildren(
      ...[...groups.entries()].map(([, daySlots]) =>
        el('section', { class: 'day-block' }, [
          el('h3', { class: 'day-block-title', text: dayFmt.format(daySlots[0].startsAt) }),
          el('div', { class: 'slot-cards' }, daySlots.map(slotCard)),
        ])
      )
    );
  }

  function slotCard(slot) {
    const session = state.sessions.get(slot.id);
    const mine = state.mine.has(slot.id);
    const busy = state.busy.has(slot.id);

    // Nessun documento sessione = l'admin non ha ancora generato il calendario
    // per quel giorno. Meglio dirlo che mostrare un pulsante che fallirebbe.
    const open = Boolean(session);
    const left = open ? Math.max(0, session.capacity - session.booked) : 0;
    const full = open && left === 0;

    let label = 'Prenota';
    if (busy) label = '…';
    else if (mine) label = 'Disdici';
    else if (!open) label = 'Non aperta';
    else if (full) label = 'Completo';

    return el('article', {
      class: `slot-card type-${slot.type}${mine ? ' is-mine' : ''}${full && !mine ? ' is-full' : ''}`,
    }, [
      el('div', { class: 'slot-card-main' }, [
        el('span', { class: 'slot-card-time', text: timeFmt.format(slot.startsAt) }),
        el('span', { class: 'slot-card-type', text: CLASS_TYPES[slot.type].short }),
      ]),
      el('span', {
        class: `slot-card-seats${full ? ' is-full' : ''}`,
        text: !open ? 'non aperta' : full ? 'completo' : `${left} post${left === 1 ? 'o' : 'i'}`,
      }),
      el('button', {
        type: 'button',
        class: `mini-btn${mine ? ' danger' : ''}`,
        disabled: busy || (!mine && (!open || full)),
        text: label,
        onClick: () => run(slot.id, () => (mine ? cancel(slot.id) : book(slot))),
      }),
    ]);
  }

  /* ---------- le mie prenotazioni ---------- */

  function renderMine() {
    const now = new Date();
    const mine = [...state.mine.values()]
      .map((b) => ({ ...b, start: asDate(b.startsAt) }))
      .sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));

    qs('#mineCount').textContent = String(mine.filter((b) => b.start && b.start > now).length);

    mineEl.replaceChildren(
      ...(mine.length
        ? mine.map((booking) => {
            const start = booking.start;
            const past = !start || start <= new Date();
            return el('article', { class: `admin-row${past ? ' is-draft' : ' is-featured'}` }, [
              el('div', { class: 'admin-row-head' }, [
                el('h3', {
                  class: 'admin-row-title',
                  text: start ? `${dayFmt.format(start)} · ${timeFmt.format(start)}` : 'Classe prenotata',
                }),
                el('span', {
                  class: `pill${past ? '' : ' on'}`,
                  text: CLASS_TYPES[booking.type]?.short || booking.type,
                }),
              ]),
              past
                ? el('p', { class: 'admin-row-meta', text: 'Classe già svolta.' })
                : el('div', { class: 'admin-row-actions' }, [
                    el('button', {
                      type: 'button',
                      class: 'mini-btn danger',
                      text: 'Disdici',
                      onClick: () => run(booking.sessionId, () => cancel(booking.sessionId)),
                    }),
                  ]),
            ]);
          })
        : [el('p', { class: 'admin-empty', text: 'Non hai ancora prenotazioni.' })])
    );
  }

  /* ---------- listener realtime ---------- */

  const stopSessions = S.onSnapshot(
    S.query(
      S.collection(db, COLLECTIONS.sessions),
      S.where('startsAt', '>', new Date())
    ),
    (snapshot) => {
      state.sessions = new Map(snapshot.docs.map((d) => [d.id, d.data()]));
      renderCalendar();
    },
    (error) => showError(`Calendario non leggibile: ${error.message}`)
  );

  const stopMine = S.onSnapshot(
    S.query(S.collection(db, COLLECTIONS.bookings), S.where('uid', '==', user.uid)),
    (snapshot) => {
      state.mine = new Map(snapshot.docs.map((d) => [d.data().sessionId, d.data()]));
      renderCalendar();
      renderMine();
    },
    (error) => showError(`Prenotazioni non leggibili: ${error.message}`)
  );

  renderCalendar();
  renderMine();

  return () => {
    stopSessions();
    stopMine();
  };
}

/* ------------------------------------------------------------------ *
 * Tabs
 * ------------------------------------------------------------------ */

function initTabs() {
  const tabs = [
    { tab: qs('#tabCalendar'), panel: qs('#panelCalendar') },
    { tab: qs('#tabMine'), panel: qs('#panelMine') },
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
