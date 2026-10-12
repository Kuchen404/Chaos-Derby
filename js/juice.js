// Chaos-Derby – Überzeichnung: Ausholen vor jedem Gag, Stauchen und Strecken, wackelnde Ohren und Schwänze, Kamerawackeln und Speedlines bei Treffern.
// Reine Darstellung. Das Rennen steht vorab fest, deshalb kann die Figur schon ausholen, bevor der Gag in der Simulation beginnt.
const JU={
  gags:{4:1,6:1,9:1,11:1,13:1,15:1,21:1,22:1,23:1,24:1,25:1},   // Zustände, vor denen ausgeholt wird (Sturmlauf, Rakete, Sprung, Jagd, Zoomies, Überholgags)
  hits:{2:.45,17:.7,18:.9,19:.35,20:.6,26:.8},                  // Treffer: Stärke des Kamerawackelns je Unfallzustand
  wild:{2:1,4:1,13:1,15:1,17:1,18:1,19:1,20:1,24:1,26:1},        // hier schlackern Ohren und Schwanz besonders
  ahead:.32,   // so lange vor dem Gag wird ausgeholt (s)
  bones:[...['L','R'].flatMap(s=>[1,2,3,4].map(n=>'Ear'+n+s)),...[1,2,3,4,5,6,7,8].map(n=>'Tail'+n)],   // GLTFLoader entfernt die Punkte aus den Knochennamen
  shake:0,burst:null,cv:null
};
const juV=new THREE.Vector3();
// Liegt die Figur gerade im Bild? (Kamera vom letzten Bild)
function juSeen(f){f.root.getWorldPosition(juV);juV.y+=f.V.top*S*.4;juV.project(camera);return Math.abs(juV.x)<1.05&&Math.abs(juV.y)<1.05&&juV.z<1}
// Pro Figur und Bild, am Ende von pose(): Feder für Stauchen/Strecken, Ausholen, Knochen von Ohren und Schwanz
function juice(f,i,st,dt,sdt){
  if(t===0)f.ju=null;
  const j=f.ju||(f.ju={s:0,v:0,h:null,vy:0,a:.1,ph:0,gp:f.gp,an:0});
  const sp=f.spin,run=state==='run'&&sdt>0;
  // Ausholen: In den letzten 0,32 s vor einem Gag duckt sich die Figur, lehnt sich zurück und nimmt Schwung
  let an=0;
  if(race&&race.frames&&!JU.gags[st]){const fr=race.frames,n=fr.length,fi=Math.floor(t*30);
    for(let q=1;q<=Math.ceil(JU.ahead*30)+1&&fi+q<n;q++){const s=fr[fi+q].s[i];if(s!==st){const w=(fi+q)/30-t;if(JU.gags[s]&&w<JU.ahead)an=Math.sin(PI/2*(1-w/JU.ahead));break}}}
  // Höhe über dem Boden für Landungen und Strecken in der Luft
  const h=f.root.position.y+S*(sp.position.y-f.c);
  if(run){
    const vy=j.h===null?0:(h-j.h)/sdt;
    if(j.vy<-3&&vy>j.vy*.4&&h<.6){j.v+=Math.min(9,-j.vy*.8);j.a+=.25;if(j.vy<-7&&juSeen(f))JU.shake=Math.min(1,JU.shake+.18)}   // Landung: stauchen
    if(st!==f.prev){
      if(JU.gags[st]){j.v-=5.5;j.a+=.2}                            // Gag beginnt: aus dem Ausholen heraus strecken
      if(JU.hits[st]&&!(st===2&&(f.prev===17||f.prev===26))){j.v+=4;j.a+=.4;
        if(juSeen(f)){JU.shake=Math.min(1,JU.shake+JU.hits[st]);JU.burst={f,life:.5,max:.5}}}
      if((f.prev===6||f.prev===9)&&st===2&&juSeen(f))JU.shake=1}   // Rakete explodiert
    // Feder: Stauchen ist positiv, Strecken negativ; schwach gedämpft, damit es nachfedert
    const tg=.24*an,K=260,C=9;
    j.v+=(K*(tg-j.s)-C*j.v)*sdt;j.s=clamp(j.s+j.v*sdt,-.32,.42);
    j.vy=vy;
    // Ohren und Schwanz: Grundwackeln im Laufrhythmus, mehr bei Unfällen und Tempo-Gags, Stöße klingen ab
    const tgA=STAND[st]&&!JU.wild[st]?.06:JU.wild[st]?.32:.13;
    j.a+=(tgA-j.a)*Math.min(1,sdt*3);
    j.ph+=(f.gp-j.gp)*2*PI+sdt*(JU.wild[st]?14:4)}
  j.gp=f.gp;j.h=h;j.an=an;
  // Stauchen/Strecken anwenden, Füße bleiben am Boden. Gestreckt wird zusätzlich, solange die Figur schnell steigt oder fällt.
  const s=j.s-(h>.3?Math.min(.18,Math.abs(j.vy)*.025):0),sy=1-s,sx=1+s*.5,sy0=sp.scale.y;
  sp.scale.set(sp.scale.x*sx,sy0*sy,sp.scale.z*sx);sp.position.y-=f.c*sy0*(1-sy);
  sp.rotation.z+=.28*an;sp.position.x=-.35*an;   // zurücklehnen und Anlauf nehmen
  if(!f.model)return;
  const B=f.bone,a=Math.min(.7,j.a),fly=st===17||st===26?1:0;
  const nt=f.ju.nt||(f.ju.nt=[1,2,3,4,5,6,7,8].filter(k=>B['Tail'+k]).length||1);   // gleicher Gesamtausschlag, egal wie viele Glieder der Schwanz hat
  for(let k=1;k<=nt;k++){const b=B['Tail'+k],w=a*(1+k/nt)*3/nt;
    b.rotateZ(w*Math.sin(j.ph-k*.7));b.rotateX(w*.6*Math.sin(j.ph*.5-k*.9)+fly*.25)}
  for(const sd of ['L','R'])for(let k=1;k<=4;k++){const b=B['Ear'+k+sd];if(!b)break;const w=a*(.6+.25*k)*(sd==='L'?1:-1);
    b.rotateX(w*.9*Math.sin(j.ph-k*.8+(sd==='L'?0:.6))-fly*.35);b.rotateZ(w*.5*Math.sin(j.ph*.7-k))}
}
// Pro Bild nach der Kameraregie: Kamerawackeln und Speedlines um den Getroffenen
function juiceView(dt){
  if(t===0){JU.shake=0;JU.burst=null}
  const tr=JU.shake;
  if(tr>0){const q=tr*tr,n=performance.now()/1000;
    juV.set(Math.sin(n*41)+Math.sin(n*67)*.5,Math.sin(n*53+1)+Math.sin(n*29)*.5,Math.sin(n*37+2)*.6).multiplyScalar(q*.35);
    camera.position.add(juV);camera.rotateZ(Math.sin(n*47+3)*q*.035);
    JU.shake=Math.max(0,tr-dt*1.7)}
  speedLines(dt);
}
// Konzentrationslinien wie im Manga: Keile vom Bildrand zum Getroffenen hin, flackern bei jedem Bild neu
function speedLines(dt){
  const b=JU.burst;
  if(!JU.cv){if(!b)return;const c=document.createElement('canvas');c.className='speed';c.setAttribute('aria-hidden','true');$('view').insertBefore(c,renderer.domElement.nextSibling);JU.cv=c}
  const c=JU.cv,x=c.getContext('2d');
  if(!b||b.life<=0){if(c.dataset.on){x.clearRect(0,0,c.width,c.height);delete c.dataset.on}JU.burst=null;return}
  const W=c.clientWidth,H=c.clientHeight;if(c.width!==W||c.height!==H){c.width=W;c.height=H}
  b.f.root.getWorldPosition(juV);juV.y+=b.f.V.top*S*.4;juV.project(camera);
  const cx=(juV.x+1)/2*W,cy=(1-juV.y)/2*H,R=Math.hypot(W,H),u=b.life/b.max;
  x.clearRect(0,0,W,H);c.dataset.on=1;x.globalAlpha=Math.min(1,u*1.6)*.85;x.fillStyle='#ffffff';
  for(let k=0;k<54;k++){const a=Math.random()*2*PI,r0=R*(.16+Math.random()*.14)*(1.4-u*.4),wd=(.004+Math.random()*.01);
    x.beginPath();x.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);x.lineTo(cx+Math.cos(a-wd)*R,cy+Math.sin(a-wd)*R);x.lineTo(cx+Math.cos(a+wd)*R,cy+Math.sin(a+wd)*R);x.closePath();x.fill()}
  x.globalAlpha=1;b.life-=dt;
}
