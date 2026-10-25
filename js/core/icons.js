/* Small inline icons (24px grid, stroke = currentColor). */
const ICONS = {
  home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v8.5h11V10"/><path d="M10 18.5v-4.5h4v4.5"/>',
  cards: '<rect x="4" y="6.5" width="12" height="13" rx="2.5"/><path d="M8.5 4.5h9a2.5 2.5 0 0 1 2.5 2.5v10"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  chart: '<path d="M5 19.5V11"/><path d="M10 19.5V6"/><path d="M15 19.5v-6"/><path d="M20 19.5V9"/>',
  more: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
  speak: '<path d="M5 9.5v5h3.5L13 18V6L8.5 9.5z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  flame: '<path d="M12 20.5c3.6 0 6-2.4 6-5.8 0-3.6-2.7-5.4-3.6-8.7-1.8 1.3-2.7 3-2.7 4.8-1-.7-1.6-1.8-1.7-3.1C8 9.4 6 11.7 6 14.7c0 3.4 2.4 5.8 6 5.8z"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-.5 9-5.5 14-13 14z"/><path d="M5 19 13 11"/>',
  check: '<path d="m5.5 12.5 4 4 9-9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  edit: '<path d="M5 19h3.5L19 8.5 15.5 5 5 15.5z"/>',
  trash: '<path d="M5.5 7h13"/><path d="M9.5 7V5h5v2"/><path d="M7 7l1 12.5h8L17 7"/>',
  star: '<path d="m12 4.5 2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 16.4l-4.6 2.4.9-5.2-3.8-3.6 5.2-.7z"/>',
  book: '<path d="M5 5.5h5a2 2 0 0 1 2 2V19a2 2 0 0 0-2-2H5z"/><path d="M19 5.5h-5a2 2 0 0 0-2 2V19a2 2 0 0 1 2-2h5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
  target: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  back: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>'
};
export function icon(name, size){
  const s = size || 20;
  return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
}
