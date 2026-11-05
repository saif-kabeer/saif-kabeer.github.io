import {getItem,configured} from './roadmap-api.js';
import {detail,loadImages} from './roadmap-render.js';
const params=new URLSearchParams(location.search),preview=params.get('preview')==='1';
const slug=params.get('slug')||location.pathname.replace(/\/$/,'').split('/').pop();
const root=document.querySelector('#detail');
if(preview){document.querySelector('#preview-banner').hidden=false;document.querySelector('meta[name=robots]').content='noindex,nofollow';}
try{
 const item=preview?(await import('./roadmap-demo.js')).demoItems.find(i=>i.slug===slug):configured?await getItem(slug):null;
 root.className='';
 if(!item){root.innerHTML='<div class="empty" style="margin-top:50px"><div class="empty-icon">↗</div><h1>This chapter isn’t here.</h1><p>It may be private, unpublished, or no longer available.</p><a class="button" href="/roadmap/">Back to the roadmap</a></div>';document.title='Entry not found | Saif Kabeer';document.querySelector('meta[name=robots]').content='noindex,follow';}
 else{document.title=`${item.title} | The Roadmap | Saif Kabeer`;document.querySelector('meta[name=description]').content=item.summary;root.innerHTML=detail(item,{preview});await loadImages(root);}
}catch{root.innerHTML='<div class="empty"><h1>Unable to open this chapter.</h1><p>Please try again shortly.</p><a class="button" href="/roadmap/">Back to the roadmap</a></div>';}
