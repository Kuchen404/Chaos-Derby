// Prüft die Balance. Pro Rennen laufen 6 der 12 Starter, deshalb drei Blicke:
// 1. ausgeloste Felder und Böden wie im Spiel: Wie oft gewinnt jeder Starter, wenn er dabei ist? (fair wäre 1/6 = 16,7 %)
// 2. das ursprüngliche Feld je Boden, mit den Quoten, die das Spiel dafür anzeigen würde
// 3. Gegenprobe: Wie viel zahlt jede Wettart im Schnitt pro eingesetztem Taler aus, mit Rennen, die nicht in die Quoten eingeflossen sind?
// Aufruf: node tools/odds.js [Anzahl]
const {simulate,ROSTER,CLASSIC,BODEN,drawBoden,drawField,rng}=require('../js/sim.js');
const B=require('../js/bets.js');
const N=+process.argv[2]||B.ODDS_N;
const pct=x=>(x*100).toFixed(1).padStart(5)+' %';

// 1. ausgeloste Felder
const R=rng(4242),start=ROSTER.map(()=>0),wins=ROSTER.map(()=>0),top2=ROSTER.map(()=>0),byB=BODEN.map(()=>ROSTER.map(()=>[0,0]));let time=0;
for(let k=0;k<N;k++){const b=drawBoden(R()),f=drawField(R),r=simulate(1000+k*7919,false,b,f);
  f.forEach(q=>{start[q]++;byB[b][q][0]++});wins[f[r.order[0]]]++;byB[b][f[r.order[0]]][1]++;top2[f[r.order[0]]]++;top2[f[r.order[1]]]++;time+=r.winT}
console.log('Ausgeloste Felder ('+N+' Rennen): Siegchance, wenn der Starter dabei ist (fair: 16,7 %)');
console.log('Nr Starter              Sieg  Platz |'+BODEN.map(b=>b.name.padStart(9)).join(''));
ROSTER.forEach((d,q)=>console.log(String(d.nr).padStart(2),d.name.padEnd(16),pct(wins[q]/start[q]),pct(top2[q]/start[q]),'|'+byB.map(x=>pct(x[q][1]/Math.max(1,x[q][0])).padStart(9)).join('')));
console.log('Mittlere Siegerzeit:',(time/N).toFixed(1),'s');

// 2. ursprüngliches Feld je Boden
const per=BODEN.map((d,b)=>{const tl=B.tally(b,CLASSIC);B.count(tl,N,N);return B.quotes(tl)});
console.log('\nUrsprüngliches Feld: Siegchance und Sieg-Quote je Boden');
CLASSIC.forEach((q,i)=>console.log(String(ROSTER[q].nr).padStart(2),ROSTER[q].name.padEnd(16),'|'+per.map(Q=>(pct(Q.pWin[i])+Q.win[i].toFixed(1).padStart(6)).padStart(16)).join('')));

// 3. Gegenprobe mit ausgelosten Feldern: Quoten aus weniger Probeläufen je Feld, dann neue Rennen mit demselben Feld
const M=Math.min(40,Math.ceil(N/150)),back={win:0,place:0,exacta:0},put={win:0,place:0,exacta:0},R2=rng(777);
for(let k=0;k<M;k++){const b=drawBoden(R2()),f=drawField(R2),tl=B.tally(b,f);B.count(tl,3000,3000);const Q=B.quotes(tl);
  for(let m=0;m<75;m++){const o=simulate(7+(k*75+m)*104729,false,b,f).order;
    for(let a=0;a<6;a++){for(const t of ['win','place']){put[t]++;back[t]+=B.payout({type:t,a,stake:1,q:B.betQuote(Q,t,a)},o)}
      for(let c=0;c<6;c++)if(a!==c){put.exacta++;back.exacta+=B.payout({type:'exacta',a,b:c,stake:1,q:B.betQuote(Q,'exacta',a,c)},o)}}}}
console.log('\nAuszahlung je Taler in '+M*75+' neuen Rennen, '+M+' ausgeloste Felder (Ziel 0,85):',Object.keys(B.BET).map(t=>B.BET[t].name+' '+(back[t]/put[t]).toFixed(2)).join(', '));
