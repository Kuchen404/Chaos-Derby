// Chaos-Derby – Ladeanzeige im Sendebild: Das Spiel beginnt erst, wenn Tiermodelle, Kommentator-Aufnahmen und die Quoten des ersten Felds fertig sind.
// Jeder Ladeteil meldet sich mit einem Gewicht an (grob: Megabyte bzw. Sekunden Rechenzeit) und meldet dann seinen Fortschritt 0…1.
// Fehlgeschlagene Teile zählen als fertig, damit die Anzeige nie hängen bleibt; das Spiel fällt dann wie bisher zurück (etwa auf die Browserstimme).
// Als Ladeanimation läuft ein kleines Rennen der sechs Starter: Der Führende steht beim Ladestand, die anderen wechseln sich dahinter ab.
const loading=(()=>{
  const P={},GROUP={m:'Tiere',f:'Tiere',a:'Kommentator',q:'Quoten',s:'Schriften'};
  // was gerade dauert, als Zeile über der Bahn (in dieser Reihenfolge wird nach Unfertigem gesucht)
  const MSG=[['s','Die Tafeln werden beschriftet.'],['m','Die Starter werden in die Boxen geführt.'],['f','Die Jockeys steigen auf.'],
    ['q','Die Buchmacher rechnen die Quoten aus.'],['a','Der Sprecher räuspert sich.']];
  let ready=false,sealed=false,started=false,go=null,raf=0,u=0,shown=0,t0=0,dots=null;
  const doc=typeof document!=='undefined';
  const total=()=>{let w=0,d=0;for(const n in P){w+=P[n].w;d+=P[n].w*P[n].f}return w?d/w:0};
  const settled=g=>Object.keys(P).every(n=>(g&&!g.includes(n[0]))||P[n].f>=1);
  const open=c=>Object.keys(P).some(n=>n[0]===c&&P[n].f<1);
  // Starter auf der Ladebahn: Startnummern und Farben des ausgelosten Felds, sobald es feststeht
  function mkDots(){
    if(dots||typeof RUN==='undefined'||!RUN.length)return;
    dots=RUN.map((d,i)=>{const e=document.createElement('span');e.className='ldot';e.textContent=d.nr;e.style.background=d.col;e.style.color=d.ink;
      e.style.top=(100*(i+.5)/RUN.length)+'%';e.style.animationDelay=(-i*.13)+'s';$('ltrack').append(e);
      return {e,ph:i*2.1+Math.random(),w:1.3+Math.random()*1.4,a:i===4?.34:.1+Math.random()*.12}});   // Nr. 5 der Laune nach: fällt manchmal weit zurück
  }
  function info(){
    const pc=Math.floor(u*100);$('lpct').textContent=pc+' %';$('ltrack').setAttribute('aria-valuenow',pc);
    const g={};for(const n in P){const k=GROUP[n[0]];g[k]=g[k]||{w:0,d:0};g[k].w+=P[n].w;g[k].d+=P[n].w*P[n].f}
    $('lparts').innerHTML=Object.keys(g).map(k=>{const v=g[k].d/g[k].w;return '<li'+(v>=1?' class="ok"':'')+'><span>'+k+'</span><b>'+(v>=1?'fertig':Math.floor(v*100)+' %')+'</b></li>'}).join('');
    const m=MSG.find(([c])=>open(c));$('lmsg').textContent=ready?'Alle Starter sind im Ziel.':m?m[1]:'Gleich geht es los.';
    if(!sealed)return;
    if(!ready&&settled()){ready=true;$('lgo').disabled=false;$('lgo').textContent='Los geht’s';$('lskip').hidden=true;$('lh').textContent='Fertig geladen'}
    // Auf langsamen Leitungen dauert der Kommentator am längsten; ohne ihn kann es schon losgehen, er wird dann nachgeladen
    else if(!ready&&settled('mfqs'))$('lskip').hidden=false;
  }
  function tick(now){
    raf=0;if(started||!$('load'))return;
    t0=t0||now;const tt=(now-t0)/1000;
    u=total();shown+=(u-shown)*.08;              // weich hinterherlaufen statt springen
    mkDots();
    if(dots){
      const span=.9,end=ready?1:Math.min(shown,.995);
      dots.forEach(d=>{const gap=d.a*(.5+.5*Math.sin(tt*d.w+d.ph))*(1-end);d.e.style.left=(2+span*Math.max(0,end-gap)*100)+'%'})
    }
    info();
    raf=requestAnimationFrame(tick);
  }
  const kick=()=>{if(!raf&&!started&&doc)raf=requestAnimationFrame(tick)};
  function add(n,w){if(!P[n])P[n]={w,f:0};kick()}
  function set(n,f){const p=P[n];if(p&&f>p.f){p.f=Math.min(1,f);kick()}}
  function fail(n,msg){set(n,1);if(msg){$('lerr').textContent=msg;$('lerr').hidden=false}}
  function start(){
    if(started)return;started=true;
    $('load').hidden=true;$('go').disabled=false;$('neu').disabled=false;if(go)go();
  }
  // Die Schriften stecken auch in den Tafeln und Startnummern der 3D-Szene
  if(doc&&document.fonts&&document.fonts.ready){add('s',.3);document.fonts.ready.then(()=>set('s',1),()=>set('s',1))}
  if(doc&&$('lgo')){$('lgo').onclick=start;$('lskip').onclick=start}
  return {add,set,fail,
    // alle Teile sind angemeldet; vorher kann die Anzeige nicht fertig werden
    seal(){sealed=true;kick()},get ready(){return ready},get started(){return started},
    // wird beim Klick auf „Los geht’s“ aufgerufen (der Klick gibt zugleich den Ton frei)
    onStart(f){go=f}};
})();
// Datei laden und den Fortschritt melden. Kennt der Server die Größe nicht (oder liefert gepackt), springt der Teil erst am Ende auf fertig.
function fetchProg(url,name,as){
  return fetch(url).then(r=>{
    if(!r.ok)throw new Error(url);
    const n=+r.headers.get('content-length'),enc=r.headers.get('content-encoding');
    if(!r.body||!r.body.getReader||!n||enc&&enc!=='identity')return as==='text'?r.text():r.arrayBuffer();
    const rd=r.body.getReader(),bits=[];let got=0;
    const pump=()=>rd.read().then(({done,value})=>{
      if(done){const all=new Uint8Array(got);let o=0;for(const b of bits){all.set(b,o);o+=b.length}return as==='text'?new TextDecoder().decode(all):all.buffer}
      bits.push(value);got+=value.length;loading.set(name,.95*got/Math.max(n,got));return pump()});
    return pump();
  });
}
