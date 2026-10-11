// Chaos-Derby – Wetten: Quoten aus Probeläufen, Wettarten, Kasse und Abrechnung. Kennt keine Grafik, läuft auch in Node.
const runSim=typeof module!=='undefined'?require('./sim.js').simulate:simulate;
const BANK=.85, START_CASH=100, ODDS_N=6000;          // Auszahlungsanteil, Startgeld je Spieler, Probeläufe für die Quoten
const BET={
  win:{name:'Sieg',help:'Der Starter gewinnt.',two:false,cap:99},
  place:{name:'Platz',help:'Der Starter wird Erster oder Zweiter.',two:false,cap:99},
  exacta:{name:'Zweierwette',help:'Erster und Zweiter in genau dieser Reihenfolge.',two:true,cap:250}
};
// Probeläufe zählen: Sieg, Platz (Rang 1 oder 2) und jede Einlaufkombination der ersten beiden
function tally(){return {N:0,win:[0,0,0,0,0,0],place:[0,0,0,0,0,0],ex:new Array(36).fill(0)}}
function count(tl,n,max){
  max=max||ODDS_N;
  for(let k=0;k<n&&tl.N<max;k++,tl.N++){
    const o=runSim(1000+tl.N*7919,false).order;
    tl.win[o[0]]++;tl.place[o[0]]++;tl.place[o[1]]++;tl.ex[o[0]*6+o[1]]++}
  return tl.N>=max}
// Quote = 0,85 / Chance, auf eine Nachkommastelle gerundet. Was angezeigt wird, wird auch ausgezahlt.
function quote(n,N,cap){const p=n/N;return p>0?Math.round(Math.min(cap,Math.max(1.1,BANK/p))*10)/10:cap}
function quotes(tl){
  const N=tl.N;
  return {N,
    pWin:tl.win.map(n=>n/N),
    win:tl.win.map(n=>quote(n,N,BET.win.cap)),
    place:tl.place.map(n=>quote(n,N,BET.place.cap)),
    ex:tl.ex.map((n,k)=>(k%7===0?0:quote(n,N,BET.exacta.cap)))}}
function computeQuotes(){const tl=tally();count(tl,ODDS_N);return quotes(tl)}
function betQuote(Q,type,a,b){return type==='exacta'?(a===b?0:Q.ex[a*6+b]):Q[type][a]}
function hits(s,order){
  if(s.type==='win')return order[0]===s.a;
  if(s.type==='place')return order[0]===s.a||order[1]===s.a;
  return order[0]===s.a&&order[1]===s.b}

/* ---------- Kasse: Mitspieler, Wettscheine, Abrechnung ---------- */
function newBook(){return {players:[],slips:[]}}
function addPlayer(bk,name){
  name=String(name||'').trim().slice(0,16);
  if(!name)return 'Bitte einen Namen eingeben.';
  if(bk.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))return name+' spielt schon mit.';
  bk.players.push({name,cash:START_CASH});return ''}
// Einsatz wird sofort von der Kasse abgezogen, die Quote gilt fest ab Abgabe
function placeBet(bk,Q,s){
  const pl=bk.players[s.p],stake=Math.floor(+s.stake);
  if(!pl)return 'Wer wettet? Erst einen Mitspieler anlegen.';
  if(!BET[s.type])return 'Unbekannte Wettart.';
  if(!(s.a>=0&&s.a<6)||(BET[s.type].two&&!(s.b>=0&&s.b<6)))return 'Bitte einen Starter wählen.';
  if(BET[s.type].two&&s.a===s.b)return 'Für die Zweierwette zwei verschiedene Starter wählen.';
  if(!(stake>=1))return 'Der Einsatz muss mindestens 1 sein.';
  if(stake>pl.cash)return pl.name+' hat nur noch '+pl.cash+' in der Kasse.';
  const slip={p:s.p,type:s.type,a:s.a,b:BET[s.type].two?s.b:-1,stake,q:betQuote(Q,s.type,s.a,s.b)};
  pl.cash-=stake;bk.slips.push(slip);return ''}
function cancelBet(bk,k){const s=bk.slips[k];if(!s)return;bk.players[s.p].cash+=s.stake;bk.slips.splice(k,1)}
function payout(s,order){return hits(s,order)?Math.round(s.stake*s.q):0}
function settle(bk,order){
  const res=bk.slips.map(s=>({...s,win:payout(s,order)}));
  res.forEach(r=>{bk.players[r.p].cash+=r.win});bk.slips=[];return res}

if(typeof module!=='undefined')module.exports={BANK,START_CASH,ODDS_N,BET,tally,count,quotes,computeQuotes,betQuote,hits,payout,newBook,addPlayer,placeBet,cancelBet,settle};
