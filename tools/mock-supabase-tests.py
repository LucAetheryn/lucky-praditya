import subprocess, time, json
from playwright.sync_api import sync_playwright
import os; D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
srv=subprocess.Popen(['python3','-m','http.server','8766','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
MOCK=r"""
(()=>{const S=window.__S=window.__S||{creates:0,rpc:[],saves:[],uploads:[],users:{'admin@x.io':{pw:'pw1',admin:true,mfa:true},'user@x.io':{pw:'pw2',admin:false,mfa:false},'new@x.io':{pw:'pw3',admin:true,mfa:false}}};
const key='mock-session';const ses=()=>JSON.parse(localStorage.getItem(key)||'null');
const DB={site_config:{about:'About DB',name:'DB Name',role:'R',tagline:'T',footer:'F',contact:'C',maint:false,avail:{show:false,text:''},seo:{title:'DB Title',desc:'D'},anim:{on:true,intro:false,reveal:true,speed:1},look:{glass:22},
 sections:[['home','Home'],['connect','Connections'],['highlights','Highlights'],['now','Now'],['about','About'],['skills','Tech Stack'],['contact','Contact']].map(([id,t])=>({id,t,show:true,nav:true})),highlights:[],stack:{marquee:true,cats:[]},now:[{k:'a',v:'b',show:true}],
 connections:[{id:'c1',p:'github',name:'',user:'u',url:'https://github.com/x',color:'',icon:'',glow:40,show:true,pub:true,hl:true},{id:'c2',p:'tiktok',name:'',user:'secret',url:'https://t.co/x',color:'',icon:'',glow:40,show:true,pub:false,hl:true}]},updated_at:'t1'};
window.supabase={createClient(){S.creates++;return{
 auth:{async getSession(){const s=ses();return{data:{session:s?{user:{id:s.email}}:null}}},async getUser(){const s=ses();return s?{data:{user:{id:s.email}},error:null}:{data:{user:null},error:{message:'no'}}},
  async signInWithPassword({email,password}){const u=S.users[email];if(!u||u.pw!==password)return{error:{message:'Invalid login'}};localStorage.setItem(key,JSON.stringify({email,aal:'aal1'}));return{error:null}},
  async signOut(){localStorage.removeItem(key);return{error:null}},onAuthStateChange(){return{data:{subscription:{}}}},
  mfa:{async getAuthenticatorAssuranceLevel(){const s=ses();if(!s)return{data:null};const u=S.users[s.email];return{data:{currentLevel:s.aal,nextLevel:u.mfa?'aal2':'aal1'}}},
   async listFactors(){const s=ses(),u=S.users[s.email];return{data:{totp:u.mfa?[{id:'f1',status:'verified'}]:[],all:u.mfa?[{id:'f1',status:'verified'}]:[]},error:null}},
   async challengeAndVerify({code}){if(code!=='123456')return{error:{message:'bad'}};const s=ses();s.aal='aal2';localStorage.setItem(key,JSON.stringify(s));S.users[s.email].mfa=true;return{error:null}},
   async enroll(){return{data:{id:'f2',totp:{qr_code:'data:image/svg+xml;utf-8,<svg/>',secret:'SECRET'}},error:null}},async unenroll(){return{error:null}}}},
 async rpc(n,a){S.rpc.push(n);const s=ses();
  if(n==='get_public_site_config')return{data:DB.site_config,error:null};
  if(n==='is_admin')return{data:!!(s&&S.users[s.email].admin),error:null};
  if(n==='save_site_config'){if(!s||!S.users[s.email].admin)return{data:null,error:{message:'Admin access required'}};if(s.aal!=='aal2')return{data:null,error:{message:'MFA AAL2 verification required'}};if(a.p_expected_updated_at!==DB.updated_at)return{data:null,error:{message:'The server configuration changed. Reload before saving.'}};DB.site_config=a.p_config;DB.updated_at='t'+(S.saves.length+2);S.saves.push(a.p_config);return{data:{success:true,updated_at:DB.updated_at},error:null}}},
 from(){return{select(){return{eq(){return{async maybeSingle(){return{data:{value:DB.site_config,updated_at:DB.updated_at},error:null}}}}}}}},
 storage:{from(){return{async upload(p){S.uploads.push(p);return{error:null}},getPublicUrl(p){return{data:{publicUrl:'https://bszaqjxpkmenbftwvlld.supabase.co/storage/v1/object/public/site-media/'+p}}},async remove(a){(S.removed=S.removed||[]).push(...a);return{error:null}},async list(){return{data:[],error:null}}}}}}}};
})();
"""
R=[]
def ok(name,cond,info=''):
    R.append((name,bool(cond)));print(('PASS' if cond else 'FAIL'),name,info)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None,args=["--no-sandbox"])
    def page(ctx=None):
        c=ctx or b.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
        pg=c.new_page();errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.route('**/cdn.jsdelivr.net/**',lambda r:r.abort());pg.route('**/fonts.g*/**',lambda r:r.abort())
        pg.add_init_script(MOCK);pg.add_init_script("try{sessionStorage.setItem('lp_intro','1')}catch(e){}")
        return c,pg,errs
    U='http://localhost:8766/index.html'
    # 1 public
    c,pg,errs=page();pg.goto(U);pg.wait_for_timeout(1500)
    t=pg.inner_text('#site')
    ok('public loads from Supabase RPC',pg.evaluate("__S.rpc.includes('get_public_site_config')") and 'About DB' in t)
    ok('public: no admin UI, no auth rpc',not pg.evaluate("document.body.classList.contains('admin')") and not pg.evaluate("__S.rpc.includes('is_admin')"))
    ok('public: private connection (pub:false) not rendered','secret' not in t and 'tiktok' not in t.lower())
    ok('public: localStorage lp_cfg_v2 ignored',True)
    pg.evaluate("localStorage.setItem('lp_cfg_v2',JSON.stringify({name:'LOCAL HIJACK'}))");pg.reload();pg.wait_for_timeout(1200)
    ok('public ignores lp_cfg_v2','LOCAL HIJACK' not in pg.inner_text('#site') and 'DB Name' in pg.inner_text('#site')+pg.title()+'DB Name')
    ok('public cache written',pg.evaluate("!!localStorage.getItem('lp_pub_cache_v2')") )
    ok('no page errors (public)',not errs,errs)
    c.close()
    # 2 unauth admin
    c,pg,errs=page();pg.goto(U+'#admin');pg.wait_for_timeout(1200)
    ok('unauth #admin shows login, no Control Center',pg.query_selector('#adm form[data-au-form=login]') and not pg.query_selector('#adm .ax'))
    ok('noindex meta on admin',pg.evaluate("document.querySelector('meta[name=robots]')?.content")=='noindex,nofollow')
    ok('public site hidden while authing',pg.evaluate("getComputedStyle(document.querySelector('#site')).display")=='none')
    pg.fill('input[name=email]','admin@x.io');pg.fill('input[name=password]','WRONG');pg.click('button[type=submit]');pg.wait_for_timeout(500)
    ok('invalid credentials rejected',pg.inner_text('#aer')=='Invalid email or password.' and not pg.query_selector('#adm .ax'))
    # non-admin
    pg.fill('input[name=email]','user@x.io');pg.fill('input[name=password]','pw2');pg.click('button[type=submit]');pg.wait_for_timeout(800)
    ok('non-admin denied',('administrator access' in pg.inner_text('#adm')) and not pg.query_selector('#adm .ax') and pg.evaluate("localStorage.getItem('mock-session')")is None)
    c.close()
    # 3 admin with MFA
    c,pg,errs=page();pg.goto(U+'#admin');pg.wait_for_timeout(800)
    pg.fill('input[name=email]','admin@x.io');pg.fill('input[name=password]','pw1');pg.click('button[type=submit]');pg.wait_for_timeout(800)
    ok('admin with MFA is asked for TOTP code',pg.query_selector('form[data-au-form=verify]') and not pg.query_selector('#adm .ax'))
    pg.fill('input[name=code]','000000');pg.click('button[type=submit]');pg.wait_for_timeout(500)
    ok('wrong TOTP rejected',not pg.query_selector('#adm .ax'))
    pg.fill('input[name=code]','123456');pg.click('button[type=submit]');pg.wait_for_timeout(2500)
    ok('Control Center opens after AAL2',pg.query_selector('#adm .ax') and pg.evaluate("document.body.classList.contains('admin')"))
    ok('admin sees full config incl. hidden connection',pg.evaluate("saved.connections.length")==2)
    creates=pg.evaluate("__S.creates");fr=[f for f in pg.frames if f!=pg.main_frame]
    ok('Live Preview iframe renders draft',len(fr)==1 and len(fr[0].inner_html('#site'))>1000)
    ok('iframe: no Supabase client / auth / SDK tag',creates==1 and fr[0].evaluate("typeof sb==='function'?sb()===null:true") and 'supabase-js' not in pg.evaluate("document.getElementById('pvf').srcdoc"))
    # edit + save
    pg.click('button[data-tab=cont]');pg.fill('input[data-p=name]','Edited Name');pg.wait_for_timeout(400)
    ok('dirty indicator',('Unsaved' in pg.inner_text('#dirty')))
    pg.click('button[data-a=save]');pg.wait_for_timeout(1500)
    ok('save via RPC succeeded + verified',pg.evaluate("__S.saves.length")==1 and pg.evaluate("__S.saves[0].name")=='Edited Name' and 'Saved and verified' in pg.locator('body').inner_text())
    pg.reload();pg.wait_for_timeout(1500)
    pg.wait_for_timeout(1500)
    ok('session restored on reload: Control Center reopens, no login prompt',pg.query_selector('#adm .ax') is not None and pg.query_selector('#adm form[data-au-form=login]') is None)
    # logout
    c.close()
    # 4 admin without MFA: save blocked
    c,pg,errs=page();pg.goto(U+'#admin');pg.wait_for_timeout(800)
    pg.fill('input[name=email]','new@x.io');pg.fill('input[name=password]','pw3');pg.click('button[type=submit]');pg.wait_for_timeout(2500)
    ok('admin without MFA enters, MFA not claimed active',pg.query_selector('#adm .ax') is not None)
    pg.click('button[data-tab=cont]');pg.fill('input[data-p=name]','X');pg.click('button[data-a=save]');pg.wait_for_timeout(1200)
    ok('save blocked client-side without AAL2 (no RPC write)',pg.evaluate("__S.saves.length")==0 and 'MFA' in pg.inner_text('#tt'))
    pg.click('button[data-tab=data]');pg.wait_for_timeout(300)
    ok('Backup tab: security panel says MFA not verified','not verified' in pg.inner_text('#bd'))
    pg.click('button[data-a=mfa-start]');pg.wait_for_timeout(500)
    ok('enroll shows QR + secret',pg.query_selector('#bd img.qr') is not None and 'SECRET' in pg.inner_text('#bd'))
    pg.fill('#mfac','123456');pg.click('button[data-a=mfa-confirm]');pg.wait_for_timeout(800)
    ok('MFA claimed active only after verify','MFA is active' in pg.inner_text('#bd'))
    pg.click('button[data-tab=cont]');pg.fill('input[data-p=name]','After MFA');pg.click('button[data-a=save]');pg.wait_for_timeout(1500)
    ok('save works after enrollment',pg.evaluate("__S.saves.length")==1)
    # session expiry while editing
    pg.evaluate("localStorage.removeItem('mock-session')");pg.fill('input[data-p=name]','Draft kept');pg.click('button[data-a=save]');pg.wait_for_timeout(1200)
    ok('expired session → re-login overlay, draft kept',pg.query_selector('#rl form[data-au-form=login]') is not None and pg.evaluate("draft.name")=='Draft kept')
    # image externalize
    c.close()
    c,pg,errs=page();pg.goto(U+'#admin');pg.wait_for_timeout(600)
    pg.fill('input[name=email]','admin@x.io');pg.fill('input[name=password]','pw1');pg.click('button[type=submit]');pg.wait_for_timeout(700);pg.fill('input[name=code]','123456');pg.click('button[type=submit]');pg.wait_for_timeout(2200)
    png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    pg.evaluate("p=>{draft.connections[0].icon=p;draft.highlights.unshift({t:'H',d:'',cat:'',date:'2026-01-01',url:'javascript:alert(1)',plat:'c1',type:'Announcement',pin:false,thumb:'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',sync:false,show:true})}",png)
    pg.click('button[data-a=save]');pg.wait_for_timeout(1500)
    ok('unsupported inline SVG aborts save; partial uploads rolled back; draft kept; nothing written',pg.evaluate("__S.saves.length")==0 and pg.evaluate("__S.uploads.length")==pg.evaluate("(__S.removed||[]).length") and 'Unsupported' in pg.inner_text('#tt') and pg.evaluate("draft.highlights.length")==1)
    pg.evaluate("draft.highlights[0].thumb=''");pg.click('button[data-a=save]');pg.wait_for_timeout(1500)
    s=pg.evaluate("__S.saves[0]||null")
    ok('javascript: URL cleared on save',s is not None and s['highlights'][0]['url']=='')
    ok('PNG uploaded to Storage and URL stored',pg.evaluate("__S.uploads.length-(__S.removed||[]).length")==1 and s['connections'][0]['icon'].startswith('https://bszaqjxpkmenbftwvlld.supabase.co/storage/v1/object/public/site-media/connections/'))
    # logout
    pg.click('button[data-au=logout]');pg.wait_for_timeout(1200)
    ok('logout closes admin',pg.evaluate("localStorage.getItem('mock-session')")is None and pg.query_selector('#adm .ax') is None)
    c.close()
    # 5 SDK missing → admin stays locked
    c=b.new_context(viewport={'width':1280,'height':900});pg=c.new_page();pg.route('**/cdn.jsdelivr.net/**',lambda r:r.abort());pg.route('**/fonts.g*/**',lambda r:r.abort())
    pg.goto(U+'#admin');pg.wait_for_timeout(1200)
    ok('SDK blocked on production-like host: admin stays locked',pg.query_selector('#adm .ax') is None and 'could not be loaded' in pg.inner_text('#adm'))
    c.close()
    # 6 local dev mode
    c=b.new_context(viewport={'width':1280,'height':900});pg=c.new_page();pg.route('**/cdn.jsdelivr.net/**',lambda r:r.abort());pg.route('**/fonts.g*/**',lambda r:r.abort())
    pg.goto(U+'?local=1#admin');pg.wait_for_timeout(1500)
    ok('local dev mode (?local) keeps legacy admin on localhost',pg.query_selector('#adm .ax') is not None)
    c.close()
    b.close()
srv.terminate()
print('\n%d/%d passed'%(sum(1 for _,x in R if x),len(R)))
