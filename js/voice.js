// Chaos-Derby – gesprochener Kommentar
// Zwei Sprecher: ein japanischer (Standard), der im Rennverlauf immer mehr abdreht, und ein deutscher, der die Textzeilen vorliest.
// Der japanische Sprecher sind vorab mit VOICEVOX erzeugte Aufnahmen (audio/jikkyo.mp3, Sätze aus js/jikkyo.js),
// abgespielt über Web Audio. Fehlen die Aufnahmen, springt die Sprachausgabe des Browsers ein (Web Speech API).
// Die Ereignisse kommen schneller, als man sie sprechen kann. Deshalb gibt es höchstens eine wartende Zeile:
// Wichtigeres verdrängt Unwichtigeres, Veraltetes fällt weg, der Zieleinlauf unterbricht alles.
const voice=(()=>{
  const sy=typeof speechSynthesis!=='undefined'?speechSynthesis:null;
  const AC=typeof AudioContext!=='undefined'?AudioContext:typeof webkitAudioContext!=='undefined'?webkitAudioContext:null;
  const MAXAGE=[0,2.5,4,8];             // so lange (s) darf eine Zeile je Gewicht warten
  const MODES=['ja','de','aus'];
  let mode='ja',de=null,ja=null,cur=null,wait=null,final=false,quiet=0,chaos=0,m=0;
  let ac=null,buf=null,map=null,src=null;
  try{const v=localStorage.getItem('derby-voice');mode=v==='aus'?'aus':v==='de'?'de':'ja'}catch(e){}
  function best(re){
    const vs=sy.getVoices().filter(v=>re.test(v.lang));
    return vs.find(v=>v.localService)||vs[0]||null;
  }
  function pick(){de=best(/^de\b/i);ja=best(/^ja\b/i)}
  if(sy){pick();sy.addEventListener&&sy.addEventListener('voiceschanged',pick)}
  // Aufnahmen laden: eine MP3 mit allen Sätzen und eine Liste mit Start und Länge je Satz
  function load(){
    if(!AC||typeof fetch==='undefined'||ac)return;
    try{ac=new AC()}catch(e){return}
    Promise.all([fetch('audio/jikkyo.json').then(r=>r.json()),fetch('audio/jikkyo.mp3').then(r=>r.arrayBuffer())])
      .then(([j,a])=>new Promise((ok,no)=>ac.decodeAudioData(a,ok,no)).then(b=>{map=j;buf=b}))
      .catch(()=>{});
  }
  const has=c=>!!(map&&buf&&map[c]);
  const tape=()=>mode==='ja'&&!!buf&&typeof jikkyo!=='undefined';
  const jpSpeech=()=>mode==='ja'&&!buf&&!!ja&&typeof jikkyo!=='undefined';
  function playClips(l){
    let k=0;
    const next=()=>{
      if(cur!==l)return;
      if(k>=l.clips.length){cur=null;return}
      const [o,d]=map[l.clips[k++]],s=ac.createBufferSource();
      s.buffer=buf;s.connect(ac.destination);s.onended=next;src=s;s.start(0,o,d);
    };
    next();
  }
  function stopAll(){
    if(src){try{src.onended=null;src.stop()}catch(e){}src=null}
    if(sy)sy.cancel();
  }
  function speak(l){
    cur=l;quiet=0;
    if(l.clips){playClips(l);return}
    const u=new SpeechSynthesisUtterance(l.s);
    if(l.ja){
      // Aufregung m: schneller, höher, lauter
      u.lang='ja-JP';u.voice=ja;u.rate=Math.min(1.75,.95+.8*l.m);u.pitch=Math.min(1.9,.9+1*l.m);u.volume=.8+.2*l.m;
    }else{
      u.lang='de-DE';if(de)u.voice=de;u.rate=1.08+.22*l.hot;u.pitch=1+.25*l.hot;u.volume=1;   // gegen Ende schneller und höher
    }
    u.onend=u.onerror=()=>{if(cur===l)cur=null};
    sy.speak(u);
  }
  if(typeof document!=='undefined')setTimeout(load,0);
  return {
    ok:!!(sy||AC),
    get on(){return mode!=='aus'},
    get mode(){return mode},
    get ready(){return !!buf},             // Aufnahmen geladen
    // Japanisch gewählt, aber weder Aufnahmen noch japanische Stimme auf dem Gerät
    get fallback(){return mode==='ja'&&!buf&&!ja},
    // Browser geben Ton erst nach einem Klick frei; beim Start des Rennens aufrufen
    unlock(){if(ac&&ac.state==='suspended')ac.resume()},
    next(){mode=MODES[(MODES.indexOf(mode)+1)%MODES.length];try{localStorage.setItem('derby-voice',mode)}catch(e){}wait=null;cur=null;stopAll();if(mode==='aus')this.stop()},
    stop(){wait=null;cur=null;final=false;quiet=0;chaos=0;m=0;stopAll()},
    // l: Ereignis {s, p, k, i, …}, prog: Rennfortschritt 0…1 (1 = Sieg)
    say(l,prog){
      if(mode==='aus')return;
      const p=l.p||1;prog=prog||0;
      if(p>=2&&!final)chaos=Math.min(.45,chaos+.05);   // jedes Chaos-Ereignis bringt den Sprecher weiter aus der Fassung
      if(!final)m=Math.max(m,Math.min(1,prog*.75+chaos));
      if(final&&p<3)return;               // nach dem Sieg nur noch Zieleinlauf und Ergebnis
      const mm=p>=3&&l.k!=='einlauf'?1:m;
      let s=l.s,useJa=false,clips=null;
      if(tape())clips=jikkyo.clips(l,mm,has);
      // ohne passende Aufnahme (etwa für neue Starter) spricht die japanische Stimme des Browsers, sonst die deutsche
      if(!clips&&(jpSpeech()||tape()&&ja)){const j=jikkyo.text(l,mm);if(j){s=j;useJa=true}}
      if(!clips&&(!sy||!s))return;
      const line={s,p,at:performance.now(),hot:Math.max(0,Math.min(1,(prog-.73)/.27)),m:mm,ja:useJa,clips};
      if(p>=3&&!(cur&&cur.p>=3)){final=true;wait=null;if(cur)stopAll();cur=null;line.hot=1;if(l.k==='einlauf')line.m=.25;speak(line);return}
      if(!wait||p>=wait.p)wait=line;
    },
    // Grad der Aufregung des japanischen Sprechers, 0…3
    get level(){return typeof jikkyo!=='undefined'?jikkyo.level(m):0},
    // jedes Bild: wartende Zeile sprechen, sobald die vorige fertig ist; liefert Sekunden seit der letzten Zeile
    update(dt){
      if(mode==='aus')return 0;
      if(cur&&!cur.clips&&sy&&!sy.speaking&&!sy.pending)cur=null;   // falls onend ausbleibt
      if(cur){quiet=0;return 0}
      quiet+=dt;
      if(wait){const w=wait;wait=null;if((performance.now()-w.at)/1000<=MAXAGE[w.p])speak(w)}
      return quiet;
    }
  };
})();
