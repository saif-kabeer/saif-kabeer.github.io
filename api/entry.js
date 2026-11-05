import {readFile} from 'node:fs/promises';
import {publicItems} from '../lib/public-data.js';
import {escapeHtml as e,normalizeItem} from '../assets/roadmap-model.js';
import {detail} from '../assets/roadmap-render.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 const slug=typeof req.query.slug==='string'?req.query.slug:'';
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>100){res.status(404).send('Entry not found');return;}
 try{
  const rows=await publicItems(slug),item=rows[0]&&normalizeItem(rows[0]);
  let html=await readFile(new URL('../roadmap/entry/index.html',import.meta.url),'utf8');
  if(!item){res.status(404).send(html.replace('<div id="detail" class="skeleton">Opening this chapter…</div>','<div id="detail"><div class="empty"><h1>This chapter isn’t here.</h1><p>It may be private or unpublished.</p><a class="button" href="/roadmap/">Back to the roadmap</a></div></div>'));return;}
  html=html.replace('<title>An ambition | Saif Kabeer</title>',`<title>${e(item.title)} | The Roadmap | Saif Kabeer</title>`).replace('content="noindex,follow"','content="index,follow"').replaceAll('https://saifkabeer.com/roadmap/entry/',`https://saifkabeer.com/roadmap/${e(slug)}`).replace('property="og:title" content="An ambition | Saif Kabeer"',`property="og:title" content="${e(item.title)} | Saif Kabeer"`).replaceAll('Follow the milestones and reflections behind an ambition on Saif Kabeer’s roadmap.',e(item.summary)).replace('<div id="detail" class="skeleton">Opening this chapter…</div>',`<div id="detail">${detail(item)}</div>`);
  res.status(200).send(html);
 }catch{res.status(503).send('<h1>The roadmap is temporarily unavailable.</h1><p>Please try again shortly.</p>');}
}
