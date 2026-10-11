// Prüft die Balance: simuliert viele Rennen und gibt Siegchancen und Quoten aus.
// Danach eine Gegenprobe mit anderen Rennen: Wie viel zahlt jede Wettart im Schnitt pro eingesetztem Taler aus?
// Aufruf: node tools/odds.js [Anzahl]
const {simulate,RUN}=require('../js/sim.js');
const B=require('../js/bets.js');
const N=+process.argv[2]||B.ODDS_N,tl=B.tally();let time=0;
B.count(tl,N,N);for(let k=0;k<N;k++)time+=simulate(1000+k*7919,false).winT;
const Q=B.quotes(tl);
console.log('Nr Starter              Sieg   Quote  Platz-Quote');
RUN.forEach((d,i)=>console.log(String(d.nr).padStart(2),d.name.padEnd(18),(Q.pWin[i]*100).toFixed(1).padStart(5)+' %',Q.win[i].toFixed(1).padStart(6),Q.place[i].toFixed(1).padStart(8)));
const ex=Q.ex.filter(q=>q>0).sort((a,b)=>a-b);
console.log('Zweierwette: Quoten von',ex[0].toFixed(1),'bis',ex[ex.length-1].toFixed(1)+',',Q.ex.filter(q=>q===B.BET.exacta.cap).length,'Kombinationen an der Obergrenze');
console.log('Mittlere Siegerzeit:',(time/N).toFixed(1),'s');
// Gegenprobe: auf jeden Starter bzw. jede Kombination 1 Taler, mit Rennen, die nicht in die Quoten eingeflossen sind
const M=Math.min(N,3000),back={win:0,place:0,exacta:0},put={win:0,place:0,exacta:0};
for(let k=0;k<M;k++){const o=simulate(7+k*104729,false).order;
  for(let a=0;a<6;a++){for(const t of ['win','place']){put[t]++;back[t]+=B.payout({type:t,a,stake:1,q:B.betQuote(Q,t,a)},o)}
    for(let b=0;b<6;b++)if(a!==b){put.exacta++;back.exacta+=B.payout({type:'exacta',a,b,stake:1,q:B.betQuote(Q,'exacta',a,b)},o)}}}
console.log('Auszahlung je Taler in '+M+' neuen Rennen (Ziel 0,85):',Object.keys(B.BET).map(t=>B.BET[t].name+' '+(back[t]/put[t]).toFixed(2)).join(', '));
