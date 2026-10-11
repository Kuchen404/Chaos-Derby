// Chaos-Derby – rechnet Probeläufe für die Quoten neben der Seite, damit Vorstellung und Bedienung dabei nicht ruckeln.
// Auftrag: Bahnzustand, Feld und ein Bereich der Probeläufe [from,to). Jeder Probelauf hat seinen festen Startwert (siehe count in bets.js),
// deshalb ergeben mehrere Helfer zusammen genau dieselben Quoten wie ein Durchlauf am Stück.
importScripts('sim.js','bets.js');
onmessage=e=>{
  const {id,bod,field,from,to}=e.data,tl=tally(bod,field);tl.N=from;
  while(tl.N<to){count(tl,50,to);postMessage({id,n:tl.N-from})}
  postMessage({id,n:to-from,done:true,win:tl.win,place:tl.place,ex:tl.ex});
};
