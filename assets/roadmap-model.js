export const categories = ['Ventures','Research & Education','Creative & Technical','Experiences','Life & Growth'];
export const statuses = ['Idea','Planned','In progress','Paused','Completed','Archived'];
export const statusLabels = {Idea:'Someday',Planned:'Up next','In progress':'Building',Paused:'On hold',Completed:'Achieved',Archived:'No longer pursuing'};
export const slugify = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeUrl = value => {try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
export const isPublic = item => item.visibility === 'public' && !item.deleted_at;
export const pad = n => String(n).padStart(2,'0');
export function filterItems(items,{q='',category='',status='',sort='priority'}={}) {
 const term=q.trim().toLocaleLowerCase();
 return items.filter(isPublic).filter(i=>(!category||i.category===category)&&(!status||i.status===status)&&(!term||[i.title,i.summary,i.description,...(i.tags||[])].join(' ').toLocaleLowerCase().includes(term))).sort((a,b)=>{
  if(sort==='newest')return new Date(b.created_at)-new Date(a.created_at);
  if(sort==='updated')return new Date(b.updated_at)-new Date(a.updated_at);
  if(sort==='title')return a.title.localeCompare(b.title);
  const rank={'In progress':0,Planned:1,Idea:2,Paused:3,Completed:4,Archived:5};
  return rank[a.status]-rank[b.status] || Number(b.featured)-Number(a.featured) || b.priority-a.priority || a.title.localeCompare(b.title);
 });
}
export function timeline(items){return items.filter(isPublic).flatMap(i=>[
 ...(i.milestones||[]).filter(m=>m.completed_at).map(m=>({date:m.completed_at,title:m.title,kind:'Milestone',item:i})),
 ...(i.updates||[]).filter(u=>u.published).map(u=>({date:u.date,title:u.title,body:u.body,kind:'Field note',item:i}))
 ]).sort((a,b)=>new Date(b.date)-new Date(a.date));}
export function validateItem(item){
 if(!item.title?.trim() || item.title.length>160)throw new Error('Add a title of up to 160 characters.');
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||item.slug.length>100)throw new Error('Use a URL slug with lowercase letters, numbers and hyphens.');
 if(!categories.includes(item.category)||!statuses.includes(item.status))throw new Error('Choose a valid category and status.');
 if(!['draft','private','public'].includes(item.visibility))throw new Error('Choose a visibility.');
 if(!item.summary?.trim()||item.summary.length>300)throw new Error('Add a summary of up to 300 characters.');
 if(item.links?.some(l=>!safeUrl(l.url)))throw new Error('Links must begin with https:// or http://.');
 return item;
}
export function normalizeItem(i){return {...i,milestones:i.roadmap_milestones||i.milestones||[],updates:i.roadmap_updates||i.updates||[],media:i.roadmap_media||i.media||[]};}
