// Chaos-Derby – gesprochener Kommentar über die Sprachausgabe des Browsers (Web Speech API)
// Zwei Sprecher: ein japanischer (Standard, Sätze aus js/jikkyo.js), der im Rennverlauf immer mehr abdreht,
// und ein deutscher, der die Textzeilen vorliest. Fehlt eine japanische Stimme, spricht der deutsche.
// Die Ereignisse kommen schneller, als man sie sprechen kann. Deshalb gibt es höchstens eine wartende Zeile:
// Wichtigeres verdrängt Unwichtigeres, Veraltetes fällt weg, der Zieleinlauf unterbricht alles.
const voice=(()=>{
  const sy=typeof speechSynthesis!=='undefined'?speechSynthesis:null;
  const MAXAGE=[0,2.5,4,8];             // so lange (s) darf eine Zeile je Gewicht warten
  const MODES=['ja','de','aus'];
  let mode='ja',de=null,ja=null,cur=null,wait=null,final=false,quiet=0,chaos=0,m=0;
  try{const v=localStorage.getItem('derby-voice');mode=v==='aus'?'aus':v==='de'?'de':'ja'}catch(e){}
  function best(re){
    const vs=sy.getVoices().filter(v=>re.test(v.lang));
    return vs.find(v=>v.localService)||vs[0]||null;
  }
  function pick(){de=best(/^de\b/i);ja=best(/^ja\b/i)}
  if(sy){pick();sy.addEventListener&&sy.addEventListener('voiceschanged',pick)}
  const jp=()=>mode==='ja'&&!!ja&&typeof jikkyo!=='undefined';
  function speak(l){
    const u=new SpeechSynthesisUtterance(l.s);
    if(l.ja){
      // Aufregung m: schneller, höher, lauter
      u.lang='ja-JP';u.voice=ja;u.rate=Math.min(1.75,.95+.8*l.m);u.pitch=Math.min(1.9,.9+1*l.m);u.volume=.8+.2*l.m;
    }else{
      u.lang='de-DE';if(de)u.voice=de;u.rate=1.08+.22*l.hot;u.pitch=1+.25*l.hot;u.volume=1;   // gegen Ende schneller und höher
    }
    u.onend=u.onerror=()=>{if(cur===l)cur=null};
    cur=l;quiet=0;sy.speak(u);
  }
  return {
    ok:!!sy,
    get on(){return mode!=='aus'},
    get mode(){return mode},
    // Japanisch gewählt, aber keine japanische Stimme auf dem Gerät
    get fallback(){return mode==='ja'&&!ja},
    next(){mode=MODES[(MODES.indexOf(mode)+1)%MODES.length];try{localStorage.setItem('derby-voice',mode)}catch(e){}if(mode==='aus')this.stop();else{wait=null;if(sy)sy.cancel();cur=null}},
    stop(){wait=null;cur=null;final=false;quiet=0;chaos=0;m=0;if(sy)sy.cancel()},
    // l: Ereignis {s, p, k, i, …}, prog: Rennfortschritt 0…1 (1 = Sieg)
    say(l,prog){
      if(!sy||mode==='aus')return;
      const p=l.p||1;prog=prog||0;
      if(p>=2&&!final)chaos=Math.min(.45,chaos+.05);   // jedes Chaos-Ereignis bringt den Sprecher weiter aus der Fassung
      if(!final)m=Math.max(m,Math.min(1,prog*.75+chaos));
      if(final&&p<3)return;               // nach dem Sieg nur noch Zieleinlauf und Ergebnis
      let s=l.s,useJa=false;
      if(jp()){const j=l.rant?jikkyo.rant():jikkyo.line(l,m);if(j){s=j;useJa=true}}
      if(!s)return;
      const line={s,p,at:performance.now(),hot:Math.max(0,Math.min(1,(prog-.73)/.27)),m,ja:useJa};
      if(p>=3&&!(cur&&cur.p>=3)){final=true;wait=null;if(cur||sy.speaking){sy.cancel();cur=null}line.hot=1;line.m=l.k==='einlauf'?.25:1;speak(line);return}
      if(!wait||p>=wait.p)wait=line;
    },
    // Grad der Aufregung des japanischen Sprechers, 0…3
    get level(){return typeof jikkyo!=='undefined'?jikkyo.level(m):0},
    // jedes Bild: wartende Zeile sprechen, sobald die vorige fertig ist; liefert Sekunden seit der letzten Zeile
    update(dt){
      if(!sy||mode==='aus')return 0;
      if(cur&&!sy.speaking&&!sy.pending)cur=null;   // falls onend ausbleibt
      if(cur){quiet=0;return 0}
      quiet+=dt;
      if(wait){const w=wait;wait=null;if((performance.now()-w.at)/1000<=MAXAGE[w.p])speak(w)}
      return quiet;
    }
  };
})();
