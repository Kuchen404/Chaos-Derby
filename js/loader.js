// Chaos-Derby – Ladebildschirm: Das Spiel beginnt erst, wenn Tiermodelle, Kommentator-Aufnahmen und die Quoten des ersten Felds fertig sind.
// Jeder Ladeteil meldet sich mit einem Gewicht an (grob: Megabyte bzw. Sekunden Rechenzeit) und meldet dann seinen Fortschritt 0…1.
// Fehlgeschlagene Teile zählen als fertig, damit der Ladebildschirm nie hängen bleibt; das Spiel fällt dann wie bisher zurück (etwa auf die Browserstimme).
const loading=(()=>{
  const P={},GROUP={m:'Tiere',f:'Tiere',a:'Kommentator',q:'Quoten',s:'Schriften'};
  let ready=false,sealed=false,go=null,raf=0;
  const total=()=>{let w=0,d=0;for(const n in P){w+=P[n].w;d+=P[n].w*P[n].f}return w?d/w:0};
  const settled=g=>Object.keys(P).every(n=>(g&&!g.includes(n[0]))||P[n].f>=1);
  function draw(){
    raf=0;const el=$('load');if(!el)return;
    const u=total();$('lbar').style.width=(u*100).toFixed(1)+'%';$('lpct').textContent=Math.floor(u*100)+' %';
    // je Gruppe ein Häkchen, sobald sie fertig ist
    const g={};for(const n in P){const k=GROUP[n[0]];g[k]=g[k]||{w:0,d:0};g[k].w+=P[n].w;g[k].d+=P[n].w*P[n].f}
    $('lparts').innerHTML=Object.keys(g).map(k=>{const v=g[k].d/g[k].w;return '<li'+(v>=1?' class="ok"':'')+'><span>'+k+'</span><b>'+(v>=1?'fertig':Math.floor(v*100)+' %')+'</b></li>'}).join('');
    if(!sealed)return;
    if(!ready&&settled()){ready=true;$('lgo').disabled=false;$('lgo').textContent='Los geht’s';$('lgo').focus();$('lskip').hidden=true}
    // Auf langsamen Leitungen dauert der Kommentator am längsten; ohne ihn kann es schon losgehen, er wird dann nachgeladen
    else if(!ready&&settled('mfqs'))$('lskip').hidden=false;
  }
  const kick=()=>{if(!raf)raf=requestAnimationFrame(draw)};
  function add(n,w){if(!P[n])P[n]={w,f:0};kick()}
  function set(n,f){const p=P[n];if(p&&f>p.f){p.f=Math.min(1,f);kick()}}
  function fail(n,msg){set(n,1);if(msg){$('lerr').textContent=msg;$('lerr').hidden=false}}
  function start(){
    if(!$('load')||$('load').hidden)return;
    $('load').hidden=true;document.body.classList.remove('loading');if(go)go();
  }
  // Die Schriften stecken auch in den Tafeln und Startnummern der 3D-Szene
  if(typeof document!=='undefined'&&document.fonts&&document.fonts.ready){add('s',.3);document.fonts.ready.then(()=>set('s',1),()=>set('s',1))}
  if(typeof document!=='undefined'&&$('lgo')){$('lgo').onclick=start;$('lskip').onclick=start}
  return {add,set,fail,kick,
    // alle Teile sind angemeldet; vorher kann der Ladebildschirm nicht fertig werden
    seal(){sealed=true;kick()},get ready(){return ready},
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
