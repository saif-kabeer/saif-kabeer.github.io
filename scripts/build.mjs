import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of ['index.html','consult.html','profile.jpg','og.jpg','CNAME','robots.txt','sitemap.xml','404.html','assets','roadmap','admin'])await cp(file,`dist/${file}`,{recursive:true});
// Vercel injects only public configuration; never expose server or service-role keys.
if(process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY){
 const key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(key.startsWith('sb_secret_'))throw new Error('Use the publishable key, not a Supabase secret.');
 try{if(key.split('.').length===3&&JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role')throw new Error('Service-role keys must never be published.');}catch(err){if(err.message.includes('Service-role'))throw err;}
 const url=new URL(process.env.SUPABASE_URL);if(url.protocol!=='https:')throw new Error('Supabase URL must use HTTPS.');
 await writeFile('dist/assets/roadmap-config.js',`export const config=Object.freeze(${JSON.stringify({supabaseUrl:url.origin,supabasePublishableKey:key,cleanUrls:true,siteUrl:'https://saifkabeer.com'})});\n`);
}
console.log('Built static site in dist/. Existing profile and consultation pages preserved.');
