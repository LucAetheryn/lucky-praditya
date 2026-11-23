/* Supabase Auth: email/password, admin verification (public.is_admin() RPC), TOTP MFA (AAL2), session handling.
   UI gating is only UX: real protection is RLS + is_admin() + the AAL2 check inside save_site_config(). */
const Auth={user:null,aal:"aal1",next:"aal1",enr:null,err:null,
  msg(e){const m=String(e&&e.message||e||"");
    if(/AAL2|MFA/i.test(m))return"Saving requires MFA (AAL2). Enable or verify MFA in Backup → Security.";
    if(/Admin access required|not admin/i.test(m))return"This account is not an administrator.";
    if(/jwt|expired|not authenticated|session/i.test(m)||(e&&e.status===401))return"Your session expired. Sign in again.";
    if(e&&(e.code==="stale"||e.code==="img"||e.code==="cfg"))return m;
    return"Something went wrong: "+m.slice(0,160)},
  async probe(){const c=sb();if(!c)return"nolib";
    try{const {data:{session}}=await c.auth.getSession();if(!session)return"out";
      const {data:u,error:ue}=await c.auth.getUser();if(ue||!u||!u.user){await c.auth.signOut({scope:"local"});return"out"}
      Auth.user=u.user;
      const {data:ok,error:ae}=await c.rpc("is_admin");if(ae)throw ae;
      if(ok!==true){await c.auth.signOut({scope:"local"});Auth.user=null;return"denied"}
      const {data:l}=await c.auth.mfa.getAuthenticatorAssuranceLevel();Auth.aal=(l&&l.currentLevel)||"aal1";Auth.next=(l&&l.nextLevel)||"aal1";
      if(Auth.next==="aal2"&&Auth.aal!=="aal2")return"mfa";
      return"ok"}catch(e){Auth.err=e;return"error"}},
  /* Re-check before every write. Throws a coded error instead of letting the write proceed. */
  async require(needAal2){const st=await Auth.probe();
    if(st==="out"||st==="nolib")throw E("Your session expired. Sign in again.","session");
    if(st==="denied")throw E("This account is not an administrator.","admin");
    if(st==="error")throw Auth.err||E("Could not verify your session.","session");
    if(needAal2&&Auth.aal!=="aal2")throw E("MFA AAL2 verification required","mfa");return true},
  async login(email,pw){const {error}=await sb().auth.signInWithPassword({email:String(email||"").trim(),password:String(pw||"")});if(error)throw error},
  async factorId(){const {data,error}=await sb().auth.mfa.listFactors();if(error)throw error;const f=((data&&data.totp)||[]).find(x=>x.status==="verified");return f?f.id:null},
  async verifyCode(code){const id=await Auth.factorId();if(!id)throw E("No verified authenticator is set up.","mfa");
    const {error}=await sb().auth.mfa.challengeAndVerify({factorId:id,code:String(code||"").replace(/\s/g,"")});if(error)throw error},
  async enroll(){const c=sb();const {data:l}=await c.auth.mfa.listFactors();
    for(const f of((l&&l.all)||[]))if(f.status==="unverified")await c.auth.mfa.unenroll({factorId:f.id});
    const {data,error}=await c.auth.mfa.enroll({factorType:"totp",friendlyName:"Lucky Praditya "+new Date().toISOString().slice(0,10)});if(error)throw error;
    const qr=String(data.totp.qr_code||"");Auth.enr={id:data.id,qr:/^data:image\/svg\+xml/i.test(qr)?qr:"",secret:data.totp.secret};return Auth.enr},
  async confirmEnroll(code){const c=sb(),en=Auth.enr;if(!en)throw E("Start enrollment first.","mfa");
    const {error}=await c.auth.mfa.challengeAndVerify({factorId:en.id,code:String(code||"").replace(/\s/g,"")});if(error)throw error;
    const {data:l}=await c.auth.mfa.getAuthenticatorAssuranceLevel();Auth.aal=(l&&l.currentLevel)||"aal1";Auth.enr=null;
    return Auth.aal==="aal2"&&!!(await Auth.factorId())},
  async logout(){Auth.leaving=true;try{await sb().auth.signOut()}catch(e){}history.replaceState(null,"",location.pathname+location.search);location.reload()},
  /* ---- UI ---- */
  view(st,target){const root=target||"#adm",box=(h)=>{$(root).innerHTML=`<div class="auth"><div class="bx"><b>Control Center</b>${h}</div></div>`};
    const back='<button type="button" data-au="back">Back to site</button>';
    if(st==="checking")return box('<p>Checking your session…</p>');
    if(st==="out")return box(`<form data-au-form="login" autocomplete="on"><label class="f"><span>Email</span><input name="email" type="email" autocomplete="username" required></label><label class="f"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label><p class="err" id="aer" role="alert"></p><div class="tl"><button class="pr" type="submit">Sign in</button>${target?"":back}</div></form>`);
    if(st==="denied")return box(`<p class="err" role="alert">This account does not have administrator access.</p><div class="tl">${back}</div>`);
    if(st==="mfa")return box(`<form data-au-form="verify"><p>Enter the 6-digit code from your authenticator app.</p><label class="f"><span>Code</span><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required></label><p class="err" id="aer" role="alert"></p><div class="tl"><button class="pr" type="submit">Verify</button><button type="button" data-au="logout">Sign out</button></div></form>`);
    if(st==="nolib")return box(`<p class="err" role="alert">The authentication library could not be loaded, so the Control Center stays locked. Check your connection and retry.</p><div class="tl"><button type="button" data-au="retry">Retry</button>${back}</div>`);
    return box(`<p class="err" role="alert">Could not verify your session. Try again.</p><div class="tl"><button type="button" data-au="retry">Retry</button>${back}</div>`)},
  /* Session lost while editing: overlay, the draft in memory is untouched. */
  expired(st){if(!$("#rl")){const d=document.createElement("div");d.id="rl";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");document.body.append(d)}Auth.view(st||"out","#rl");const e=$("#rl #aer");if(e&&(st||"out")==="out")e.textContent="Your session expired. Sign in to continue; your unsaved changes are kept."},
  handle(e){const m=String(e&&e.message||e||"");
    if(/jwt|expired|not authenticated/i.test(m)||(e&&(e.status===401||e.code==="session"))){Auth.expired("out");return true}
    if(e&&e.code==="mfa"||/AAL2/i.test(m)){if(typeof tab!=="undefined"){tab="data";admin()}toast(Auth.msg(e));return true}
    return false}};
document.addEventListener("submit",async e=>{const f=e.target.closest&&e.target.closest("[data-au-form]");if(!f||EMB)return;e.preventDefault();
  const kind=f.dataset.auForm,err=f.querySelector("#aer"),btn=f.querySelector("button[type=submit]"),inRl=!!f.closest("#rl"),set=t=>{if(err)err.textContent=t};
  btn.disabled=true;set("");
  try{
    if(kind==="login"){try{await Auth.login(f.email.value,f.password.value)}catch(x){set("Invalid email or password.");return}}
    else if(kind==="verify"){try{await Auth.verifyCode(f.code.value)}catch(x){set("That code was not accepted. Try again.");return}}
    const st=await Auth.probe();
    if(st==="ok"){if(inRl){$("#rl").remove();toast("Session restored. Your draft is intact.")}else if(typeof route==="function")route()}
    else Auth.view(st,inRl?"#rl":undefined)
  }finally{btn.disabled=false}});
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-au]");if(!b||EMB)return;const a=b.dataset.au;
  if(a==="back"){if(location.pathname.includes("/admin/")){const sitePath=location.pathname.replace(/admin\\/?$/,"");location.assign(sitePath||"/")}else{location.hash="";if(typeof route==="function")route()}}
  else if(a==="retry"){if(typeof route==="function"){built=false;route()}}
  else if(a==="logout"){if(typeof draft!=="undefined"&&typeof saved!=="undefined"&&JSON.stringify(draft)!==JSON.stringify(saved)&&!confirm("You have unsaved changes. Sign out anyway?"))return;Auth.logout()}});
