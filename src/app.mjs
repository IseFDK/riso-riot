import {glyph} from './glyphs.mjs';
import {posters} from './posters.mjs';
import {defaults,normalize,posterSVG,filterPosters,palettes,shapeIds,layoutIds,normalizeHex,colorsFor,paletteForColors,contrastRatio} from './engine.mjs';
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
let toastTimer;function toast(t){const el=$('.toast');if(!el)return;el.textContent=t;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3200);}
const storage={get(k,fallback){try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}};
let saved=storage.get('riso-saved',[]);if(!Array.isArray(saved))saved=[];saved=saved.filter(id=>posters.some(p=>p.id===id));
function syncSaved(){for(const b of $$('[data-save]')){const is=saved.includes(b.dataset.save),p=posters.find(p=>p.id===b.dataset.save);b.setAttribute('aria-pressed',String(is));b.setAttribute('aria-label',`${is?'Убрать из сохранённых':'Сохранить'} плакат «${p?.name||''}»`);b.innerHTML=glyph(is?'♥':'♡')+(b.classList.contains('button')?(is?' ЛИСТ СОХРАНЁН':' СОХРАНИТЬ ЛИСТ'):'');}const count=$('#saved-count');if(count)count.textContent=saved.length;}
let renderGallery;
document.addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(!b)return;const id=b.dataset.save;if(!posters.some(p=>p.id===id))return;if(saved.includes(id)){saved=saved.filter(s=>s!==id);toast('Лист убран из сохранённых')}else{saved.push(id);toast('Лист сохранён в этом браузере')}if(!storage.set('riso-saved',saved))toast('Лист сохранён на время этой вкладки: хранилище браузера недоступно');syncSaved();renderGallery?.(id);});syncSaved();
const scene=$('#stack-scene'),stackButton=$('.stack-toggle');if(scene&&stackButton){stackButton.addEventListener('click',()=>{const spread=scene.classList.toggle('spread');stackButton.setAttribute('aria-pressed',String(spread));stackButton.innerHTML=`${spread?'Собрать листы':'Разложить листы'} ${glyph("↔")}`;});}
if(document.body.dataset.page==='gallery') {let category='all',savedOnly=false;const grid=$('#poster-grid'),search=$('#poster-search'),sort=$('#poster-sort'),savedButton=$('.saved-filter');const card=p=>`<article class="poster-card" data-id="${p.id}"><a class="poster-image" href="posters/${p.id}.html"><img src="art/${p.id}.svg" width="1400" height="1960" alt="${p.name}: ${p.palette}" loading="lazy"><span class="poster-open" aria-hidden="true">СМОТРЕТЬ ${glyph("↗")}</span></a><div class="card-meta"><span>${p.categoryName} / ${p.edition}</span><button class="save-poster" type="button" data-save="${p.id}" aria-pressed="false" aria-label="Сохранить плакат «${p.name}»">${glyph("♡")}</button></div><h2><a href="posters/${p.id}.html">${p.name}</a></h2></article>`;
renderGallery=(focusId)=>{const oldButtons=$$('[data-save]',grid),oldIndex=oldButtons.findIndex(b=>b.dataset.save===focusId);const hadFocus=!!focusId&&document.activeElement?.dataset?.save===focusId;const filtered=filterPosters(posters,{category,query:search.value,savedOnly,saved,sort:sort.value});grid.innerHTML=filtered.map(card).join('');$('#gallery-empty').hidden=filtered.length>0;grid.hidden=filtered.length===0;$('#result-count').textContent=`На стене: ${filtered.length} из ${posters.length} листов`;syncSaved();if(hadFocus){const buttons=$$('[data-save]',grid),target=buttons.find(b=>b.dataset.save===focusId)||buttons[Math.max(0,Math.min(oldIndex,buttons.length-1))]||$('#gallery-empty .reset-filters');target?.focus();}};
for(const b of $$('[data-filter]'))b.addEventListener('click',()=>{category=b.dataset.filter;for(const t of $$('[data-filter]'))t.setAttribute('aria-pressed',String(t===b));renderGallery()});search.addEventListener('input',renderGallery);sort.addEventListener('change',renderGallery);savedButton.addEventListener('click',()=>{savedOnly=!savedOnly;savedButton.setAttribute('aria-pressed',String(savedOnly));renderGallery();});for(const b of $$('.reset-filters'))b.addEventListener('click',()=>{category='all';savedOnly=false;search.value='';sort.value='edition';for(const t of $$('[data-filter]'))t.setAttribute('aria-pressed',String(t.dataset.filter==='all'));savedButton.setAttribute('aria-pressed','false');renderGallery();if(b.closest('#gallery-empty'))search.focus();});renderGallery();
}
if(document.body.dataset.page==='lab'){
 const form=$('#lab-controls'),preview=$('#poster-preview'),undo=$('#undo-poster'),dialog=$('#reset-dialog'),status=$('#preview-status'),colorEditor=$('#custom-colors'),validation=$('#color-validation');
 const colorKeys=['bgColor','inkColor','accentColor'];
 let history=[],state=normalize(storage.get('riso-draft',defaults));
 const preset=new URLSearchParams(location.search).get('poster'),poster=posters.find(p=>p.id===preset);
 if(poster)state=normalize({text1:poster.headline[0],text2:poster.headline[1],shape:poster.shape,layout:poster.layout,angle:poster.angle,offset:12,palette:paletteForColors(poster.colors),bgColor:poster.colors[0],inkColor:poster.colors[1],accentColor:poster.colors[2],grain:55});
 if(poster){const cleanURL=new URL(location.href);cleanURL.searchParams.delete('poster');window.history.replaceState(window.history.state,'',cleanURL);}
 let saveUnavailable=false,currentSVG='',scheduled;
 function syncColors(preserveEditing=true){
  const colors=colorsFor(state);
  for(const [i,key]of colorKeys.entries()){
   const picker=$(`[data-picker-color="${key}"]`),hex=$(`[data-hex-color="${key}"]`);
   picker.value=colors[i];
   if(!preserveEditing||document.activeElement!==hex){hex.value=colors[i];hex.removeAttribute('aria-invalid');}
  }
  form.elements.namedItem('palette').value=state.palette;
  $('.palette-mini.custom').style.background=`linear-gradient(90deg,${colors[0]} 33%,${colors[1]} 33% 66%,${colors[2]} 66%)`;
 }
 function clearColorFeedback(){validation.textContent='';for(const hex of $$('[data-hex-color]'))hex.removeAttribute('aria-invalid');}
 function render(){
  cancelAnimationFrame(scheduled);currentSVG=posterSVG(state);preview.innerHTML=currentSVG;syncColors();
  $('#count1').textContent=`${state.text1.length} / 22`;$('#count2').textContent=`${state.text2.length} / 22`;
  $('#offset-value').value=state.offset+' px';$('#angle-value').value=state.angle+'°';$('#grain-value').value=state.grain+'%';undo.disabled=history.length===0;
  status.textContent=state.text1.trim()||state.text2.trim()?'Макет готов':'Лист без текста';
  const colors=colorsFor(state),ratio=contrastRatio(colors[0],colors[1]),hint=$('#contrast-hint');
  hint.textContent=ratio<4.5?`Буквы и фон близки по цвету (${ratio.toFixed(1)}:1). Для читаемости попробуй темнее буквы или светлее фон.`:'';
  hint.hidden=ratio>=4.5;
  if(!storage.set('riso-draft',state)&&!saveUnavailable){saveUnavailable=true;toast('Хранилище браузера недоступно: макет останется только в этой вкладке');}
 }
 function syncForm(){
  for(const [name,value]of Object.entries(state)){const field=form.elements.namedItem(name);if(field)field.value=value;}
  syncColors(false);clearColorFeedback();colorEditor.open=state.palette==='custom';
 }
 function remember(next){const normalized=normalize(next);if(JSON.stringify(normalized)===JSON.stringify(state))return false;history.push({...state});if(history.length>60)history.shift();state=normalized;return true;}
 function push(next){remember(next);syncForm();render();}
 function queueRender(){cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(render);}
 form.addEventListener('submit',e=>e.preventDefault());
 form.addEventListener('input',e=>{
  const field=e.target,key=field.dataset.hexColor||field.dataset.pickerColor;
  if(key){
   const color=normalizeHex(field.value);
   if(!color){field.setAttribute('aria-invalid','true');validation.textContent='Введи HEX вроде #ff3dac или #f3a. Превью сохраняет последний верный цвет.';return;}
   clearColorFeedback();const colors=colorsFor(state),next={...state,palette:'custom'};
   for(const [i,colorKey]of colorKeys.entries())next[colorKey]=colors[i];next[key]=color;
   if(remember(next)){syncColors();queueRender();}
   return;
  }
  const next={...state,...Object.fromEntries(new FormData(form))};
  if(field.name==='palette'){clearColorFeedback();if(field.value==='custom')colorEditor.open=true;}
  if(remember(next)){syncColors();queueRender();}
 });
 form.addEventListener('focusout',e=>{
  const key=e.target.dataset.hexColor;if(!key)return;
  const color=normalizeHex(e.target.value);
  if(color){e.target.value=color;return;}
  const previous=colorsFor(state)[colorKeys.indexOf(key)];e.target.value=previous;e.target.removeAttribute('aria-invalid');validation.textContent=`Цвет не распознан. Оставили ${previous}.`;
 });
 undo.addEventListener('click',()=>{if(!history.length)return;state=history.pop();syncForm();render();toast('Вернули предыдущий вариант');});
 $('#random-poster').addEventListener('click',()=>{
  const phrases=[['ПОРА','НАЧАТЬ'],['НЕ ТИХО','А ЯРКО'],['ЕСТЬ','ХАРАКТЕР'],['СВОЙ','РИТМ'],['БУДЬ','ВИДИМЫМ'],['ПРОСТО','ПОПРОБУЙ']],pick=a=>a[Math.floor(Math.random()*a.length)],p=pick(phrases);
  push({...state,text1:p[0],text2:p[1],palette:state.palette==='custom'?'custom':pick(Object.keys(palettes)),shape:pick(shapeIds),layout:pick(layoutIds),offset:Math.floor(Math.random()*25),angle:Math.floor(Math.random()*25)-12,grain:30+Math.floor(Math.random()*50)});
  toast(state.palette==='custom'?'Новая композиция. Твои цвета оставили.':'Новый вариант. Теперь можно спорить с ним.');
 });
 $('#reset-poster').addEventListener('click',()=>{dialog.returnValue='';dialog.showModal();});
 dialog.addEventListener('close',()=>{if(dialog.returnValue==='reset'){push(defaults);toast('Чистый лист готов. Предыдущий вариант можно вернуть.')}$('#reset-poster').focus();});
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 $('#download-svg').addEventListener('click',()=>{render();download(new Blob([currentSVG],{type:'image/svg+xml;charset=utf-8'}),'riso-riot-my-poster.svg');toast('SVG подготовлен. Проверь загрузки браузера.');});
 $('#download-png').addEventListener('click',async()=>{
  const b=$('#download-png');if(b.disabled)return;render();const svgAtClick=currentSVG;b.disabled=true;b.textContent='ГОТОВИМ PNG…';status.textContent='Подготовка PNG';let url;
  try{
   url=URL.createObjectURL(new Blob([svgAtClick],{type:'image/svg+xml;charset=utf-8'}));const img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('SVG rasterization failed'));img.src=url});
   const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=1960;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.drawImage(img,0,0);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG export unavailable');download(blob,'riso-riot-my-poster.png');toast('PNG подготовлен. Проверь загрузки браузера.');status.textContent=currentSVG===svgAtClick?'PNG готов':'PNG готов: вариант на момент нажатия';
  }catch{status.textContent='PNG не удалось подготовить';toast('Этот браузер не смог создать PNG. Скачай SVG.')}
  finally{if(url)URL.revokeObjectURL(url);b.disabled=false;b.innerHTML='СКАЧАТЬ PNG '+glyph('↓');}
 });
 syncForm();render();
}
