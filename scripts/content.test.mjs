import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{palettes,shapeIds,layoutIds}from'../src/engine.mjs';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}const files=walk('docs'),html=files.filter(f=>f.endsWith('.html'));
test('all public page local links and media exist',()=>{let checked=0;for(const file of html){const s=fs.readFileSync(file,'utf8');for(const match of s.matchAll(/(?:href|src)="([^"]+)"/g)){const url=match[1].split('#')[0].split('?')[0];if(!url||/^(https?:|data:|mailto:)/.test(url))continue;assert(fs.existsSync(path.resolve(path.dirname(file),url)),`${file} missing ${url}`);checked++}}assert(checked>200)});
test('every public page has Russian lang unique title description and one h1',()=>{const titles=new Set();for(const file of html.filter(f=>!f.endsWith('qa.html'))){const s=fs.readFileSync(file,'utf8');assert(s.includes('<html lang="ru">'));assert(s.includes('name="description"'));assert.equal([...s.matchAll(/<h1[ >]/g)].length,1,file);const title=s.match(/<title>(.*?)<\/title>/)[1];assert(!titles.has(title),title);titles.add(title);assert(s.includes('href="#main"'));assert(s.includes('aria-label="Основная навигация"'));assert(s.includes('rel="icon"'))}assert.equal(titles.size,17)});
test('art and font files have expected formats and source provenance',()=>{assert.equal(fs.readFileSync('docs/fonts/manrope-cyrillic-wght-normal.woff2').subarray(0,4).toString(),'wOF2');const art=fs.readFileSync('docs/art/riso-sheet.webp');assert.equal(art.subarray(0,4).toString(),'RIFF');assert.equal(art.subarray(8,12).toString(),'WEBP');assert(fs.readFileSync('docs/art/riso-sheet-provenance.txt','utf8').includes('No specific model identifier'));assert(fs.existsSync('docs/fonts/OFL.txt'));assert(!fs.existsSync('docs/art/riso-sheet-original.png'))});
test('sitemap has sixteen substantive pages and no QA or 404',()=>{const s=fs.readFileSync('docs/sitemap.xml','utf8');assert.equal([...s.matchAll(/<loc>/g)].length,16);assert(!s.includes('qa.html'));assert(!s.includes('404.html'));assert(fs.existsSync('docs/.nojekyll'))});
test('CSS provides mobile and reduced-motion support and code has no external requests',()=>{const css=fs.readFileSync('src/style.css','utf8'),app=fs.readFileSync('src/app.mjs','utf8');assert(css.includes('prefers-reduced-motion'));assert(css.includes('@media(max-width:550px)'));assert(css.includes(':focus-visible'));assert(!app.includes('fetch('));assert(!app.includes('eval('))});

test('range controls have explicit labels and decorative symbols use SVG',()=>{const s=fs.readFileSync('docs/lab.html','utf8');for(const name of ['offset','angle','grain']){assert(s.includes(`for="lab-${name}"`));assert(s.includes(`id="lab-${name}" aria-label=`))}for(const file of html.filter(f=>!f.endsWith('qa.html'))){const s=fs.readFileSync(file,'utf8');assert(s.includes('class="glyph glyph-arrow"'));assert(!/[↗↔↶↺↓↑←→♡♥✳]/.test(s),file)}});

// Prevent the CSS class collision that placed the PNG button over the live art.
test('physical print sheets do not share classes with paper-colored controls',()=>{
 const home=fs.readFileSync('docs/index.html','utf8'),lab=fs.readFileSync('docs/lab.html','utf8');
 const sheets=[...home.matchAll(/class="([^"]*paper-(?:back|middle|front)[^"]*)"/g)].map(m=>m[1].split(/\s+/));
 const controls=[lab.match(/id="download-png"[^>]*class="([^"]+)"/)[1].split(/\s+/),['palette-mini','paper']];
 assert.equal(sheets.length,3);
 for(const sheet of sheets)for(const control of controls)assert.deepEqual(sheet.filter(c=>control.includes(c)),[]);
 const preview=lab.match(/id="poster-preview"[^>]*>([\s\S]*?)<\/div>/)[1];
 assert(preview.startsWith('<svg xmlns='));assert(preview.includes('viewBox="0 0 1400 1960"'));
});

// UI choices must cover the renderer contract and keep native/HEX inputs accessible.
test('expanded lab exposes every palette shape and composition with named ink inputs',()=>{
 const html=fs.readFileSync('docs/lab.html','utf8');
 for(const id of [...Object.keys(palettes),'custom'])assert(html.includes(`name="palette" value="${id}"`),id);
 for(const id of [...shapeIds,...layoutIds])assert(html.includes(`<option value="${id}">`),id);
 for(const [key,label]of [['bgColor','Фон'],['inkColor','Чернила'],['accentColor','Акцент']]){
  assert(html.includes(`type="color" id="lab-${key}"`));assert(html.includes(`for="lab-${key}"`));
  assert(html.includes(`data-picker-color="${key}" aria-label="${label}: выбрать цвет"`));
  assert(html.includes(`data-hex-color="${key}" aria-label="${label}: HEX"`));
 }
 assert(html.includes('id="color-validation"'));assert(html.includes('id="contrast-hint"'));
});
