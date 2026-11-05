export async function publicItems(slug){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return [];
 const query=new URLSearchParams({select:'*,roadmap_milestones(*),roadmap_updates(*),roadmap_media(*)',visibility:'eq.public',deleted_at:'is.null',order:'created_at.desc'});
 if(slug)query.set('slug',`eq.${slug}`);
 const items=[];const pageSize=200;
 for(let offset=0;;offset+=pageSize){query.set('limit',String(pageSize));query.set('offset',String(offset));const r=await fetch(`${url}/rest/v1/roadmap_items?${query}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('Public roadmap unavailable');const batch=await r.json();items.push(...batch);if(batch.length<pageSize)break;}
 return items;
}
