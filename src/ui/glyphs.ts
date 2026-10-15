// Small UI icons. Ink on every button colour; accents only where the icon sits on a cream panel.
const INK = '#2A2F5A';

const SHAPES = {
  play: `<path d="M11 7l14 9-14 9z" fill="${INK}"/>`,
  retry: `<path d="M16 7a9 9 0 1 0 8.2 5.3" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><path d="M21 5.5l4.5 4.2-5.4 2.2z" fill="${INK}"/>`,
  menu: `<path d="M7 9h18M7 16h18M7 23h18" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  map: `<path d="M6 9l6.5-3 7 3L27 6v17l-7.5 3-7-3L6 26z" fill="#FFFAF0" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M12.5 6v17M19.5 9v17" stroke="${INK}" stroke-width="2"/>`,
  endless: `<path d="M9 16c0-2.4 1.8-4.2 4-4.2 2.5 0 3.8 2.2 5 4.2s2.5 4.2 5 4.2c2.2 0 4-1.8 4-4.2s-1.8-4.2-4-4.2c-2.5 0-3.8 2.2-5 4.2s-2.5 4.2-5 4.2c-2.2 0-4-1.8-4-4.2z" fill="none" stroke="${INK}" stroke-width="2.5"/>`,
  back: `<path d="M19 7L10 16l9 9" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  next: `<path d="M13 7l9 9-9 9" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  pause: `<rect x="9" y="7" width="4.5" height="18" rx="1.5" fill="${INK}"/><rect x="18.5" y="7" width="4.5" height="18" rx="1.5" fill="${INK}"/>`,
  rain: `<path d="M8 18h16.2a5.6 5.6 0 0 0 .3-11.2 7.2 7.2 0 0 0-13.8 1.8A4.6 4.6 0 0 0 8 18z" fill="#FFFAF0" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 21.5v4M16 20.5v5M20 21.5v4" stroke="#4FB3F6" stroke-width="2.5" stroke-linecap="round"/>`,
  night: `<path d="M20 6.5a8.5 8.5 0 1 0 5.2 15.2A7.2 7.2 0 0 1 20 6.5z" fill="#FFCC2E" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  unlock: `<path d="M16 4l1.5 6.2L24 12l-6.5 1.8L16 20l-1.5-6.2L8 12l6.5-1.8z" fill="#FFCC2E" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="25" cy="7" r="2" fill="#5DD039"/><circle cx="7" cy="24" r="2" fill="#FF5A4E"/>`,
  rider: `<circle cx="16" cy="11" r="5.5" fill="none" stroke="${INK}" stroke-width="2.5"/><path d="M7.5 26c1.4-5 4.2-7.2 8.5-7.2s7.1 2.2 8.5 7.2" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
} as const;

export type Glyph = keyof typeof SHAPES;

export function glyph(name: Glyph, cls = 'ico'): string {
  return `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${SHAPES[name]}</svg>`;
}
