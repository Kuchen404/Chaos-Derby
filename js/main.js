// Chaos-Derby – Abspielen eines vorab simulierten Rennens, Bedienung, Quotentafel
function posAt(tt){
  const fr=race.frames,fi=Math.min(Math.floor(tt*30),fr.length-1),f2=Math.min(fi+1,fr.length-1),a=clamp(tt*30-fi,0,1);
  const A=fr[fi],B=fr[f2];return {A,xs:A.x.map((v,i)=>v+(B.x[i]-v)*a)};
}
function frame(dt,sdt){
  const {A,xs}=posAt(t);
  xs.forEach((x,i)=>pose(i,x,A.s[i],A.rain,dt,sdt,A.o?A.o[i]:-1,xs));
  stepParts(sdt);
  rainFx.visible=A.rain;if(state==='run')sfx.rain(A.rain);
  if(A.rain){const pa=rainFx.geometry.attributes.position,ar=pa.array;for(let q=1;q<ar.length;q+=3){ar[q]-=sdt*26;}
    for(let q=1;q<ar.length;q+=6)if(ar[q]<0){ar[q]+=22;ar[q+3]+=22}pa.needsUpdate=true}
  const w=A.rain?1:0;frame.w=(frame.w||0)+(w-(frame.w||0))*Math.min(1,dt*2);
  bgc.copy(SKY).lerp(GREY,frame.w);scene.fog.color.copy(bgc);sun.intensity=.7-.35*frame.w;hemi.intensity=.8-.15*frame.w;
  direct(xs,dt);juiceView(dt);renderer.render(scene,camera);
  const lead=Math.max(...xs),rest=Math.max(0,Math.round(L-lead));
  $('rest').textContent=rest>0?'noch '+rest+' m':'im Ziel';
  xs.forEach((x,i)=>{dots[i].style.left=(clamp(x/L,0,1)*100)+'%'});
  if(state==='run')raceBar.live(xs);
}

/* ---------- Ablauf ---------- */
const dots=RUN.map(()=>{const e=document.createElement('div');e.className='dot';$('rail').append(e);return e});
function stamp(s){s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function logLine(e){
  $('cap').textContent=e.s;const ol=$('log');if(ol.firstChild&&ol.firstChild.className==='empty')ol.textContent='';
  const li=document.createElement('li'),tm=document.createElement('time'),sp=document.createElement('span');
  voice.say(e.k==='start'?Object.assign({b:race.bod},e):e,clamp(e.t/race.winT,0,1));sfx.event(e.k);
  tm.textContent=stamp(e.t);sp.textContent=e.s;li.append(tm,sp);ol.prepend(li);while(ol.children.length>9)ol.lastChild.remove();
  if(e.cut&&(!cut||t>cut.until+1.2))cut={i:e.i,until:t+e.cut}}
function step(dt){
  const slow=t>race.winT-.5&&t<race.winT+.45,sdt=dt*(slow?.28:1);
  $('slow').hidden=!slow;t+=sdt;
  while(evI<race.ev.length&&race.ev[evI].t<=t)logLine(race.ev[evI++]);
  if(!photoTaken&&race.winT>=0&&t>=race.winT)snapPhoto();
  frame(dt,sdt);
  if(voice.update(dt)>(voice.mode==='ja'?[7,6,4,3][voice.level]:8)&&t>3&&t<race.winT-6)filler();
  return t>=Math.min(race.dur,race.winT+7);
}
// Füllt längere Pausen im gesprochenen Kommentar mit dem Stand an der Spitze. Nur gesprochen, nicht im Verlauf.
// Der japanische Sprecher bricht stattdessen manchmal einfach aus, sobald er die Fassung verloren hat.
function filler(){
  const x=race.frames[Math.min(Math.floor(t*30),race.frames.length-1)].x,o=x.map((v,i)=>i).sort((a,b)=>x[b]-x[a]);
  const a=RUN[o[0]].name,b=RUN[o[1]].name,gap=Math.round(x[o[0]]-x[o[1]]),z=RUN[o[5]].name,k=Math.random();
  const s=gap<3?'Kopf an Kopf an der Spitze: '+a+' und '+b+'.'
    :k<.6?a+' führt mit '+gap+' Metern vor '+b+'.'
    :'Vorne '+a+', ganz hinten '+z+'.';
  const rant=voice.mode==='ja'&&voice.level>=2&&Math.random()<.45;
  voice.say({s,p:1,k:'stand',a:o[0],b:o[1],z:o[5],gap,tail:gap>=3&&k>=.6,rant},clamp(t/race.winT,0,1));
}
function tick(now){const dt=clamp((now-last)/1000,0,.1);last=now;if(step(dt)){finish();return}raf=requestAnimationFrame(tick)}
function finish(){
  state='done';$('go').textContent='Wiederholung ansehen';$('slow').hidden=true;
  const o=race.order;o.forEach((i,k)=>{$('pl'+i).textContent=(k+1)+'.'});
  voice.say({s:'Der Einlauf: Erster '+RUN[o[0]].name+', Zweiter '+RUN[o[1]].name+', Dritter '+RUN[o[2]].name+'.',p:3,k:'einlauf',o},1);
  startCeremony();
  const res=settleBets(o);raceBar.done(o);if(res&&res.length){const won=res.filter(r=>r.win).length;$('cap').textContent+=' · '+(won?won+(won>1?' Wetten':' Wette')+' gewonnen':'keine Wette gewonnen')}
}
function reset(){
  cancelAnimationFrame(raf);paradeStop();voice.stop();sfx.music(null);sfx.rain(false);t=0;evI=0;cut=null;shotK='';regie.sp=regie.alone=-1;regie.since=0;state='idle';$('slow').hidden=true;
  endCeremony();raceBar.view(false);
  $('log').innerHTML='<li class="empty">Der Kommentar läuft mit, sobald das Rennen startet.</li>';
  $('cap').textContent='Die Starter stehen an der Linie. Der Boden ist '+BODEN[race.bod].name+'.';
  RUN.forEach((d,i)=>{$('pl'+i).textContent='–'});
  if(!gl)return;
  for(const p of parts){p.life=0;p.s.visible=false}
  trackMat.color.set(BODEN_COL[race.bod][0]);trackMat.emissive.set(BODEN_COL[race.bod][1]);
  fig.forEach(f=>{f.ry=0;f.b=0;f.zo=0;f.prev=0;f.ch=0;f.sl=0;f.rk=0;f.jb=0;f.jp=0;f.dT=0;f.fT=0;f.lie=0;f.bel=0;f.sq=0;f.lx=0;f.gp=0;f.wp=0;f.tb=1;f.spin.scale.set(1,1,1);f.spin.rotation.z=0;f.spin.rotation.x=0;if(f.rocket){f.rocket.color.set('#c9ced4');f.cone.color.set('#d2232a')}});frame(1,0);
}
function start(){voice.unlock();reset();if(!gl)return;closeBets();state='run';raceBar.view(true);sfx.music('race');$('go').textContent='Von vorn';last=performance.now();raf=requestAnimationFrame(tick)}
// Jedes Rennen bekommt einen ausgelosten Bahnzustand; die Quoten werden für genau diesen Boden gerechnet
const BODEN_COL=[['#ffffff','#000000'],['#c8c09a','#14100a'],['#8f7a58','#2e1e0c']];   // Rasenfarbe und Schlammton je Boden
// Jedes Rennen bekommt außerdem ein ausgelostes Feld von 6 aus allen Startern
function fresh(){
  const b=drawBoden(Math.random()),f=drawField(Math.random);setField(f);
  race=simulate((Math.random()*2**31)|0,true,b,f);race.bod=b;race.key=oddsKey(b,f);$('bod').textContent=BODEN[b].name;
  if(gl)useField(f);showField();odds()}
// Startnummern auf der Leiste, Quotentafel und Wettschein an das neue Feld anpassen
function showField(){
  RUN.forEach((d,i)=>{const e=dots[i];e.textContent=d.nr;e.style.background=d.col;e.style.color=d.ink});
  $('tb').innerHTML=RUN.map((d,i)=>'<tr><td><span class="nr" style="background:'+d.col+';color:'+d.ink+'">'+d.nr+'</span></td><td><div class="name">'+d.name+'</div><div class="sub">'+d.kind+'. '+d.trait+'.</div></td><td class="n p" id="pc'+i+'">…</td><td class="n q" id="qt'+i+'">…</td><td class="n q2" id="qp'+i+'">…</td><td class="n" id="pl'+i+'">–</td></tr>').join('');
  fieldBets();
}
function fit(){if(!gl)return;const w=$('view').clientWidth;renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setSize(w,Math.round(w*9/16),false)}

try{
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  $('view').prepend(renderer.domElement);build();
}catch(err){gl=false;$('nogl').hidden=false}
$('go').onclick=start;
$('neu').onclick=()=>{fresh();reset();$('go').textContent='Rennen starten';openBets();paradeStart()};
function voiceLabel(){$('ton').textContent='Ton: '+(voice.mode==='aus'?'aus':voice.mode==='de'?'Deutsch':voice.pending?'Japanisch (lädt …)':voice.fallback?'Deutsch (keine japanische Stimme)':'Japanisch');$('ton').setAttribute('aria-pressed',voice.on);sfx.setOn(voice.on)}
if(voice.ok){voiceLabel();voice.onload=voiceLabel;speechSynthesis.addEventListener&&speechSynthesis.addEventListener('voiceschanged',voiceLabel);$('ton').onclick=()=>{voice.unlock();voice.next();voiceLabel();tonHint()}}else $('ton').hidden=true;
// Quoten für Boden und Feld des aktuellen Rennens, je Rennen einmal gemerkt. Gerechnet wird in Helfern (Web Worker) neben der Seite,
// aufgeteilt auf mehrere Prozessorkerne; ohne Worker wie früher in Häppchen auf der Seite selbst.
const TL={};let oddsBusy=false,oddsJob=null,pool=null;
const oddsDone=k=>TL[k]&&TL[k].N>=ODDS_N;
function showOdds(k){
  const q=quotes(TL[k]);
  RUN.forEach((d,i)=>{$('pc'+i).textContent=(q.pWin[i]*100).toFixed(0)+' %';$('qt'+i).textContent=fmtQ(q.win[i]);$('qp'+i).textContent=fmtQ(q.place[i])});
  $('mc').textContent='Die Quoten stammen aus '+q.N+' unsichtbar vorab gerechneten Rennen mit diesen Startern auf '+BODEN[q.bod].name+'em Boden, abzüglich 15 % für die Bank. Platz heißt: Erster oder Zweiter.';
  setQuotes(q);
}
function oddsProgress(k,u){if(k!==race.key)return;loading.set('q',u);$('mc').textContent='Quoten werden berechnet … '+Math.round(u*100)+' %'}
function oddsFinished(k){if(k===race.key){loading.set('q',1);showOdds(k)}}
function oddsLoop(){
  const k=race.key;
  if(oddsDone(k)){oddsBusy=false;return}
  TL[k]=TL[k]||tally(race.bod,race.field);
  if(count(TL[k],250))oddsFinished(k);else oddsProgress(k,TL[k].N/ODDS_N);
  setTimeout(oddsLoop,0);
}
// Versionsanhang der Seite (?v=…), damit die Helfer dieselbe sim.js rechnen wie die Seite und keine alte aus dem Cache
const VER=(()=>{const e=document.querySelector('script[src*="js/main.js"]');const q=e&&e.getAttribute('src').split('?')[1];return q?'?'+q:''})();
function mkPool(){
  if(typeof Worker==='undefined')return null;
  try{const n=Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1));return Array.from({length:n},()=>new Worker('js/odds-worker.js'+VER))}catch(e){return null}
}
function oddsWorkers(k,bod,field){
  if(oddsJob)pool.forEach(w=>w.terminate()),pool=mkPool();   // altes Feld abbrechen, das neue hat Vorrang
  if(!pool)return false;
  const job=oddsJob={k,tl:tally(bod,field),got:pool.map(()=>0),open:pool.length},n=pool.length;
  pool.forEach((w,j)=>{
    w.onmessage=e=>{const m=e.data;if(oddsJob!==job)return;
      job.got[j]=m.n;
      if(m.done){['win','place','ex'].forEach(a=>m[a].forEach((v,i)=>{job.tl[a][i]+=v}));
        if(--job.open===0){job.tl.N=ODDS_N;TL[k]=job.tl;oddsJob=null;oddsFinished(k);return}}
      oddsProgress(k,job.got.reduce((a,b)=>a+b,0)/ODDS_N)};
    // Fällt ein Helfer aus (etwa weil die Seite als Datei geöffnet ist), rechnet die Seite selbst weiter
    w.onerror=e=>{if(oddsJob!==job)return;e.preventDefault&&e.preventDefault();pool.forEach(x=>x.terminate());pool=null;oddsJob=null;odds()};
    w.postMessage({id:j,bod,field,from:Math.floor(ODDS_N*j/n),to:Math.floor(ODDS_N*(j+1)/n)});
  });
  return true;
}
function odds(){
  const k=race.key;dropStaleBets(k);loading.add('q',4);
  if(oddsDone(k)){showOdds(k);loading.set('q',1);return}
  setQuotes(null);
  if(oddsJob&&oddsJob.k===k)return;
  if(pool===null&&oddsJob===null&&!odds.tried){odds.tried=true;pool=mkPool()}
  if(pool&&oddsWorkers(k,race.bod,race.field))return;
  if(!oddsBusy){oddsBusy=true;setTimeout(oddsLoop,0)}
}
fit();
// Alle Starter gleich zu Beginn anlegen, damit ihre Modelle mit dem Ladebildschirm kommen und nicht erst, wenn sie zum ersten Mal im Feld stehen
if(gl)ROSTER.forEach((d,k)=>figFor(k));
fresh();reset();loading.seal();
// Erst nach dem Klick auf dem Ladebildschirm: Vorstellung der Starter, mit Ton
loading.onStart(()=>{voice.unlock();if(voice.ok)voiceLabel();tonHint();if(gl&&state==='idle')paradeStart()});
window.addEventListener('resize',()=>{fit();if(gl&&state!=='run'&&state!=='cer'&&!paraOn)frame(1,0)});
// Browser geben Ton erst nach einer Bedienung frei; danach kann der Sprecher schon die Starter vorstellen (Musik und Geräusche: js/sfx.js)
// Bis dahin zeigt ein Hinweis im Sendebild, dass ein Klick (oder eine Taste) den Ton einschaltet.
let tonFrei=false;
function tonHint(){$('tonhint').hidden=tonFrei||!voice.on||!loading.started}
function tonAn(){tonFrei=true;voice.unlock();tonHint()}
document.addEventListener('pointerdown',tonAn);document.addEventListener('keydown',tonAn);
