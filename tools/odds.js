// Prüft die Balance: simuliert viele Rennen und gibt Siegchancen und Quoten aus.
// Aufruf: node tools/odds.js [Anzahl]
const {simulate,RUN}=require('../js/sim.js');
const N=+process.argv[2]||3000,wins=RUN.map(()=>0);let time=0;
for(let k=0;k<N;k++){const r=simulate(1000+k*7919,false);wins[r.order[0]]++;time+=r.winT}
RUN.forEach((d,i)=>{const p=wins[i]/N;console.log(String(d.nr).padStart(2),d.name.padEnd(18),(p*100).toFixed(1).padStart(5)+' %','Quote',(p>0?Math.min(99,Math.max(1.1,.85/p)):99).toFixed(1))});
console.log('Mittlere Siegerzeit:',(time/N).toFixed(1),'s');
