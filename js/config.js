/* Default content (DEF), saved config (localStorage), toast and shared helpers. */
const LOGO=document.querySelector("link[rel=icon]").href;const KEY="lp_cfg_v2",ST=["Planned","Experimental","In Development","Active","Completed","Archived"],CATS=["Graphic Design","Illustration","UI/UX","Website","Software","AI Experiment"];
const DEF=()=>({name:"Lucky Praditya",role:"Visual Designer & Illustrator · Visual & AI Engineer Enthusiast",tagline:"Designing ideas. Building experiences. Exploring what’s next.",about:"Visual designer and creator exploring the intersection of design, technology, and AI. I enjoy turning ideas into visual identities, interfaces, and digital products, moving between creative direction, UI/UX exploration, frontend development, and AI-assisted building. I care about both how something works and how it feels to use. Principles: make it clear before making it complex; preserve the idea while improving the experience; build thoughtfully, test honestly, and keep learning.",footer:"© 2026 Lucky Praditya. #LuckyPraditya",avail:{show:false,text:""},contact:"Have an idea or a collaboration in mind? Let’s talk.",maint:false,
seo:{title:"Lucky Praditya — Designing ideas. Building experiences.",desc:"Personal digital presence of Lucky Praditya."},anim:{on:true,intro:true,reveal:true,speed:1},look:{glass:22},
sections:[["home","Home"],["connect","Connections"],["highlights","Highlights"],["now","Now"],["about","About"],["skills","Tech Stack"],["contact","Contact"]].map(([id,t])=>({id,t,show:true,nav:true})),
highlights:[],
stack:{marquee:true,cats:[{k:"Design & Creative",v:""},{k:"Frontend Development",v:""},{k:"Backend Development",v:""},{k:"Programming Languages",v:""},{k:"AI & Machine Learning",v:"ChatGPT, Google Gemini, Google Stitch, Replit Agent"},{k:"Development Tools & Platforms",v:"GitHub"}]},
now:[["Design","Visual design, illustration, and digital brand experiences"],["Frontend","Frontend development and product interface implementation"],["AI workflow","AI-assisted workflows, rapid prototyping, and creative engineering"]].map(([k,v])=>({k,v,show:true})),
connections:[["github","LucAetheryn","https://github.com/LucAetheryn"],["instagram","lucky.praditya","https://www.instagram.com/lucky.praditya"],["tiktok","@lucky.pradityaaa","https://www.tiktok.com/@lucky.pradityaaa"],["linkedin","luckypraditya","https://www.linkedin.com/in/luckypraditya/"],["email","",""]].map(([p,user,url],i)=>({id:"c"+(i+1),p,name:"",user,url,color:"",icon:"",glow:40,show:true,pub:true,hl:true}))});
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
let saved,draft,tab="dash",dev="desk",filt="All",hi=-1,tm;
function load(){try{const r=localStorage.getItem(KEY);if(r){const o=Object.assign(DEF(),pre(JSON.parse(r)));if(!o.sections.some(x=>x.id==="skills")){o.sections.splice(o.sections.findIndex(x=>x.id==="about")+1,0,{id:"skills",t:"Tech Stack",show:true,nav:true})}return mig(o)}}catch(e){}return DEF()}
const persist=c=>{try{localStorage.setItem(KEY,JSON.stringify(c));return true}catch(e){return false}};
saved=load();draft=JSON.parse(JSON.stringify(saved));
const cfg=()=>document.body.classList.contains("admin")?draft:saved;
const toast=m=>{let t=$("#tt");if(!t){t=document.createElement("div");t.id="tt";t.className="glass";t.style.cssText="position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);padding:12px 18px;border-radius:16px;z-index:300;max-width:90vw;font-size:.88rem";document.body.append(t)}t.textContent=m;t.hidden=false;clearTimeout(toast.i);toast.i=setTimeout(()=>t.hidden=true,2800)};
const href=l=>!l.u?null:(l.l==="Email"&&!/^mailto:/.test(l.u)?"mailto:"+l.u:l.u);
const email=c=>c.connections.find(x=>x.p==="email")?.url||"";
const go=id=>{closeIsl();document.getElementById(id)?.scrollIntoView({behavior:RM?"auto":"smooth"})};
const nm=c=>c.name.split(" ");

const GLOBE='<svg class="orb" viewBox="0 0 100 100" fill="none" stroke="rgba(185,168,245,.55)" stroke-width=".8" aria-hidden="true"><circle cx="50" cy="50" r="40"/><ellipse cx="50" cy="50" rx="16" ry="40"/><ellipse cx="50" cy="50" rx="30" ry="40"/><path d="M10 50h80M16 30h68M16 70h68"/></svg>';
