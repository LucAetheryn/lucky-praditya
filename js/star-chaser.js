/* Star Chaser intro animation. */
function startIntro(force){
  if(introOn||RM)return;
  if(!force){try{if(sessionStorage.getItem("lp_intro"))return}catch(e){}}
  introOn=true;try{sessionStorage.setItem("lp_intro","1")}catch(e){}
  let o,raf,done=false;
  const end=()=>{if(done)return;done=true;cancelAnimationFrame(raf);if(o)o.remove();introOn=false};
  try{
    o=document.createElement("div");o.id="intro";o.innerHTML='<canvas aria-hidden="true"></canvas><button type="button">Skip intro</button>';document.body.append(o);
    o.querySelector("button").onclick=end;document.addEventListener("visibilitychange",()=>{if(document.hidden)end()},{once:true});
    const cv=o.firstChild,x=cv.getContext("2d"),dp=Math.min(1.5,devicePixelRatio||1),W=innerWidth,H=innerHeight;
    cv.width=W*dp;cv.height=H*dp;x.setTransform(dp,0,0,dp,0,0);
    const T=2800/((cfg().anim&&cfg().anim.speed)||1),st=Array.from({length:Math.round(Math.min(90,W*H/9000))},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.2+.3}));
    const PP=u=>({x:W*(.08+.84*u),y:H*(.72-.4*u)-Math.sin(u*Math.PI)*H*.1});
    const ez=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
    const low=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4,TL=low?26:46,trail=[],t0=performance.now();if(low)st.length=st.length>>1;
    setTimeout(end,T+1500);
    const frame=now=>{
      if(done)return;const f=(now-t0)/T;
      x.clearRect(0,0,W,H);x.fillStyle="#0b0b0e";x.fillRect(0,0,W,H);
      const sa=cl(f/.25,0,1);st.forEach(s=>{x.globalAlpha=sa*(.35+.4*Math.sin(now/300+s.x));x.fillStyle="#cfd6ff";x.beginPath();x.arc(s.x,s.y,s.r,0,6.3);x.fill()});x.globalAlpha=1;
      const uS=ez(cl((f-.1)/.6,0,1)),sp=PP(uS),burst=f>.7?cl((f-.7)/.22,0,1):0;
      const k=cl((f-.22)/.48,0,1),uR=-.5+(uS+.5)*k*k,rp=PP(uR),rq=PP(uR+.01),ang=Math.atan2(rq.y-rp.y,rq.x-rp.x);
      if(f>.22&&f<.72){trail.push(rp);if(trail.length>TL)trail.shift()}
      if(trail.length>1&&f<.9){for(let i=1;i<trail.length;i++){const q=i/trail.length;x.strokeStyle=`rgba(${Math.round(124-40*q)},${Math.round(58+60*q)},${Math.round(237+10*q)},${q*.8})`;x.lineWidth=1+q*7*(.4+k);x.lineCap="round";x.beginPath();x.moveTo(trail[i-1].x,trail[i-1].y);x.lineTo(trail[i].x,trail[i].y);x.stroke()}}
      if(f<.72){const g=x.createRadialGradient(sp.x,sp.y,0,sp.x,sp.y,34);g.addColorStop(0,"rgba(255,255,255,.95)");g.addColorStop(.25,"rgba(167,139,250,.5)");g.addColorStop(1,"rgba(124,58,237,0)");x.fillStyle=g;x.fillRect(sp.x-34,sp.y-34,68,68);
        x.fillStyle="#fff";x.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?3:11;x.lineTo(sp.x+Math.cos(a)*r,sp.y+Math.sin(a)*r)}x.closePath();x.fill()}
      if(f>.22&&f<.74){x.save();x.translate(rp.x,rp.y);x.rotate(ang);const z=Math.max(.9,Math.min(W,H)/380);x.scale(z,z);
        x.fillStyle="#06B6D4";x.beginPath();x.moveTo(-10,0);x.lineTo(-22-k*10,-4);x.lineTo(-22-k*10,4);x.fill();
        x.fillStyle="#7C3AED";x.beginPath();x.moveTo(-6,-5);x.lineTo(-13,-11);x.lineTo(-12,-4);x.moveTo(-6,5);x.lineTo(-13,11);x.lineTo(-12,4);x.fill();
        x.fillStyle="#F4F5F7";x.beginPath();x.moveTo(15,0);x.quadraticCurveTo(5,-7,-10,-5);x.lineTo(-10,5);x.quadraticCurveTo(5,7,15,0);x.fill();
        x.fillStyle="#5267FF";x.beginPath();x.arc(3,0,2.4,0,6.3);x.fill();x.restore()}
      if(burst>0){const R=burst*Math.max(W,H)*.55,g=x.createRadialGradient(sp.x,sp.y,0,sp.x,sp.y,R);g.addColorStop(0,`rgba(255,255,255,${.9*(1-burst)})`);g.addColorStop(.3,`rgba(167,139,250,${.5*(1-burst)})`);g.addColorStop(1,"rgba(82,103,255,0)");x.fillStyle=g;x.fillRect(sp.x-R,sp.y-R,2*R,2*R);
        x.strokeStyle=`rgba(255,255,255,${.7*(1-burst)})`;x.lineWidth=1.5;for(let i=0;i<14;i++){const a=i*Math.PI/7,r1=R*.15,r2=R*.5;x.beginPath();x.moveTo(sp.x+Math.cos(a)*r1,sp.y+Math.sin(a)*r1);x.lineTo(sp.x+Math.cos(a)*r2,sp.y+Math.sin(a)*r2);x.stroke()}}
      o.style.opacity=f>.86?String(cl(1-(f-.86)/.14,0,1)):"1";
      if(f>=1)return end();raf=requestAnimationFrame(frame)};
    raf=requestAnimationFrame(frame);
  }catch(e){end()}
}
