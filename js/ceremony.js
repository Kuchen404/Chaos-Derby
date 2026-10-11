// Chaos-Derby – Zielfoto im Moment des Siegs und Siegerehrung auf dem Podest nach dem Rennen
let podium,photoCam,photoTaken=false,ct=0;
const PODX=L+70,PH=[1.8,1.2,.8],PX=[0,-3.6,3.6];            // Podest hinter dem Ziel: Höhe und Lage der Stufen für Platz 1 bis 3
const REST=[[-7.8,1.2],[-11.2,-.8],[-14.6,1.2]];          // Plätze 4 bis 6 stehen links daneben im Gras
const CONF=['#d2232a','#f2b600','#2f6fb8','#12a08f','#8e44ad','#e0559b','#ffffff'];

/* ---------- Bauten ---------- */
function buildPodium(){
  podium=G(scene,PODX,0,0);podium.visible=false;
  const plate=['#e3b521','#b9c0c6','#c07a3e'];
  PH.forEach((h,k)=>{
    const b=P(BOX,'#f4f4f4',podium,PX[k],h/2,0,3.2,h,3.4);b.receiveShadow=true;
    const ph=Math.min(h*.8,1.1),f=new THREE.Mesh(new THREE.PlaneGeometry(ph*1.6,ph),new THREE.MeshBasicMaterial({map:canvasTex(160,100,c=>{
      c.fillStyle=plate[k];c.fillRect(0,0,160,100);c.fillStyle='#17231a';c.font='70px "Dela Gothic One","Arial Black",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(k+1,80,56)})}));
    f.position.set(PX[k],h/2,1.71);podium.add(f)});
  // Wand mit Schriftzug hinter dem Podest
  const w=new THREE.Mesh(new THREE.PlaneGeometry(16,2.6),new THREE.MeshBasicMaterial({map:canvasTex(512,84,c=>{
    c.fillStyle='#d2232a';c.fillRect(0,0,512,84);c.fillStyle='#fff';c.font='46px "Dela Gothic One","Arial Black",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('SIEGEREHRUNG',256,46)})}));
  w.position.set(0,6.2,-5);podium.add(w);
  [-7.6,7.6].forEach(x=>P(CYL,'#f4f4f4',podium,x,3.6,-5.05,.12,7.2,.12));
  // Zielkamera: steht genau auf der Höhe der Ziellinie, die Linie erscheint dadurch senkrecht in der Bildmitte
  photoCam=new THREE.PerspectiveCamera(16,16/9,1,300);photoCam.position.set(L,3,34);photoCam.lookAt(L,2,0);
}

/* ---------- Zielfoto ---------- */
const clock=s=>Math.floor(s/60)+':'+(s%60).toFixed(2).padStart(5,'0').replace('.',',');
function margin(d){return d<.3?'einer Nasenlänge':d<1?'einer Kopflänge':d<2?'einer Halslänge':d<3.5?'einer Länge':Math.round(d/2.5)+' Längen'}
function snapPhoto(){
  photoTaken=true;
  const o=race.order,w=race.winT,{A,xs}=posAt(w);
  xs.forEach((x,i)=>pose(i,x,A.s[i],A.rain,0,0));
  renderer.render(scene,photoCam);
  const cv=$('photo'),c=cv.getContext('2d'),W=cv.width,H=cv.height;
  c.filter='sepia(.5) contrast(1.15)';c.drawImage(renderer.domElement,0,0,W,H);c.filter='none';
  c.fillStyle='rgba(255,255,255,.9)';c.fillRect(W/2-1,0,2,H);
  c.font='500 20px "DM Mono",ui-monospace,monospace';c.textBaseline='top';
  const lbl=clock(w);c.fillStyle='rgba(16,25,15,.8)';c.fillRect(10,10,c.measureText(lbl).width+20,32);c.fillStyle='#ffc233';c.fillText(lbl,20,16);
  const d=L-(xs[o[1]]+nose(RUN[o[1]],xs[o[1]]));
  $('photocap').textContent=RUN[o[0]].name+' gewinnt mit '+margin(d)+' vor '+RUN[o[1]].name+'.';
}

/* ---------- Siegerehrung ---------- */
function startCeremony(){
  state='cer';ct=0;sfx.music('fanfare');sfx.rain(false);podium.visible=true;rainFx.visible=false;frame.w=0;$('strip').hidden=true;
  bgc.copy(SKY);scene.fog.color.copy(bgc);sun.intensity=.7;hemi.intensity=.8;
  fig.forEach(f=>{f.spin.rotation.z=0;f.spin.rotation.x=0;f.lie=0;f.fT=0;f.spin.position.y=f.c;for(const q in f.fx)f.fx[q].visible=false});
  fig.forEach(k=>{if(k.flame){k.inner.rotation.z=0;k.inner.position.y=-k.c;k.flame.visible=false}});
  const o=race.order,fin=race.fin,w=fin[o[0]];
  $('podl').innerHTML=o.map((i,k)=>{const d=RUN[i],tm=fin[i]<0?'nicht im Ziel':k?'+'+(fin[i]-w).toFixed(2).replace('.',',')+' s':clock(w);
    return '<li'+(k<3?' class="top"':'')+'><span class="rk">'+(k+1)+'.</span><span class="nr" style="background:'+d.col+';color:'+d.ink+'">'+d.nr+'</span><span class="nm">'+d.name+'</span><span class="tm">'+tm+'</span></li>'}).join('');
  $('photobox').hidden=!photoTaken;$('cer').hidden=false;
  $('cap').textContent='Siegerehrung: '+RUN[o[0]].name+' vor '+RUN[o[1]].name+' und '+RUN[o[2]].name+'.';
  last=performance.now();raf=requestAnimationFrame(cerTick);
}
function endCeremony(){photoTaken=false;$('cer').hidden=true;$('strip').hidden=false;if(podium)podium.visible=false}
function cerTick(now){const dt=clamp((now-last)/1000,0,.1);last=now;voice.update(dt);cerFrame(dt);raf=requestAnimationFrame(cerTick)}
function cerFrame(dt){
  ct+=dt;
  race.order.forEach((i,k)=>{const f=fig[i],r=f.root;
    if(k<3)r.position.set(PODX+PX[k],PH[k]+(k===0?Math.abs(Math.sin(ct*3.2))*.35:0),0);
    else r.position.set(PODX+REST[k-3][0],0,REST[k-3][1]);
    f.ry=r.rotation.y=-1.15;poseModel(f,i,0,0,dt)});
  if(ct<6&&Math.random()<dt*50){const r=Math.random;emit(PODX+r()*12-6,9+r()*2,r()*6-3,r()-.5,-1.6-r(),r()-.5,4,.3,CONF[(r()*CONF.length)|0],.95)}
  stepParts(dt);
  // Kamera fährt heran und pendelt dann langsam; auf breiten Bildern rückt das Podest nach links, rechts steht die Ergebnistafel
  const R=21+12*Math.exp(-ct*.8),a=-.2+.14*Math.sin(ct*.22),sd=matchMedia('(min-width:860px)').matches?R*.17:-3;
  camera.position.set(PODX+Math.sin(a)*R+sd,3+R*.14,Math.cos(a)*R);camera.lookAt(tmpV.set(PODX+sd,2.8,0));
  sun.position.set(PODX-14,32,20);sun.target.position.set(PODX,0,0);sun.target.updateMatrixWorld();
  renderer.render(scene,camera);
}
