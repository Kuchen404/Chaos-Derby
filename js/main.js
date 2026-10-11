// Chaos-Derby – Abspielen eines vorab simulierten Rennens, Bedienung, Quotentafel
function frame(dt,sdt){
  const fr=race.frames,fi=Math.min(Math.floor(t*30),fr.length-1),f2=Math.min(fi+1,fr.length-1),a=clamp(t*30-fi,0,1);
  const A=fr[fi],B=fr[f2],xs=A.x.map((v,i)=>v+(B.x[i]-v)*a);
  xs.forEach((x,i)=>pose(i,x,A.s[i],A.rain,dt,sdt));
  for(const p of parts)if(p.life>0){p.life-=sdt;p.s.position.addScaledVector(p.v,sdt);const u=Math.max(0,p.life/p.max);p.s.material.opacity=u*.5;const z=p.size*(1.4-u*.8);p.s.scale.set(z,z,1);if(p.life<=0)p.s.visible=false}
  rainFx.visible=A.rain;
  if(A.rain){const pa=rainFx.geometry.attributes.position,ar=pa.array;for(let q=1;q<ar.length;q+=3){ar[q]-=sdt*26;}
    for(let q=1;q<ar.length;q+=6)if(ar[q]<0){ar[q]+=22;ar[q+3]+=22}pa.needsUpdate=true}
  const w=A.rain?1:0;frame.w=(frame.w||0)+(w-(frame.w||0))*Math.min(1,dt*2);
  bgc.copy(SKY).lerp(GREY,frame.w);scene.fog.color.copy(bgc);sun.intensity=.7-.35*frame.w;hemi.intensity=.8-.15*frame.w;
  direct(xs,dt);renderer.render(scene,camera);
  const lead=Math.max(...xs),rest=Math.max(0,Math.round(L-lead));
  $('rest').textContent=rest>0?'noch '+rest+' m':'im Ziel';
  xs.forEach((x,i)=>{dots[i].style.left=(clamp(x/L,0,1)*100)+'%'});
}

/* ---------- Ablauf ---------- */
const dots=RUN.map(d=>{const e=document.createElement('div');e.className='dot';e.textContent=d.nr;e.style.background=d.col;e.style.color=d.ink;$('rail').append(e);return e});
function stamp(s){s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function logLine(e){
  $('cap').textContent=e.s;const ol=$('log');if(ol.firstChild&&ol.firstChild.className==='empty')ol.textContent='';
  const li=document.createElement('li'),tm=document.createElement('time'),sp=document.createElement('span');
  tm.textContent=stamp(e.t);sp.textContent=e.s;li.append(tm,sp);ol.prepend(li);while(ol.children.length>9)ol.lastChild.remove();
  if(e.cut&&(!cut||t>cut.until+1.2))cut={i:e.i,until:t+e.cut}}
function step(dt){
  const slow=t>race.winT-.5&&t<race.winT+.45,sdt=dt*(slow?.28:1);
  $('slow').hidden=!slow;t+=sdt;
  while(evI<race.ev.length&&race.ev[evI].t<=t)logLine(race.ev[evI++]);
  frame(dt,sdt);
  return t>=Math.min(race.dur,race.winT+7);
}
function tick(now){const dt=clamp((now-last)/1000,0,.1);last=now;if(step(dt)){finish();return}raf=requestAnimationFrame(tick)}
function finish(){
  state='done';$('go').textContent='Wiederholung ansehen';$('slow').hidden=true;
  const o=race.order;$('cap').textContent='Einlauf: 1. '+RUN[o[0]].name+' · 2. '+RUN[o[1]].name+' · 3. '+RUN[o[2]].name;
  o.forEach((i,k)=>{$('pl'+i).textContent=(k+1)+'.'});
}
function reset(){
  cancelAnimationFrame(raf);t=0;evI=0;cut=null;shotK='';regie.sp=regie.alone=-1;regie.since=0;state='idle';$('slow').hidden=true;
  $('log').innerHTML='<li class="empty">Der Kommentar läuft mit, sobald das Rennen startet.</li>';
  RUN.forEach((d,i)=>{$('pl'+i).textContent='–'});
  if(!gl)return;
  for(const p of parts){p.life=0;p.s.visible=false}
  fig.forEach(f=>{f.ry=0;f.b=0;f.zo=0;f.prev=0;f.ch=0;f.sl=0;f.rk=0;f.dT=0;f.spin.rotation.z=0});
  fig[5].rocket.color.set('#c9ced4');fig[5].cone.color.set('#d2232a');frame(1,0);
}
function start(){reset();if(!gl)return;state='run';$('go').textContent='Von vorn';last=performance.now();raf=requestAnimationFrame(tick)}
function fresh(){race=simulate((Math.random()*2**31)|0,true)}
function fit(){if(!gl)return;const w=$('view').clientWidth;renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setSize(w,Math.round(w*9/16),false)}

$('tb').innerHTML=RUN.map((d,i)=>'<tr><td><span class="nr" style="background:'+d.col+';color:'+d.ink+'">'+d.nr+'</span></td><td><div class="name">'+d.name+'</div><div class="sub">'+d.kind+'. '+d.trait+'.</div></td><td class="n p" id="pc'+i+'">…</td><td class="n q" id="qt'+i+'">…</td><td class="n" id="pl'+i+'">–</td></tr>').join('');
try{
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  $('view').prepend(renderer.domElement);build();
}catch(err){gl=false;$('nogl').hidden=false}
$('go').onclick=start;
$('neu').onclick=()=>{fresh();start()};
fit();fresh();reset();
window.addEventListener('resize',()=>{fit();if(gl&&state!=='run')frame(1,0)});
setTimeout(()=>{
  const N=1200,w=[0,0,0,0,0,0];for(let k=0;k<N;k++)w[simulate(1000+k*7919,false).order[0]]++;
  w.forEach((n,i)=>{const p=n/N,q=p>0?clamp(.85/p,1.1,99):99;
    $('pc'+i).textContent=(p*100).toFixed(0)+' %';$('qt'+i).textContent=q.toFixed(1).replace('.',',')});
  $('mc').textContent='Die Quoten stammen aus '+N+' unsichtbar vorab gerechneten Rennen mit diesen Startern, abzüglich 15 % für die Bank.';
},60);
