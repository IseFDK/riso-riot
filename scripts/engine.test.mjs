import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  normalize, defaults, posterSVG, filterPosters, escapeXML, palettes,
  shapeIds, layoutIds, normalizeHex, colorsFor, paletteForColors, contrastRatio
} from '../src/engine.mjs';
import {posters, articles} from '../src/posters.mjs';

const acid = ['#f1ff38', '#141414', '#f22ba8'];
const custom = ['#abc123', '#321abc', '#ff2211'];
const colorState = colors => ({palette: 'custom', bgColor: colors[0], inkColor: colors[1], accentColor: colors[2]});
const hash = svg => createHash('sha256').update(svg).digest('hex');

// Captured before expanding the engine. These are the exact exhibition build inputs.
const originalHashes = {
  default: 'ee8690dadacd9828d56f9a064cf7b59947354b5428e91c550a640ef25a82a6a8',
  'louder-than-words': '957eefbcd0f556fb92bb41f1e693f674279ea47a840e5fb13a46e91813caab76',
  'perfect-error': '7ee57d973325c12cc3e57dc9e92f3216af3b78437ebd23940d576ec24fa8e537',
  'look-again': '5a03e73cd30e05c53d3d097bb741b2a865c6cb5b29dd1706e3860fc7ad5efdd8',
  'pause-is-loud': '3c36b03bbfdad59c6c59ea5448e8dc40780d0eed28232ce182cb42badbc21f91',
  'paper-remembers': '31966552862d982774945ea425abe3e20effd358e3dd008acf17063d7165fb04',
  'no-silent-mode': '2859bbc9da8fe582740abe54ecfbeb9ef4560912b28b6ed2ec0b0cdfa5547343',
  'wrong-way': '811778fcd0577889b7c9094bf09bb25cf3e3dd4aebdca3f0818faad3b48c6c87',
  'ink-party': '7f2c85a235a3bd7479850f01e6e391da0894bf5cced0a39a6747d4dcde373c3f'
};

test('original default and all eight exhibition SVG outputs stay byte-identical', () => {
  assert.equal(hash(posterSVG()), originalHashes.default);
  for (const poster of posters) {
    const svg = posterSVG({
      text1: poster.headline[0], text2: poster.headline[1], shape: poster.shape,
      layout: poster.layout, angle: poster.angle, offset: 12, grain: 55
    }, poster.colors);
    assert.equal(hash(svg), originalHashes[poster.id], poster.id);
  }
});

test('normalization bounds unsafe inputs and returns only supported state fields', () => {
  const n = normalize({
    text1: 'x'.repeat(100), text2: null, shape: 'evil', layout: 'wrong', palette: 'bad',
    offset: 500, angle: -90, grain: 'NaN', hidden: 'not persisted', onload: 'alert(1)'
  });
  assert.equal(n.text1.length, 22);
  assert.equal(n.text2, '');
  assert.equal(n.shape, 'star');
  assert.equal(n.layout, 'burst');
  assert.equal(n.palette, 'acid');
  assert.equal(n.offset, 30);
  assert.equal(n.angle, -15);
  assert.equal(n.grain, 0);
  assert.deepEqual(Object.keys(n).sort(), Object.keys(defaults).sort());
  assert.deepEqual(colorsFor(n), acid);
  assert.deepEqual(normalize(null), defaults);
  assert.deepEqual(normalize(['pink']), defaults);
  assert.deepEqual(normalize('pink'), defaults);
  const extreme = normalize({offset: Infinity, angle: -Infinity, grain: Symbol('unsafe')});
  assert.equal(extreme.offset, 30);
  assert.equal(extreme.angle, -15);
  assert.equal(extreme.grain, 0);
});

test('legacy drafts migrate to their chosen palette and ignore inherited properties', () => {
  for (const palette of ['acid', 'pink', 'blue', 'paper']) {
    const state = normalize({palette, shape: 'eye', layout: 'split', text1: 'ЕЩЁ', offset: '12', grain: '55'});
    assert.equal(state.palette, palette);
    assert.equal(state.offset, 12);
    assert.equal(state.grain, 55);
    assert.deepEqual(colorsFor(state), palettes[palette]);
    assert.equal(state.bgColor, palettes[palette][0]);
  }
  for (const palette of ['__proto__', 'constructor', 'toString', null, {}, ['pink']]) {
    assert.equal(normalize({palette}).palette, 'acid');
    assert.deepEqual(colorsFor({palette}), acid);
    assert.doesNotThrow(() => posterSVG({palette}));
  }
  assert.deepEqual(normalize(Object.create({palette: 'pink', text1: 'INHERITED'})), defaults);
});

test('HEX normalizer canonicalizes short and full colors while rejecting payloads', () => {
  for (const [input, expected] of [
    ['ABC', '#aabbcc'], ['#ABC', '#aabbcc'], ['  #AbC123  ', '#abc123'],
    ['abc123', '#abc123'], ['000', '#000000'], ['#FFF', '#ffffff']
  ]) assert.equal(normalizeHex(input), expected);
  for (const value of [
    '', '#', '##abc', '#abcd', '#abcde', '#abcdefgh', '#12g', 'red', 'rgb(0,0,0)',
    'url(https://example.com)', '#abc\n123', '#fff" onload="x', '#fff/><script>',
    null, undefined, 123, {}, ['#fff']
  ]) assert.equal(normalizeHex(value), null, String(value));
});

test('custom scalar colors survive persistence and safely fall back per invalid field', () => {
  const state = normalize({palette: 'custom', bgColor: '#ABC', inkColor: ' 321ABC ', accentColor: 'ff2211'});
  assert.deepEqual(colorsFor(state), ['#aabbcc', '#321abc', '#ff2211']);
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(state))), state);
  assert.deepEqual(colorsFor({palette: 'custom', bgColor: '#f00', inkColor: 'evil', accentColor: null}), ['#ff0000', acid[1], acid[2]]);
  assert.deepEqual(colorsFor({palette: 'custom'}), acid);
  assert.deepEqual(colorsFor({...colorState(custom), palette: 'pink'}), palettes.pink);
  const returned = colorsFor({palette: 'pink'});
  returned[0] = '#000000';
  assert.deepEqual(colorsFor({palette: 'pink'}), palettes.pink);
});

test('palette identification matches the complete canonical triplet', () => {
  assert.deepEqual(Object.keys(palettes), ['acid', 'pink', 'blue', 'paper', 'mint', 'orange', 'plum', 'night']);
  assert.deepEqual(palettes.mint, ['#b7f5d4', '#0c4038', '#ff3dac']);
  assert.deepEqual(palettes.orange, ['#ff6b35', '#141414', '#2545f5']);
  assert.deepEqual(palettes.plum, ['#5b1c69', '#fff1dc', '#fb8b24']);
  assert.deepEqual(palettes.night, ['#141414', '#f1ff38', '#ff3dac']);
  assert.deepEqual(shapeIds, ['star', 'circle', 'eye', 'flower', 'waves', 'checker', 'rings']);
  assert.deepEqual(layoutIds, ['burst', 'split', 'steps', 'columns', 'band']);
  for (const [id, colors] of Object.entries(palettes)) {
    assert.equal(paletteForColors(colors), id);
    assert.equal(paletteForColors(colors.map(color => color.slice(1).toUpperCase())), id);
    assert.deepEqual(colorsFor({palette: id}), colors);
  }
  for (const colors of [custom, ['#f1ff38', '#141414', '#000000'], [], null, {0: '#fff'}, Array(3)]) {
    assert.equal(paletteForColors(colors), 'custom');
  }
});

test('SVG escapes untrusted strings in artwork and accessible labels', () => {
  for (const layout of layoutIds) {
    const svg = posterSVG({layout, text1: '<svg onload="x">', text2: '&"</text>'});
    assert(!svg.includes('<svg onload'));
    assert(!svg.includes('&"</text>'));
    assert(svg.includes('&lt;svg'));
    assert(svg.includes('&amp;&quot;&lt;/text&gt;'));
  }
  assert.equal(escapeXML('<&>'), '&lt;&amp;&gt;');
});

test('custom triplets are canonicalized atomically and cannot inject SVG attributes', () => {
  const state = {palette: 'mint', shape: 'flower', layout: 'band'};
  assert.equal(posterSVG(state, [' ABC ', '#123', 'FFF']), posterSVG(state, ['#aabbcc', '#112233', '#ffffff']));
  const invalid = [
    ['#000" onload="alert(1)', '#fff', '#f00'], ['url(https://example.com)', '#fff', '#f00'],
    ['#000', '#fff'], ['#000', '#fff', '#f00', '#0f0'], ['#000', null, '#f00'],
    [], Array(3), 'red', {0: '#000', 1: '#fff', 2: '#f00'}
  ];
  for (const colors of invalid) {
    assert.equal(posterSVG(state, colors), posterSVG(state));
  }
  const unsafeState = {...state, palette: 'custom', bgColor: '#fff" onload="x', inkColor: 'url(x)', accentColor: '</svg>'};
  assert.deepEqual(colorsFor(unsafeState), acid);
  const svg = posterSVG(unsafeState);
  assert(!svg.includes('onload='));
  assert(!svg.includes('url('));
});

test('all 280 preset combinations create distinct standalone SVG artwork', () => {
  const outputs = new Set();
  for (const shape of shapeIds) for (const layout of layoutIds) for (const palette of Object.keys(palettes)) {
    const svg = posterSVG({shape, layout, palette});
    const label = `${shape}/${layout}/${palette}`;
    assert.equal((svg.match(/<svg\b/g) || []).length, 1, label);
    assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), label);
    assert(svg.includes('width="1400" height="1960" viewBox="0 0 1400 1960"'), label);
    assert(svg.endsWith('</svg>'), label);
    assert(!/NaN|undefined|Infinity|<script\b|<image\b|<foreignObject\b/.test(svg), label);
    const actualColors = new Set([...svg.matchAll(/(?:fill|stroke)="(#[a-f\d]{6})"/g)].map(match => match[1]));
    assert.deepEqual(actualColors, new Set(palettes[palette]), label);
    outputs.add(svg);
  }
  assert.equal(outputs.size, 280);
});

test('preview and export render the same custom colors across all 35 compositions', () => {
  const outputs = new Set();
  for (const shape of shapeIds) for (const layout of layoutIds) {
    const state = {...colorState(custom), shape, layout};
    const svg = posterSVG(state);
    assert.equal(svg, posterSVG({shape, layout}, custom));
    assert.equal(svg, posterSVG(normalize(state)));
    for (const color of custom) assert(svg.includes(`fill="${color}"`));
    outputs.add(svg);
  }
  assert.equal(outputs.size, 35);
});

test('blank text remains an accessible shape-only poster for every composition', () => {
  for (const shape of shapeIds) for (const layout of layoutIds) {
    const svg = posterSVG({shape, layout, text1: '', text2: '', grain: 0});
    assert(svg.includes('aria-label="Плакат без текста"'));
    assert(svg.includes('<title>Плакат без текста</title>'));
    assert(!svg.includes('undefined'));
  }
});

test('angle and layer offset affect every shape in every layout', () => {
  for (const shape of shapeIds) for (const layout of layoutIds) {
    assert.notEqual(posterSVG({shape, layout, angle: -15}), posterSVG({shape, layout, angle: 15}), `${shape}/${layout} angle`);
    assert.notEqual(posterSVG({shape, layout, offset: 0}), posterSVG({shape, layout, offset: 30}), `${shape}/${layout} offset`);
  }
});

test('new layouts keep readable typography apart from the moving artwork', () => {
  const columns = posterSVG({layout: 'columns', shape: 'rings', angle: 15, text1: 'ЛЕВАЯ', text2: 'ПРАВАЯ'});
  assert(columns.includes('rotate(-90)'));
  assert(columns.includes('rotate(90)'));
  assert(columns.includes('rotate(0,700,980)'));
  assert(columns.includes('>ЛЕВАЯ</text>'));
  assert(columns.includes('>ПРАВАЯ</text>'));
  const band = posterSVG({layout: 'band', shape: 'rings', angle: -15, text1: 'ПЕРВАЯ', text2: 'ВТОРАЯ'});
  const artworkEnd = band.indexOf('width="1480" height="620"');
  assert(artworkEnd > band.indexOf('fill-rule="evenodd"'));
  assert(artworkEnd < band.indexOf('>ПЕРВАЯ</text>'));
  assert(band.includes('fill="#f1ff38" text-anchor="middle"'));
  assert(band.includes('rotate(0,700,980)'));
});

test('contrast uses linear sRGB luminance with a conservative invalid fallback', () => {
  assert.equal(contrastRatio('#000', '#fff'), 21);
  assert.equal(contrastRatio('#fff', '#000'), 21);
  assert.equal(contrastRatio('#abc123', '#abc123'), 1);
  assert(Math.abs(contrastRatio('#777', '#fff') - 4.478089453577214) < 1e-12);
  for (const [bg, ink] of Object.values(palettes)) {
    assert(contrastRatio(bg, ink) >= 4.5);
    assert.equal(contrastRatio(bg, ink), contrastRatio(ink, bg));
  }
  assert.equal(contrastRatio('invalid', '#fff'), 1);
  assert.equal(contrastRatio('#fff', null), 1);
});

test('filters combine category keyword favorites and alphabetical sort', () => {
  assert.equal(filterPosters(posters).length, 8);
  assert.equal(filterPosters(posters, {category: 'type'}).length, 3);
  assert.equal(filterPosters(posters, {category: 'collage'}).length, 2);
  assert.equal(filterPosters(posters, {query: 'ГРОМЧЕ'}).length, 1);
  assert.equal(filterPosters(posters, {query: '   '}).length, 8);
  assert.equal(filterPosters(posters, {query: 'nonexistentxyz'}).length, 0);
  assert.equal(filterPosters(posters, {savedOnly: true, saved: []}).length, 0);
  assert.deepEqual(filterPosters(posters, {savedOnly: true, saved: ['look-again']}).map(p => p.id), ['look-again']);
  assert.equal(filterPosters(posters, {category: 'type', savedOnly: true, saved: ['look-again']}).length, 0);
  assert.equal(filterPosters(posters, {sort: 'title'})[0].name, 'Без тихого режима');
  assert.equal(posters[0].id, 'louder-than-words');
});

test('unique poster and journal slugs retain substantive editorial copy', () => {
  assert.equal(new Set(posters.map(p => p.id)).size, 8);
  assert.equal(new Set(articles.map(p => p.id)).size, 3);
  assert(articles.every(a => a.sections.length === 4 && a.sections.every(s => s[1].length > 150)));
  assert(posters.every(p => p.desc.length > 100 && p.note.length > 100));
});
