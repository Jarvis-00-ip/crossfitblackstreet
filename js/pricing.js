/**
 * pricing.js — Sezione Prezzi.
 *
 * Il listino esposto in palestra è una tabella di sette righe per sette
 * colonne: perfetta su un foglio A4 appeso al muro, illeggibile su un
 * telefono. Qui la stessa informazione è girata di novanta gradi: si sceglie
 * la durata, e ogni formula mostra il proprio prezzo per quella durata.
 *
 * Le rate compaiono solo dove esistono davvero (sei e dodici mesi), e la
 * variante «con un ingresso in più a settimana in open box» compare solo sulle
 * formule che la prevedono. Mostrare una casella vuota dove il box non offre
 * nulla fa sembrare il listino incompleto invece che preciso.
 */

import { el, qs } from './dom.js';
import { PRICING } from './data.js';
import { whatsappLink } from './data.js';

const euro = (n) => `${n} €`;

/** Rateizzazione disponibile per una formula a una certa durata. */
function rateDi(plan, durata) {
  if (durata === 'm6' && plan.rate?.m6) {
    return { testo: `2 rate da ${euro(plan.rate.m6)}`, nota: 'una ogni 30 giorni' };
  }
  if (durata === 'm12' && plan.rate?.m12) {
    return { testo: `3 rate da ${euro(plan.rate.m12)}`, nota: 'una ogni 2 mesi' };
  }
  return null;
}

function schedaPiano(plan, durata) {
  const prezzo = plan.price[durata];
  const conOpenBox = plan.openBox?.[durata];
  const rate = rateDi(plan, durata);

  // La finanziaria copre l'anno: proporla su un mese confonderebbe.
  const finanziaria = durata === 'm12' && plan.finanziaria
    ? `oppure 12 rate da ${euro(plan.finanziaria)} con finanziaria`
    : null;

  return el('article', {
    class: `price-card${plan.highlight ? ' is-featured' : ''}`,
  }, [
    plan.highlight ? el('span', { class: 'price-flag', text: 'La più scelta' }) : null,

    el('header', { class: 'price-head' }, [
      el('h3', { class: 'price-name', text: plan.name }),
      el('p', { class: 'price-detail', text: plan.detail }),
    ]),

    el('p', { class: 'price-amount' }, [
      el('span', { class: 'price-value', text: String(prezzo) }),
      el('span', { class: 'price-cur', text: '€' }),
    ]),

    rate || finanziaria
      ? el('ul', { class: 'price-rates' }, [
          rate ? el('li', {}, [
            el('strong', { text: rate.testo }),
            el('span', { text: ` — ${rate.nota}` }),
          ]) : null,
          finanziaria ? el('li', { class: 'is-alt', text: finanziaria }) : null,
        ])
      : null,

    conOpenBox
      ? el('p', { class: 'price-openbox' }, [
          el('strong', { text: euro(conOpenBox) }),
          el('span', { text: ' con un ingresso in più a settimana in open box' }),
        ])
      : null,
  ]);
}

function filtri(attivo, onChange) {
  return el('div', { class: 'price-filters', role: 'group', 'aria-label': 'Durata dell\'abbonamento' },
    PRICING.durations.map((d) =>
      el('button', {
        type: 'button',
        class: `chip${d.id === attivo ? ' is-active' : ''}`,
        'aria-pressed': String(d.id === attivo),
        text: d.label,
        onClick: () => onChange(d.id),
      })
    )
  );
}

/**
 * Le voci che non sono abbonamenti.
 * Stanno sotto e non sopra perché chi guarda i prezzi vuole prima il numero
 * grosso; ma stanno nella stessa sezione, perché scoprire il tesseramento al
 * momento di pagare è il modo migliore per far arrabbiare un cliente.
 */
function extra() {
  const { tesseramento, onRamp, dropIn, dropIn10 } = PRICING.extra;

  return el('div', { class: 'price-extra' }, [
    el('h3', { class: 'price-extra-title', text: 'Prima di cominciare' }),
    el('ul', { class: 'price-extra-list' }, [
      el('li', {}, [
        el('strong', { text: `Tesseramento e assicurazione — ${euro(tesseramento)}` }),
        el('span', { text: 'Una volta all\'anno, alla prima iscrizione. Comprende la copertura assicurativa.' }),
      ]),
      el('li', {}, [
        el('strong', { text: `On ramp, 3 ore individuali — ${euro(onRamp)}` }),
        el('span', {
          text: 'Obbligatorie per chi non ha mai fatto CrossFit: prima di entrare in classe '
            + 'impari i movimenti con un istruttore dedicato. In omaggio con l\'abbonamento annuale.',
        }),
      ]),
      el('li', {}, [
        el('strong', { text: 'Certificato medico sportivo' }),
        el('span', { text: 'Obbligatorio per legge. Si carica dall\'area soci, anche con una foto.' }),
      ]),
      el('li', {}, [
        el('strong', { text: `Vuoi solo provare? Drop in ${euro(dropIn)}` }),
        el('span', { text: `Un singolo allenamento. Pacchetto da 10 ingressi: ${euro(dropIn10)}.` }),
      ]),
    ]),
    el('a', {
      class: 'btn btn-primary',
      href: whatsappLink('Ciao! Vorrei informazioni sugli abbonamenti.'),
      target: '_blank',
      rel: 'noopener',
      text: 'Chiedi su WhatsApp',
    }),
  ]);
}

export function renderPricing(root) {
  if (!root) return;

  let durata = 'm12';

  const griglia = el('div', { class: 'price-grid' });
  const nota = el('p', { class: 'price-note' });

  const disegna = () => {
    griglia.replaceChildren(...PRICING.plans.map((p) => schedaPiano(p, durata)));
    nota.textContent = durata === 'm12'
      ? 'Prezzi per dodici mesi. La rateizzazione è sempre possibile: a rate fra loro, oppure mensile tramite finanziaria.'
      : durata === 'm6'
        ? 'Prezzi per sei mesi, con possibilità di dividere in due rate.'
        : `Prezzi per ${PRICING.durations.find((d) => d.id === durata).label}, da saldare all'iscrizione.`;
  };

  // La barra dei filtri porta lo stato attivo nel proprio markup, quindi al
  // cambio di durata si rifà: più semplice che rincorrere le classi CSS.
  const contenitore = el('div', { class: 'price-filters-wrap' });

  function montaBarra() {
    contenitore.replaceChildren(filtri(durata, (nuova) => {
      if (nuova === durata) return;
      durata = nuova;
      montaBarra();
      disegna();
    }));
  }

  root.replaceChildren(contenitore, griglia, nota, extra());
  montaBarra();
  disegna();
}
