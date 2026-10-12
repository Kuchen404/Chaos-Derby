// Chaos-Derby – Rennansicht: Ab dem Start bekommt das Sendebild fast den ganzen Bildschirm.
// Darunter zeigt die Wettleiste, wer was gesetzt hat; wer nach dem aktuellen Stand gewinnen würde, leuchtet auf.
// Nach dem Zieleinlauf zeigt die Leiste die Abrechnung, kurz nach der Siegerehrung kehrt das normale Layout zurück.
const raceBar=(()=>{
  let on=false,shown='',back=0;
  // Wetten dieses Rennens: vor der Abrechnung im Buch, danach (auch bei der Wiederholung) im Ergebnis
  const slips=()=>book.slips.length?book.slips:(lastRes||[]);
  function view(v){
    clearTimeout(back);if(on===v)return;on=v;
    document.body.classList.toggle('rennen',v);shown='';
    if(v){window.scrollTo(0,0);render(null)}
    size();fit();
  }
  // Das Sendebild so groß, dass Bild, Kommentarzeile und Wettleiste ohne Scrollen ins Fenster passen.
  // Auf Querformat steht die Leiste rechts neben dem Bild (css/style.css, .wbar), sonst darunter; sie bricht dann je nach Breite um, deshalb zweimal messen.
  const SIDE=matchMedia('(min-width:900px) and (min-aspect-ratio:4/3)');
  function size(){
    const s=$('screen'),bar=$('wbar');s.style.maxWidth='';bar.style.maxHeight='';if(!on)return;
    const top=s.getBoundingClientRect().top+window.scrollY,side=SIDE.matches;
    for(let k=0;k<2;k++){
      const h=window.innerHeight-top-$('cap').parentNode.offsetHeight-(side||bar.hidden?0:bar.offsetHeight)-20;
      if(h<200)return;
      s.style.maxWidth=Math.floor(h*16/9+(side&&!bar.hidden?bar.offsetWidth:0))+'px';
    }
    if(side)bar.style.maxHeight=($('view').offsetHeight+$('cap').parentNode.offsetHeight)+'px';
  }
  // order: aktuelle Reihenfolge der Bahnen (live) oder Einlauf; fin: Rennen entschieden, Gewinne stehen fest
  function render(order,fin){
    const l=slips(),key=(order||[]).slice(0,2).join()+'|'+!!fin+'|'+l.length;
    if(!on||key===shown)return;shown=key;
    const bar=$('wbar');bar.hidden=!l.length;if(!l.length)return;
    bar.innerHTML=l.map(s=>{
      const hit=order&&hits(s,order),win=Math.round(s.stake*s.q);
      const cls=fin?(hit?'won':'lost'):hit?'hot':'';
      const amt=fin?(hit?'+'+win:'0'):hit?'→ '+win:s.stake+' × '+fmtQ(s.q);
      return '<li class="'+cls+'"><b class="who">'+esc(book.players[s.p]?book.players[s.p].name:'?')+'</b><span class="what">'+slipText(s)+'</span><span class="n">'+amt+'</span></li>'}).join('');
    const hb=bar.offsetHeight+'x'+bar.offsetWidth;if(hb!==size.k){size.k=hb;size();fit()}   // Leiste hat sich verändert: Bild anpassen
  }
  function live(xs){if(on)render(xs.map((v,i)=>i).sort((a,b)=>xs[b]-xs[a]))}
  function done(order){render(order,true);clearTimeout(back);back=setTimeout(()=>view(false),15000)}
  window.addEventListener('resize',()=>{if(on){size();fit()}});SIDE.addEventListener&&SIDE.addEventListener('change',()=>{if(on){size();fit()}});
  return {view,live,done,get on(){return on}};
})();
