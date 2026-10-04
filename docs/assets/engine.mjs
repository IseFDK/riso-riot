export const palettes = {
  acid: ['#f1ff38', '#141414', '#f22ba8'],
  pink: ['#ff3dac', '#141414', '#fff9e9'],
  blue: ['#2545f5', '#fff9e9', '#f1ff38'],
  paper: ['#fff9e9', '#2545f5', '#ff3dac'],
  mint: ['#b7f5d4', '#0c4038', '#ff3dac'],
  orange: ['#ff6b35', '#141414', '#2545f5'],
  plum: ['#5b1c69', '#fff1dc', '#fb8b24'],
  night: ['#141414', '#f1ff38', '#ff3dac']
};
export const shapeIds = ['star', 'circle', 'eye', 'flower', 'waves', 'checker', 'rings'];
export const layoutIds = ['burst', 'split', 'steps', 'columns', 'band'];
export const defaults = {
  text1: 'ДЕЛАЙ', text2: 'ШУМ', palette: 'acid', shape: 'star', layout: 'burst',
  offset: 10, angle: -6, grain: 45,
  bgColor: palettes.acid[0], inkColor: palettes.acid[1], accentColor: palettes.acid[2]
};
const colorKeys = ['bgColor', 'inkColor', 'accentColor'];

export function escapeXML(s) {
  return String(s).replace(/[<>&"']/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'}[c]));
}

// Stored drafts and color inputs share one strict, attribute-safe color format.
export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const hex = value.trim().replace(/^#/, '');
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;
  return '#' + (hex.length === 3 ? [...hex].map(c => c + c).join('') : hex).toLowerCase();
}

function normalizeTriplet(colors) {
  if (!Array.isArray(colors) || colors.length !== 3) return null;
  const normalized = Array.from(colors, normalizeHex);
  return normalized.every(Boolean) ? normalized : null;
}

export function normalize(state = {}) {
  const source = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  const read = key => Object.hasOwn(source, key) ? source[key] : defaults[key];
  const requestedPalette = read('palette');
  const palette = requestedPalette === 'custom' ||
    (typeof requestedPalette === 'string' && Object.hasOwn(palettes, requestedPalette)) ? requestedPalette : defaults.palette;
  const shape = shapeIds.includes(read('shape')) ? read('shape') : defaults.shape;
  const layout = layoutIds.includes(read('layout')) ? read('layout') : defaults.layout;
  const textValue = value => value == null ? '' :
    ['string', 'number', 'boolean'].includes(typeof value) ? String(value).slice(0, 22) : '';
  const n = {text1: textValue(read('text1')), text2: textValue(read('text2')), palette, shape, layout};
  for (const [key, min, max] of [['offset', 0, 30], ['angle', -15, 15], ['grain', 0, 100]]) {
    const value = read(key);
    const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : 0;
    n[key] = Math.max(min, Math.min(max, Number.isNaN(number) ? 0 : number));
  }
  const colors = palette === 'custom' ? colorKeys.map((key, i) => normalizeHex(read(key)) || palettes.acid[i]) : palettes[palette];
  colorKeys.forEach((key, i) => { n[key] = colors[i]; });
  return n;
}

export function colorsFor(state = {}) {
  const s = normalize(state);
  return colorKeys.map(key => s[key]);
}

export function paletteForColors(colors) {
  const normalized = normalizeTriplet(colors);
  if (!normalized) return 'custom';
  return Object.keys(palettes).find(id => palettes[id].every((color, i) => color === normalized[i])) || 'custom';
}

export function contrastRatio(bg, ink) {
  const pair = [normalizeHex(bg), normalizeHex(ink)];
  if (pair.some(color => color === null)) return 1;
  const luminance = color => {
    const channels = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16) / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const values = pair.map(luminance);
  return (Math.max(...values) + .05) / (Math.min(...values) + .05);
}

export function filterPosters(data, {category = 'all', query = '', savedOnly = false, saved = [], sort = 'edition'} = {}) {
  const q = query.trim().toLocaleLowerCase('ru');
  const filtered = data.filter(p => (category === 'all' || p.category === category) &&
    (!savedOnly || saved.includes(p.id)) && (!q || (p.name + ' ' + p.categoryName + ' ' + p.desc).toLocaleLowerCase('ru').includes(q)));
  return filtered.sort(sort === 'title' ? (a, b) => a.name.localeCompare(b.name, 'ru') : (a, b) => Number(a.edition) - Number(b.edition));
}

function star(cx, cy, r) {
  return Array.from({length: 24}, (_, i) => {
    const a = i * Math.PI / 12;
    const rr = i % 2 ? r * .57 : r;
    return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
  }).join(' ');
}

function shapeSVG(id, ink) {
  if (id === 'star') return `<polygon points="${star(700, 890, 460)}"/>`;
  if (id === 'circle') return '<circle cx="700" cy="890" r="420"/>';
  if (id === 'eye') return '<path d="M190 890Q700 230 1210 890Q700 1550 190 890Z"/><circle cx="700" cy="890" r="145" fill="' + ink + '"/>';
  if (id === 'flower') {
    const petals = Array.from({length: 8}, (_, i) => {
      const angle = i * Math.PI / 4;
      return `<circle cx="${(700 + Math.cos(angle) * 280).toFixed(2)}" cy="${(890 + Math.sin(angle) * 280).toFixed(2)}" r="165"/>`;
    }).join('');
    return `${petals}<circle cx="700" cy="890" r="230"/><circle cx="700" cy="890" r="100" fill="${ink}"/>`;
  }
  if (id === 'waves') {
    const ribbon = '<path d="M240 615C390 455 540 455 700 615S1010 775 1160 615L1160 760C1010 920 850 920 700 760S390 600 240 760Z"/>';
    return `${ribbon}<g transform="translate(0 220)">${ribbon}</g><g transform="translate(0 440)">${ribbon}</g>`;
  }
  if (id === 'checker') {
    let squares = '';
    for (let row = 0; row < 6; row++) for (let column = 0; column < 6; column++) {
      if ((row + column) % 2 === 0) squares += `<rect x="${265 + column * 145}" y="${455 + row * 145}" width="145" height="145"/>`;
    }
    return squares;
  }
  // Alternating circular contours form three thick, open-center ink rings.
  const rings = [445, 360, 280, 195, 115, 35].map(r =>
    `M${700 + r} 890A${r} ${r} 0 1 0 ${700 - r} 890A${r} ${r} 0 1 0 ${700 + r} 890Z`).join('');
  return `<path fill-rule="evenodd" d="${rings}"/>`;
}

export function posterSVG(input = {}, customColors) {
  const s = normalize(input), [bg, ink, accent] = normalizeTriplet(customColors) || colorsFor(s), offset = s.offset;
  const shape = shapeSVG(s.shape, ink);
  let pattern = '';
  for (let y = 24; y < 1960; y += 36) for (let x = 20; x < 1400; x += 36) {
    const r = (.7 + (x + y) % 5 / 2) * s.grain / 100;
    pattern += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}"/>`;
  }
  const text = (v, y, fill, dx = 0) => `<text x="${700 + dx}" y="${y}" fill="${fill}" text-anchor="middle" textLength="${v.length > 1 ? 1240 : 600}" lengthAdjust="spacingAndGlyphs" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="240">${escapeXML(v || ' ')}</text>`;
  let content;
  // Keep the original three compositions byte-for-byte stable for the exhibition.
  if (s.layout === 'split') content = `<rect x="0" y="980" width="1400" height="980" fill="${ink}"/> <g fill="${accent}" transform="translate(${offset} ${offset})">${shape}</g><g fill="${bg}" transform="scale(.63) translate(410 530)">${shape}</g>${text(s.text1, 310, ink)}${text(s.text2, 1810, bg)}`;
  else if (s.layout === 'steps') content = `<g fill="${ink}" transform="translate(${offset},${offset}) rotate(${s.angle},700,890)">${shape}</g><g fill="${accent}" transform="rotate(${s.angle},700,890)">${shape}</g><rect x="-100" y="300" width="1460" height="315" fill="${ink}" transform="rotate(-8 700 500)"/><rect x="70" y="1120" width="1400" height="315" fill="${ink}" transform="rotate(6 700 1300)"/>${text(s.text1, 565, bg, -20)}${text(s.text2, 1375, bg, 20)}`;
  else if (s.layout === 'columns') {
    const columnText = (value, transform) => `<text x="0" y="0" fill="${ink}" transform="${transform}" textLength="${value.length > 1 ? 1460 : 600}" lengthAdjust="spacingAndGlyphs" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="200">${escapeXML(value || ' ')}</text>`;
    content = `<g transform="translate(210 267) scale(.7)"><g fill="${ink}" transform="translate(${offset},${offset}) rotate(${s.angle},700,890)">${shape}</g><g fill="${accent}" transform="rotate(${s.angle},700,890)">${shape}</g></g><rect x="50" y="200" width="245" height="1540" fill="${bg}"/><rect x="1105" y="200" width="245" height="1540" fill="${bg}"/>${columnText(s.text1, 'translate(275 1710) rotate(-90)')}${columnText(s.text2, 'translate(1125 250) rotate(90)')}`;
  } else if (s.layout === 'band') {
    const bandText = (value, y) => `<text x="700" y="${y}" fill="${bg}" text-anchor="middle" textLength="${value.length > 1 ? 1200 : 600}" lengthAdjust="spacingAndGlyphs" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="215">${escapeXML(value || ' ')}</text>`;
    content = `<g transform="translate(-245 -221.5) scale(1.35)"><g fill="${ink}" transform="translate(${offset},${offset}) rotate(${s.angle},700,890)">${shape}</g><g fill="${accent}" transform="rotate(${s.angle},700,890)">${shape}</g></g><rect x="-40" y="670" width="1480" height="620" fill="${ink}"/><rect x="0" y="670" width="1400" height="12" fill="${accent}"/>${bandText(s.text1, 920)}${bandText(s.text2, 1175)}`;
  } else content = `<g fill="${ink}" transform="translate(${offset},${offset}) rotate(${s.angle},700,890)">${shape}</g><g fill="${accent}" transform="rotate(${s.angle},700,890)">${shape}</g>${text(s.text1, 350, accent, offset)}${text(s.text1, 340, ink)}${text(s.text2, 1760, accent, offset)}${text(s.text2, 1750, ink)}`;
  // The new layouts keep their type inside the page while the artwork still tilts.
  const compositionAngle = s.layout === 'columns' || s.layout === 'band' ? 0 : s.angle * .5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1960" viewBox="0 0 1400 1960" role="img" aria-label="${escapeXML((s.text1 + ' ' + s.text2).trim() || 'Плакат без текста')}"><title>${escapeXML((s.text1 + ' ' + s.text2).trim() || 'Плакат без текста')}</title><rect width="1400" height="1960" fill="${bg}"/><g transform="rotate(${compositionAngle},700,980)">${content}</g><g fill="${ink}" opacity=".15">${pattern}</g><path d="M50 45H1350M50 1905H1350" fill="none" stroke="${s.layout === 'split' ? accent : ink}" stroke-width="3"/><text x="55" y="95" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="${ink}">ШУМ / ЦИФРОВОЙ ЛИСТ</text><text x="55" y="1870" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="${s.layout === 'split' ? bg : ink}">RISO RIOT — НЕЗАВИСИМЫЙ ПОСТЕР-КЛУБ</text><text x="1345" y="95" font-family="Arial,sans-serif" text-anchor="end" font-size="28" fill="${ink}">01 / 01</text></svg>`;
}
