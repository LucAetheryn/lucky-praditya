/* Data layer. Canonical full config remains site_settings.site_config; public visitors receive only the SQL allowlist projection. */
const clone0=o=>JSON.parse(JSON.stringify(o));
const canon=v=>JSON.stringify(v,(k,x)=>x&&typeof x==="object"&&!Array.isArray(x)?Object.keys(x).sort().reduce((a,y)=>(a[y]=x[y],a),{}):x);
const publicOnly=c=>{
  const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o&&Object.prototype.hasOwnProperty.call(o,k)).map(k=>[k,o[k]]));
  const connections=c.connections.filter(x=>x.show===true&&x.pub===true).map(x=>pick(x,["id","p","name","user","url","color","icon","glow","show","pub","hl"]));
  const visible=new Set(connections.map(x=>x.id));
  return{
    ...pick(c,["name","role","tagline","about","footer","contact","maint"]),
    avail:pick(c.avail,["show","text"]),seo:pick(c.seo,["title","desc"]),
    anim:pick(c.anim,["on","intro","reveal","speed"]),look:pick(c.look,["glass"]),
    sections:c.sections.filter(x=>x.show===true).map(x=>pick(x,["id","t","show","nav"])),
    stack:{marquee:c.stack.marquee,cats:c.stack.cats.map(x=>pick(x,["k","v"]))},
    connections,
    highlights:c.highlights.filter(h=>h.show===true&&(!h.plat||visible.has(h.plat))).map(h=>pick(h,["plat","type","url","pin","thumb","sync","t","d","cat","date","show"])),
    now:c.now.filter(x=>x.show===true).map(x=>pick(x,["k","v","show"]))
  };
};
/* Client-side validation is a usability layer; SQL repeats structural/size checks. */
function cleanCfg(c){
  if(!c||typeof c!=="object"||Array.isArray(c))throw E("Configuration must be an object.","cfg");
  const o=clone0(c),w=[],str=(v,n)=>String(v==null?"":v).slice(0,n),
    url=(v,l,mail)=>{v=String(v||"").trim();if(!v)return"";if(/^(https?:\/\/|mailto:|tel:)/i.test(v))return v.slice(0,2048);if(mail&&/^[^\s@<>"']+@[^\s@<>"']+$/.test(v))return v.slice(0,320);w.push(l+": invalid URL cleared");return""},
    img=(v,l)=>{v=String(v||"");if(!v)return"";if(/^data:image\/(png|jpeg|webp|gif);base64,/i.test(v)||/^https:\/\//i.test(v))return v;throw E(l+": unsupported image format (PNG, JPEG, WebP or GIF only).","img")},
    num=(v,a,b,d)=>{v=+v;return isFinite(v)?Math.min(b,Math.max(a,v)):d};
  ["connections","highlights","now","sections"].forEach(k=>{if(!Array.isArray(o[k]))throw E("Invalid configuration list: "+k,"cfg")});
  ["seo","anim","look","avail","stack"].forEach(k=>{if(!o[k]||typeof o[k]!=="object"||Array.isArray(o[k]))throw E("Invalid configuration object: "+k,"cfg")});
  if(!Array.isArray(o.stack.cats))throw E("Invalid technology stack categories.","cfg");
  if(new TextEncoder().encode(JSON.stringify(o)).length>1048576)throw E("Configuration exceeds the 1 MiB limit.","cfg");
  ["name","role","tagline","footer"].forEach(k=>o[k]=str(o[k],300));o.about=str(o.about,5000);o.contact=str(o.contact,1000);
  o.seo.title=str(o.seo.title,200);o.seo.desc=str(o.seo.desc,500);o.avail.text=str(o.avail.text,300);
  o.look.glass=num(o.look.glass,6,40,22);o.anim.speed=num(o.anim.speed,.5,2,1);
  if(o.connections.length>50||o.highlights.length>200||o.now.length>50||o.sections.length>20||o.stack.cats.length>30)throw E("Too many items in one list.","cfg");
  o.connections.forEach((x,i)=>{x.id=str(x.id,40);x.name=str(x.name,80);x.user=str(x.user,120);x.url=url(x.url,"Connection "+(i+1),x.p==="email");x.color=/^#[0-9a-f]{6}$/i.test(x.color||"")?x.color:"";x.icon=img(x.icon,"Connection "+(i+1)+" icon");x.glow=num(x.glow,0,100,40);x.show=!!x.show;x.pub=!!x.pub});
  o.highlights.forEach((h,i)=>{h.t=str(h.t,200);h.d=str(h.d,2000);h.cat=str(h.cat,100);h.date=str(h.date,10);h.url=url(h.url,"Highlight "+(i+1));h.thumb=img(h.thumb,"Highlight "+(i+1)+" image");h.show=!!h.show});
  o.now.forEach(n=>{n.k=str(n.k,100);n.v=str(n.v,500);n.show=!!n.show});
  o.stack.cats.forEach(x=>{x.k=str(x.k,100);x.v=str(x.v,1500)});o.sections.forEach(s=>{s.t=str(s.t,60)});
  return{cfg:o,warnings:w}}
const DB={ver:null,KEY:"lp_pub_cache_v2",
  cacheRead(){try{const j=JSON.parse(localStorage.getItem(DB.KEY)||"null");if(!j||!j.cfg||typeof j.cfg!=="object"||!Number.isFinite(j.t)||Date.now()-j.t>86400000){localStorage.removeItem(DB.KEY);return null}return normCfg(j.cfg)}catch(e){return null}},
  cacheWrite(c){try{localStorage.setItem(DB.KEY,JSON.stringify({t:Date.now(),cfg:c}))}catch(e){}},
  async fetchPublic(){const c=sb();if(!c)throw E("no client","nolib");const {data,error}=await c.rpc("get_public_site_config");if(error)throw error;
    if(!data||typeof data!=="object"||Array.isArray(data))throw E("empty","empty");return publicOnly(normCfg(data))},
  async fetchAdmin(keep){const c=sb(),{data,error}=await c.from("site_settings").select("value,updated_at").eq("key","site_config").maybeSingle();if(error)throw error;
    if(!data||!data.value||typeof data.value!=="object"){DB.ver=null;return null}if(!keep)DB.ver=data.updated_at;return normCfg(data.value)},
  /* The RPC locks the canonical row and compares this version atomically before writing. */
  async save(cfg){const c=sb();if(!c)throw E("Backend unavailable.","session");await Auth.require(true);
    if(!DB.ver)throw E("The server version is unavailable. Reload the Control Center before saving.","stale");
    let up={uploaded:[]},cl;
    try{
      const checked=cleanCfg(clone0(cfg));
      up=await Store.externalize(checked.cfg);
      cl=cleanCfg(up.cfg);cl.warnings=[...checked.warnings,...cl.warnings];
      const {data,error}=await c.rpc("save_site_config",{p_config:cl.cfg,p_expected_updated_at:DB.ver});
      if(error)throw error;if(!data||data.success!==true||!data.updated_at)throw E("The server did not confirm the save version.","cfg");
      DB.ver=data.updated_at;
    }catch(e){await Store.rollback(up.uploaded);throw e}
    const back=await c.from("site_settings").select("value,updated_at").eq("key","site_config").maybeSingle();
    if(back.error||!back.data)return{cfg:cl.cfg,verified:false,warnings:cl.warnings,uploaded:up.uploaded.length};
    DB.ver=back.data.updated_at;
    try{DB.cacheWrite(await DB.fetchPublic())}catch(e){}
    return{cfg:cl.cfg,verified:canon(back.data.value)===canon(cl.cfg),warnings:cl.warnings,uploaded:up.uploaded.length}}};
