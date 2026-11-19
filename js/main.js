/* Routing and boot. Loaded last: SRC must be captured after every script tag exists, because the Live Preview re-renders it. */
const SRC="<!DOCTYPE html>"+document.documentElement.outerHTML;
function route(){
  if(EMB){render(saved,true);parent.postMessage({lpvReady:1},"*");return}
  const a=location.hash==="#admin";document.body.classList.toggle("admin",a);
  if(a){if(!built){built=true;shell()}}
  else{if(FB){document.body.insertBefore($("#site"),$("#ov"));FB=false}$("#adm").innerHTML="";built=false;ready=false;render(saved,false)}}
addEventListener("message",e=>{const m=e.data;if(!m)return;
  if(m.lpvReady){ready=true;return}
  if(EMB&&m.lpv){const y=scrollY;if(m.cfg){const c=clone(m.cfg);c.anim.reveal=false;saved=c;render(c,true);scrollTo(0,y)}if(m.go)document.getElementById(m.go)?.scrollIntoView();if(m.replay)startIntro(true)}});
const pubP=(location.protocol==="file:"||EMB)?Promise.resolve():Promise.race([fetch("site-config.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(j=>{if(!j||typeof j!=="object")return;PUB=mig(Object.assign(DEF(),pre(j)));let loc=false;try{loc=!!localStorage.getItem(KEY)}catch(e){}if(!loc){saved=clone(PUB);draft=clone(PUB)}}).catch(()=>{}),new Promise(r=>setTimeout(r,900))]);
addEventListener("hashchange",route);pubP.then(route);
