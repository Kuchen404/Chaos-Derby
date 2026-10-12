// Chaos-Derby – Geräusche und Hintergrundmusik, alles per Web Audio im Browser erzeugt (keine Tondateien, keine fremden Lizenzen).
// Musik: ruhig in der Vorstellung, treibend im Rennen, Fanfare bei der Siegerehrung; sie wird leiser, solange der Sprecher redet.
// Geräusche: je Szene der Vorstellung und je Ereignis im Rennen. Der Ton-Knopf schaltet alles mit aus.
const sfx=(()=>{
  const AC=typeof AudioContext!=='undefined'?AudioContext:typeof webkitAudioContext!=='undefined'?webkitAudioContext:null;
  let ac=null,master,musicG,fxG,noiseBuf,on=true,song=null,beat=0,nextT=0,timer=0,rainSrc=null,rainG=null;
  const MUS=.16,DUCK=.05,FX=.55;   // Lautstärken: Musik, Musik unter dem Sprecher, Geräusche
  // Erst nach einer Bedienung starten, sonst sperrt der Browser den Ton ohnehin
  function init(){
    if(ac||!AC)return;try{ac=typeof voice!=='undefined'&&voice.ctx||new AC()}catch(e){return}
    master=ac.createGain();master.gain.value=on?1:0;const cp=ac.createDynamicsCompressor();master.connect(cp);cp.connect(ac.destination);   // fängt Spitzen ab, wenn vieles zugleich klingt
    musicG=ac.createGain();musicG.gain.value=MUS;musicG.connect(master);
    fxG=ac.createGain();fxG.gain.value=FX;fxG.connect(master);
    noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    timer=setInterval(tick,40);
  }
  const live=()=>ac&&ac.state==='running'&&on;

  /* ---------- Bausteine ---------- */
  // Hüllkurve: Anstieg a, Halten bis d, Abklingen r; v Spitzenwert
  function env(g,t,v,a,d,r){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.setValueAtTime(v,t+a+d);g.gain.exponentialRampToValueAtTime(.0001,t+a+d+r)}
  // Ton: Wellenform w, Frequenz f (Zahl oder [Start, Ende] als Gleiten), Dauer, Lautstärke, Ziel
  function tone(t,w,f,dur,v,out,o={}){
    const os=ac.createOscillator(),g=ac.createGain();os.type=w;
    if(Array.isArray(f)){os.frequency.setValueAtTime(f[0],t);for(let k=1;k<f.length;k++)os.frequency.exponentialRampToValueAtTime(f[k],t+dur*k/(f.length-1))}else os.frequency.value=f;
    if(o.vib){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=o.vib;lg.gain.value=o.vd||8;l.connect(lg);lg.connect(os.frequency);l.start(t);l.stop(t+dur+.1)}
    let n=os;if(o.lp){const fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=o.lp;fl.Q.value=o.q||1;os.connect(fl);n=fl}
    n.connect(g);g.connect(out||fxG);env(g,t,v,o.a||.01,Math.max(0,dur-(o.a||.01)-(o.r||.08)),o.r||.08);os.start(t);os.stop(t+dur+.05)}
  // Rauschen durch einen Filter (Typ ft, Frequenz ff oder [Start, Ende]), z. B. Atmen, Zischen, Explosion
  function noise(t,dur,v,ft,ff,out,o={}){
    const s=ac.createBufferSource(),fl=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf;s.loop=true;fl.type=ft;fl.Q.value=o.q||1;
    if(Array.isArray(ff)){fl.frequency.setValueAtTime(ff[0],t);fl.frequency.exponentialRampToValueAtTime(ff[1],t+dur)}else fl.frequency.value=ff;
    s.connect(fl);fl.connect(g);g.connect(out||fxG);env(g,t,v,o.a||.005,Math.max(0,dur-(o.a||.005)-(o.r||.1)),o.r||.1);s.start(t,Math.random());s.stop(t+dur+.05);return g}

  /* ---------- Geräusche ---------- */
  const S={
    howl(t){tone(t,'sine',[320,620,560,380],2.2,.32,0,{a:.25,r:.6,vib:5.5,vd:14,lp:1400});tone(t,'triangle',[640,1240,1120,760],2.2,.06,0,{a:.3,r:.6,vib:5.5,vd:20})},
    snore(t){for(let k=0;k<3;k++){const s=t+k*.8;noise(s,.45,.35,'lowpass',[260,520],0,{a:.18,r:.2,q:6});noise(s+.5,.25,.1,'bandpass',1800,0,{a:.05,r:.15})}},
    yawn(t){tone(t,'sawtooth',[420,520,240],1,.2,0,{a:.15,r:.3,lp:900})},
    boing(t){tone(t,'sine',[180,720],.35,.35,0,{vib:18,vd:40})},
    whoosh(t){noise(t,.6,.6,'bandpass',[300,2600],0,{a:.2,r:.3,q:2})},
    munch(t){for(let k=0;k<5;k++)noise(t+k*.22,.08,.7,'bandpass',900+Math.random()*500,0,{q:3})},
    slide(t){tone(t,'sine',[300,1400],1,.18,0,{a:.1,r:.2,vib:6,vd:10})},
    snort(t){for(let k=0;k<2;k++)noise(t+k*.35,.25,.5,'bandpass',[700,300],0,{a:.02,r:.15,q:1.5})},
    stomp(t){for(let k=0;k<3;k++){tone(t+k*.18,'sine',[110,45],.25,.6);noise(t+k*.18,.15,.3,'lowpass',600)}},
    rumble(t){noise(t,1.2,.5,'lowpass',[180,90],0,{a:.1,r:.5});for(let k=0;k<8;k++)tone(t+k*.14,'sine',[90,45],.14,.5)},
    rain(t,d){noise(t,d||2.5,.25,'highpass',3000,0,{a:.3,r:.6});noise(t,d||2.5,.12,'bandpass',900,0,{a:.3,r:.6,q:.5})},
    yip(t){for(let k=0;k<2;k++)tone(t+k*.18,'square',[700,1100,800],.12,.12,0,{lp:2500})},
    sigh(t){noise(t,.9,.45,'bandpass',[700,350],0,{a:.3,r:.5,q:2})},
    tadaa(t){[523,659,784,1047].forEach((f,k)=>tone(t+k*.11,'square',f,k<3?.12:.6,.1,0,{lp:2400}))},
    clip(t){tone(t,'triangle',[260,160],.5,.25,0,{lp:700,vib:7,vd:20})},
    ignite(t){noise(t,.25,.45,'bandpass',[400,2000],0,{q:2})},
    rocket(t,d){d=d||2;noise(t,d,.5,'bandpass',[500,1600],0,{a:.15,r:.4,q:.7});noise(t,d,.4,'lowpass',200,0,{a:.15,r:.4})},
    sputter(t){for(let k=0;k<7;k++)if(Math.random()<.75)noise(t+k*.28,.16,.45,'bandpass',800+Math.random()*900,0,{q:1})},
    pfft(t){noise(t,.7,.4,'lowpass',[1500,200],0,{a:.01,r:.5});tone(t+.1,'sine',[300,90],.6,.15)},
    boom(t){noise(t,1.4,.5,'lowpass',[2200,80],0,{a:.005,r:1});tone(t,'sine',[120,30],1,.45)},
    heehaw(t){for(let k=0;k<2;k++){tone(t+k*.7,'sawtooth',[880,820],.3,.13,0,{lp:2000});tone(t+k*.7+.32,'sawtooth',[330,300],.35,.15,0,{lp:1200})}},
    kick(t){noise(t,.12,.4,'lowpass',900);tone(t,'sine',[160,50],.2,.5)},
    bang(t){noise(t,.3,.55,'highpass',800,0,{r:.25});tone(t,'square',[200,60],.15,.15)},
    squeak(t){tone(t,'sine',[1200,2400,1800],.3,.18,0,{vib:30,vd:60})},
    tremble(t){for(let k=0;k<10;k++)tone(t+k*.11,'triangle',k%2?1500:1600,.06,.14)},
    tiptoe(t){[392,330,392,330,523].forEach((f,k)=>tone(t+k*.25,'triangle',f,.09,.18,0,{r:.06}))},
    snicker(t){for(let k=0;k<4;k++)tone(t+k*.13,'square',[900,700],.08,.16,0,{lp:2000})},
    growl(t){const g=noise(t,1,.4,'lowpass',260,0,{a:.1,r:.3,q:4});const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=28;lg.gain.value=.3;l.connect(lg);lg.connect(g.gain);l.start(t);l.stop(t+1.1);tone(t,'sawtooth',[95,80],1,.12,0,{lp:300})},
    sniff(t){for(let k=0;k<4;k++)noise(t+k*.16,.08,.3,'highpass',2500)},
    bark(t){for(let k=0;k<3;k++){tone(t+k*.2,'square',[520,780,420],.12,.14,0,{lp:1800});noise(t+k*.2,.08,.2,'bandpass',1500)}},
    skid(t){noise(t,.5,.25,'bandpass',[2500,1200],0,{q:4})},
    thud(t){tone(t,'sine',[140,40],.35,.7);noise(t,.2,.35,'lowpass',500)},
    bell(t){[0,.12].forEach(d=>{tone(t+d,'sine',1320,.8,.25,0,{r:.7});tone(t+d,'sine',2640,.5,.08,0,{r:.4})})},
    cheer(t,d){d=d||2.5;noise(t,d,.35,'bandpass',1200,0,{a:.3,r:1,q:.6});noise(t,d,.15,'bandpass',2600,0,{a:.4,r:1,q:.8})},
    quack(t){for(let k=0;k<4;k++){const s=t+k*.22+(k%2)*.05;tone(s,'sawtooth',[620,480],.13,.14,0,{lp:1400,q:6});noise(s,.1,.12,'bandpass',900,0,{q:4})}},
    fall(t){tone(t,'sine',[2400,500],1.1,.22,0,{a:.05,r:.15})},
    whistle(t){[0,.35].forEach(d=>tone(t+d,'sine',2900,d?.6:.22,.2,0,{vib:38,vd:120,r:.05}))},
    ooh(t){tone(t,'sine',[300,220],1,.08,0,{a:.2,r:.4,vib:5,vd:6});noise(t,1,.12,'bandpass',[700,400],0,{a:.2,r:.5,q:1.5})}
  };
  function play(n,delay,a){if(!live()||!S[n])return;S[n](ac.currentTime+(delay||0)+.02,a)}

  // Vorstellung: Zeitplan je Starter (Sekunden ab Beginn der Szene, Geräusch, Zusatzwert)
  const SCENE={
    pferd:[[0,'yawn'],[1,'snore'],[3,'boing'],[3.05,'squeak']],
    alpaka:[[.2,'slide'],[2.7,'munch'],[3.3,'munch']],
    stier:[[.2,'snort'],[1.2,'stomp'],[1.9,'snort'],[2.4,'rumble']],
    husky:[[0,'sigh'],[1,'rain',2.8],[1.5,'yip'],[2.3,'yip'],[3,'howl']],
    aufrecht:[[.1,'clip'],[.6,'whoosh'],[1.4,'clip'],[2.2,'whoosh'],[3.1,'tadaa']],
    kuh:[[0,'tiptoe'],[.5,'ignite'],[.6,'sputter'],[2.6,'pfft']],
    esel:[[.1,'heehaw'],[2,'kick'],[2.7,'kick']],
    hirsch:[[.5,'boing'],[.7,'whoosh'],[1.8,'thud'],[1.9,'cheer',1.2]],
    reh:[[.8,'bang'],[.85,'squeak'],[1.2,'tremble']],
    fuchs:[[0,'tiptoe'],[1,'snicker'],[2,'tiptoe']],
    wolf:[[.2,'howl'],[2.4,'growl'],[2.6,'bark']],
    shiba:[[0,'sniff'],[.7,'sniff'],[1.5,'bark'],[1.7,'skid'],[2.5,'whoosh'],[3.3,'skid']]
  };
  // Rennen: Geräusch je Art des Ereignisses (k in sim.js)
  const EV={start:['bell','cheer'],sleep:['snore'],eat:['munch'],charge:['snort','rumble'],slip:['thud'],back:['clip'],rocket:['ignite','rocket'],
    rocketwrong:['ignite','rocket'],explode:['boom','ooh'],howl:['howl'],howlalong:['howl'],knock:['thud','whoosh'],stubborn:['heehaw'],unstubborn:['sigh'],
    crash:['thud','ooh'],scare:['squeak'],spook:['squeak'],freeze:['squeak'],hunt:['growl'],sniff:['sniff'],zoom:['bark','whoosh'],
    trip:['thud'],pileup:['thud'],chargefail:['thud','ooh'],rocketram:['thud'],blast:['thud'],landon:['thud'],bullturn:['snort','rumble'],
    kick:['kick','whoosh'],zoomhit:['thud'],headon:['thud','ooh'],rearend:['thud'],bump:['thud'],jub:['cheer'],stretch:['slide'],draftout:['whoosh'],
    leap:['boing'],leapfail:['boing','thud','ooh'],piggy:['boing','snicker'],piggyoff:['boing'],buckoff:['heehaw','whoosh'],piggyfall:['thud'],
    barge:['thud'],bargefail:['boing','ooh'],turbo:['whoosh'],turbofail:['skid','thud'],taunt:['snicker'],tauntfail:['thud','ooh'],
    tramp:['boing','whoosh'],fallback:['fall'],dropon:['thud','ooh'],knockhigh:['thud','whoosh'],kickhigh:['kick','whoosh'],blasthigh:['thud','whoosh'],
    buckhigh:['heehaw','whoosh'],bananathrow:['whoosh'],banana:['skid','thud'],bananaeat:['munch'],snack:['munch'],
    ducks:['quack'],duckwait:['quack'],duckscatter:['quack','whoosh'],streak:['whistle','ooh'],streakride:['boing','cheer'],
    streakcrash:['thud','ooh'],streakknock:['thud','whoosh'],streakoff:['thud','whistle'],
    win:['cheer'],close:['ooh']};

  /* ---------- Musik ---------- */
  // Akkorde als Halbtöne über A (110 Hz); je Lied Tempo, Akkordfolge (ein Akkord je Takt) und was pro Achtel gespielt wird
  const hz=s=>110*Math.pow(2,s/12);
  const SONGS={
    calm:{bpm:96,ch:[[3,7,10],[0,3,7],[8,12,15],[10,14,17]],   // C, Am, F, G
      step(b,t,c,e){const k=b%8;
        if(k===0||k===4)tone(t,'sine',hz(c[0]-12),e*1.8,.5,musicG,{r:.3});
        tone(t,'triangle',hz(c[[0,1,2,1,0,2,1,2][k]]+12),e*.9,.22,musicG,{r:.15});
        if(k%2)noise(t,.04,.06,'highpass',7000,musicG)}},
    race:{bpm:150,ch:[[0,3,7],[8,12,15],[10,14,17],[7,11,14]],   // Am, F, G, E
      step(b,t,c,e){const k=b%8;
        if(k%4===0)tone(t,'sine',[150,45],.18,.9,musicG);
        if(k%4===2)noise(t,.12,.35,'bandpass',1800,musicG,{q:.8});
        noise(t,.03,.09,'highpass',8000,musicG);
        if(k===0||k===3||k===4||k===6)tone(t,'sawtooth',hz(c[0]-12),e*.8,.25,musicG,{lp:500});   // galoppierender Bass
        if(k===0||k===5)[1,2].forEach(q=>tone(t,'square',hz(c[q]+12),e*.7,.06,musicG,{lp:1800}))}},
    fanfare:{bpm:110,ch:[[3,7,10],[8,12,15],[10,14,17],[3,7,10]],
      step(b,t,c,e){const k=b%8;
        if(k===0)c.forEach(s=>tone(t,'sawtooth',hz(s+12),e*3.5,.07,musicG,{lp:1600,a:.03,r:.3}));
        if(k===0||k===4)tone(t,'sine',hz(c[0]-12),e*1.5,.45,musicG);
        if(k===6||k===7)tone(t,'square',hz(c[2]+24),e*.5,.05,musicG,{lp:2500})}}
  };
  function tick(){
    if(!ac||ac.state!=='running')return;
    // unter dem Sprecher leiser
    const want=typeof voice!=='undefined'&&voice.busy?DUCK:MUS;musicG.gain.setTargetAtTime(want,ac.currentTime,.25);
    if(!song)return;
    const sg=SONGS[song],e=60/sg.bpm/2;
    if(nextT<ac.currentTime)nextT=ac.currentTime+.05;
    while(nextT<ac.currentTime+.2){if(on)sg.step(beat,nextT,sg.ch[Math.floor(beat/8)%sg.ch.length],e);beat++;nextT+=e}
  }
  // Regen im Rennen als Dauergeräusch
  function rain(r){
    if(!live()){if(rainSrc&&!on)stopRain();return}
    if(r&&!rainSrc){rainSrc=ac.createBufferSource();rainSrc.buffer=noiseBuf;rainSrc.loop=true;const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=2500;
      rainG=ac.createGain();rainG.gain.setValueAtTime(0,ac.currentTime);rainG.gain.linearRampToValueAtTime(.22,ac.currentTime+1);rainSrc.connect(f);f.connect(rainG);rainG.connect(fxG);rainSrc.start()}
    else if(!r&&rainSrc)stopRain()}
  function stopRain(){if(!rainSrc)return;const s=rainSrc;rainG.gain.setTargetAtTime(0,ac.currentTime,.3);s.stop(ac.currentTime+1.5);rainSrc=null}

  if(typeof document!=='undefined'){const go=()=>{init();if(ac&&ac.state==='suspended')ac.resume()};document.addEventListener('pointerdown',go);document.addEventListener('keydown',go)}
  // Prüfhilfe: rendert ein Geräusch ohne Lautsprecher und misst Spitze und Mittel (siehe tools/sfx-test.js)
  function probe(n,dur){
    const keep=[ac,fxG,noiseBuf],sr=22050,oc=new OfflineAudioContext(1,sr*(dur||3),sr);
    ac=oc;fxG=oc.createGain();fxG.connect(oc.destination);noiseBuf=oc.createBuffer(1,sr*2,sr);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    try{S[n](0)}finally{[ac,fxG,noiseBuf]=keep}
    return oc.startRendering().then(b=>{const x=b.getChannelData(0);let pk=0,s=0,bad=0;for(const v of x){if(!isFinite(v))bad++;pk=Math.max(pk,Math.abs(v));s+=v*v}return {peak:pk,rms:Math.sqrt(s/x.length),bad}})}
  return {
    play,probe,names:Object.keys(S),
    scene(id){return SCENE[id]||[]},
    event(k){(EV[k]||[]).forEach((n,q)=>play(n,q*.15))},
    music(n){if(n===song)return;song=n;beat=0;if(ac)nextT=ac.currentTime+.1},
    rain,
    setOn(v){on=v;if(master)master.gain.setTargetAtTime(v?1:0,ac.currentTime,.05);if(!v)stopRain()}
  };
})();
