import {getItems,itemUrl} from './roadmap-api.js';
import {filterItems,escapeHtml as e} from './roadmap-model.js';
try{const items=filterItems(await getItems()).slice(0,3);document.querySelector('#roadmap-teaser').innerHTML=items.map(i=>`<p style="margin:12px 0"><a href="${itemUrl(i.slug)}">${e(i.title)}</a> <small style="color:var(--muted)">· ${e(i.status)}</small></p>`).join('');}catch{/* Keep the navigation available when the roadmap database is offline. */}
