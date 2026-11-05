import {categories,statuses,filterItems,timeline,pad,escapeHtml as e} from './roadmap-model.js';
import {getItems} from './roadmap-api.js';
import {card,dateLabel,hrefFor} from './roadmap-render.js';
const $=s=>document.querySelector(s), params=new URLSearchParams(location.search);
const preview=params.get('preview')==='1';let items=[],limit=12,category=params.get('category')||'',view=params.get('view')==='timeline'?'timeline':'grid';
if(preview){$('#preview-banner').hidden=false;document.querySelector('meta[name=robots]').content='noindex,nofollow';}
$('#status').insertAdjacentHTML('beforeend',statuses.map(s=>`<option>${e(s)}</option>`).join(''));
$('#search').value=params.get('q')||'';$('#status').value=params.get('status')||'';$('#sort').value=params.get('sort')||'priority';
function renderCategories(){$('#categories').innerHTML=['',...categories].map(c=>`<button class="category" data-category="${e(c)}" aria-pressed="${category===c}">${e(c||'Everything')}</button>`).join('');}
function render(){
 const filters={q:$('#search').value,category,status:$('#status').value,sort:$('#sort').value};
 const filtered=filterItems(items,filters);const events=timeline(filtered);const count=view==='grid'?filtered.length:events.length;
 $('#total').textContent=pad(items.length);$('#active').textContent=pad(items.filter(i=>i.status==='In progress').length);$('#completed').textContent=pad(items.filter(i=>i.status==='Completed').length);
 $('#result-count').textContent=view==='grid'?`SHOWING ${pad(Math.min(limit,count))} OF ${pad(count)} AMBITIONS`:`${pad(count)} MOMENTS ALONG THE WAY`;
 $('#reset').hidden=!filters.q&&!category&&!filters.status&&filters.sort==='priority';
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));renderCategories();
 const results=$('#results');results.className=view==='grid'?'grid':'timeline';
 if(!count)results.innerHTML=`<div class="empty"><div class="empty-icon">↗</div><h3>${items.length?(view==='timeline'?'The story is still unfolding.':'Nothing here. Yet.'):'A new chapter is taking shape.'}</h3><p>${items.length?(view==='timeline'?'Dated updates and completed milestones will appear here.':'Try another category or search. There’s more to explore.'):'The first ambitions will appear here when they’re ready to be shared. A little room for possibility.'}</p>${items.length?'<button class="text-button" data-clear>Reset filters ↺</button>':'<a class="button" href="/">Get to know me ↗</a>'}</div>`;
 else if(view==='grid')results.innerHTML=filtered.slice(0,limit).map((i,n)=>card(i,n,preview)).join('');
 else results.innerHTML=events.slice(0,limit).map(event=>`<article class="timeline-event"><time class="timeline-date" datetime="${e(event.date)}">${dateLabel(event.date)}</time><div><span class="eyebrow">${event.kind}</span><h3>${e(event.title)}</h3>${event.body?`<p>${e(event.body)}</p>`:''}<a href="${hrefFor(event.item,preview)}">${e(event.item.title)} ↗</a></div></article>`).join('');
 $('#more').hidden=count<=limit;
 const next=new URLSearchParams();if(preview)next.set('preview','1');for(const [k,v]of Object.entries(filters))if(v&&(k!=='sort'||v!=='priority'))next.set(k,v);if(view!=='grid')next.set('view',view);history.replaceState(null,'',location.pathname+(next.size?'?'+next:''));
}
function reset(){$('#search').value='';$('#status').value='';$('#sort').value='priority';category='';limit=12;render();}
$('#categories').addEventListener('click',ev=>{const b=ev.target.closest('[data-category]');if(b){category=b.dataset.category;limit=12;render();}});
$('#search').addEventListener('input',()=>{limit=12;render();});['#status','#sort'].forEach(s=>$(s).addEventListener('change',()=>{limit=12;render();}));
$('#reset').addEventListener('click',reset);$('#results').addEventListener('click',ev=>{if(ev.target.closest('[data-clear]'))reset();});
$('#more').addEventListener('click',()=>{limit+=12;render();});
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{view=b.dataset.view;limit=12;render();});
try{items=preview?(await import('./roadmap-demo.js')).demoItems:await getItems();render();}catch{render();$('#results').innerHTML='<div class="empty"><h3>The notebook couldn’t open.</h3><p>Please try again in a moment.</p><button class="button" id="retry">Try again ↺</button></div>';$('#result-count').textContent='Unable to load ambitions';$('#retry').onclick=()=>location.reload();}
