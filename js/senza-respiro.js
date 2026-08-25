/**
 * senza-respiro.js — Sezione del progetto e carosello Instagram.
 *
 * Sul carosello, una scelta obbligata: mostrare "gli ultimi post"
 * automaticamente richiederebbe la Instagram Graph API, un account Business e
 * un access token da rinnovare ogni 60 giorni — quindi un backend che se ne
 * occupi. La Basic Display API, che bastava, è stata dismessa a fine 2024.
 *
 * L'embed del singolo post invece funziona senza alcun token e non scade mai.
 * Il carosello mostra quindi post scelti a mano, elencati in `data.js`.
 *
 * Gli iframe di Instagram profilano chi li vede: vengono caricati solo al
 * click, non all'apertura della pagina. È corretto lato privacy ed evita di
 * appesantire una home che oggi spedisce ~12 KB di JavaScript.
 */

import { el, qs, icon } from './dom.js';
import { SENZA_RESPIRO, INSTAGRAM_POSTS, CONTACTS } from './data.js';

/** Card fotografica con segnaposto se il file non è ancora stato caricato. */
function photoCard(photo, index) {
  const figure = el('figure', {
    class: 'sr-photo reveal',
    dataset: { revealDelay: String(index * 90) },
  });

  const img = el('img', { src: photo.src, alt: photo.alt, loading: 'lazy' });

  // Un'immagine mancante mostrerebbe l'icona di file rotto, che fa sembrare
  // il sito abbandonato. Meglio un segnaposto che dice quale file manca.
  img.addEventListener('error', () => {
    figure.classList.add('is-missing');
    img.remove();
    figure.prepend(el('span', { class: 'sr-missing', text: photo.src.split('/').pop() }));
  });

  figure.append(img, el('figcaption', { text: photo.label }));
  return figure;
}

export function renderSenzaRespiro(root, data = SENZA_RESPIRO) {
  if (!root) return;

  const { athlete } = data;

  root.replaceChildren(
    el('div', { class: 'sr-copy' }, [
      el('p', { class: 'eyebrow reveal', text: data.eyebrow }),
      el('h2', { class: 'section-title reveal', dataset: { revealDelay: '60' } }, [
        document.createTextNode(data.title.split(' ')[0] + ' '),
        el('span', { class: 'accent', text: data.title.split(' ').slice(1).join(' ') }),
      ]),
      el('p', { class: 'sr-claim reveal', dataset: { revealDelay: '100' }, text: data.claim }),
      el('p', { class: 'lead reveal', dataset: { revealDelay: '140' }, text: data.lead }),
      el('p', { class: 'reveal', dataset: { revealDelay: '180' }, text: data.body }),

      el('div', { class: 'sr-athlete reveal', dataset: { revealDelay: '220' } }, [
        el('div', {}, [
          el('strong', { text: athlete.name }),
          el('span', { text: athlete.note }),
        ]),
        el('a', {
          class: 'btn btn-ghost btn-sm',
          href: athlete.url,
          target: '_blank',
          rel: 'noopener',
        }, [icon('instagram'), el('span', { text: athlete.handle })]),
      ]),
    ]),

    el('div', { class: 'sr-gallery' }, data.photos.map(photoCard))
  );
}

/* ------------------------------------------------------------------ *
 * Carosello Instagram
 * ------------------------------------------------------------------ */

/**
 * Riquadro che diventa un embed solo quando qualcuno lo chiede.
 * Prima del click non parte nessuna richiesta verso Instagram.
 */
function postCard(code, index) {
  const card = el('article', {
    class: 'ig-card reveal',
    dataset: { revealDelay: String(index * 80) },
  });

  const load = () => {
    card.classList.add('is-loaded');
    card.replaceChildren(
      el('iframe', {
        src: `https://www.instagram.com/p/${encodeURIComponent(code)}/embed`,
        title: `Post Instagram ${code}`,
        loading: 'lazy',
        scrolling: 'no',
        allowtransparency: 'true',
        frameborder: '0',
      })
    );
  };

  card.append(
    el('button', { type: 'button', class: 'ig-facade', onClick: load }, [
      el('span', { class: 'ig-facade-icon' }, [icon('instagram')]),
      el('span', { class: 'ig-facade-label', text: 'Mostra il post' }),
      el('span', {
        class: 'ig-facade-note',
        text: 'Caricandolo, Instagram potrà rilevare la tua visita.',
      }),
    ])
  );

  return card;
}

export function renderInstagram(root, codes = INSTAGRAM_POSTS) {
  if (!root) return;

  const follow = el('a', {
    class: 'btn btn-primary',
    href: CONTACTS.instagram,
    target: '_blank',
    rel: 'noopener',
  }, [icon('instagram'), el('span', { text: `Seguici su ${CONTACTS.instagramHandle}` })]);

  if (!codes.length) {
    // Nessun post scelto: meglio un invito diretto che una fila di riquadri
    // vuoti. Come riempirlo è spiegato in data.js.
    root.replaceChildren(
      el('div', { class: 'ig-empty reveal' }, [
        el('p', { text: 'Gli allenamenti, gli eventi e le storie del box li raccontiamo su Instagram.' }),
        follow,
      ])
    );
    return;
  }

  root.replaceChildren(
    el('div', { class: 'ig-grid' }, codes.map(postCard)),
    el('div', { class: 'ig-follow reveal' }, [follow])
  );
}
