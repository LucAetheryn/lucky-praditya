/* Public site rendering, search island, story overlay and site event handlers. */
function sec(s,c){
  const h=`<h2>${esc(s.t)}</h2>`,R=" rv";
  if(s.id==="home"){const n=c.now.filter(x=>x.show).slice(0,2),L=c.connections.filter(x=>x.show&&x.pub&&x.url).slice(0,3).map(x=>({l:plat(x).name}));
    return `<section class="sec" id="home" data-s="${esc(s.t)}" style="padding-top:96px"><div class="bento">
    <div class="card glass s4 r2 hero"><img class="lgo" src="${LOGO}" alt="Lucky Praditya logo" width="64" height="64"><h1>${esc(nm(c)[0])}<br>${esc(nm(c).slice(1).join(" "))}</h1><p class="role">${esc(c.role)}</p><p class="mu">${esc(c.tagline)}</p><div class="row"><button class="btn" data-go="connect">Explore connections →</button><button class="btn o" data-go="highlights">Highlights</button></div></div>
    <div class="card glass s2" style="min-height:150px">${GLOBE}<span class="mu">#LuckyPraditya</span></div>
    ${c.avail.show?`<div class="card glass s2"><span class="live" style="display:inline-block"></span><p style="margin:10px 0 0;font-size:.9rem">${esc(c.avail.text)}</p></div>`:""}
    <div class="card glass s3"><span class="mu">Now</span>${n.map(x=>`<p style="margin:8px 0 0"><b>${esc(x.k)}</b><br><span class="mu">${esc(x.v)}</span></p>`).join("")||"<p class='mu'>Nothing shown.</p>"}</div>
    <div class="card glass s3"><span class="mu">Connect</span><div class="chips" style="margin-top:10px">${L.map(l=>`<span>${esc(l.l)}</span>`).join("")}</div><div class="row"><button class="btn o" data-go="connect">All links</button></div></div></div></section>`}
  if(s.id==="highlights"){const L=HLV(c);return `<section class="sec${R}" id="highlights" data-s="${esc(s.t)}">${h}<p class="mu">Latest activity and handpicked work.</p>${L.length?`<div class="hg">${L.map(x=>hlHTML(c,x)).join("")}</div>`:`<p class="mu">Highlights appear here once added in the Control Center.</p>`}</section>`}
  if(s.id==="about")return `<section class="sec${R}" id="about" data-s="${esc(s.t)}">${h}<div class="bento"><div class="card glass s4"><p>${esc(c.about)}</p></div><div class="card glass s2"><span class="mu">Focus</span><div class="chips" style="margin-top:10px"><span>Visual design</span><span>Illustration</span><span>Frontend development</span><span>AI-assisted building</span></div></div></div></section>`;
  if(s.id==="skills")return stackHTML(s,c,h,R);
  if(s.id==="now")return `<section class="sec${R}" id="now" data-s="${esc(s.t)}">${h}<div class="bento">${c.now.filter(x=>x.show).map(x=>`<div class="card glass s2"><span class="mu">${esc(x.k)}</span><p style="margin:8px 0 0">${esc(x.v)}</p></div>`).join("")}</div></section>`;
  if(s.id==="connect"){const L=c.connections.filter(x=>x.show&&x.pub&&x.url);return `<section class="sec${R}" id="connect" data-s="${esc(s.t)}">${h}<div class="cg">${L.map(x=>cnHTML(x,true)).join("")||"<p class='mu'>No connections yet.</p>"}</div></section>`}
  if(s.id==="contact")return `<section class="sec${R}" id="contact" data-s="${esc(s.t)}">${h}<div class="card glass"><p>${esc(c.contact)}</p><div class="row">${email(c)?`<button class="btn" data-act="mail">Send email</button><button class="btn o" data-act="copy">Copy email</button>`:c.connections.filter(x=>x.show&&x.pub&&x.url).slice(0,3).map(x=>`<a class="btn o" href="${esc(safe(x.url))}" target="_blank" rel="noopener noreferrer">${esc(plat(x).name)} ↗</a>`).join("")}<button class="btn o" data-act="share">Share profile</button></div></div></section>`;
  return "";
}
function render(c,pv){PVM=pv;
  const S=c.sections.filter(s=>s.show&&(pv||((s.id!=="highlights"||HLV(c).length)&&(s.id!=="connect"||c.connections.some(x=>x.show&&x.pub&&x.url)))));
  document.documentElement.style.setProperty("--bl",c.look.glass+"px");document.documentElement.style.setProperty("--sp",1/(c.anim.speed||1));
  document.body.classList.toggle("noanim",!c.anim.on||!c.anim.reveal);document.body.classList.toggle("nomotion",!c.anim.on);document.title=c.seo.title;document.querySelector('meta[name=description]').content=c.seo.desc;
  if(c.maint&&!pv){$("#site").innerHTML=`<div class="maint"><div><h1>${esc(c.name)}</h1><p class="mu">Back soon.</p></div></div>`;return}
  $("#site").innerHTML=(pv&&c.maint?'<div class="note">Maintenance mode is on: visitors see “Back soon”.</div>':"")+`<header class="top"><div class="isl glass" id="isl"><div class="ih" data-isl><div class="lg"><img src="${LOGO}" alt="Lucky Praditya logo"></div><span id="cur">${esc(S[0]?.t||"")}</span>${c.avail.show?'<span class="live" title="Available"></span>':""}<span class="ib" aria-hidden="true">⌕</span></div><div class="pg" id="pg"></div><div class="xp"><input id="q" type="search" placeholder="Search sections, works, highlights" aria-label="Search" autocomplete="off"><div id="res"></div><div class="row" style="margin:10px 0 0"><button class="btn o" data-act="share">Share</button>${email(c)?'<button class="btn o" data-act="copy">Copy email</button>':""}</div></div></div></header><main>${S.map(s=>sec(s,c)).join("")}</main><footer class="ft"><span>${esc(c.footer)}</span><button class="ib" data-act="top" aria-label="Back to top">↑</button></footer>`;
  if(!pv&&c.anim.on&&c.anim.intro&&!RM)startIntro();
  results("");
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");const k=$("#cur");if(k&&e.target.dataset.s)k.textContent=e.target.dataset.s}}),{threshold:.35});
  document.querySelectorAll("section.sec").forEach(x=>io.observe(x));
}
function results(q){const c=cfg(),r=$("#res");if(!r)return;q=q.toLowerCase();
  const it=[...c.sections.filter(s=>s.show&&s.nav).map(s=>["go",s.id,s.t,"Section"]),...HLV(c).map(h=>["hl",h.i,h.t,"Highlight"])].filter(x=>!q||(x[2]+x[3]).toLowerCase().includes(q)).slice(0,8);
  r.innerHTML=it.map(x=>`<button type="button" class="rs" data-r="${x[0]}" data-v="${x[1]}"><span>${esc(x[2])}</span><span class="mu">${esc(x[3])}</span></button>`).join("")||"<p class='mu'>No results.</p>"}
const closeIsl=()=>$("#isl")?.classList.remove("open");
const ov=$("#ov");
function closeOv(){clearTimeout(tm);ov.className="";ov.innerHTML="";hi=-1}
function story(i){const c=cfg(),h=c.highlights[i];if(!h)return closeOv();const cn=c.connections.find(x=>x.id===h.plat),m=cn?plat(cn):CUST(),u=safe(h.url);ov.className="on";ov.innerHTML=`<div class="pn glass nb" style="${nstyle(m,cn?cn.glow:40)}"><div class="ht">${imgOk(h.thumb)?`<img class="htimg" src="${esc(h.thumb)}" alt="">`:""}<span class="hp">${m.ico}<b>${esc(m.name)}</b></span></div><span class="mu">${esc(h.type)}${h.date?" · "+esc(fmt(h.date)):""}</span><h2 style="margin:8px 0 12px">${esc(h.t)}</h2><p>${esc(h.d)}</p><div class="row">${u?`<a class="btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Open on ${esc(m.name)} ↗</a>`:`<span class="mu">Original link not set</span>`}<button class="btn o" data-cl>Close</button></div></div>`}
ov.addEventListener("click",e=>{if(e.target===ov||e.target.closest("[data-cl]"))return closeOv();const s=e.target.closest("[data-st]");if(s)story(hi+ +s.dataset.st)});
addEventListener("keydown",e=>{if(e.key==="Escape"){closeOv();closeIsl()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#isl")?.classList.add("open");$("#q")?.focus()}});
$("#site").addEventListener("input",e=>{if(e.target.id==="q")results(e.target.value)});
$("#site").addEventListener("click",e=>{const t=e.target,g=t.closest("[data-go]"),f=t.closest("[data-f]"),a=t.closest("[data-act]"),m=t.closest("[data-miss]"),h=t.closest("[data-hl]"),r=t.closest("[data-r]"),i=t.closest("[data-isl]");
  if(r){e.preventDefault();closeIsl();r.dataset.r==="go"?go(r.dataset.v):story(+r.dataset.v);return}
  if(i){$("#isl").classList.toggle("open");return}
  if(g)go(g.dataset.go);if(f){filt=f.dataset.f;render(cfg(),document.body.classList.contains("admin"))}
  if(h)story(+h.dataset.hl);
  if(m){e.preventDefault();toast(m.dataset.miss+": URL belum diatur (Control Center → Links).")}
  if(a){const c=cfg(),k=a.dataset.act;
    if(k==="top")scrollTo({top:0,behavior:RM?"auto":"smooth"});
    if(k==="mail"){const u=email(c);u?location.href="mailto:"+u.replace(/^mailto:/,""):toast("Email belum diatur (Control Center → Links).")}
    if(k==="copy"){const u=email(c);u?navigator.clipboard?.writeText(u).then(()=>toast("Email copied."),()=>toast(u)):toast("Email belum diatur (Control Center → Links).")}
    if(k==="share"){const u=location.href.split("#")[0];navigator.share?navigator.share({title:c.name,url:u}).catch(()=>{}):navigator.clipboard?.writeText(u).then(()=>toast("Link copied."),()=>toast(u))}}});
addEventListener("scroll",()=>{const p=$("#pg");if(p){const m=document.documentElement.scrollHeight-innerHeight;p.style.width=(m>0?scrollY/m*100:0)+"%"}},{passive:true});
