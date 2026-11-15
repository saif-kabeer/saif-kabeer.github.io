import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for (const file of ['index.html','consult.html','profile.jpg','og.jpg','CNAME','robots.txt','sitemap.xml']) await cp(file,`dist/${file}`);
console.log('Built portfolio and consultation site.');
