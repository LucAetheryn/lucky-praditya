/* Backup tab extensions: security (MFA), migration preview, JSON backup, manual media clean-up.
   Migration never overwrites anything by itself: sources are compared, a backup must be downloaded, a source is loaded into the DRAFT
   (Live Preview), and only the normal Save writes to Supabase. localStorage is never deleted. */
const ADM_EXT={};
const Mig={backed:false,src:null,media:null,
  local(){try{const r=localStorage.getItem(KEY);return r?{raw:JSON.parse(r)}:null}catch(e){return null}},
  async file(){try{const r=await fetch(location.pathname.includes("/admin/")?"../site-config.json":"site-config.json",{cache:"no-cache"});return r.ok?{raw:await r.json()}:null}catch(e){return null}},
  stat(c){const b64=[...c.connections.map(x=>x.icon),...c.highlights.map(x=>x.thumb)].filter(u=>/^data:/i.test(u||"")).length;
    return{connections:c.connections.length,highlights:c.highlights.length,now:c.now.length,sections:c.sections.length,images_inline:b64,bytes:JSON.stringify(c).length}},
  diff(a,b){const out=[];new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>{if(canon(a[k])!==canon(b[k]))out.push(k)});return out},
  async scan(){const S={};const l=Mig.local(),f=await Mig.file();
    if(l){try{S.local=normCfg(l.raw)}catch(e){}}if(f){try{S.file=normCfg(f.raw)}catch(e){}}S.server=clone(saved);Mig.src=S;return S},
  backup(){const d={format:"lp-backup-v1",exportedAt:new Date().toISOString(),origin:location.origin,sources:{server:Mig.src?Mig.src.server:saved,local:Mig.local()?Mig.local().raw:null,file:Mig.src&&Mig.src.file?Mig.src.file:null,draft}};
    const u=URL.createObjectURL(new Blob([JSON.stringify(d,null,1)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="lucky-praditya-backup-"+d.exportedAt.slice(0,19).replace(/[:T]/g,"-")+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);Mig.backed=true}};
const NOTE=()=>LOCAL?'<div class="note">Local development mode (?local): data is saved in this browser only (localStorage). Never available on the live site.</div>':'<div class="note">Content is stored in Supabase and shown to visitors after you press Save. Signed in as an administrator; saving requires MFA (AAL2).</div>';
const SAVEDTXT=()=>LOCAL?"Saved on this device only":"Saved to Supabase";
function dataExtra(){if(LOCAL||EMB)return"";
  const mfa=Auth.aal==="aal2"?'<b>MFA is active</b> for this session (AAL2).':'<b>MFA is not verified in this session.</b> Saving is blocked until you enroll or verify an authenticator app.';
  let h=`<div class="bx"><b>Security</b><p class="mu">${mfa}</p>`;
  if(Auth.enr)h+=`${Auth.enr.qr?`<img class="qr" alt="Authenticator QR code" src="${esc(Auth.enr.qr)}">`:""}<p class="mu">Or enter this key manually: <code>${esc(Auth.enr.secret)}</code></p><label class="f"><span>6-digit code</span><input id="mfac" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></label><div class="tl"><button data-a="mfa-confirm">Confirm</button><button data-a="mfa-cancel">Cancel</button></div>`;
  else h+=`<div class="tl"><button data-a="mfa-start">Set up authenticator (TOTP)</button><button data-au="logout">Sign out</button></div>`;
  h+=`</div><div class="bx"><b>Migration &amp; backup</b><p class="mu">Compare sources, download a backup, then load one into the draft and review it in the preview before pressing Save. Nothing is deleted.</p><div class="tl"><button data-a="mig-scan">Compare sources</button><button data-a="mig-backup">Download full backup</button></div><div id="migout"></div></div>`;
  h+=`<div class="bx"><b>Media (Supabase Storage)</b><p class="mu">Images are uploaded only when you press Save. Unused files are never removed automatically.</p><div class="tl"><button data-a="media-scan">Find unused files</button></div><div id="mediaout"></div></div>`;return h}
function migTable(){const S=Mig.src;if(!S)return"";const names={server:"Supabase (current)",local:"This browser (lp_cfg_v2)",file:"site-config.json"};
  return'<div style="overflow:auto"><table style="width:100%;font-size:.82rem;border-collapse:collapse"><tr><th align="left">Source</th><th>Conn.</th><th>High.</th><th>Now</th><th>Inline img</th><th>Differs from server</th><th></th></tr>'+
  Object.keys(names).filter(k=>S[k]).map(k=>{const s=Mig.stat(S[k]),d=k==="server"?[]:Mig.diff(S[k],S.server);
    return`<tr><td>${names[k]}</td><td align="center">${s.connections}</td><td align="center">${s.highlights}</td><td align="center">${s.now}</td><td align="center">${s.images_inline}</td><td>${k==="server"?"—":d.length?esc(d.join(", ")):"identical"}</td><td>${k==="server"?"":`<button data-a="mig-load" data-src="${k}" style="min-height:36px">Load into draft</button>`}</td></tr>`}).join("")+'</table></div>'+
  `<p class="mu">${Object.keys(names).filter(k=>!S[k]).map(k=>names[k]+": not found").join(" · ")}${Mig.backed?" · Backup downloaded ✓":" · Download a backup first to enable loading"}</p>`}
const setOut=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
ADM_EXT["mig-scan"]=async()=>{setOut("#migout","<p class='mu'>Reading sources…</p>");await Mig.scan();setOut("#migout",migTable())};
ADM_EXT["mig-backup"]=async()=>{if(!Mig.src)await Mig.scan();Mig.backup();setOut("#migout",migTable());toast("Backup downloaded.")};
ADM_EXT["mig-load"]=(b)=>{if(!Mig.backed){toast("Download the full backup first.");return}const k=b.dataset.src;if(!Mig.src||!Mig.src[k])return;
  if(!confirm("Load this source into the draft? Nothing is saved until you press Save."))return;draft=normCfg(clone(Mig.src[k]));admin();toast("Loaded into the draft. Check the preview, then press Save.")};
ADM_EXT["mfa-start"]=async()=>{try{await Auth.enroll();admin()}catch(e){toast(Auth.msg(e))}};
ADM_EXT["mfa-cancel"]=()=>{Auth.enr=null;admin()};
ADM_EXT["mfa-confirm"]=async()=>{try{const ok=await Auth.confirmEnroll(($("#mfac")||{}).value);admin();toast(ok?"MFA verified. Saving is now allowed in this session.":"Code accepted, but this session is not AAL2 yet. Sign out and in again.")}catch(e){toast("That code was not accepted.")}};
ADM_EXT["media-scan"]=async()=>{setOut("#mediaout","<p class='mu'>Scanning…</p>");try{const srv=(await DB.fetchAdmin(true))||saved,u=await Store.unused(srv,draft);Mig.media=u;
  setOut("#mediaout",u.length?u.map((x,i)=>`<div class="tl" style="align-items:center;margin:6px 0"><code style="flex:1">${esc(x.path)}</code><button data-a="media-del" data-i="${i}">Delete</button></div>`).join(""):"<p class='mu'>No unused files found.</p>")}catch(e){setOut("#mediaout","");toast(Auth.msg(e))}};
ADM_EXT["media-del"]=async(b)=>{const x=(Mig.media||[])[+b.dataset.i];if(!x)return;if(!confirm("Delete "+x.path+" permanently?"))return;
  try{await Auth.require(true);await Store.remove(x.path);b.closest(".tl").remove();toast("Deleted.")}catch(e){Auth.handle(e)||toast(Auth.msg(e))}};
