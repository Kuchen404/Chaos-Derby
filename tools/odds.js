// Prüft die Balance: simuliert viele Rennen und gibt Siegchancen und Quoten aus,
// über alle Bahnzustände gemischt und je Bahnzustand (das Spiel rechnet die Quoten je Boden).
// Danach eine Gegenprobe mit anderen Rennen: Wie viel zahlt jede Wettart im Schnitt pro eingesetztem Taler aus?
// Aufruf: node tools/odds.js [Anzahl]
const {simulate,RUN,BODEN,drawBoden}=require('../js/sim.js');
const B=require('../js/bets.js');
const N=+process.argv[2]||B.ODDS_N;
// gemischt: Boden wie im Spiel ausgelost
const mixW=RUN.map(()=>0);let mixT=0;
for(let k=0;k<N;k++){const r=simulate(1000+k*7919,false,drawBoden(((k*2654435761)>>>0)/4294967296));mixW[r.order[0]]++;mixT+=r.winT}
// je Boden: genau die Quoten, die das Spiel anzeigt
const per=BODEN.map((d,b)=>{const tl=B.tally(b);B.count(tl,N,N);let time=0;for(let k=0;k<N;k++)time+=simulate(1000+k*7919,false,b).winT;return {Q:B.quotes(tl),time:time/N}});
console.log('Siegchance und Sieg-Quote je Boden ('+N+' Rennen)');
console.log('Nr Starter              gemischt |'+BODEN.map(b=>b.name.padStart(16)).join(''));
RUN.forEach((d,i)=>console.log(String(d.nr).padStart(2),d.name.padEnd(18),((mixW[i]/N*100).toFixed(1)+' %').padStart(8),'|'+per.map(r=>((r.Q.pWin[i]*100).toFixed(1)+' % '+r.Q.win[i].toFixed(1).padStart(5)).padStart(16)).join('')));
console.log('Platz-Quoten:',BODEN.map((d,b)=>d.name+' '+per[b].Q.place.map(q=>q.toFixed(1)).join('/')).join(' | '));
per.forEach((r,b)=>{const ex=r.Q.ex.filter(q=>q>0).sort((a,c)=>a-c);
  console.log('Zweierwette '+BODEN[b].name+': Quoten von',ex[0].toFixed(1),'bis',ex[ex.length-1].toFixed(1)+',',r.Q.ex.filter(q=>q===B.BET.exacta.cap).length,'Kombinationen an der Obergrenze')});
console.log('Mittlere Siegerzeit:',(mixT/N).toFixed(1),'s |',per.map((r,b)=>BODEN[b].name+' '+r.time.toFixed(1)+' s').join(', '));
// Gegenprobe: auf jeden Starter bzw. jede Kombination 1 Taler, mit Rennen, die nicht in die Quoten eingeflossen sind
const M=Math.min(N,3000),back={win:0,place:0,exacta:0},put={win:0,place:0,exacta:0};
for(let k=0;k<M;k++){const b=drawBoden(((k*40503+17)>>>0)%65536/65536),Q=per[b].Q,o=simulate(7+k*104729,false,b).order;
  for(let a=0;a<6;a++){for(const t of ['win','place']){put[t]++;back[t]+=B.payout({type:t,a,stake:1,q:B.betQuote(Q,t,a)},o)}
    for(let c=0;c<6;c++)if(a!==c){put.exacta++;back.exacta+=B.payout({type:'exacta',a,b:c,stake:1,q:B.betQuote(Q,'exacta',a,c)},o)}}}
console.log('Auszahlung je Taler in '+M+' neuen Rennen, Boden ausgelost (Ziel 0,85):',Object.keys(B.BET).map(t=>B.BET[t].name+' '+(back[t]/put[t]).toFixed(2)).join(', '));
