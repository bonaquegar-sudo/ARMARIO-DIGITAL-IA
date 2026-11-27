// Icon pack: fashion line icons, 24×24, drawn with currentColor (stroke set in CSS).
// Any element with data-icon="name" gets its icon inserted at the start on load.
const P = {
  // Tabs
  armario: '<path d="M10 5.5a2 2 0 1 1 2.8 1.8c-.5.2-.8.7-.8 1.2V9m0 0-8.6 6.2c-1 .7-.5 2.3.7 2.3h15.8c1.2 0 1.7-1.6.7-2.3z"/>',
  probador: '<path d="M12 2.5V4M8 4h8c.4 2.2-1 3.4-1 5.6 0 2.1 1.5 3.1 1.5 5.4h-9c0-2.3 1.5-3.3 1.5-5.4C9 7.4 7.6 6.2 8 4zM12 15v5.5m-3.5 1h7"/><path d="M9.2 8.5c1.8.6 3.8.6 5.6 0" stroke-dasharray="1 1.6"/>',
  outfits: '<path d="M8.6 2.5 5 4.6l1.3 2.7 1.5-.7V10h8.4V6.6l1.5.7L19 4.6l-3.6-2.1c0 1.2-1.5 2.1-3.4 2.1s-3.4-.9-3.4-2.1z"/><path d="M8 12h8l.9 9.5h-3.3L12 15.5l-1.6 6H7.1z"/>',
  chat: '<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.3A7.5 7.5 0 1 1 20 11.5z"/><path d="m12.5 7.6.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" fill="currentColor"/>',
  ajustes: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5" stroke-dasharray="1.2 1.8"/><g fill="currentColor" stroke="none"><circle cx="10.6" cy="10.6" r="1"/><circle cx="13.4" cy="10.6" r="1"/><circle cx="10.6" cy="13.4" r="1"/><circle cx="13.4" cy="13.4" r="1"/></g>',
  // Categories
  gorra: '<path d="M3 15.5a7.5 7.5 0 0 1 15 0M3 15.5h15c1.6 0 2.8.4 3.5 1.3-.4.4-1 .7-1.7.7H4.2c-.7 0-1.2-.5-1.2-1.2zM10.5 8v-.6M10.5 8c-1.6 1.8-2.3 4.4-2.3 7.5"/>',
  camiseta: '<path d="M8.5 3 3 6l2 4.5 2-1V21h10V9.5l2 1L21 6l-5.5-3c0 1.9-1.6 3.2-3.5 3.2S8.5 4.9 8.5 3z"/>',
  abrigo: '<path d="M8.5 3 4.2 5.4 3 20h3.4l.6-9.5V21h10V10.5l.6 9.5H21L19.8 5.4 15.5 3 12 8.5z"/><path d="M8.5 3 10.3 10 12 8.5l1.7 1.5L15.5 3M12 8.5V21"/><path d="M14.2 14.5h1.3" />',
  pantalon: '<path d="M7 3h10l1.2 18h-4.4L12 10.5 10.2 21H5.8z"/><path d="M7 6.2h10M12 6.2v4.3"/>',
  zapatilla: '<path d="M2.5 17.8V9.6c1.6 0 2.7-.6 3.2-2 2.1 1.6 4.7 2.1 6.4 1.6l3.1 2.6c2.6.5 5.2 1.4 6.3 3.6v2.4c0 .6-.4 1-1 1h-17c-.6 0-1-.4-1-1z"/><path d="M2.5 15.6h19M8.6 9.9l.9-1.1m1.3 2 .9-1.1"/>',
  collar: '<path d="M5 3c0 6.2 3.1 10.6 7 10.6S19 9.2 19 3" stroke-dasharray="1.2 1.5"/><path d="M12 13.6 10.2 16l1.8 3.5 1.8-3.5z"/>',
  // Actions
  camara: '<path d="M4 8.5c0-1 .8-1.8 1.8-1.8h2l1.5-2.2h5.4l1.5 2.2h2c1 0 1.8.8 1.8 1.8V18c0 1-.8 1.8-1.8 1.8H5.8C4.8 19.8 4 19 4 18z"/><circle cx="12" cy="13" r="3.6"/>',
  editar: '<path d="M4 20 15.6 8.4M17 4.2a2 2 0 0 1 2.8 2.8l-1.4 1.4-2.8-2.8z"/><path d="M4 20c2.5-.4 4.6-2.2 4-4.5" stroke-dasharray="1 1.6"/>',
  borrar: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5m4-5.5v5.5"/>',
  enviar: '<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>',
  nuevo: '<path d="M12 20h8.5M16.6 3.6a2.1 2.1 0 0 1 3 3L7.2 19l-3.7.9.9-3.7z"/>',
  prev: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  next: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  // Weather
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2m0 15v2M2.5 12h2m15 0h2M5.3 5.3l1.4 1.4m10.6 10.6 1.4 1.4m0-13.4-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
  nube: '<path d="M7 18.5a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6-1.4A4.6 4.6 0 0 1 17 18.5z"/>',
  lluvia: '<path d="M7 15a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6-1.4A4.6 4.6 0 0 1 17 15z"/><path d="m8.5 18-1 2.5m5-2.5-1 2.5m5-2.5-1 2.5"/>',
  // Brand: swinging hanger with a spark
  logo: '<path d="M10 6.5a2 2 0 1 1 2.8 1.8c-.5.2-.8.7-.8 1.2V10m0 0-8.6 6.2c-1 .7-.5 2.3.7 2.3h15.8c1.2 0 1.7-1.6.7-2.3z"/><path d="m19 2.5.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" fill="currentColor"/>',
};

export const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

export const CAT_ICON = {
  'Cabeza': 'gorra', 'Parte de arriba': 'camiseta', 'Capa exterior': 'abrigo',
  'Parte de abajo': 'pantalon', 'Calzado': 'zapatilla', 'Accesorios': 'collar',
};

/** Weather icon from the sky description of tiempo.js. */
export const iconoTiempo = cielo =>
  icon(/lluv|chubas|llovizna|torment|nieve/i.test(cielo) ? 'lluvia' : /despejado|sol/i.test(cielo) ? 'sol' : 'nube');

document.querySelectorAll('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));
