// Chaos-Derby – Wetten am eigenen Handy. Der Fernseher bleibt die Kasse: Er nimmt Wetten an, prüft sie mit js/bets.js und rechnet ab.
// Handys verbinden sich per QR-Code (handy.html?raum=CODE) direkt mit ihm. Sie bekommen nur Feld, Quoten, die eigene Kasse,
// die eigenen Wetten und nach dem Rennen den Einlauf, nie das Rennen selbst: Zuschauen geht nur gemeinsam am Fernseher.
// Ohne Verbindung (Server nicht erreichbar, kein peerjs) bleibt alles wie vorher, das Wettbüro auf der Seite funktioniert weiter.
const remote=(()=>{
  const SAVE='chaosderby.raum',conns=new Set();
  let code='',peer=null,ready=false,fails=0,timer=0;
  try{code=LINK.clean(localStorage.getItem(SAVE))}catch(e){}
  if(code.length!==5)code=LINK.newCode();
  const keep=()=>{try{localStorage.setItem(SAVE,code)}catch(e){}};
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const who=c=>book.players.findIndex(p=>p.name===c.who);
  const send=(c,m)=>{try{if(c.open)c.send(m)}catch(e){}};
  // Ablauf aus Sicht des Handys: Quoten kommen, Wetten offen, Rennen läuft (am Fernseher), abgerechnet
  const phase=()=>betsOpen?(Q?'open':'wait'):lastRes?'done':'run';

  function stateFor(c){
    const k=who(c),me=k>=0?book.players[k]:null;
    if(!me)c.who='';                                    // etwa nach „Kasse zurücksetzen“
    book.slips.forEach(s=>{s.id=s.id||Math.random().toString(36).slice(2,10)});
    const sl=s=>({id:s.id,type:s.type,a:s.a,b:s.b,stake:s.stake,q:s.q});
    return {t:'st',phase:phase(),me:me&&{name:me.name,cash:me.cash},bod:BODEN[race.bod].name,
      field:RUN.map(d=>({nr:d.nr,name:d.name,kind:d.kind,col:d.col,ink:d.ink})),
      types:Object.keys(BET).map(t=>({t,name:BET[t].name,help:BET[t].help,two:BET[t].two})),
      q:Q&&{key:Q.key,win:Q.win,place:Q.place,ex:Q.ex},
      slips:me?book.slips.filter(s=>s.p===k).map(sl):[],
      res:me&&lastRes?lastRes.filter(r=>r.p===k).map(r=>Object.assign(sl(r),{win:r.win})):null,
      order:lastRes?race.order.slice(0,3):null}
  }
  function push(){clearTimeout(timer);timer=setTimeout(()=>{conns.forEach(c=>send(c,stateFor(c)));show()},30)}
  const tell=(c,err,ok)=>send(c,{t:'msg',err:err||'',ok:!!ok});

  // Anmelden mit Namen. Das Handy merkt sich ein Kennwort (tok), damit es nach dem Neuladen wieder dieselbe Kasse bekommt.
  // Wer schon am Fernseher eingetragen ist, kann seine Kasse einmal aufs Handy holen.
  function join(c,m){
    const name=String(m.name||'').trim().slice(0,16),tok=String(m.tok||'').slice(0,40);
    if(!tok)return tell(c,'Anmeldung fehlgeschlagen, bitte die Seite neu laden.');
    let k=book.players.findIndex(p=>p.name.toLowerCase()===name.toLowerCase());
    if(k>=0&&book.players[k].tok&&book.players[k].tok!==tok)return tell(c,name+' spielt schon mit. Bitte einen anderen Namen wählen.');
    if(k<0){const err=addPlayer(book,name);if(err)return tell(c,err);k=book.players.length-1}
    book.players[k].tok=tok;c.who=book.players[k].name;
    saveBook();renderBets();tell(c,'',true)
  }
  function bet(c,k,m){
    if(!betsOpen||!Q)return tell(c,'Die Wetten sind geschlossen.');
    if(m.key!==Q.key)return tell(c,'Inzwischen gibt es ein neues Rennen mit neuen Quoten. Bitte noch einmal prüfen.');
    const type=String(m.type),a=+m.a,b=+m.b;
    if(!own(BET,type)||!Number.isInteger(a)||(BET[type].two&&!Number.isInteger(b)))return tell(c,'Bitte einen Starter wählen.');
    const err=placeBet(book,Q,{p:k,type,a,b,stake:m.stake});
    if(err)return tell(c,err);
    saveBook();renderBets();tell(c,'',true)
  }
  function onData(c,m){
    if(!m||typeof m!=='object')return;
    if(m.t==='sync')return send(c,stateFor(c));
    if(m.t==='hi')return join(c,m);
    const k=who(c);if(k<0)return tell(c,'Bitte zuerst mit Namen anmelden.');
    if(m.t==='bet')return bet(c,k,m);
    if(m.t==='del'){
      if(!betsOpen)return tell(c,'Das Rennen läuft schon, die Wette gilt.');
      const i=book.slips.findIndex(s=>s.id===m.id&&s.p===k);if(i>=0){cancelBet(book,i);saveBook();renderBets()}
    }
  }

  function open(){
    if(typeof Peer==='undefined'){show('Handy-Wetten nicht verfügbar.');return}
    peer=new Peer(LINK.id(code),LINK.opts());
    peer.on('open',()=>{ready=true;fails=0;keep();show()});
    peer.on('connection',c=>{
      c.on('open',()=>{conns.add(c);send(c,stateFor(c));show()});
      c.on('data',m=>onData(c,m));
      c.on('close',()=>{conns.delete(c);show();renderBets()});
      c.on('error',()=>{});
    });
    peer.on('disconnected',()=>{ready=false;show()});
    peer.on('error',e=>{
      if(e.type==='peer-unavailable')return;
      // Raumcode noch belegt (etwa die alte Seite kurz nach dem Neuladen, oder ein zweiter Tab): erst noch einmal versuchen, dann neuer Code
      if(e.type==='unavailable-id'){peer.destroy();peer=null;if(++fails>=3){code=LINK.newCode();fails=0}setTimeout(open,2000);return}
      ready=false;show('Handy-Wetten gerade nicht möglich, der Vermittlungsserver ist nicht erreichbar. Neuer Versuch läuft.');
    });
  }
  // Wächter: Verbindung zum Vermittlungsserver verloren oder nie zustande gekommen. Schon verbundene Handys bleiben dabei verbunden,
  // neue kommen erst nach dem Wiederverbinden dazu.
  setInterval(()=>{if(!peer)return;if(peer.destroyed){peer=null;open()}else if(peer.disconnected)peer.reconnect()},10000);

  // QR-Code im Wettbüro und klein im Sendebild, solange die Wetten offen sind
  let shown='';
  function show(msg){
    const url=LINK.phoneUrl(code),n=conns.size;
    if(shown!==url&&typeof qrcode==='function'){
      shown=url;const q=qrcode(0,'M');q.addData(url);q.make();
      const svg=q.createSvgTag({cellSize:4,margin:2,scalable:true,alt:'QR-Code zum Wetten am Handy'});
      $('qr').innerHTML=svg;$('tvqrc').innerHTML=svg;
      $('hurl').href=url;$('hurl').textContent=url.replace(/^https?:\/\//,'').replace(/\?.*$/,'');$('hcode').textContent=code;
    }
    $('handy').hidden=false;$('hon').hidden=!ready;
    $('hmsg').textContent=msg||(ready?(n?n+(n>1?' Handys':' Handy')+' verbunden.':'Noch kein Handy verbunden.'):'Verbindung wird hergestellt …');
    $('tvqr').hidden=!ready||!betsOpen;
  }
  if(typeof window!=='undefined')setTimeout(open,0);
  return {push,online:name=>[...conns].some(c=>c.who===name),get code(){return code}};
})();
