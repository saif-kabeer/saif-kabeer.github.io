import {config} from './roadmap-config.js';
import {normalizeItem,validateItem} from './roadmap-model.js';
export const configured=Boolean(config.supabaseUrl&&config.supabasePublishableKey);
const key='roadmap-admin-session';
let session; try{session=JSON.parse(sessionStorage.getItem(key)||'null');}catch{session=null;}
function remember(value){session=value; if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key);}
async function parse(response){if(!response.ok){let e;try{e=await response.json();}catch{}throw new Error(e?.message||e?.msg||e?.error_description||`Request failed (${response.status}).`);}if(response.status===204)return null;return response.json();}
async function token(){
 if(!session)return config.supabasePublishableKey;
 if(Date.now()/1000>session.expires_at-60){
  const r=await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:config.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  try{remember(await parse(r));}catch{remember(null);throw new Error('Your session expired. Please sign in again.');}
 }
 return session.access_token;
}
export async function request(path,{method='GET',body,anonymous=false,headers={}}={}){
 if(!configured)throw new Error('The roadmap database has not been connected yet.');
 const bearer=anonymous?config.supabasePublishableKey:await token();
 return parse(await fetch(`${config.supabaseUrl}${path}`,{method,cache:'no-store',headers:{apikey:config.supabasePublishableKey,Authorization:`Bearer ${bearer}`,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)}));
}
export async function signIn(email,password){remember(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},anonymous:true}));if(!await isAdmin()){await signOut();throw new Error('This account does not have roadmap access.');}}
export async function signOut(){try{if(session)await request('/auth/v1/logout',{method:'POST'});}finally{remember(null);}}
export async function isAdmin(){return session?Boolean(await request('/rest/v1/rpc/roadmap_is_admin',{method:'POST',body:{}})):false;}
const select='*,roadmap_milestones(*),roadmap_updates(*),roadmap_media(*)';
export async function getItems({admin=false}={}){
 if(!configured)return [];
 const rows=[];let offset=0;const size=200;
 while(true){const batch=await request(`/rest/v1/roadmap_items?select=${select}&order=priority.desc,created_at.desc&limit=${size}&offset=${offset}${admin?'':'&visibility=eq.public&deleted_at=is.null'}`,{anonymous:!admin});rows.push(...batch);if(batch.length<size)break;offset+=size;}
 return rows.map(normalizeItem);
}
export async function getItem(slug){const result=await request(`/rest/v1/roadmap_items?select=${select}&slug=eq.${encodeURIComponent(slug)}&visibility=eq.public&deleted_at=is.null`,{anonymous:true});return result[0]?normalizeItem(result[0]):null;}
export async function saveItem(item){validateItem(item);return request('/rest/v1/rpc/roadmap_save',{method:'POST',body:{payload:item}});}
export async function getNotes(id){const rows=await request(`/rest/v1/roadmap_private_notes?item_id=eq.${id}&select=body`);return rows[0]?.body||'';}
export async function setDeleted(id,deleted){return request(`/rest/v1/roadmap_items?id=eq.${id}`,{method:'PATCH',body:{deleted_at:deleted?new Date().toISOString():null},headers:{Prefer:'return=minimal'}});}
export async function uploadImage(itemId,file){
 const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
 if(!types[file.type]||file.size>8*1024*1024)throw new Error('Choose a JPG, PNG, WebP or AVIF image smaller than 8 MB.');
 const path=`${itemId}/${crypto.randomUUID()}.${types[file.type]}`;
 await parse(await fetch(`${config.supabaseUrl}/storage/v1/object/roadmap-media/${path}`,{method:'POST',headers:{apikey:config.supabasePublishableKey,Authorization:`Bearer ${await token()}`,'Content-Type':file.type},body:file}));return path;
}
export async function imageBlob(path,{admin=false}={}){
 if(!/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp|avif)$/.test(path))throw new Error('Invalid media path.');
 const r=await fetch(`${config.supabaseUrl}/storage/v1/object/authenticated/roadmap-media/${path}`,{cache:'no-store',headers:{apikey:config.supabasePublishableKey,Authorization:`Bearer ${admin?await token():config.supabasePublishableKey}`}});
 if(!r.ok)throw new Error('Image unavailable.');return URL.createObjectURL(await r.blob());
}
export function itemUrl(slug){return config.cleanUrls?`/roadmap/${encodeURIComponent(slug)}`:`/roadmap/entry/?slug=${encodeURIComponent(slug)}`;}
export async function sendSignIn(email){return request('/auth/v1/otp',{method:'POST',anonymous:true,body:{email,create_user:true}});}
export async function verifySignIn(email,code){
 let body={email,token:code.trim(),type:'email'};
 if(code.trim().startsWith('https://')){
  const url=new URL(code.trim());
  if(url.origin!==new URL(config.supabaseUrl).origin||url.pathname!=='/auth/v1/verify')throw new Error('Paste the sign-in link from the roadmap email.');
  const type=url.searchParams.get('type');if(!['magiclink','signup','email'].includes(type))throw new Error('Use a sign-in email, not a password reset link.');
  body={token_hash:url.searchParams.get('token')||url.searchParams.get('token_hash'),type};
 }
 remember(await request('/auth/v1/verify',{method:'POST',anonymous:true,body}));
 if(!await isAdmin()){await signOut();throw new Error('This verified account does not have roadmap access.');}
}
