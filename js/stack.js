/* Technology stack section renderer (marquee + categories). */
const NK=s=>String(s).toLowerCase().replace(/[^a-z0-9+#]/g,"");
const techList=v=>{const seen=new Set();return String(v||"").split(",").map(x=>x.trim()).filter(x=>x&&!seen.has(x.toLowerCase())&&seen.add(x.toLowerCase()))};
const tIcon=n=>{const e=ICONS[NK(n)];return e?`<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="${e}"/></svg>`:""};
function stackHTML(s,c,h,R){
  const cats=c.stack.cats.map(x=>({k:x.k,t:techList(x.v)})).filter(x=>x.t.length);
  const all=[...new Map(cats.flatMap(x=>x.t).map(n=>[n.toLowerCase(),n])).values()];
  const open=`<section class="sec${R}" id="skills" data-s="${esc(s.t)}">${h}`;
  if(!all.length)return PVM?open+`<p class="mu">Add technologies in the Control Center.</p></section>`:"";
  const grp=(r,f)=>Array.from({length:Math.ceil(24/r.length)},()=>r).flat().map(n=>`<span class="mi" title="${esc(n)}" aria-label="${esc(n)}">${tIcon(n)||`<b>${esc(n)}</b>`}</span>`).join("");
  const row=(r,rev)=>`<div class="mq${rev?" rev":""}"><div class="mg">${grp(r,1)}</div><div class="mg" aria-hidden="true">${grp(r,0)}</div></div>`;
  return open+`<p class="mu">Tools and platforms in my workflow.</p>`+(c.stack.marquee?`<div class="mqw glass" role="group" aria-label="Technology marquee">${row(all,0)}${row([...all].reverse(),1)}</div>`:"")+
  `<div class="sg">${cats.map(x=>`<div class="sc glass"><h3>${esc(x.k)}<span class="mu">${x.t.length}</span></h3><div class="tg">${x.t.map(n=>`<div class="tt">${tIcon(n)}<span>${esc(n)}</span></div>`).join("")}</div></div>`).join("")}</div></section>`;
}
