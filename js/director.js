// Chaos-Derby – Kameraregie: Startfahrt, Seitenkamera, Schnitte auf Ereignisse, Zieleinlauf
function direct(xs,dt){
  // Kamera wird relativ zu einem mitlaufenden Ankerpunkt geführt, damit schnelle Starter im Bild bleiben
  const srt=[...xs].sort((a,b)=>b-a),lead=Math.min(srt[0],L+6),wt=race.winT;
  let tail=lead;for(let q=1;q<6&&srt[0]-srt[q]<=38;q++)tail=srt[q];   // Führungsgruppe: alle, die mit dem Ersten ins Bild passen
  let k,ax=0,px,py,pz,tx,ty,tz=0;
  if(t<2.6){k='start';ax=lead;px=13;py=2.1;pz=9.5;tx=-3;ty=1.7}
  else if(t>wt+1.6){k='post';px=L+9;py=6;pz=27;tx=L-12;ty=1}
  else if(lead>=L-32){k='fin';px=L+2;py=2.4;pz=21;tx=L-3.5;ty=2}
  else if(cut&&t<cut.until){const i=cut.i,r=fig[i].root.position,w=[1,1.1,1.3,.75,1.3,1.2][i];k='cut'+cut.until;ax=r.x;px=6.5*w;py=1.9*w;pz=r.z+7.5*w;tx=.5;ty=TOPY[i]*S*.42;tz=r.z}
  else{k='side';const sp=Math.max(0,lead-tail),d=clamp(13+sp*.9,13,50);ax=lead;px=-sp/2+1.5;py=2.8+d*.12;pz=d;tx=-sp/2;ty=2.4}
  if(k!==shotK){shotK=k;camP.set(px,py,pz);camT.set(tx,ty,tz)}
  else{const a=1-Math.exp(-dt*6);camP.lerp(tmpV.set(px,py,pz),a);camT.lerp(tmpV.set(tx,ty,tz),a)}
  camera.position.set(camP.x+ax,camP.y,camP.z);camera.lookAt(tmpV.set(camT.x+ax,camT.y,camT.z));
  sun.position.set(camT.x+ax-14,32,20);sun.target.position.set(camT.x+ax,0,0);sun.target.updateMatrixWorld();
  rainFx.position.x=camT.x+ax;
}
