// Chaos-Derby – Abspielen eines vorab simulierten Rennens, Bedienung, Quotentafel
function posAt(tt){
  const fr=race.frames,fi=Math.min(Math.floor(tt*30),fr.length-1),f2=Math.min(fi+1,fr.length-1),a=clamp(tt*30-fi,0,1);
  const A=fr[fi],B=fr[f2];return {A,xs:A.x.map((v,i)=>v+(B.x[i]-v)*a)};
}
function frame(dt,sdt){
  const {A,xs}=posAt(t);
  xs.forEach((x,i)=>pose(i,x,A.s[i],A.rain,dt,sdt));
  stepParts(sdt);
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
  voice.say(e,clamp((e.t-race.winT+12)/12,0,1));
  tm.textContent=stamp(e.t);sp.textContent=e.s;li.append(tm,sp);ol.prepend(li);while(ol.children.length>9)ol.lastChild.remove();
  if(e.cut&&(!cut||t>cut.until+1.2))cut={i:e.i,until:t+e.cut}}
function step(dt){
  const slow=t>race.winT-.5&&t<race.winT+.45,sdt=dt*(slow?.28:1);
  $('slow').hidden=!slow;t+=sdt;
  while(evI<race.ev.length&&race.ev[evI].t<=t)logLine(race.ev[evI++]);
  if(!photoTaken&&race.winT>=0&&t>=race.winT)snapPhoto();
  frame(dt,sdt);
  if(voice.update(dt)>8&&t>3&&t<race.winT-6)filler();
  return t>=Math.min(race.dur,race.winT+7);
}
// Füllt längere Pausen im gesprochenen Kommentar mit dem Stand an der Spitze. Nur gesprochen, nicht im Verlauf.
function filler(){
  const x=race.frames[Math.min(Math.floor(t*30),race.frames.length-1)].x,o=x.map((v,i)=>i).sort((a,b)=>x[b]-x[a]);
  const a=RUN[o[0]].name,b=RUN[o[1]].name,gap=Math.round(x[o[0]]-x[o[1]]),z=RUN[o[5]].name,k=Math.random();
  const s=gap<3?'Kopf an Kopf an der Spitze: '+a+' und '+b+'.'
    :k<.6?a+' führt mit '+gap+' Metern vor '+b+'.'
    :'Vorne '+a+', ganz hinten '+z+'.';
  voice.say({s,p:1},clamp((t-race.winT+12)/12,0,1));
}
function tick(now){const dt=clamp((now-last)/1000,0,.1);last=now;if(step(dt)){finish();return}raf=requestAnimationFrame(tick)}
function finish(){
  state='done';$('go').textContent='Wiederholung ansehen';$('slow').hidden=true;
  const o=race.order;o.forEach((i,k)=>{$('pl'+i).textContent=(k+1)+'.'});
  voice.say({s:'Der Einlauf: Erster '+RUN[o[0]].name+', Zweiter '+RUN[o[1]].name+', Dritter '+RUN[o[2]].name+'.',p:3},0);
  startCeremony();
  const res=settleBets(o);if(res&&res.length){const won=res.filter(r=>r.win).length;$('cap').textContent+=' · '+(won?won+(won>1?' Wetten':' Wette')+' gewonnen':'keine Wette gewonnen')}
}
function reset(){
  cancelAnimationFrame(raf);voice.stop();t=0;evI=0;cut=null;shotK='';regie.sp=regie.alone=-1;regie.since=0;state='idle';$('slow').hidden=true;
  endCeremony();
  $('log').innerHTML='<li class="empty">Der Kommentar läuft mit, sobald das Rennen startet.</li>';
  RUN.forEach((d,i)=>{$('pl'+i).textContent='–'});
  if(!gl)return;
  for(const p of parts){p.life=0;p.s.visible=false}
  fig.forEach(f=>{f.ry=0;f.b=0;f.zo=0;f.prev=0;f.ch=0;f.sl=0;f.rk=0;f.dT=0;f.spin.rotation.z=0});
  fig[5].rocket.color.set('#c9ced4');fig[5].cone.color.set('#d2232a');frame(1,0);
}
function start(){reset();if(!gl)return;closeBets();state='run';$('go').textContent='Von vorn';last=performance.now();raf=requestAnimationFrame(tick)}
function fresh(){race=simulate((Math.random()*2**31)|0,true)}
function fit(){if(!gl)return;const w=$('view').clientWidth;renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setSize(w,Math.round(w*9/16),false)}

$('tb').innerHTML=RUN.map((d,i)=>'<tr><td><span class="nr" style="background:'+d.col+';color:'+d.ink+'">'+d.nr+'</span></td><td><div class="name">'+d.name+'</div><div class="sub">'+d.kind+'. '+d.trait+'.</div></td><td class="n p" id="pc'+i+'">…</td><td class="n q" id="qt'+i+'">…</td><td class="n q2" id="qp'+i+'">…</td><td class="n" id="pl'+i+'">–</td></tr>').join('');
try{
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  $('view').prepend(renderer.domElement);build();
}catch(err){gl=false;$('nogl').hidden=false}
$('go').onclick=start;
$('neu').onclick=()=>{fresh();reset();$('go').textContent='Rennen starten';openBets()};
function voiceLabel(){$('ton').textContent=voice.on?'Ton: an':'Ton: aus';$('ton').setAttribute('aria-pressed',voice.on)}
if(voice.ok){voiceLabel();$('ton').onclick=()=>{voice.set(!voice.on);voiceLabel()}}else $('ton').hidden=true;
fit();fresh();reset();
window.addEventListener('resize',()=>{fit();if(gl&&state!=='run'&&state!=='cer')frame(1,0)});
// Quoten in Häppchen rechnen, damit die Seite bedienbar bleibt
const tl=tally();
(function oddsChunk(){
  if(!count(tl,250)){$('mc').textContent='Quoten werden berechnet … '+Math.round(tl.N/ODDS_N*100)+' %';setTimeout(oddsChunk,0);return}
  const q=quotes(tl);
  RUN.forEach((d,i)=>{$('pc'+i).textContent=(q.pWin[i]*100).toFixed(0)+' %';$('qt'+i).textContent=fmtQ(q.win[i]);$('qp'+i).textContent=fmtQ(q.place[i])});
  $('mc').textContent='Die Quoten stammen aus '+q.N+' unsichtbar vorab gerechneten Rennen mit diesen Startern, abzüglich 15 % für die Bank. Platz heißt: Erster oder Zweiter.';
  setQuotes(q);
})();
