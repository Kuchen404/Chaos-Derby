// Chaos-Derby – Kameraregie: Startfahrt, Seitenkamera, Verfolger, Schnitte auf Ereignisse, Zieleinlauf
const regie={sp:-1,alone:-1,since:0,cutI:0};   // geglättete Gruppenbreite; seit wann der Erste allein vorn liegt; Beginn der laufenden Einstellung
const HOLD=1.5,NEAR=L-70;   // Mindestdauer einer Einstellung in s; ab hier bleibt die Einstellung bis zur Zielkamera stehen
function direct(xs,dt){
  // Kamera wird relativ zu einem mitlaufenden Ankerpunkt geführt, damit schnelle Starter im Bild bleiben
  const srt=[...xs].sort((a,b)=>b-a),lead=Math.min(srt[0],L+6),wt=race.winT;
  let n=1;while(n<6&&srt[0]-srt[n]<=38)n++;   // Führungsgruppe: alle, die mit dem Ersten ins Bild passen
  // Liegt der Erste lange allein vorn, zeigt die Regie im Wechsel auch die Verfolger: 4 s Führung, dann 3 s Verfolger
  if(n===1&&lead<L-150){if(regie.alone<0)regie.alone=t}else regie.alone=-1;
  const pack=regie.alone>=0&&t-regie.alone>4&&(t-regie.alone-4)%7<3;
  // Welche Einstellung? Ziel und Nachspann haben Vorrang; sonst läuft jede Einstellung mindestens HOLD Sekunden, damit nichts aufblitzt
  const cur=shotK.replace(/[\d.]+$/,'');
  let k=t<2.6?'start':t>wt+1.6?'post':lead>=L-32?'fin':cut&&t<cut.until&&(cur==='cut'||lead<NEAR)?'cut'+cut.until:pack?'pack':'side';
  if(k!=='start'&&k!=='post'&&k!=='fin'&&k!==shotK&&(cur==='cut'||cur==='pack'||cur==='side')&&(t-regie.since<HOLD||lead>=NEAR))k=shotK;
  if(k.startsWith('cut')&&cut&&k==='cut'+cut.until)regie.cutI=cut.i;
  let ax=0,px,py,pz,tx,ty,tz=0;
  if(k==='start'){ax=lead;px=13;py=2.1;pz=9.5;tx=-3;ty=1.7}
  else if(k==='post'){px=L+9;py=6;pz=27;tx=L-12;ty=1}
  else if(k==='fin'){px=L+2;py=2.4;pz=21;tx=L-3.5;ty=2}
  else if(k.startsWith('cut')){const i=regie.cutI,r=fig[i].root.position,w=[1,1.1,1.6,.9,1.3,1.2][i];ax=r.x;px=6.5*w;py=1.9*w;pz=r.z+7.5*w;tx=.5;ty=TOPY[i]*S*.42;tz=r.z}
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
