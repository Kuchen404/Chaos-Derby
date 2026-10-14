// Chaos-Derby – Kameraregie: Startfahrt, Seitenkamera, Verfolger, Schnitte auf Ereignisse, Zieleinlauf
const regie={sp:-1,alone:-1,since:0,cutI:0,of:null,plan:[],slow:[],shot:null,off:0,cs:-1};   // geglättete Gruppenbreite; seit wann der Erste allein vorn liegt; Beginn der laufenden Einstellung; Drehbuch
const HOLD=1.5,NEAR=L-70;   // Mindestdauer einer Einstellung in s; ab hier keine neuen Schnitte mehr bis zur Zielkamera
// Drehbuch: Das Rennen steht vorab fest, deshalb legt die Regie vor dem Start fest, wann sie auf welchen Moment schneidet.
// Jeder Moment (Ereignis mit Schnitt) beginnt PRE Sekunden vorher, damit man das Ausholen sieht, und läuft mindestens MINSHOT.
// Was in der Nähe als Folge passiert (Getroffene, Gestürzte, der Partner eines Überholgags), kommt mit ins Bild statt eines neuen Schnitts.
const PRE=.7,MINSHOT=2.6,NEARX=20,SEEN=1.5;   // SEEN: so lange nach seinem Ereignis darf ein laufender Moment für einen neuen unterbrochen werden
// Die stärksten Momente eines Rennens bekommen live eine kurze Zeitlupe (Gewicht je Art; höchstens SLOWN je Rennen)
const BIG={knockhigh:5,blasthigh:5,kickhigh:5,buckhigh:5,tramp:4,explode:4,landon:4,dropon:4,leapfail:3,chargefail:3,streakcrash:3,streakknock:3,duckscatter:3,knock:2,rocketwrong:2,underfail:3,vaultfail:3,slingfail:3,slingoff:3,trickfail:2,vault:2,under:2,trick:2},SLOWN=2,SLOWF=.35;
function planShots(){
  const fr=race.frames,n=fr.length,F=tt=>fr[clamp(Math.round(tt*30),0,n-1)],X=(i,tt)=>F(tt).x[i];
  // Neue Momente nur bis NEAR; danach steht die Seitenkamera mindestens HOLD, bevor die Zielkamera übernimmt
  let tNear=race.winT,tFin=race.winT;for(let q=0;q<n;q++){const x=Math.max(...fr[q].x);if(x>=NEAR&&tNear===race.winT)tNear=q/30;if(x>=L-32){tFin=q/30;break}}
  tNear=Math.min(tNear,tFin-HOLD);
  const shots=[];
  for(const e of race.ev){
    if(e.i<0||e.t>=tNear||!(e.cut>0||e.p>=2))continue;
    const s=shots[shots.length-1],near=s&&e.t<s.t1&&s.who.some(w=>Math.abs(X(w.i,e.t)-X(e.i,e.t))<NEARX);
    const add=(i,u)=>{const o=s.who.find(w=>w.i===i);if(o)o.u=Math.max(o.u,u);else s.who.push({i,u})};
    const big=k=>BIG[k]?{w:BIG[k],a:e.t+(e.sl||0)}:null,best=b=>{if(b&&(!s.big||b.w>s.big.w))s.big=b};
    if(near){   // Folge im selben Bild
      add(e.i,e.t+Math.max(1.8,e.cut||0));if(e.j>=0&&Math.abs(X(e.j,e.t)-X(e.i,e.t))<NEARX)add(e.j,e.t+1.8);
      s.t1=Math.min(Math.max(s.t1,e.t+Math.max(1.6,e.cut||0)),s.t0+8,tNear);best(big(e.k));continue}
    if(!(e.cut>0))continue;
    let t0=e.t-PRE<2.6+HOLD?2.6:e.t-PRE;   // direkt nach der Startfahrt keine Seitenkamera für einen Augenblick
    if(s&&t0<s.t1){
      // anderswo, während noch ein Moment läuft: Der laufende bleibt mindestens SEEN nach seinem Ereignis stehen (wer aus dem
      // Höhenflug zurückfällt, bekommt immer sofort seinen Schnitt), dann wird geschnitten, wenn vom neuen noch genug übrig ist
      const t2=e.k==='fallback'?Math.max(s.t0+1.5,t0):Math.max(t0,s.e+SEEN);
      if(t2<s.t1&&e.t+e.cut-t2>=1.2){s.t1=t2;t0=t2}else if(t2>=s.t1&&e.t+e.cut-s.t1>=1.2)t0=s.t1;else continue}
    const t1=Math.min(Math.max(t0+MINSHOT,e.t+Math.max(e.cut,MINSHOT-PRE)),tNear);if(t1-t0<1.5)continue;
    const who=[{i:e.i,u:1e9}];if(e.j>=0&&e.j!==e.i&&Math.abs(X(e.j,e.t)-X(e.i,e.t))<NEARX)who.push({i:e.j,u:e.t+Math.max(1.8,e.cut)});
    shots.push({t0,t1,e:e.t,who,big:big(e.k),cap:e.s})}
  // Zwischen zwei Momenten bleibt die Seitenkamera mindestens HOLD stehen, sonst wird direkt weitergeschnitten
  for(let q=0;q+1<shots.length;q++)if(shots[q+1].t0-shots[q].t1<HOLD)shots[q].t1=shots[q+1].t0;
  // Zeitlupe für die stärksten Momente, mindestens 8 s auseinander
  const slow=[];shots.filter(s=>s.big&&s.big.w>=4&&s.big.a>s.t0&&s.big.a<s.t1-.3).sort((a,b)=>b.big.w-a.big.w||a.t0-b.t0)
    .forEach(s=>{if(slow.length<SLOWN&&slow.every(w=>Math.abs(w.a-s.big.a)>8))slow.push({a:s.big.a-.05,b:s.big.a+.5})});
  regie.plan=shots;regie.slow=slow;regie.of=race;
}
function ensurePlan(){if(regie.of!==race)planShots()}
// Läuft gerade eine Zeitlupe auf einem Höhepunkt? (main.js bremst dann das Abspielen)
function liveSlow(tt){ensurePlan();return regie.slow.some(w=>tt>=w.a&&tt<w.b)}
function direct(xs,dt){
  ensurePlan();
  // Kamera wird relativ zu einem mitlaufenden Ankerpunkt geführt, damit schnelle Starter im Bild bleiben
  const srt=[...xs].sort((a,b)=>b-a),lead=Math.min(srt[0],L+6),wt=race.winT;
  let n=1;while(n<6&&srt[0]-srt[n]<=38)n++;   // Führungsgruppe: alle, die mit dem Ersten ins Bild passen
  // Liegt der Erste lange allein vorn, zeigt die Regie im Wechsel auch die Verfolger: 4 s Führung, dann 3 s Verfolger
  if(n===1&&lead<L-150){if(regie.alone<0)regie.alone=t}else regie.alone=-1;
  const pack=regie.alone>=0&&t-regie.alone>4&&(t-regie.alone-4)%7<3;
  // Welche Einstellung? Start, Ziel und Nachspann haben Vorrang (die Zielkamera bleibt, auch wenn der Erste noch einmal zurückläuft), dann das Drehbuch; Seitenkamera und Verfolger wechseln frühestens nach HOLD
  const cur=shotK.replace(/[\d.]+$/,''),si=regie.plan.findIndex(s=>t>=s.t0&&t<s.t1);
  let k=t<2.6?'start':t>wt+1.6?'post':lead>=L-32||cur==='fin'?'fin':si>=0?'cut'+si:pack?'pack':'side';
  // Wechsel zwischen Seitenkamera und Verfolgern nicht kurz vor dem nächsten Moment, sonst stünde die Einstellung nur einen Augenblick
  const soon=regie.plan.some(s=>s.t0>t&&s.t0-t<HOLD);
  if((k==='side'||k==='pack')&&k!==shotK&&(cur==='side'||cur==='pack')&&(t-regie.since<HOLD||lead>=NEAR||soon))k=shotK;
  let ax=0,px,py,pz,tx,ty,tz=0;
  if(k==='start'){ax=lead;px=13;py=2.1;pz=9.5;tx=-3;ty=1.7}
  else if(k==='post'){px=L+9;py=6;pz=27;tx=L-12;ty=1}
  else if(k==='fin'){px=L+2;py=2.4;pz=21;tx=L-3.5;ty=2}
  else if(k.startsWith('cut')){
    // Nah auf den Moment, schräg von vorn. Sind mehrere beteiligt, rückt die Kamera so weit zurück, dass alle ins Bild passen.
    const s=regie.plan[+k.slice(3)],m=s.who[0].i,r0=fig[m].root.position;regie.cutI=m;regie.shot=s;
    let x0=r0.x,x1=r0.x,z0=r0.z,z1=r0.z,w=vis(m).cw,top=vis(m).top;
    for(const q of s.who){if(q.i===m||t>q.u)continue;const r=fig[q.i].root.position;if(Math.abs(r.x-r0.x)>30)continue;
      x0=Math.min(x0,r.x);x1=Math.max(x1,r.x);z0=Math.min(z0,r.z);z1=Math.max(z1,r.z);w=Math.max(w,vis(q.i).cw);top=Math.max(top,vis(q.i).top)}
    // Ausdehnung längs der Bahn und quer über die Bahnen; die Kamera steht vor dem vordersten Beteiligten, damit niemand hinter ihr liegt
    const off=(x0+x1)/2-r0.x,sp=Math.max(x1-x0,(z1-z0)*.95),a=k!==shotK?1:1-Math.exp(-dt*2.5);
    regie.off+=(off-regie.off)*a;regie.cs=k!==shotK?sp:regie.cs+(sp-regie.cs)*a;regie.cz=k!==shotK?z1:regie.cz+(z1-regie.cz)*a;
    // etwas Luft nach oben, damit Startnummer, Sprechblase und Sprünge nicht oben aus dem Bild ragen
    const kk=Math.max(1.1,(regie.cs*.8+8)/(10*w)),zc=regie.cz-(z1-z0)/2;
    ax=r0.x+regie.off;px=6.5*w*kk;py=2.1*w*Math.sqrt(kk);pz=regie.cz+7.5*w*kk;tx=.5;ty=top*S*.55;tz=zc}
  else{
    // Seitenkamera auf die Führungsgruppe oder auf die Verfolger. Die Gruppenbreite ändert sich sprunghaft, wenn jemand eine Grenze kreuzt;
    // geglättet zoomt die Kamera ruhig statt zu reißen.
    let m=2,sp0;const pk=k==='pack';   // Verfolger: der Zweite und wer bis 25 m hinter ihm liegt
    if(pk){while(m<6&&srt[1]-srt[m]<=25)m++;sp0=srt[1]-srt[m-1]}else sp0=Math.max(0,lead-srt[n-1]);
    regie.sp=shotK!==k||regie.sp<0?sp0:regie.sp+(sp0-regie.sp)*(1-Math.exp(-dt*1.2));
    const sp=regie.sp,d=clamp(13+sp*.9,13,pk?40:50);ax=pk?srt[1]:lead;px=-sp/2+1.5;py=2.8+d*.12;pz=d;tx=-sp/2;ty=2.4}
  if(k!==shotK){shotK=k;regie.since=t;camP.set(px,py,pz);camT.set(tx,ty,tz)}
  else{const a=1-Math.exp(-dt*6);camP.lerp(tmpV.set(px,py,pz),a);camT.lerp(tmpV.set(tx,ty,tz),a)}
  camera.position.set(camP.x+ax,camP.y,camP.z);camera.lookAt(tmpV.set(camT.x+ax,camT.y,camT.z));
  sun.position.set(camT.x+ax-14,32,20);sun.target.position.set(camT.x+ax,0,0);sun.target.updateMatrixWorld();
  rainFx.position.x=camT.x+ax;
}
// Wer der Kamera sehr nah kommt (etwa auf einer vorderen Bahn vorbeiläuft), zeigt keine Startnummer und keine Sprechblase, sonst verdecken sie das Bild
function hideNear(){
  for(const f of fig){const near=camera.position.distanceTo(f.root.position)<7;f.lbl.visible=!near;
    if(near){for(const q in f.fx)f.fx[q].visible=false;for(const q in f.rxs)f.rxs[q].visible=false}}
}
