// Chaos-Derby – Figuren: Tiermodelle laden, Jockeys, Rakete, Animation je Bild
/* ---------- Bausteine ---------- */
const SPH=new THREE.SphereGeometry(1,20,14),CYL=new THREE.CylinderGeometry(1,1,1,14),BOX=new THREE.BoxGeometry(1,1,1),CONE=new THREE.ConeGeometry(1,1,14);
const mats={};const mat=c=>mats[c]||(mats[c]=new THREE.MeshLambertMaterial({color:c}));
function G(par,x,y,z){const g=new THREE.Group();g.position.set(x||0,y||0,z||0);if(par)par.add(g);return g}
function P(geo,col,par,x,y,z,sx,sy,sz){const m=new THREE.Mesh(geo,typeof col==='string'?mat(col):col);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;par.add(m);return m}
function canvasTex(w,h,fn){const cv=document.createElement('canvas');cv.width=w;cv.height=h;fn(cv.getContext('2d'),w,h);return new THREE.CanvasTexture(cv)}
function jockey(par,x,y,z,col,s){
  const g=G(par,x,y,z);g.scale.setScalar(s||1);
  const tr=P(SPH,col,g,.05,.3,0,.17,.3,.17);tr.rotation.z=-.5;
  P(SPH,'#f1c9a5',g,.24,.6,0,.13,.13,.13);P(SPH,col,g,.25,.66,0,.14,.09,.14);
  P(CYL,'#f4f4f4',g,.02,.02,.17,.05,.34,.05);P(CYL,'#f4f4f4',g,.02,.02,-.17,.05,.34,.05);return g}
function shell(c){const root=G(scene),spin=G(root,0,c,0),inner=G(spin,0,-c,0);root.scale.setScalar(S);return {root,spin,inner,c,ry:0,b:0,zo:0,prev:0,ch:0,sl:0,rk:0,dT:0}}

/* ---------- Die sechs Starter: Modelle mit Skelett (Quaternius, Ultimate Animated Animals, CC0) ---------- */
const WHITE={Main:'#b2b2a3',Main_Dark:'#a3a394',Main_Light:'#928f92',Hooves:'#928351',Hair:'#aca088',Muzzle:'#977c62'};
const MODELS={horse:{sc:.6,xo:-.37},alpaca:{sc:.6,xo:-.25},bull:{sc:.55,xo:-.58},husky:{sc:.5,xo:-.235},cow:{sc:.46,xo:-.485}};
const CAST=[{m:'horse'},{m:'alpaca'},{m:'bull'},{m:'husky',js:.8},{m:'horse',pal:WHITE,up:true},{m:'cow',rocket:true,js:.9}];
let UPA=1.1,UPN=-.55,NRA=-.8,NST=1.5,HDA=-.6;   // Zusatzdrehungen über das Skelett
function mkRocket(f){
  const h=f.rkH=G(f.inner,0,2.4,0),rk=G(h);rk.rotation.z=-PI/2;
  f.rocket=new THREE.MeshLambertMaterial({color:'#c9ced4'});f.cone=new THREE.MeshLambertMaterial({color:'#d2232a'});
  P(CYL,f.rocket,rk,0,0,0,.2,1.5,.2);P(CONE,f.cone,rk,0,.98,0,.2,.46,.2);
  for(let k=0;k<3;k++){const a=k*2.094;P(BOX,f.cone,rk,Math.cos(a)*.24,-.62,Math.sin(a)*.24,.26,.34,.04).rotation.y=-a}
  f.flame=G(rk,0,-.75,0);
  const fa=new THREE.Mesh(CONE,new THREE.MeshBasicMaterial({color:'#ff8a1e'}));fa.scale.set(.19,1.2,.19);fa.position.y=-.6;fa.rotation.z=PI;f.flame.add(fa);
  const fb=new THREE.Mesh(CONE,new THREE.MeshBasicMaterial({color:'#ffe066'}));fb.scale.set(.1,.7,.1);fb.position.y=-.35;fb.rotation.z=PI;f.flame.add(fb);
  f.flame.visible=false}
// Modelle liegen als glTF in models/ und werden je Datei nur einmal geladen
const modelText={};
function loadModelText(name){return modelText[name]||(modelText[name]=fetch('models/'+name+'.gltf').then(r=>{if(!r.ok)throw new Error(name);return r.text()}))}
function modelError(){$('nogl').textContent='Die Tiermodelle konnten nicht geladen werden. Die Seite muss über einen Webserver laufen, siehe README.';$('nogl').hidden=false}
function mkModel(i){
  const cfg=CAST[i],M=MODELS[cfg.m],f=shell(1.4);f.cfg=cfg;
  f.jock=jockey(f.inner,0,2.2,0,RUN[i].col,cfg.js||1.15);
  if(cfg.rocket)mkRocket(f);
  loadModelText(cfg.m).then(txt=>new THREE.GLTFLoader().parse(txt,'',g=>{
    const m=g.scene;m.scale.setScalar(M.sc);m.rotation.y=PI/2;m.position.x=M.xo;
    const conv=mm=>{const c=mm.color.clone().convertLinearToSRGB();if(cfg.pal&&cfg.pal[mm.name])c.set(cfg.pal[mm.name]);return new THREE.MeshLambertMaterial({color:c,skinning:true,side:THREE.DoubleSide})};
    m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;o.material=Array.isArray(o.material)?o.material.map(conv):conv(o.material)}});
    f.inner.add(m);f.model=m;f.mixer=new THREE.AnimationMixer(m);f.act={};
    g.animations.forEach(a=>{const ac=f.mixer.clipAction(a);ac.play();ac.setEffectiveWeight(0);f.act[a.name]=ac});
    f.bone={};['Back','Torso','Torso2','Neck1','Head'].forEach(n=>{f.bone[n]=m.getObjectByName(n)});
    if(gl&&race&&state==='idle')frame(1,0);
  },modelError)).catch(modelError);
  return f}
function poseModel(f,i,x,st,sdt){
  if(!f.model)return;
  const A=f.act,B=f.bone,idle=(state!=='run'&&t===0)||state==='cer',W={},cyc=(v,a)=>(((v%1)+1)%1)*a.getClip().duration;
  if(i===0){if(st===1)f.dT=Math.min(f.dT+sdt,A.Death.getClip().duration-.03);else if(f.b<.02)f.dT=0;A.Death.time=f.dT}
  if(i===1){if(st===3)f.dT+=sdt;else if(f.b<.02)f.dT=1;A.Eating.time=f.dT%A.Eating.getClip().duration}
  if(idle)W.Idle=1;
  else if(i===0){W.Gallop=1-f.b;W.Death=f.b}
  else if(i===1){W.Gallop=1-f.b;W.Eating=f.b}
  else if(i===2)W.Gallop=1;
  else if(i===3){W.Walk=1-f.sl;W.Gallop=f.sl}
  else if(i===4)W.Walk=1;
  else{W.Walk=1-f.rk;W.Idle=f.rk}
  if(A.Gallop)A.Gallop.time=cyc(x/GS[i],A.Gallop);if(A.Walk)A.Walk.time=cyc(x/WS[i],A.Walk);A.Idle.time=.5;
  for(const n in A)A[n].setEffectiveWeight(W[n]||0);
  // Eigene Zusatzdrehungen vom letzten Bild zurücknehmen, weil der Mixer unveränderte Werte nicht neu schreibt
  const sv=f.sv||(f.sv={});for(const q in sv){B[q].quaternion.copy(sv[q].q);B[q].scale.copy(sv[q].s)}
  f.mixer.update(0);
  for(const q of ['Torso','Neck1']){const o=sv[q]||(sv[q]={q:new THREE.Quaternion(),s:new THREE.Vector3()});o.q.copy(B[q].quaternion);o.s.copy(B[q].scale)}
  if(!idle){
    if(i===4){B.Torso.rotateX(UPA);B.Neck1.rotateX(UPN)}
    if(i===1){const kk=clamp((x-(L-90))/60,0,1)*(1-f.b);if(kk>0){B.Neck1.rotateX(NRA*kk);B.Neck1.scale.y=1+NST*kk}}
    if(i===2&&f.ch>.01)B.Neck1.rotateX(HDA*f.ch);
  }
  const up=f.cfg.up&&!idle;
  B.Torso2.getWorldPosition(tmpV);f.inner.worldToLocal(tmpV);f.jock.position.copy(tmpV);
  if(up){f.jock.rotation.z=1.1;f.jock.position.x-=.5;f.jock.position.y-=.1}else{f.jock.rotation.z=0;f.jock.position.y+=.22;f.jock.position.x-=.25}
  if(f.rkH){B.Back.getWorldPosition(tmpV);f.inner.worldToLocal(tmpV);f.rkH.position.set(tmpV.x+.55,tmpV.y+.62,0);f.jock.position.set(tmpV.x+.45,tmpV.y+.82,0)}
}
function label(f,i){
  const d=RUN[i];
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:canvasTex(128,128,(c)=>{c.fillStyle=d.col;c.beginPath();c.arc(64,64,54,0,7);c.fill();c.lineWidth=9;c.strokeStyle='#fff';c.stroke();
    c.fillStyle=d.ink;c.font='70px "Dela Gothic One","Arial Black",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(d.nr,64,70)}),depthTest:false}));
  s.scale.set(.85,.85,1);s.position.set(0,TOPY[i],0);s.renderOrder=5;f.root.add(s);
  f.fx={};[[1,'Zzz'],[3,'mampf'],[7,'?!'],[2,'✶ ✶']].forEach(q=>{
    const e=new THREE.Sprite(new THREE.SpriteMaterial({map:canvasTex(256,96,(c)=>{c.font='56px "Dela Gothic One","Arial Black",sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=10;c.strokeStyle='#17231a';c.strokeText(q[1],128,50);c.fillStyle='#fff';c.fillText(q[1],128,50)}),depthTest:false}));
    e.scale.set(1.9,.7,1);e.position.set(1.3,TOPY[i]+.05,0);e.renderOrder=5;e.visible=false;f.root.add(e);f.fx[q[0]]=e})}

/* ---------- Animation je Bild ---------- */
function pose(i,x,st,rain,dt,sdt){
  const f=fig[i],k=Math.min(1,dt*8);
  f.b+=((st===1||st===3?1:0)-f.b)*k;f.ch+=((st===4?1:0)-f.ch)*k;f.sl+=((i===3&&rain?1:0)-f.sl)*k;f.rk+=((st===6?1:0)-f.rk)*k;
  f.ry+=((st===7?PI:0)-f.ry)*Math.min(1,dt*9);f.root.rotation.y=f.ry;
  f.zo+=((i===2&&st===4?Math.sin(t*2.3)*4:0)-f.zo)*Math.min(1,dt*4);
  const wx=x+(i===1?2:0)-FRONT[i]*S,wz=laneZ(i)+f.zo;
  f.root.position.set(wx,0,wz);
  if(st===2){f.spin.rotation.z-=sdt*10;f.spin.position.y=f.c+Math.abs(Math.sin(t*5))*1.3}
  else{f.spin.rotation.z=0;f.spin.position.y=f.c}
  for(const q in f.fx)f.fx[q].visible=(+q===st);
  poseModel(f,i,x,st,sdt);
  if(i===2&&st===4&&Math.random()<sdt*40)emit(wx-2-Math.random()*2,.4,wz+Math.random()*2-1,-3,1.5,0,.9,1.3,'#d6c8a0');
  if(i===3&&rain&&Math.random()<sdt*45)emit(wx-1,.25,wz+Math.random()-.5,-5,2+Math.random()*2,Math.random()*2-1,.5,.4,'#ffffff');
  if(i===5){
    f.inner.rotation.z=f.rk*.12;f.inner.position.y=-f.c+f.rk*.5;
    f.flame.visible=st===6;
    if(st===6){f.flame.scale.y=.8+Math.random()*.6;
      if(Math.random()<sdt*60)emit(wx-1.6,3.2,wz,-9-Math.random()*5,Math.random()*1.5,Math.random()*2-1,.8,1.1,Math.random()<.3?'#ffb347':'#e8e8e8')}
    if(f.prev===6&&st===2){f.rocket.color.set('#3a3a3a');f.cone.color.set('#222222');
      for(let q=0;q<26;q++)emit(wx+1,3,wz,Math.random()*10-5,Math.random()*8,Math.random()*10-5,1.1,1.8,q%3?'#444444':'#ff8a1e')}
  }
  f.prev=st;
}
