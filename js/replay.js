// Chaos-Derby – Wiederholung nach dem Zieleinlauf: der größte Crash und der Zieleinlauf noch einmal in Zeitlupe, mit eigener Kamera.
// Reine Darstellung: Das Rennen liegt fertig in race.frames, hier wird nur ein Ausschnitt davon erneut abgespielt.
const RFALL={2:1,17:1,18:1,19:1,20:1};   // Zustände, in denen ein Starter stürzt, fliegt, platt oder benommen ist
const rep={segs:[],k:0,u:0,done:null,cx:0,cz:0,sp:0,hold:-1};
// Größter Crash: Stürze, die höchstens 1,5 s und 15 m auseinanderliegen, gehören zu einem Unfall. Gewertet wird die Zahl der Gestürzten;
// ein Flug durch die Luft oder eine explodierte Rakete zählt etwas mehr. Stürze nach dem Sieg zählen nicht.
// Im Bild sind die Gestürzten und wer den Sturz ausgelöst hat (etwa der Stier); als Bauchbinde dient die Meldung aus dem Kommentar.
function bigCrash(){
  const fr=race.frames,end=Math.min(fr.length-1,Math.floor(race.winT*30)),hits=[];
  for(let k=1;k<=end;k++)fr[k].s.forEach((s,i)=>{const p=fr[k-1].s[i];if(RFALL[s]&&!RFALL[p]){
    const tt=k/30,e=race.ev.find(e=>e.i===i&&Math.abs(e.t-tt)<.1&&e.p>=2)||race.ev.find(e=>e.i===i&&Math.abs(e.t-tt)<.1);
    hits.push({i,t:tt,x:fr[k].x[i],w:s===17||p===6||p===9?1.5:1,e})}});
  let best=null;
  for(let a=0;a<hits.length;){
    let b=a+1;while(b<hits.length&&hits[b].t-hits[b-1].t<=1.5&&Math.abs(hits[b].x-hits[a].x)<=15)b++;
    const g=hits.slice(a,b),who=[...new Set(g.map(h=>h.i))],top=g.reduce((m,h)=>h.w>m.w?h:m,g[0]),sc=who.length+top.w-1;
    // Auslöser bleiben nur bis kurz nach ihrem Zusammenstoß im Bild, sonst zöge ein davonrennender Stier die Kamera auf
    const cam=who.map(i=>({i,u:1e9}));g.forEach(h=>{if(h.e&&h.e.j>=0&&!who.includes(h.e.j))cam.push({i:h.e.j,u:h.t+.5})});
    if(!best||sc>best.sc)best={sc,who,cam,t0:g[0].t,t1:g[g.length-1].t,cap:top.e?top.e.s:RUN[top.i].name+' stürzt.'};
    a=b}
  return best;
}
function replayPlan(){
  const segs=[],c=bigCrash(),w=race.winT;
  // Der Crash beginnt kurz vorher und endet, wenn alle liegen; höchstens 4,5 s Rennzeit. Fällt er in den Zieleinlauf, reicht der Zieleinlauf.
  if(c&&c.t0<w-3.5){const t0=Math.max(.5,c.t0-1.1);segs.push({k:'crash',t0,t1:Math.min(t0+4.5,c.t1+1.9,w-.3),sp:.4,who:c.cam,cap:c.cap})}
  segs.push({k:'ziel',t0:Math.max(.5,w-2.2),t1:w+.7,sp:.3,who:[{i:race.order[0],u:1e9}],cap:'Der Zieleinlauf: '+RUN[race.order[0]].name+' vor '+RUN[race.order[1]].name+'.'});
  return segs;
}
function startReplay(done){
  rep.segs=replayPlan();rep.k=-1;rep.done=done;state='rep';$('slow').hidden=true;$('strip').hidden=true;
  $('rpskip').onclick=endReplay;nextSeg();
  last=performance.now();raf=requestAnimationFrame(repTick);
}
// Vor jedem Ausschnitt die Figuren zurücksetzen und eine gute Sekunde unsichtbar vorlaufen lassen, damit Haltungen und Übergänge stimmen
function nextSeg(){
  const s=rep.segs[++rep.k];if(!s){endReplay();return}
  resetFigs();
  const kuh=fig.findIndex(f=>f.rocket);
  if(kuh>=0)for(let q=1;q<=Math.floor(s.t0*30);q++){const p=race.frames[q-1].s[kuh];if((p===6||p===9)&&race.frames[q].s[kuh]===2){fig[kuh].rocket.color.set('#3a3a3a');fig[kuh].cone.color.set('#222222');break}}
  for(t=Math.max(0,s.t0-1.2);t<s.t0;t+=1/30){const {A,xs}=posAt(t);xs.forEach((x,i)=>pose(i,x,A.s[i],A.rain,1/30,1/30,A.o?A.o[i]:-1,xs))}
  for(const p of parts){p.life=0;p.s.visible=false}
  t=s.t0;rep.u=-1;rep.hold=-1;rep.hy=null;
  $('rptag').textContent=s.k==='ziel'?'Wiederholung · Zieleinlauf':'Wiederholung';
  $('rpcap').textContent=s.cap;$('cap').textContent='Wiederholung. '+s.cap;
  const o=$('replay');o.hidden=false;o.classList.remove('flash');void o.offsetWidth;o.classList.add('flash');
}
function repTick(now){
  const dt=clamp((now-last)/1000,0,.1);last=now;voice.update(dt);
  const s=rep.segs[rep.k];
  if(t>=s.t1){nextSeg();if(state!=='rep')return}
  else{
    // Beim Zieleinlauf steht das Bild im Moment des Siegs kurz still
    if(s.k==='ziel'&&rep.hold<0&&t>=race.winT){rep.hold=1.1;t=race.winT}
    let sdt=dt*s.sp;if(rep.hold>0){rep.hold-=dt;sdt=0}
    t+=sdt;frame(dt,sdt)}
  raf=requestAnimationFrame(repTick);
}
function endReplay(){
  if(state!=='rep')return;
  cancelAnimationFrame(raf);hideReplay();
  camera.fov=32;camera.updateProjectionMatrix();
  resetFigs();const d=rep.done;rep.done=null;if(d)d();
}
function hideReplay(){$('replay').hidden=true;$('replay').classList.remove('flash')}
// Kamera der Wiederholung. Crash: von schräg vorn auf die Beteiligten, die Kamera schwenkt langsam herum und zoomt heran.
// Zieleinlauf: tief an der Ziellinie, folgt dem Sieger bis zur Linie und zoomt dabei auf die Linie.
function replayCam(xs,dt){
  const s=rep.segs[rep.k],u=clamp((t-s.t0)/(s.t1-s.t0),0,1),e=u*u*(3-2*u);
  // Mitte und Breite der Beteiligten; beides geglättet, damit die Kamera nicht springt, wenn einer durch die Luft fliegt
  let lo=1e9,hi=-1e9,cz=0,cn=0;s.who.forEach(({i,u})=>{if(t>u)return;const r=fig[i].root.position;cn++;lo=Math.min(lo,r.x-vis(i).front*S);hi=Math.max(hi,r.x+vis(i).front*S);cz+=r.z});
  const cx=(lo+hi)/2,sp=hi-lo;cz/=cn;
  if(rep.u<0){rep.cx=cx;rep.cz=cz;rep.sp=sp}else{const a=1-Math.exp(-dt*5);rep.cx+=(cx-rep.cx)*a;rep.cz+=(cz-rep.cz)*a;rep.sp+=(sp-rep.sp)*(1-Math.exp(-dt*2))}
  rep.u=u;
  let px,py,pz,tx,ty,tz,fov;
  if(s.k==='crash'){fov=34-14*e;const a=.5-.7*e,R=Math.max(11-2*e,(rep.sp+5)/(2*Math.tan(fov*PI/360)*camera.aspect)*1.15);tx=rep.cx;ty=1.5;tz=rep.cz;px=tx+Math.sin(a)*R;py=1.6+R*.08;pz=tz+Math.cos(a)*R}
  else{const v=clamp((t-s.t0)/(race.winT-s.t0),0,1),z=v*v*(3-2*v);   // größter Zoom genau im Moment des Siegs
    // Die Kamera richtet sich nach dem Kopf des Siegers, damit er auch mit langem Hals (Alpaka) oder aufrecht im Bild bleibt
    const f=fig[s.who[0].i],hd=f.bone&&f.bone.Head?f.bone.Head.getWorldPosition(tmpV):tmpV.set(xs[s.who[0].i],2,0);
    rep.hy=rep.hy==null?hd.y:rep.hy+(hd.y-rep.hy)*(1-Math.exp(-dt*3));   // Kopfnicken im Galopp geglättet
    tx=Math.min(hd.x-1.2,L-1);ty=Math.max(1.5,rep.hy-1.2);tz=0;px=tx+2.5;py=ty-.3;pz=17.5;fov=30-14*z}
  if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix()}
  camera.position.set(px,py,pz);camera.lookAt(tmpV.set(tx,ty,tz));
  sun.position.set(tx-14,32,20);sun.target.position.set(tx,0,0);sun.target.updateMatrixWorld();
  rainFx.position.x=tx;
}
