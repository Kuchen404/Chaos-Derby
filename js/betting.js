// Chaos-Derby – Wettbüro am gemeinsamen Bildschirm: Mitspieler mit Spielgeld, Wettschein, Abrechnung nach dem Rennen
let Q=null,book=newBook(),betsOpen=true,lastRes=null;
const SAVE='chaosderby.kasse';
try{const s=JSON.parse(localStorage.getItem(SAVE));if(s&&Array.isArray(s.players)&&Array.isArray(s.slips))book=s}catch(e){}
function saveBook(){try{localStorage.setItem(SAVE,JSON.stringify(book))}catch(e){}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const runner=i=>'<span class="nr sm" style="background:'+RUN[i].col+';color:'+RUN[i].ink+'">'+RUN[i].nr+'</span>';
const slipText=s=>BET[s.type].name+' '+runner(s.a)+(s.b>=0?'<span class="then">vor</span>'+runner(s.b):'');
const fmtQ=q=>q.toFixed(1).replace('.',',');

function renderBets(){
  const opts=RUN.map((d,i)=>'<option value="'+i+'">'+d.nr+' '+esc(d.name)+'</option>').join('');
  if(!$('ba').options.length){$('ba').innerHTML=opts;$('bb').innerHTML=opts;$('bb').value='1'}
  const sel=$('bp').value;
  $('bp').innerHTML=book.players.map((p,k)=>'<option value="'+k+'">'+esc(p.name)+'</option>').join('');
  if(sel&&book.players[sel])$('bp').value=sel;
  $('players').innerHTML=book.players.length?book.players.map(p=>'<li><span>'+esc(p.name)+'</span><b>'+p.cash+'</b></li>').join(''):'<li class="empty">Noch niemand dabei. Jeder startet mit '+START_CASH+' Talern.</li>';
  $('slips').innerHTML=book.slips.length?book.slips.map((s,k)=>'<li><span class="who">'+esc(book.players[s.p].name)+'</span><span class="what">'+slipText(s)+'</span><span class="n">'+s.stake+' × '+fmtQ(s.q)+'</span>'+(betsOpen?'<button class="x" data-k="'+k+'" aria-label="Wette zurücknehmen">×</button>':'')+'</li>').join(''):'<li class="empty">'+(betsOpen?'Noch keine Wetten für dieses Rennen.':'Keine Wetten in diesem Rennen.')+'</li>';
  $('slips').hidden=!!lastRes&&!book.slips.length;$('result').hidden=!lastRes;
  if(lastRes)$('result').innerHTML='<h3>Abrechnung</h3><ul>'+(lastRes.length?lastRes.map(r=>'<li class="'+(r.win?'won':'lost')+'"><span class="who">'+esc(book.players[r.p].name)+'</span><span class="what">'+slipText(r)+'</span><span class="n">'+(r.win?'+'+r.win:'0')+'</span></li>').join(''):'<li class="empty">Es wurde nicht gewettet.</li>')+'</ul>';
  const two=BET[$('bt').value].two;$('bbl').hidden=!two;$('bal').textContent=two?'Erster':'Starter';
  $('bhelp').textContent=BET[$('bt').value].help;
  $('bgo').disabled=!betsOpen||!Q||!book.players.length;
  $('betstate').textContent=!Q?'Quoten werden berechnet …':betsOpen?'Wetten offen':'Wetten geschlossen';
  $('betstate').className='pill'+(betsOpen&&Q?' open':'');
  slipPreview();
}
function slipPreview(){
  const a=+$('ba').value,b=+$('bb').value,t=$('bt').value,st=Math.floor(+$('bs').value);
  const q=Q?betQuote(Q,t,a,b):0;
  $('bq').textContent=q?fmtQ(q):'–';$('bw').textContent=q&&st>0?Math.round(st*q):'–';
}
function betMsg(s){$('berr').textContent=s;$('berr').hidden=!s}
function setQuotes(q){Q=q;renderBets()}
// Ab dem Start sind keine Wetten mehr möglich, abgerechnet wird einmal je Rennen
function closeBets(){if(!betsOpen)return;betsOpen=false;betMsg('');renderBets()}
function openBets(){betsOpen=true;lastRes=null;renderBets()}
// Quoten gelten nur für den Boden, auf dem gewettet wurde. Wechselt der Boden, gehen offene Wetten an die Kasse zurück.
function dropStaleBets(b){
  let n=0;for(let k=book.slips.length-1;k>=0;k--)if(book.slips[k].bod!==b){cancelBet(book,k);n++}
  if(n){saveBook();betMsg('Neuer Boden, neue Quoten: '+(n>1?n+' offene Wetten wurden':'eine offene Wette wurde')+' zurückgegeben.');renderBets()}}
function settleBets(order){if(race.settled)return null;race.settled=true;lastRes=settle(book,order);saveBook();renderBets();return lastRes}

$('addp').onsubmit=e=>{e.preventDefault();const err=addPlayer(book,$('pname').value);betMsg(err);if(!err){$('pname').value='';saveBook();renderBets();$('bp').value=book.players.length-1}};
$('slip').onsubmit=e=>{e.preventDefault();if(!betsOpen||!Q)return;
  const err=placeBet(book,Q,{p:+$('bp').value,type:$('bt').value,a:+$('ba').value,b:+$('bb').value,stake:$('bs').value});
  betMsg(err);if(!err){saveBook();renderBets()}};
$('slips').onclick=e=>{const k=e.target.dataset&&e.target.dataset.k;if(k!=null&&betsOpen){cancelBet(book,+k);saveBook();renderBets()}};
['bt','ba','bb'].forEach(id=>$(id).onchange=()=>{betMsg('');renderBets()});$('bs').oninput=slipPreview;
$('resetp').onclick=()=>{if(confirm('Alle Mitspieler, Kassen und offenen Wetten löschen?')){book=newBook();lastRes=null;saveBook();renderBets()}};
renderBets();
