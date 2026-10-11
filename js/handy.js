// Chaos-Derby – Wettschein am Handy (handy.html?raum=CODE). Verbindet sich direkt mit dem Fernseher (js/remote.js),
// der Kasse und Quoten führt und jede Wette prüft. Das Handy zeigt das Rennen nicht: Zugeschaut wird gemeinsam am Fernseher.
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const fmtQ=q=>q.toFixed(1).replace('.',',');
const SAVE='chaosderby.handy';
let mem={};try{mem=JSON.parse(localStorage.getItem(SAVE))||{}}catch(e){}
if(!mem.tok)mem.tok=Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);   // Kennwort dieses Handys
mem.names=mem.names||{};
const keep=()=>{try{localStorage.setItem(SAVE,JSON.stringify(mem))}catch(e){}};keep();

let code=LINK.clean(new URLSearchParams(location.search).get('raum')),peer=null,conn=null,retry=0;
let st=null,sel={t:'win',a:-1,b:-1},key='',busy=false;

/* ---------- Verbindung ---------- */
function status(s,ok){$('conn').textContent=s;$('conn').className='pill'+(ok?' open':'')}
function later(ms){clearTimeout(retry);retry=setTimeout(connect,ms)}
function connect(){
  clearTimeout(retry);
  if(!code){$('code').hidden=false;status('Raumcode fehlt');return}
  $('raum').textContent=' · Raum '+code;
  if(!peer||peer.destroyed){
    peer=new Peer(LINK.opts());
    peer.on('open',()=>connect());
    peer.on('disconnected',()=>{if(!peer.destroyed)later(3000)});
    peer.on('error',e=>{
      if(e.type==='peer-unavailable'){status('Kein Fernseher in Raum '+code+'. Läuft das Spiel dort noch?');later(5000);return}
      if(e.type==='browser-incompatible'){status('Dieser Browser kann keine direkte Verbindung aufbauen.');return}
      status('Vermittlungsserver nicht erreichbar, neuer Versuch …');if(peer.destroyed)peer=null;later(6000)});
    return}
  if(peer.disconnected){peer.reconnect();return}
  if(!peer.open)return;
  if(conn&&conn.open)return;
  if(conn)conn.close();
  status('Verbinde mit dem Fernseher …');
  const c=conn=peer.connect(LINK.id(code),{serialization:'json',reliable:true});
  c.on('open',()=>{if(conn!==c)return;status('Verbunden',true);st=null;hello()});
  c.on('data',m=>{if(conn===c)onData(m)});
  c.on('close',()=>{if(conn!==c)return;conn=null;busy=false;status('Verbindung unterbrochen, neuer Versuch …');later(2000)});
  c.on('error',()=>{});
}
// Anmelden (oder nur den Stand abfragen), bis der Fernseher antwortet: Die allererste Nachricht geht auf manchen Verbindungen verloren
function hello(){
  if(!(conn&&conn.open))return;
  const n=mem.names[code];
  if(st&&(st.me||!n))return;
  conn.send(n?{t:'hi',name:n,tok:mem.tok}:{t:'sync'});
  clearTimeout(hello.t);hello.t=setTimeout(hello,2000)}
// Handys schlafen gern ein und verlieren dabei die Verbindung; beim Aufwachen gleich neu verbinden
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!(conn&&conn.open))connect()});
const send=m=>{if(conn&&conn.open){conn.send(m);return true}toast('Keine Verbindung zum Fernseher.',true);return false};

function onData(m){
  if(!m||typeof m!=='object')return;
  if(m.t==='msg'&&m.err&&!(st&&st.me)){delete mem.names[code];keep();hello()}   // Anmeldung abgelehnt, etwa Name vergeben
  if(m.t==='msg'){busy=false;if(m.err)toast(m.err,true);else if(m.ok&&st&&st.me)toast(lastAct==='bet'?'Wette angenommen.':'',false);lastAct='';render();return}
  if(m.t==='st'){st=m;if(st.q&&st.q.key!==key){key=st.q.key;sel={t:sel.t,a:-1,b:-1}}render()}
}
let lastAct='',toastT=0;
function toast(s,bad){if(!s)return;$('msg').textContent=s;$('msg').className='toast'+(bad?' bad':'');$('msg').hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{$('msg').hidden=true},bad?5000:2500)}

/* ---------- Anzeige ---------- */
const runner=i=>{const d=st.field[i];return '<span class="nr sm" style="background:'+esc(d.col)+';color:'+esc(d.ink)+'">'+esc(d.nr)+'</span>'};
const typeOf=t=>st.types.find(x=>x.t===t)||st.types[0];
const slipText=s=>esc(typeOf(s.type).name)+' '+runner(s.a)+(s.b>=0?'<span class="then">vor</span>'+runner(s.b):'');
const quoteOf=(t,a,b)=>!st.q||a<0?0:t==='exacta'?(b<0||a===b?0:st.q.ex[a*6+b]):st.q[t][a];
function render(){
  const joined=!!(st&&st.me);
  $('join').hidden=!st||joined;$('game').hidden=!joined;$('me').hidden=!joined;
  if(!st)return;
  if(!joined){if(!$('name').value)$('name').value=mem.names[code]||'';return}
  $('mename').textContent=st.me.name;$('mecash').textContent=st.me.cash+' Taler';
  const ph=st.phase;
  $('banner').className='banner '+ph;
  $('banner').innerHTML=ph==='wait'?'Die Buchmacher rechnen die Quoten aus. Gleich kannst du wetten.'
    :ph==='open'?'Wetten offen. Am Fernseher werden gerade die Starter vorgestellt.'
    :ph==='run'?'<b>Das Rennen läuft!</b> Schau auf den Fernseher.'
    :'<b>Rennen vorbei.</b> Das nächste Rennen startet am Fernseher.';
  $('slip').hidden=ph!=='open';
  if(ph==='open')slip();
  $('slips').innerHTML=st.slips.length?st.slips.map(s=>'<li><span class="what">'+slipText(s)+'</span><span class="n">'+s.stake+' × '+fmtQ(s.q)+'</span>'+(ph==='open'?'<button type="button" class="x" data-id="'+esc(s.id)+'" aria-label="Wette zurücknehmen">×</button>':'')+'</li>').join('')
    :'<li class="empty">'+(ph==='open'||ph==='wait'?'Noch keine Wetten für dieses Rennen.':'Keine offenen Wetten.')+'</li>';
  $('mine').hidden=ph==='done'&&!st.slips.length;
  $('res').hidden=!st.order;
  if(st.order){
    $('order').innerHTML=st.order.map(i=>'<li>'+runner(i)+'<span>'+esc(st.field[i].name)+'</span></li>').join('');
    const r=st.res||[],sum=r.reduce((a,x)=>a+x.win,0);
    $('paid').innerHTML=r.length?r.map(x=>'<li class="'+(x.win?'won':'lost')+'"><span class="what">'+slipText(x)+'</span><span class="n">'+(x.win?'+'+x.win:'0')+'</span></li>').join('')+'<li class="total"><span>'+(sum?'Gewonnen':'Diesmal nichts gewonnen')+'</span><b>'+(sum?'+'+sum:'')+'</b></li>'
      :'<li class="empty">Du hattest in diesem Rennen keine Wette.</li>';
  }
}
function slip(){
  const T=typeOf(sel.t);sel.t=T.t;
  $('bod').textContent='Boden '+st.bod;
  $('types').innerHTML=st.types.map(x=>'<button type="button" data-t="'+x.t+'" aria-pressed="'+(x.t===sel.t)+'">'+esc(x.name)+'</button>').join('');
  $('help').textContent=T.help+(T.two?' Tippe erst den Ersten, dann den Zweiten an.':'');
  $('pick').innerHTML=st.field.map((d,i)=>{
    const mark=i===sel.a?(T.two?'1.':'✓'):i===sel.b&&T.two?'2.':'';
    const q=T.two?(sel.a>=0&&i!==sel.a?quoteOf('exacta',sel.a,i):0):quoteOf(sel.t,i);
    return '<li><button type="button" data-i="'+i+'" aria-pressed="'+!!mark+'">'+runner(i)+'<span class="nm"><b>'+esc(d.name)+'</b><small>'+esc(d.kind)+'</small></span><span class="qq">'+(q?fmtQ(q):'')+'</span><span class="mk">'+mark+'</span></button></li>'}).join('');
  preview();
}
function preview(){
  const q=quoteOf(sel.t,sel.a,sel.b),s=Math.floor(+$('stake').value);
  $('q').textContent=q?fmtQ(q):'–';$('w').textContent=q&&s>0?Math.round(s*q):'–';
  $('go').disabled=busy||!q||!(s>=1);
}

/* ---------- Bedienung ---------- */
$('code').onsubmit=e=>{e.preventDefault();const c=LINK.clean($('codein').value);if(c.length!==5){toast('Der Code hat fünf Zeichen.',true);return}
  code=c;$('code').hidden=true;history.replaceState(null,'',LINK.phoneUrl(c));connect()};
$('join').onsubmit=e=>{e.preventDefault();const n=$('name').value.trim();if(!n){toast('Bitte einen Namen eingeben.',true);return}
  mem.names[code]=n;keep();send({t:'hi',name:n,tok:mem.tok})};
$('types').onclick=e=>{const b=e.target.closest('button');if(!b)return;sel={t:b.dataset.t,a:-1,b:-1};render()};
$('pick').onclick=e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i;
  if(!typeOf(sel.t).two)sel.a=i;
  else if(sel.a<0||sel.b>=0)sel={t:sel.t,a:i,b:-1};
  else if(i===sel.a)sel.a=-1;
  else sel.b=i;
  render()};
$('chips').onclick=e=>{const b=e.target.closest('button');if(!b||!st||!st.me)return;$('stake').value=b.dataset.s==='all'?st.me.cash:b.dataset.s;preview()};
$('stake').oninput=preview;
$('slip').onsubmit=e=>{e.preventDefault();if(busy||!st||!st.q)return;
  if(send({t:'bet',key:st.q.key,type:sel.t,a:sel.a,b:sel.b,stake:$('stake').value})){busy=true;lastAct='bet';preview();setTimeout(()=>{if(busy){busy=false;preview()}},5000)}};
$('slips').onclick=e=>{const id=e.target.dataset&&e.target.dataset.id;if(id){lastAct='del';send({t:'del',id})}};
if(code)$('codein').value=code;
if(typeof Peer==='undefined')status('Verbindungsbaustein fehlt, bitte neu laden.');else connect();
