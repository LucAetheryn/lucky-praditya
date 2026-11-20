/* Supabase configuration (publishable key only). The client is NEVER created inside the Live Preview iframe (EMB) or in local dev mode. */
const SB_URL="https://bszaqjxpkmenbftwvlld.supabase.co",SB_KEY="sb_publishable_ZVYgGY6tnKh9rcKgCwCX8A_-j7w2gFm",SB_BUCKET="site-media";
/* Local dev mode (legacy localStorage behaviour) exists only on file:/localhost and only with ?local — never on a production host. */
const DEVHOST=location.protocol==="file:"||/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const LOCAL=DEVHOST&&new URLSearchParams(location.search).has("local");
let SBC=null;
function sb(){if(EMB||LOCAL)return null;if(SBC)return SBC;if(!(window.supabase&&window.supabase.createClient))return null;
  try{SBC=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:"lp-auth"}})}catch(e){SBC=null}return SBC}
const E=(m,code)=>Object.assign(new Error(m),{code});
