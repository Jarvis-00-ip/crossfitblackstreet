/**
 * dom.js — micro-helper per creare elementi senza librerie esterne.
 */

/**
 * Crea un elemento.
 * @param {string} tag
 * @param {Object} [attrs] - attributi; `class`, `html`, `text`, `dataset`, on* per gli eventi
 * @param {Array<Node|string>} [children]
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : value);
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }

  return node;
}

/** Libreria minimale di icone inline (stroke-based). */
const ICON_PATHS = {
  barbell: '<path d="M4 9v6M8 6v12M16 6v12M20 9v6M8 12h8"/>',
  flame: '<path d="M12 3s5 4.2 5 8.6a5 5 0 11-10 0c0-1.9 1-3.4 2-4.6 0 1.6.8 2.6 1.8 2.6 1.1 0 1.6-1.1 1.2-2.5C11.6 5.7 12 4.2 12 3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a2 2 0 01-2.2 2A16.5 16.5 0 013 6.2 2 2 0 015 4z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  medical: '<path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"/><path d="M12 9v6M9 12h6"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.1"/>',
  lungs: '<path d="M12 4v9"/><path d="M8.5 8.5C8.5 12 7 13 5.5 14c-1.4.9-1.9 2.2-1.7 4 .1 1.1 1 1.9 2.1 1.9h1.3c1.2 0 2.2-1 2.2-2.2V9.6c0-1.4-1-2.1-1.4-1.1z"/><path d="M15.5 8.5C15.5 12 17 13 18.5 14c1.4.9 1.9 2.2 1.7 4-.1 1.1-1 1.9-2.1 1.9h-1.3c-1.2 0-2.2-1-2.2-2.2V9.6c0-1.4 1-2.1 1.4-1.1z"/>',
};

/**
 * Restituisce un <svg> inline.
 * @param {keyof ICON_PATHS} name
 * @param {string} [cls]
 */
export function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', cls);
  svg.innerHTML = ICON_PATHS[name] || ICON_PATHS.info;
  return svg;
}

export const qs = (sel, scope = document) => scope.querySelector(sel);
export const qsa = (sel, scope = document) => [...scope.querySelectorAll(sel)];
