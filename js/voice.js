// Chaos-Derby – gesprochener Kommentar über die Sprachausgabe des Browsers (Web Speech API)
// Die Ereignisse kommen schneller, als man sie sprechen kann. Deshalb gibt es höchstens eine wartende Zeile:
// Wichtigeres verdrängt Unwichtigeres, Veraltetes fällt weg, der Zieleinlauf unterbricht alles.
const voice=(()=>{
  const sy=typeof speechSynthesis!=='undefined'?speechSynthesis:null;
  const MAXAGE=[0,2.5,4,8];             // so lange (s) darf eine Zeile je Gewicht warten
  let on=false,de=null,cur=null,wait=null,final=false,quiet=0;
  try{on=localStorage.getItem('derby-voice')!=='aus'}catch(e){on=true}
  function pick(){
    const vs=sy.getVoices().filter(v=>/^de\b/i.test(v.lang));
    de=vs.find(v=>v.localService&&/de-DE/i.test(v.lang))||vs.find(v=>/de-DE/i.test(v.lang))||vs[0]||null;
  }
  if(sy){pick();sy.addEventListener&&sy.addEventListener('voiceschanged',pick)}
  function speak(l,hot){
    const u=new SpeechSynthesisUtterance(l.s);
    u.lang='de-DE';if(de)u.voice=de;
    u.rate=1.08+.22*hot;u.pitch=1+.25*hot;u.volume=1;   // gegen Ende schneller und höher
    u.onend=u.onerror=()=>{if(cur===l)cur=null};
    cur=l;quiet=0;sy.speak(u);
  }
  return {
    ok:!!sy,
    get on(){return on},
    set(v){on=!!v;try{localStorage.setItem('derby-voice',on?'an':'aus')}catch(e){}if(!on)this.stop()},
    stop(){wait=null;cur=null;final=false;quiet=0;if(sy)sy.cancel()},
    // l: {s, p}, hot: Spannung 0…1
    say(l,hot){
      if(!sy||!on)return;
      const p=l.p||1;
      if(final&&p<3)return;               // nach dem Sieg nur noch Zieleinlauf und Ergebnis
      const line={s:l.s,p,at:performance.now(),hot:hot||0};
      if(p>=3&&!(cur&&cur.p>=3)){final=true;wait=null;if(cur||sy.speaking){sy.cancel();cur=null}speak(line,1);return}
      if(!wait||p>=wait.p)wait=line;
    },
    // jedes Bild: wartende Zeile sprechen, sobald die vorige fertig ist; liefert Sekunden seit der letzten Zeile
    update(dt){
      if(!sy||!on)return 0;
      if(cur&&!sy.speaking&&!sy.pending)cur=null;   // falls onend ausbleibt
      if(cur){quiet=0;return 0}
      quiet+=dt;
      if(wait){const w=wait;wait=null;if((performance.now()-w.at)/1000<=MAXAGE[w.p])speak(w,w.hot)}
      return quiet;
    }
  };
})();
