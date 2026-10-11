// Chaos-Derby – Vorstellung der Starter, solange das Wettbüro offen ist: Die Kamera fährt in einer Endlosschleife von Starter zu Starter,
// jeder tritt aus der Reihe, zeigt in einer kurzen Szene seine Eigenheit und geht wieder zurück. Danach eine Totale aufs ganze Feld.
// Liest nur Feld, Darstellungswerte und Quoten; endet mit dem Start des Rennens (reset ruft paradeStop).
const SEG=6.2,TOTAL=4,STEP=5;   // Dauer je Starter und der Totale in s; so weit tritt der vorgestellte Starter vor (m)
let pt=0,paraAnn=null,paraCur=-2,pTex={};
const ease=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const win=(g,a,b,r)=>ease((g-a)/r)*(1-ease((g-b)/r));   // weich ein- und ausgeblendet zwischen a und b, Rampe r
const wav=(g,f)=>Math.sin(g*f);

// Textblase neben dem Kopf, je Text eine Textur
function paraTxt(f,s){
  if(!f.pTxt){f.pTxt=new THREE.Sprite(new THREE.SpriteMaterial({depthTest:false}));f.pTxt.scale.set(1.6,.58,1);f.pTxt.renderOrder=6;f.root.add(f.pTxt)}
  const e=f.pTxt;e.visible=!!s;if(!s)return;
  if(e.userData.s!==s){e.userData.s=s;e.material.map=pTex[s]||(pTex[s]=canvasTex(288,104,c=>{c.font='54px "Dela Gothic One","Arial Black",sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=11;c.strokeStyle='#17231a';c.strokeText(s,144,54);c.fillStyle='#fff';c.fillText(s,144,54)}));e.material.needsUpdate=true}
  e.position.set(.4,f.V.top*.78,-1.7)}   // neben dem Kopf, von der Kamera aus rechts

/* ---------- Szenen je Starter ----------
   g: Sekunden seit Beginn der Szene. o sammelt, was die Szene verlangt:
   W Gewichte der Animationen, T Zeitpunkt je Animation (sonst läuft sie in Echtzeit), x zusätzlicher Schritt nach vorn,
   y Höhe, rz Kippen nach vorn/hinten, ry Drehung um die Hochachse, dz seitlich, s Text, b(B) Knochen nach dem Mixer drehen, up aufrecht */
const GAG={
  // schläft im Stehen ein, kippt um und schreckt hoch
  pferd(f,g,o,A){const d=A.Death.getClip().duration-.03;
    if(g<.9){o.s='Gähn…';o.b=B=>B.Neck1.rotateX(.55*win(g,0,.9,.25))}
    else if(g<3){o.W={Death:1};o.T.Death=Math.min(d,(g-.9)*1.4);o.s='Zzz'}
    else{o.W={Death:1-ease((g-3)/.25)};o.T.Death=d*(1-ease((g-3)/.25));o.y=Math.sin(clamp((g-3)/.45,0,1)*PI)*.7;o.s='?!'}},
  // Hals ganz lang machen, rundum gucken, dann fressen
  alpaka(f,g,o){const k=win(g,.2,2.6,.45);o.s=g<2.6?'Guck mal!':'mampf';
    if(g>2.6){o.W={Eating:1};o.T.Eating=(g-2.6)%f.act.Eating.getClip().duration}
    o.b=B=>{B.Neck1.rotateX(NRA*.6*k);B.Neck1.scale.y=1+.8*k;B.Neck1.rotateZ(wav(g,3)*.3*k)}},
  // scharrt, schnaubt und prescht kurz los
  stier(f,g,o){const k=win(g,.2,3.4,.3);o.rz=wav(g,9)*.04*k;o.s=g<2.4?'Schnaub!':'Platz da!';
    o.b=B=>B.Neck1.rotateX(HDA*1.2*k);
    if(g>2.4&&g<3.4){const u=(g-2.4)/1;o.x=Math.sin(u*PI)*1.8;o.W={Gallop:1};o.T.Gallop=u*.8}
    if(Math.random()<.5)o.dust=1},
  // hängt lustlos herum, bis eine Regenwolke kommt, dann Freudensprünge
  husky(f,g,o){const rain=g>1.4;o.s=rain?'Regen!':'…';o.cloud=g>1&&g<3.9;
    o.b=B=>{B.Neck1.rotateX(-.45*(1-ease((g-1.4)/.3)));if(B.Tail1)B.Tail1.rotateY(rain?wav(g,22)*.7:0)};
    if(rain)o.y=Math.abs(Math.sin((g-1.4)*7))*.45},
  // richtet sich auf, winkt und dreht eine Pirouette
  aufrecht(f,g,o){const k=win(g,.1,3.7,.35);o.up=k>.5;o.s=g<2.2?'Hallo!':'Tadaa!';
    if(g>2.2&&g<3.2)o.ry=ease(g-2.2)*2*PI;
    o.b=B=>{B.Torso.rotateX(UPA*k);B.Neck1.rotateX(UPN*k);if(!f.ikRel||!o.up)return;
      for(let q=0;q<2;q++){const wave=q===0&&g<2.2,up=wave?-1.1+wav(g,10)*.35:ARM.up,lo=wave?-1.4+wav(g,10)*.45:ARM.lo;
        aimBone(B[FL[2*q]],f,up);aimBone(B[FL[2*q+1]],f,lo);followBone(B[FIK[q]],B[FL[2*q+1]],f.ikRel[q])}}},
  // Probezündung: Die Rakete stottert, die Kuh hüpft, dann eine Rußwolke
  kuh(f,g,o){const on=g>.5&&g<2.6;o.flame=on&&Math.random()<.7;o.s=g<.5?'3, 2, 1 …':on?'Brumm!':'Pfft …';
    if(on){o.y=Math.abs(Math.sin((g-.5)*9))*.35;o.rz=.08}
    if(g>2.6&&!f.pPuff){f.pPuff=1;o.puff=1}},
  // schüttelt den Kopf und keilt aus
  esel(f,g,o){o.s='Nö!';
    o.b=B=>B.Neck1.rotateZ(wav(g,14)*.5*win(g,.1,1.8,.2));
    if(g>2&&g<3.4)o.rz=-Math.sin((g-2)%.7/.7*PI)*.35},
  // Salto aus dem Stand
  hirsch(f,g,o,A){o.s=g<.6?'Achtung …':'Salto!';
    if(g>.6&&g<1.8){const u=(g-.6)/1.2;o.y=Math.sin(u*PI)*3;o.rz=ease(u)*2*PI;o.W={Gallop_Jump:1};o.T.Gallop_Jump=u*A.Gallop_Jump.getClip().duration}
    if(g>1.8)o.b=B=>B.Neck1.rotateX(.4*win(g,1.8,3.8,.3))},
  // ein Knall, das Reh springt hoch und erstarrt zitternd
  reh(f,g,o){if(g<.8){o.s='';return}
    o.s='!!';o.y=Math.sin(clamp((g-.8)/.35,0,1)*PI)*.8;o.dz=(Math.random()-.5)*.08*win(g,1.1,3.6,.2);o.T.Idle=.5;
    o.b=B=>B.Neck1.rotateX(.35*win(g,.8,3.6,.15))},
  // duckt sich, schaut sich verschlagen um und schleicht ein Stück
  fuchs(f,g,o){const k=win(g,.1,3.6,.3);o.y=-.2*k;o.s='Hehe …';
    o.b=B=>{B.Neck1.rotateX(-.25*k);B.Neck1.rotateZ(Math.sin(g*2.4)*.5*k);if(B.Tail1)B.Tail1.rotateY(wav(g,5)*.5)};
    if(g>2&&g<3.6){const u=(g-2)/1.6;o.x=Math.sin(u*PI)*1.2;o.W={Gallop:1};o.T.Gallop=u*.6}},
  // heult in den Himmel, dann ein Satz auf die Kamera zu
  wolf(f,g,o){o.s=g<2.4?'Auuu!':'Grrr!';
    o.b=B=>{B.Neck1.rotateX(.95*win(g,.2,2.3,.3));if(g>2.4)B.Neck1.rotateX(-.3*win(g,2.4,3.8,.2))};
    if(g>2.5&&g<3.3){const u=(g-2.5)/.8;o.x=Math.sin(u*PI)*1.3;o.W={Gallop:1};o.T.Gallop=u*.7}},
  // schnüffelt, dann rennt er Kreise
  shiba(f,g,o){
    if(g<1.5){o.s='schnüff';o.W={Eating:1};o.T.Eating=g%f.act.Eating.getClip().duration;return}
    const u=g-1.5,a=u*5.2,k=win(g,1.5,3.9,.3);o.s='Zoomies!';
    o.x=Math.sin(a)*k;o.dz=(1-Math.cos(a))*.9*k;o.ry=-a*k;o.W={Gallop:1};o.T.Gallop=(u*2.2)%1;o.dust=k}
};

/* ---------- Ablauf ---------- */
function paradeStart(){
  if(!gl)return;cancelAnimationFrame(raf);paraOn=true;pt=0;paraFrame.go=0;paraAnn=new Set();paraCur=-2;
  $('strip').hidden=true;sfx.music('calm');last=performance.now();raf=requestAnimationFrame(paraTick)}
function paradeStop(){
  if(!paraOn)return;paraOn=false;$('intro').classList.remove('on');$('strip').hidden=false;
  fig.forEach(f=>{f.inner.rotation.set(0,0,0);f.inner.position.set(0,-f.c,0);f.spin.rotation.set(0,0,0);f.spin.position.set(0,f.c,0);f.root.rotation.set(0,0,0);
    if(f.pTxt)f.pTxt.visible=false;f.lbl.visible=true;if(f.flame)f.flame.visible=false;f.pPuff=0})}
function paraTick(now){const dt=clamp((now-last)/1000,0,.1);last=now;paraFrame(dt);raf=requestAnimationFrame(paraTick)}
// Wer gerade dran ist: Bahn 0…5 oder -1 für die Totale; g: Sekunden seit Beginn des Abschnitts
function paraWho(){const n=fig.length,c=pt%(n*SEG+TOTAL);return c<n*SEG?{i:Math.floor(c/SEG),g:c%SEG}:{i:-1,g:c-n*SEG}}
function paraFrame(dt){
  pt+=dt;const {i:cur,g}=paraWho();
  if(cur!==paraCur){paraCur=cur;fig.forEach(f=>{f.pPuff=0});paraCard(cur)}
  fig.forEach((f,i)=>paraPose(f,i,i===cur?g:-1,dt));
  stepParts(dt);
  // Kamera: vor dem vorgestellten Starter, leicht seitlich, mit langsamem Schwenk; in der Totale von schräg vorn aufs Feld
  let px,py,pz,tx,ty,tz;
  if(cur>=0){const f=fig[cur],r=f.root.position,h=f.V.top*S,a=.14+.16*Math.sin(g/SEG*PI-PI/2),R=Math.max(6,h*1.7+1.5);
    tx=r.x+.4;ty=h*.5;tz=laneZ(cur);px=tx+Math.cos(a)*R;py=ty+R*.1;pz=tz+Math.sin(a)*R}
  else{const a=.62+.18*Math.sin(g/TOTAL*PI-PI/2);tx=-1.5;ty=1.6;tz=0;px=tx+Math.cos(a)*24;py=4.2;pz=Math.sin(a)*24}
  if(!paraFrame.go){paraFrame.go=1;camP.set(px,py,pz);camT.set(tx,ty,tz)}
  else{const k=1-Math.exp(-dt*2.6);camP.lerp(tmpV.set(px,py,pz),k);camT.lerp(tmpV.set(tx,ty,tz),k)}
  camera.position.copy(camP);camera.lookAt(camT);
  // Licht von vorn, damit die Gesichter nicht im Schatten liegen
  sun.position.set(camT.x+18,32,22);sun.target.position.copy(camT);sun.target.updateMatrixWorld();
  renderer.render(scene,camera);
}
// Einblendung unten links: Startnummer, Name, Eigenheit, Siegquote; dazu sagt der Sprecher beim ersten Durchgang den Namen
function paraCard(i){
  const e=$('intro');
  if(i<0){e.classList.remove('on');return}
  const d=RUN[i];
  $('inr').textContent=d.nr;$('inr').style.background=d.col;$('inr').style.color=d.ink;
  $('ikind').textContent='Nr. '+d.nr+' · '+d.kind;$('iname').textContent=d.name;$('itrait').textContent=d.trait+'.';
  $('iq').textContent=Q?fmtQ(Q.win[i]):'…';
  e.classList.remove('on');void e.offsetWidth;e.classList.add('on');
  if(!paraAnn.has(d.nr)&&voice.announce(ROSTER.indexOf(d),'Nummer '+d.nr+', '+d.name+'.'))paraAnn.add(d.nr);
}
// Quoten kommen erst einige Sekunden nach dem Auslosen: Einblendung nachziehen
function paraQuotes(){if(paraOn&&paraCur>=0)$('iq').textContent=Q?fmtQ(Q.win[paraCur]):'…'}
function paraPose(f,i,g,dt){
  const V=f.V,o={W:null,T:{},x:0,y:0,rz:0,ry:0,dz:0,s:'',b:null,up:false};
  let step=0;
  if(g<0)f.pgg=-9;
  if(g>=0){
    // vortreten (bis 1,1 s), Szene, zurückgehen (ab SEG-1,1 s), dabei Schritt- oder Galoppbewegung
    const fw=ease((g-.15)/.95),bk=ease((g-(SEG-1.1))/.9);step=STEP*(fw-bk);
    const gg=g-1.1;
    if(f.model&&gg>=0&&g<SEG-1.1&&GAG[f.id])GAG[f.id](f,gg,o,f.act);
    // Geräusche der Szene, jedes genau einmal, wenn sein Zeitpunkt erreicht ist
    for(const [ts,n,a] of sfx.scene(f.id))if(f.pgg<ts&&gg>=ts)sfx.play(n,0,a);
    f.pgg=gg;
    if((fw>0&&fw<1)||(bk>0&&bk<1)){const c=f.act&&(f.act.Walk?'Walk':'Gallop');if(c){o.W={[c]:1};o.T[c]=(((step/(c==='Walk'?V.ws:V.gs))%1)+1)%1*f.act[c].getClip().duration}}
  }
  const r=f.root;
  r.position.set(step+o.x+(f.id==='alpaka'?2:0)-V.front*S,0,laneZ(i)+o.dz);r.rotation.y=o.ry;
  f.spin.position.set(0,f.c+o.y,0);f.spin.rotation.z=o.rz;
  for(const q in f.fx)f.fx[q].visible=false;
  f.lbl.visible=g<0;   // die Nummer steht beim Vorgestellten schon in der Bauchbinde
  paraTxt(f,g>=0?o.s:'');
  if(f.flame){f.flame.visible=!!o.flame;if(o.flame)f.flame.scale.y=.8+Math.random()*.6}
  const wx=r.position.x,wz=r.position.z;
  if(o.dust&&Math.random()<dt*30*o.dust)emit(wx-1,.3,wz+Math.random()-.5,-2,1.2,Math.random()-.5,.6,.7,'#d6c8a0');
  if(f.flame&&o.flame&&Math.random()<dt*40)emit(wx-1.8,3.2,wz,-6-Math.random()*3,Math.random(),Math.random()-.5,.7,.9,'#e8e8e8');
  if(o.puff)for(let q=0;q<18;q++)emit(wx-1.4,3.2,wz,Math.random()*4-3,Math.random()*3,Math.random()*3-1.5,1.2,1.4,q%3?'#555555':'#ff8a1e',.7);
  if(o.cloud){const h=V.top*S*.85+.3;if(Math.random()<dt*45)emit(wx+.6+Math.random()*2-1,h+Math.random()*.4,wz+Math.random()-.5,0,0,0,.6,1.9,'#6b7681',.95);
    if(Math.random()<dt*50)emit(wx+.6+Math.random()*1.8-.9,h-.3,wz+Math.random()*.8-.4,0,-7,0,.35,.18,'#cfe8ff',.9)}
  if(!f.model)return;
  // Animationen mischen; wer gerade nichts vorhat, steht und atmet (Ruheanimation läuft weiter, je Starter versetzt)
  const A=f.act,W=o.W||{Idle:1};
  boneReset(f);
  for(const n in A){A[n].setEffectiveWeight(W[n]||0);if(W[n])A[n].time=n in o.T?o.T[n]:(pt*.8+i*.37)%A[n].getClip().duration}
  f.mixer.update(0);
  boneSave(f,f.id==='aufrecht'?['Torso','Neck1','Neck2','Head','Tail1',...FL,...FIK]:['Torso','Neck1','Neck2','Head','Tail1']);
  if(o.b)o.b(f.bone);
  seatJockey(f,o.up);
}
