/* Routing and boot. Loaded last: SRC must be captured after every script tag exists, because the Live Preview re-renders it.
   The Supabase SDK tag is removed from SRC so the preview iframe never loads the SDK or creates a client. */
const SRC="<!DOCTYPE html>"+document.documentElement.outerHTML.replace(/<script[^>]*supabase-js[^>]*><\/script>\s*/gi,"");
let gate=0,ROUTED=false;
const isAdminPath=()=>location.pathname.includes("/admin/")||/\\/admin$/.test(location.pathname);
const isAdminRoute=()=>isAdminPath()||location.hash==="#admin";
const noindex=on=>{let m=document.querySelector('meta[name=robots]');if(on){if(!m){m=document.createElement("meta");m.name="robots";document.head.append(m)}m.content="noindex,nofollow"}else if(m)m.remove()};
/* Authentication-aware guard for /admin/ and legacy #admin. The Control Center is not built until session + is_admin() are verified server-side. */
async function adminGate(){const run=++gate,cl=document.body.classList;cl.remove("admin");cl.add("authing");noindex(true);built=false;ready=false;Auth.view("checking");
  const st=await Auth.probe();if(run!==gate||!isAdminRoute())return;
  if(st!=="ok"){Auth.view(st);return}
  try{const full=(await DB.fetchAdmin())||DEF();if(run!==gate||!isAdminRoute())return;saved=full;draft=clone(full);PUB=clone(full)}
  catch(e){Auth.err=e;Auth.view("error");return}
  cl.remove("authing");cl.add("admin");built=true;shell()}
function route(){
  if(EMB){render(saved,true);parent.postMessage({lpvReady:1},"*");return}
  const a=isAdminRoute();
  if(a&&!LOCAL){if(built&&document.body.classList.contains("admin"))return;adminGate();return}
  ++gate;document.body.classList.remove("authing");noindex(false);document.body.classList.toggle("admin",a);
  if(a){if(!built){built=true;shell()}}
  else{if(FB){document.body.insertBefore($("#site"),$("#ov"));FB=false}$("#adm").innerHTML="";built=false;ready=false;render(saved,false)}}
addEventListener("message",e=>{const m=e.data;if(!m)return;
  if(m.lpvReady){ready=true;return}
  if(EMB&&m.lpv){const y=scrollY;if(m.cfg){const c=clone(m.cfg);c.anim.reveal=false;saved=c;render(c,true);scrollTo(0,y)}if(m.go)document.getElementById(m.go)?.scrollIntoView();if(m.replay)startIntro(true)}});
/* Public content: cached public copy first (fast), then Supabase RPC, then site-config.json, then built-in defaults. localStorage edits are ignored. */
async function loadPublic(){const c=DB.cacheRead(),fresh=DB.fetchPublic().then(v=>{DB.cacheWrite(v);return v}).catch(()=>null),set=v=>{saved=clone(v);draft=clone(v);PUB=clone(v)},
    late=v=>{if(!v||canon(v)===canon(saved))return;set(v);if(ROUTED&&!isAdminRoute()&&!document.body.classList.contains("admin"))render(saved,false)};
  if(c){set(c);fresh.then(late);return}
  const v=await Promise.race([fresh,new Promise(r=>setTimeout(()=>r(null),1500))]);
  if(v){set(v);return}
  /* Never fetch a raw site-config.json in production: it could contain unpublished content. */
  fresh.then(late)}
const pubP=EMB?Promise.resolve():LOCAL
  ?(location.protocol==="file:"?Promise.resolve():Promise.race([fetch("site-config.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(j=>{if(!j||typeof j!=="object")return;PUB=mig(Object.assign(DEF(),pre(j)));let loc=false;try{loc=!!localStorage.getItem(KEY)}catch(e){}if(!loc){saved=clone(PUB);draft=clone(PUB)}}).catch(()=>{}),new Promise(r=>setTimeout(r,900))]))
  :(isAdminRoute()?Promise.resolve():loadPublic());
if(!EMB&&!LOCAL&&sb())sb().auth.onAuthStateChange(ev=>{if(ev==="SIGNED_OUT")setTimeout(()=>{if(!Auth.leaving&&document.body.classList.contains("admin"))Auth.expired("out")},0)});
addEventListener("hashchange",route);pubP.then(()=>{route();ROUTED=true});
