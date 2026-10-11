// Prüft die Balance: simuliert viele Rennen und gibt Siegchancen und Quoten aus,
// über alle Bahnzustände gemischt und je Bahnzustand.
// Aufruf: node tools/odds.js [Anzahl]
const {simulate,RUN,BODEN,drawBoden}=require('../js/sim.js');
const N=+process.argv[2]||3000;
function run(pick){const wins=RUN.map(()=>0);let time=0;
  for(let k=0;k<N;k++){const s=1000+k*7919,r=simulate(s,false,pick(k));wins[r.order[0]]++;time+=r.winT}
  return {p:wins.map(w=>w/N),time:time/N}}
const quote=p=>(p>0?Math.min(99,Math.max(1.1,.85/p)):99).toFixed(1);
const mix=run(k=>drawBoden(((k*2654435761)>>>0)/4294967296)),per=BODEN.map((b,j)=>run(()=>j));
console.log('Nr Starter              gemischt  Quote |'+BODEN.map(b=>b.name.padStart(8)).join(''));
RUN.forEach((d,i)=>console.log(String(d.nr).padStart(2),d.name.padEnd(18),(mix.p[i]*100).toFixed(1).padStart(6)+' %',quote(mix.p[i]).padStart(6),'|'+per.map(r=>((r.p[i]*100).toFixed(1)+' %').padStart(8)).join('')));
console.log('Mittlere Siegerzeit:',mix.time.toFixed(1),'s |',per.map((r,j)=>BODEN[j].name+' '+r.time.toFixed(1)+' s').join(', '));
