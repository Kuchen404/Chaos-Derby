// Chaos-Derby – Absurditäten im Bild: Trampolin, Bananenschale, Entenfamilie, Flitzer und Zuschauer mit Snack.
// Die Simulation legt alles in race.props ab (Ort, Bahn, Zeiten, Ausgang); hier wird es nur nach der Rennzeit t gezeigt.
let propG=null;
const SKIN='#f1c9a5';
// Ein Mensch aus Grundformen, etwa 1,8 m groß, Blick in +x. Beine und Arme hängen an Gelenken, damit er laufen und winken kann
function mkPerson(top,legs){
  const g=G(null),body=G(g);
  const leg=z=>{const h=G(body,0,.9,z);P(CYL,legs===SKIN?SKIN:legs,h,0,-.45,0,.09,.9,.09);P(BOX,'#3a3a3a',h,.06,-.88,0,.24,.08,.12);return h};
  const arm=z=>{const h=G(body,0,1.45,z);P(CYL,top===SKIN?SKIN:top,h,0,-.3,0,.06,.6,.06);P(SPH,SKIN,h,0,-.62,0,.07,.07,.07);return h};
  g.legs=[leg(.11),leg(-.11)];g.arms=[arm(.27),arm(-.27)];
  P(SPH,top,body,0,1.17,0,.2,.34,.24);P(SPH,SKIN,body,0,1.66,0,.15,.16,.15);P(SPH,'#5a3a22',body,-.02,1.74,0,.15,.08,.15);
  g.body=body;return g}
// Laufen: Beine und Arme schwingen gegenläufig; up: Arme jubelnd nach oben
function walkPerson(g,ph,up){const s=Math.sin(ph);g.legs[0].rotation.z=.7*s;g.legs[1].rotation.z=-.7*s;
  g.arms.forEach((a,k)=>{a.rotation.z=up?0:-.6*(k?-s:s);a.rotation.x=up?(k?-1:1)*(2.6+.25*Math.sin(ph*1.5)):0});g.body.position.y=Math.abs(Math.cos(ph))*.08}
function mkDuck(c,sc){const g=G(null);g.scale.setScalar(sc);
  P(SPH,c,g,0,.28,0,.3,.2,.2);P(SPH,c,g,.24,.5,0,.13,.13,.13);P(CONE,'#ff8a1e',g,.4,.48,0,.06,.16,.05).rotation.z=-PI/2;
  P(SPH,'#17231a',g,.31,.54,.09,.025,.025,.025);P(SPH,'#17231a',g,.31,.54,-.09,.025,.025,.025);
  g.wings=[P(SPH,c,g,-.02,.32,.18,.18,.08,.06),P(SPH,c,g,-.02,.32,-.18,.18,.08,.06)];return g}
function mkTramp(){const g=G(null);
  const m=G(g,0,.5,0);P(CYL,'#1d1d22',m,0,0,0,1,.05,1);g.mat=m;
  const r=new THREE.Mesh(new THREE.TorusGeometry(1.05,.08,8,32),mat('#2f6fb8'));r.rotation.x=PI/2;r.position.y=.52;r.castShadow=true;g.add(r);
  for(let k=0;k<4;k++){const a=k*PI/2+PI/4;P(CYL,'#9aa0a6',g,Math.cos(a),.25,Math.sin(a),.04,.5,.04)}
  return g}
function mkBanana(){const g=G(null);
  const b=new THREE.Mesh(new THREE.TorusGeometry(.32,.075,8,14,PI*.9),mat('#ffd23a'));b.rotation.x=-PI/2;b.castShadow=true;g.add(b);
  P(SPH,'#5a3a22',g,.32,0,0,.05,.05,.05);return g}
// Zuschauer mit Möhre oder Wurst: steht an der hinteren Bande und hält den Arm über die Bahn
function mkFan(food){const g=mkPerson(['#2f6fb8','#d2232a','#f2b600'][Math.floor(Math.random()*3)],'#33415c');
  const h=g.arms[0];h.rotation.x=0;h.rotation.z=1.5;   // Arm nach vorn, also über die Bande
  const f=G(h,0,-.72,0);
  if(food==='carrot'){P(CONE,'#ff7a1a',f,0,-.2,0,.07,.4,.07).rotation.z=PI;P(CONE,'#3f9a4b',f,0,.05,0,.06,.15,.06)}
  else P(CYL,'#8a3b22',f,0,-.15,0,.06,.36,.06);
  g.food=f;return g}

// Baut die Dinge des aktuellen Rennens neu auf (bei jedem reset)
function propsReset(){
  if(!gl)return;
  if(propG)scene.remove(propG);
  propG=G(scene);
  for(const q of race.props||[]){
    if(q.k==='tramp')q.g=mkTramp();
    else if(q.k==='banana')q.g=mkBanana();
    else if(q.k==='ducks'){q.g=G(null);q.d=[mkDuck('#f4f4f4',1.9),...[0,1,2,3].map(()=>mkDuck('#ffd23a',1.1))];q.d.forEach(d=>q.g.add(d))}
    else if(q.k==='streak'){q.g=mkPerson(SKIN,SKIN);P(CYL,'#d2232a',q.g.body,0,.92,0,.21,.2,.21)}   // nur in Badehose
    else if(q.k==='snack')q.g=mkFan(q.food);
    q.g.visible=false;propG.add(q.g)}
}
// Bogenflug aus dem Bild: u 0…1, von (x,z) nach außen; dient für alles, was weggeschleudert wird
function flyOff(g,x,z,u,hy,dz){g.position.set(x+4*u,hy*Math.sin(PI*Math.min(u,1)*.9)+u*2,z+dz*u);g.rotation.z=-u*7;g.rotation.x=u*3}
function propsFrame(){
  if(!propG)return;
  for(const q of race.props||[]){const g=q.g;g.rotation.set(0,0,0);
    if(q.k==='tramp'){g.visible=true;g.position.set(q.x-.6,0,laneZ(q.b));
      const u=q.tu!=null?(t-q.tu)/.45:-1;g.mat.position.y=.5-(u>0&&u<1?.35*Math.sin(PI*u):0)}
    else if(q.k==='banana'){const z=laneZ(q.b);g.visible=t>=q.t0&&(q.tu==null||t<q.tu+.9);if(!g.visible)continue;
      if(t<q.t0+.9){const u=(t-q.t0)/.9;g.position.set(q.x-6+6*u,.08+7*(1-u)*(1-u)+2.5*Math.sin(PI*u),-16+(z+16)*u);g.rotation.y=u*9}   // geworfen von der Tribüne
      else if(q.tu!=null&&t>=q.tu){const u=(t-q.tu)/.9;g.position.set(q.x+3*u,.08+3*Math.sin(PI*u),z);g.rotation.z=u*12}
      else g.position.set(q.x,.08,z)}
    else if(q.k==='ducks'){const end=q.sc?q.t1+2:q.t0+6.2;g.visible=t>=q.t0&&t<end;if(!g.visible)continue;
      g.position.set(q.x+.6,0,0);
      q.d.forEach((d,k)=>{const zz=-9.5+18.5*(t-q.t0)/4.5-k*1.05;
        if(q.sc&&t>=q.t1){const u=t-q.t1;d.position.set(Math.sin(k*2.3)*u*2.5,u*3+Math.sin(k)*.3,zz+Math.cos(k*1.7)*u*2);d.rotation.set(0,k,0);d.wings.forEach((w,s)=>w.rotation.x=(s?1:-1)*(.5+.8*Math.sin(t*30+k)))}
        else{d.position.set(0,0,zz);d.rotation.set(.15*Math.sin(t*9+k*1.3),-PI/2,0);d.wings.forEach(w=>w.rotation.x=0)}})}
    else if(q.k==='streak'){
      const hop=Math.min(1,(t-q.t0)/.6),tEnd=q.t1<0?1e9:q.t1;g.visible=t>=q.t0;if(!g.visible)continue;
      const tt=Math.min(t,tEnd),x=q.x+q.v*(tt-q.t0);
      let z=-9.5+(3.5*Math.sin((tt-q.t0)*1.6)+9.5)*hop;
      if(q.j>=0&&tt>tEnd-.8)z+=(laneZ(q.j)-z)*clamp((tt-tEnd+.8)/.8,0,1);   // läuft dem, der ihn erwischt, genau vor die Nase
      if(t<tEnd){g.position.set(x,1.2*Math.sin(PI*hop)*(hop<1?1:0),z);g.rotation.y=Math.cos((tt-q.t0)*1.6)*.5;walkPerson(g,(t-q.t0)*12,true);continue}
      const f=q.j>=0?fig[q.j]:null;
      if(q.how==='ride'&&t<q.t2&&f){const p=f.jock.getWorldPosition(tmpV);g.position.set(p.x-.75,p.y-.35,p.z);walkPerson(g,t*3,true);g.legs[0].rotation.x=.9;g.legs[1].rotation.x=-.9}
      else if(q.how==='ride'&&f){const u=(t-q.t2)/1.1;g.visible=u<1;const p=f.root.position;flyOff(g,p.x-u*8,p.z,u,3,-6)}
      else{const u=(t-tEnd)/(q.how==='away'?1:1.3);g.visible=u<1;flyOff(g,x,z,u,q.how==='knock'?9:q.how==='away'?1.5:4,q.how==='away'?-4:-10);if(q.how==='away')g.rotation.set(0,PI/2,0)}}
    else if(q.k==='snack'){g.visible=t>=q.t0;if(!g.visible)continue;
      g.position.set(q.x+.6,0,-9.2);g.rotation.y=-PI/2;walkPerson(g,0,false);g.arms[0].rotation.z=1.5+.15*Math.sin(t*6);
      g.food.visible=t<q.t1-.3;
      if(t>q.t1-.3&&t<q.t1+1.5){g.arms[1].rotation.x=-2.8;g.arms[0].rotation.z=.4}}   // Snack weg: Hand hoch, Daumen hoch
  }
}
