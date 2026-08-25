/**
 * ui.js — Comportamenti trasversali: header, menu mobile, scrollspy, reveal on scroll.
 */

import { qs, qsa, el } from './dom.js';

/** Header compatto + menu mobile a scomparsa. */
export function initHeader() {
  const header = qs('#siteHeader');
  const nav = qs('#nav');
  const toggle = qs('#navToggle');
  if (!header || !nav || !toggle) return;

  const setScrolled = () => header.classList.toggle('scrolled', window.scrollY > 24);
  setScrolled();
  window.addEventListener('scroll', setScrolled, { passive: true });

  const close = () => {
    nav.classList.remove('open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Apri il menu');
  };

  toggle.addEventListener('click', () => {
    const willOpen = !nav.classList.contains('open');
    nav.classList.toggle('open', willOpen);
    document.body.classList.toggle('nav-open', willOpen);
    toggle.setAttribute('aria-expanded', String(willOpen));
    toggle.setAttribute('aria-label', willOpen ? 'Chiudi il menu' : 'Apri il menu');
  });

  qsa('a', nav).forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

/** Evidenzia la voce di menu della sezione visibile. */
export function initScrollSpy() {
  const links = qsa('.nav-link');
  const sections = links
    .map((link) => qs(link.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) =>
          l.classList.toggle('active', l.getAttribute('href') === `#${entry.target.id}`)
        );
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));
}

/**
 * Animazioni allo scroll (fade-in + slide-up).
 * Osserva anche i nodi creati dinamicamente: richiamare `refresh()` dopo il render.
 */
export function initReveal() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    qsa('.reveal').forEach((n) => n.classList.add('is-visible'));
    return { refresh: () => qsa('.reveal').forEach((n) => n.classList.add('is-visible')) };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  const observeAll = () => {
    qsa('.reveal:not(.is-visible)').forEach((node) => {
      const delay = node.dataset.revealDelay;
      if (delay) node.style.setProperty('--reveal-delay', `${delay}ms`);
      observer.observe(node);
    });
  };

  observeAll();
  return { refresh: observeAll };
}

/**
 * Immagini non ancora caricate → segnaposto invece dell'icona di file rotto.
 * Il sito viene pubblicato prima che tutte le foto esistano: un'icona rotta
 * lo fa sembrare abbandonato, un segnaposto dichiarato no.
 */
export function initPhotoFallback() {
  qsa('img[data-photo-fallback]').forEach((img) => {
    const swap = () => {
      const frame = img.parentElement;
      if (!frame) return;
      frame.classList.add('is-missing');
      frame.append(el('span', { class: 'media-missing', text: img.dataset.photoFallback }));
      img.remove();
    };

    // `complete` con naturalWidth 0 = già fallita prima che il listener
    // fosse agganciato: succede quando l'immagine è in cache come errore.
    if (img.complete && img.naturalWidth === 0) swap();
    else img.addEventListener('error', swap, { once: true });
  });
}

/** Anno corrente nel footer. */
export function initYear() {
  const year = qs('#year');
  if (year) year.textContent = String(new Date().getFullYear());
}
