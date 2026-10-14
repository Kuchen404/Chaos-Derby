// Chaos-Derby – Rennsimulation: Starter, Ereignisse, Kommentar. Läuft im Browser und in Node (siehe tools/odds.js).
const L=1200, DT=1/30, FIELD=6;
// Alle Starter. Pro Rennen laufen FIELD davon (siehe drawField); die Startnummer bleibt fest.
// v: Grundtempo m/s, late: Faktor für die zweite Rennhälfte, rain: Faktor bei Regen, bod: Faktor je Bahnzustand [gut, weich, schwer]
const ROSTER=[
 {id:'pferd',nr:1,name:'Sekundenschlaf',kind:'Pferd',trait:'Schnell, schläft in Führung aber gern ein',col:'#d2232a',ink:'#fff',v:23.55,late:-.04,rain:.85,bod:[1,.97,.95]},
 {id:'alpaka',nr:2,name:'Hals über Kopf',kind:'Alpaka',trait:'Streckt im Ziel den Hals, frisst unterwegs',col:'#f2b600',ink:'#111',v:21.5,late:.02,rain:.85,bod:[1,.99,.97]},
 {id:'stier',nr:3,name:'Dampfwalze',kind:'Stier',trait:'Langsam, räumt beim Sturmlauf alles ab',col:'#2f6fb8',ink:'#fff',v:18.37,late:.03,rain:.95,bod:[1,1,.99]},
 {id:'husky',nr:4,name:'Schmuddelwetter',kind:'Husky',trait:'Trottet lustlos, außer es regnet',col:'#12a08f',ink:'#fff',v:20.09,late:0,rain:2.33,bod:[1,1,1]},
 {id:'aufrecht',nr:5,name:'Aufrechter Gang',kind:'Pferd auf zwei Beinen',trait:'Der Schnellste, läuft manchmal zurück',col:'#8e44ad',ink:'#fff',v:25.8,late:0,rain:.8,bod:[1,.97,.95]},
 {id:'kuh',nr:6,name:'Spätzünder',kind:'Kuh mit Rakete',trait:'Trottet, bis die Rakete zündet',col:'#e0559b',ink:'#fff',v:13.35,late:0,rain:1,bod:[1,.98,.96]},
 {id:'esel',nr:7,name:'Sturkopf',kind:'Esel',trait:'Bleibt stur stehen, bis ihn einer überholt',col:'#ef7d1a',ink:'#111',v:22.36,late:.02,rain:.95,bod:[1,.99,.97]},
 {id:'hirsch',nr:8,name:'Platzhirsch',kind:'Hirsch',trait:'Springt in großen Sätzen, landet nicht immer',col:'#7a4b2a',ink:'#fff',v:21.05,late:0,rain:.9,bod:[1,.98,.95]},
 {id:'reh',nr:9,name:'Schreckhaft',kind:'Reh',trait:'Sehr schnell, erstarrt aber bei jedem Krach',col:'#f4f4f4',ink:'#111',v:23.85,late:0,rain:.85,bod:[1,.97,.94]},
 {id:'fuchs',nr:10,name:'Schlitzohr',kind:'Fuchs',trait:'Hängt sich hinter andere und zieht spät vorbei',col:'#8bc34a',ink:'#111',v:21.43,late:0,rain:.9,bod:[1,.99,.97]},
 {id:'wolf',nr:11,name:'Hetzjagd',kind:'Wolf',trait:'Jagt den Vordermann, der rennt dann um sein Leben',col:'#3a3f47',ink:'#fff',v:20.81,late:0,rain:1,bod:[1,1,.99]},
 {id:'shiba',nr:12,name:'Schnüffelnase',kind:'Shiba Inu',trait:'Schnüffelt herum, bekommt dann seine fünf Minuten',col:'#1c2f6b',ink:'#fff',v:21.75,late:0,rain:.8,bod:[1,.97,.94]}
];
const CLASSIC=[0,1,2,3,4,5];   // das ursprüngliche Feld
// Das Feld des aktuellen Rennens, Index = Bahn. Im Browser lesen Darstellung und Wetten daraus; setField tauscht den Inhalt aus.
const RUN=CLASSIC.map(k=>ROSTER[k]);
function setField(f){RUN.length=0;f.forEach(k=>RUN.push(ROSTER[k]))}
// Zieht FIELD verschiedene Starter, sortiert nach Startnummer. u: Zufallsquelle 0…1
function drawField(u){const a=ROSTER.map((d,k)=>k);for(let k=a.length-1;k>0;k--){const j=Math.floor(u()*(k+1));[a[k],a[j]]=[a[j],a[k]]}return a.slice(0,FIELD).sort((x,y)=>x-y)}
// Bahnzustand: wird vor dem Rennen ausgelost und angesagt, damit die Quoten ihn schon enthalten
const BODEN=[{name:'gut',p:.5},{name:'weich',p:.3},{name:'schwer',p:.2}];
function drawBoden(u){let a=0;for(let k=0;k<BODEN.length;k++){a+=BODEN[k].p;if(u<a)return k}return BODEN.length-1}
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
// Wie weit die Nase vor der Position liegt: das Alpaka streckt im Ziel den Hals
const nose=(d,x)=>d.id==='alpaka'?2+4*clamp((x-(L-90))/60,0,1):0;
// Zustände: 0 läuft, 1 schläft, 2 purzelt, 3 frisst, 4 Sturmlauf, 6 Rakete, 7 läuft zurück, 8 jubelt zu früh, 9 Rakete verkehrt herum,
// 10 bockt, 11 springt, 12 erstarrt, 13 jagt, 14 schnüffelt, 15 Zoomies, 16 heult mit,
// Reaktionen auf Unfälle: 17 fliegt durch die Luft, 18 platt, 19 benommen, 20 Bauchklatscher,
// Überholgags: 21 Bocksprung, 22 Huckepack, 23 abgedrängt, 24 Turbo, 25 überholt rückwärts,
// Absurditäten: 26 Höhenflug (fliegt aus dem Bild und fällt von oben wieder herein), 27 wartet auf die Enten, 28 schnappt sich einen Snack vom Zuschauer
const STOP=[1,2,3,8,10,12,14,16,18,19,27,28];
const FALL=[2,17,18,19,20];   // Unfallzustände; danach 1,5 s Schonzeit
const ISFALL=[];FALL.forEach(q=>ISFALL[q]=1);
const STAGEGAP=1.5;   // Pause nach jedem Auftritt, siehe „Bühne“ in simulate
const RAIN=12;   // so lange regnet es (s)
const CATCH=.12,LEADF=.03,GAGTRY=.6,GAGCD=3,NOCATCH=[];[6,9,17,20,21,22,26].forEach(q=>NOCATCH[q]=1);   // Aufholjagd und Überholen, siehe unten
// bod: Index in BODEN (Standard 0 = gut), field: ROSTER-Indizes der Starter (Standard CLASSIC)
function simulate(seed,rec,bod,field){
  const F=(field||CLASSIC).map(k=>ROSTER[k]),n=F.length,R=rng(seed);
  const rs=F.map(()=>({due:null,dueT:0,x:0,st:0,T:0,n:0,fin:-1,used:false,fl:0,dr:-1,ahead:0,hs:[],fT:-9,o:-1,vl:0,lv:0,ov:[-9,-9,-9,-9,-9,-9,-9,-9],tf:0,jub:false,tg:0,fz:-1}));
  const has=id=>F.findIndex(d=>d.id===id);
  const order=[],frames=[],ev=[]; let t=0,stp=0,lead=-1,leadT=0,m200=false,stretch=false,winT=-1,wasRain=false,howl=false,foxT=-9;
  const props=[];   // Dinge auf der Bahn und Zuschauer (Absurditäten, siehe unten); die Darstellung liest sie aus dem Ergebnis
  bod=bod|0;
  let rain0=R()<.45?8+R()*24:-1, rain1=rain0+RAIN;
  // p: Gewicht für den gesprochenen Kommentar, 3 = Zieleinlauf, 2 = Ereignis, 1 = Rest
  // k: Art des Ereignisses, damit die Wiedergabe es auch in anderen Sprachen ansagen kann; j: zweiter beteiligter Starter
  // Bühne: Es gibt immer nur einen Auftritt. Jedes Ereignis mit Kameraschnitt (cut) belegt die Bühne für seine Dauer und STAGEGAP danach;
  // so lange fängt niemand von sich aus einen neuen Gag an (Eigenheiten, Überholgags, Zuschauer). Folgen wie Stürze passieren trotzdem.
  let stage=0,due=false;const free=()=>t>=stage;
  // Eigenheiten mit Vormerkung: Würfelt ein Starter seine Eigenheit, während die Bühne belegt ist, merkt er sie sich vor (r.due)
  // und ist dran, sobald sie frei wird; Überholgags warten so lange. Nach 4 s verfällt die Vormerkung.
  const q=(r,k,h)=>{
    if(r.due){if(r.due!==k||!free())return false;r.due=null;return true}
    if(!(R()<h*DT))return false;
    if(free())return true;
    r.due=k;r.dueT=t;return false};
  const say=(s,i,cut,p,k,j)=>{if(cut>0)stage=Math.max(stage,t+cut+STAGEGAP);if(rec)ev.push({t,s,i,cut,p:p||(cut?2:1),k,j:j==null?-1:j})};
  const p=h=>R()<h*DT;
  // Laute Ereignisse (Sturmlauf, Rakete, Stürze, Jagd, Zoomies): Ein Reh in der Nähe erschrickt und erstarrt
  function scare(i){for(let j=0;j<n;j++){const r=rs[j];
    if(j!==i&&F[j].id==='reh'&&r.st===0&&r.fin<0&&Math.abs(r.x-rs[i].x)<18&&R()<.7){r.st=12;r.T=1.4+R()*1.2;say(F[j].name+' erschrickt und bleibt wie angewurzelt stehen.',j,1.8,0,'scare',i)}}}
  // Fehlschläge reißen andere mit. hit: Starter j stürzt, ausgelöst von src. Wer direkt dahinter läuft, kann über ihn fallen
  // (eine Stufe Kettenreaktion, nicht mehr, sonst läge bei engem Feld jedes Mal alles am Boden).
  // fT: zuletzt verunglückt; wer gerade aufsteht, fällt nicht gleich wieder. Wer fliegt, springt oder huckepack sitzt, ist nicht zu treffen
  const DN=[];for(const q of [2,6,9,17,18,19,20,21,22,26])DN[q]=1;
  const down=q=>q.fin>=0||DN[q.st]===1||t-q.fT<1.5;
  // Reaktion je Ursache (how): 2 Überschlag, 17 fliegt (vl: Tempo in der Luft, negativ = nach hinten), 18 platt, 19 benommen, 20 Bauchklatscher,
  // 26 Höhenflug: so hoch, dass er aus dem Bild verschwindet; 1,1 s vor der Landung fällt er von oben wieder herein
  const DUR={2:2.2,17:1.1,18:2.2,19:1.8,20:1.3,26:2.6};
  function fall(q,how,vl){q.st=how;q.T=DUR[how];q.vl=vl||0;q.o=-1;q.tg=0}
  function hit(j,src,s,k,deep,how,vl){const q=rs[j];if(down(q))return false;
    how=how||2;fall(q,how,vl);say(s,j,deep?0:2,2,k,src);scare(j);
    if(!deep&&(how===2||how===20))for(let b=0;b<n;b++){const g=q.x-rs[b].x;if(b!==j&&b!==src&&g>0&&g<2.5&&!down(rs[b])&&R()<.35){hit(b,j,F[b].name+' fällt über '+F[j].name+'.','trip',1,R()<.5?20:2,9);break}}
    return true}
  // Wer innerhalb von w Metern an Starter i vorbeikommt, wird je Ereignis einmal geprüft (r.hs merkt sich, wer schon dran war)
  function passBy(i,w,pr,fn){const r=rs[i];for(let j=0;j<n;j++){if(j===i||r.hs.includes(j)||down(rs[j])||Math.abs(rs[j].x-r.x)>w)continue;r.hs.push(j);if(R()<pr)fn(j)}}
  // Explosion der Rakete: wer im Umkreis von 7 m ist, wird mit 50 % umgeworfen
  function blast(i){for(let j=0;j<n;j++)if(j!==i&&!down(rs[j])&&Math.abs(rs[j].x-rs[i].x)<7&&R()<.5){const hi=R()<.2;hit(j,i,hi?'Die Druckwelle schleudert '+F[j].name+' bis über die Wolken.':'Die Druckwelle schleudert '+F[j].name+' in die Luft.',hi?'blasthigh':'blast',1,hi?26:17,(rs[j].x>rs[i].x?1:-1)*(hi?9:6))}}
  // der nächste laufende Starter hinter i, höchstens w Meter
  function behind(i,w){let b=-1,g0=w;for(let j=0;j<n;j++){const g=rs[i].x-rs[j].x;if(j!==i&&g>0&&g<g0&&!down(rs[j])&&rs[j].st!==1){g0=g;b=j}}return b}
  // Überholversuche: Wer schneller ist und bis auf 2,5 m an einen laufenden Vordermann aufläuft, hängt an ihm fest und versucht
  // es nach im Schnitt 1,7 s (GAGTRY je s) mit einem Gag. Danach hat das Paar 3 s Ruhe (GAGCD). Welcher Gag, hängt etwas vom Tier ab;
  // jeder kann schiefgehen.
  const GAG={hirsch:'leap',reh:'leap',fuchs:'piggy',shiba:'turbo',wolf:'turbo',pferd:'taunt',aufrecht:'taunt',stier:'barge',esel:'barge'};
  const GAGS=['leap','piggy','barge','turbo','taunt'];
  const SMALL=['husky','fuchs','wolf','shiba'];   // wer so klein ist, trägt niemanden; dann wird gesprungen
  function overtake(i,v){const r=rs[i],d=F[i],x=r.x;let j=-1,g0=2.5;
    for(let q=0;q<n;q++){const o=rs[q],g=o.x-x;if(g>.2&&g<g0&&o.st===0&&o.fin<0){g0=g;j=q}}
    if(j<0||v<=rs[j].lv)return v;if(t-r.ov[j]<GAGCD)return v;
    // Einfach vorbeilaufen geht nicht: Wer aufläuft, hängt am Vordermann fest, bis er es mit einem Gag versucht
    if(!free()||due||!p(GAGTRY))return Math.min(v,rs[j].lv);
    r.ov[j]=t;
    const q=rs[j],e=F[j];let a=GAG[d.id]&&R()<.6?GAG[d.id]:GAGS[Math.floor(R()*5)];r.hs=[];
    if(a==='piggy'&&SMALL.includes(e.id))a='leap';
    if(a==='leap'){
      if(R()<.25){fall(q,18);fall(r,19);say(d.name+' will über '+e.name+' springen und landet genau drauf.',i,2.2,0,'leapfail',j);scare(i)}
      else{r.st=21;r.T=.7;r.o=j;r.vl=q.lv+(g0+3)/.7;say(d.name+' macht einen Bocksprung über '+e.name+'!',i,2,0,'leap',j)}}
    else if(a==='piggy'){r.st=22;r.T=1.6;r.o=j;r.x=q.x;say(d.name+' springt '+e.name+' auf den Rücken und lässt sich tragen.',i,2.2,0,'piggy',j)}
    else if(a==='barge'){
      if(['stier','esel','wolf'].includes(e.id)&&R()<.5){fall(r,19);say(d.name+' will '+e.name+' wegdrängen und prallt ab.',i,1.8,0,'bargefail',j)}
      else{q.st=23;q.T=1.2;q.o=i;r.fl=Math.max(r.fl,1);say(d.name+' drängelt '+e.name+' einfach zur Seite.',j,1.8,0,'barge',i)}}
    else if(a==='turbo'){r.st=24;r.T=.9;r.tf=R()<.2;say(d.name+' schaltet den Turbo ein und rauscht an '+e.name+' vorbei!',i,1.6,0,'turbo',j)}
    else{r.st=25;r.T=1.2;r.tf=R()<.25;say(d.name+' überholt '+e.name+' rückwärts und streckt die Zunge raus. Bätsch!',i,1.8,0,'taunt',j)}
    return v}
  /* ---------- Absurditäten: Dinge auf der Bahn und Zuschauer, die eingreifen ----------
     Jeder Gag ist klein (einer verliert oder gewinnt ein paar Meter), dafür passiert in fast jedem Rennen etwas davon.
     props: {k, x, b: Bahn (-1: alle), t0: erscheint, t1: vorbei, tu: benutzt}, dazu je Art eigene Felder für die Darstellung */
  const AIR=[];for(const q of [6,9,11,17,21,22,26])AIR[q]=1;      // fliegt, springt oder sitzt huckepack: geht über alles hinweg
  const RUNS=[];for(const q of [0,4,13,15,23,24,25])RUNS[q]=1;    // läuft aus eigener Kraft
  const HERB=['pferd','alpaka','stier','aufrecht','kuh','esel','hirsch','reh'];   // fressen Möhren, die anderen lieber Wurst
  function land(i){const r=rs[i],q=r.o;r.st=2;r.T=1;r.o=-1;
    if(q>=0&&!down(rs[q]))hit(q,i,F[i].name+' landet genau auf '+F[q].name+'.','dropon',1,18)}
  // Trampolin: steht in knapp einem Drittel der Rennen von Anfang an auf einer Bahn
  if(R()<.3)props.push({k:'tramp',x:L*(.25+R()*.5),b:Math.floor(R()*n),t0:0,t1:-1});
  // Entenfamilie und Flitzer: je in einem Viertel der Rennen
  const duck=R()<.25?{k:'ducks',x:L*(.3+R()*.45),b:-1,t0:-1,t1:-1,sc:0}:null;
  const streak=R()<.25?{k:'streak',x:0,b:-1,t0:-1,t1:-1,t2:-1,v:7,how:'',j:-1,at:8+R()*22}:null;
  let ducksaid=false,snacks=0,bananas=0;
  function absurd(lx){
    // Ein Zuschauer wirft eine Bananenschale vor einen Starter
    if(bananas<2&&t>5&&lx<L-80&&free()&&!due&&p(.03)){const b=Math.floor(R()*n),r=rs[b];
      if(r.fin<0&&!AIR[r.st]){bananas++;props.push({k:'banana',x:Math.min(L-10,r.x+14+R()*14),b,t0:t,t1:-1});say('Von der Tribüne fliegt eine Bananenschale vor '+F[b].name+'.',b,0,1,'bananathrow')}}
    // Ein Zuschauer hält eine Möhre (oder eine Wurst) über die Bande, und ein Starter kann nicht widerstehen
    if(snacks<2&&t>6&&lx<L-100&&free()&&!due&&p(.03)){const b=Math.floor(R()*n),r=rs[b];
      if(r.st===0&&r.fin<0&&t-r.fT>1.5){snacks++;const herb=HERB.includes(F[b].id);r.st=28;r.T=1.6+R()*.8;
        props.push({k:'snack',x:r.x+1.5,b,t0:t-1.5,t1:t+r.T,food:herb?'carrot':'sausage'});
        say(herb?'Ein Zuschauer hält eine Möhre über die Bande. '+F[b].name+' kann nicht widerstehen.':'Ein Zuschauer hält eine Wurst über die Bande. '+F[b].name+' biegt sofort ab.',b,2.2,0,'snack')}}
    // Enten: erscheinen, wenn die Spitze 55 m davor ist, und brauchen 4,5 s über die Bahn. Wer ankommt, wartet höflich; der Stier im Sturmlauf nicht
    if(duck&&duck.t0<0&&lx>=duck.x-55&&(free()||lx>=duck.x-30)){duck.t0=t;duck.t1=t+4.5;props.push(duck);stage=Math.max(stage,t+2);say('Eine Entenfamilie überquert die Bahn. Ganz gemütlich.',-1,0,2,'ducks')}
    if(duck&&duck.t0>=0&&t<duck.t1)for(let i=0;i<n;i++){const r=rs[i],g=duck.x-r.x;if(r.fin>=0||g<=0||g>3||!RUNS[r.st])continue;
      if(r.st===4){duck.t1=t;duck.sc=1;rs.forEach(q=>{if(q.st===27)q.T=.2});say(F[i].name+' prescht mitten durch die Enten. Federn fliegen!',i,2,0,'duckscatter');break}
      r.st=27;r.T=duck.t1-t+.2;if(!ducksaid){ducksaid=true;say(F[i].name+' bremst und lässt die Enten vorbei. Bitte schön!',i,2.2,0,'duckwait')}}
    // Flitzer: springt 30 m vor der Spitze auf die Bahn und rennt mit; wen er zuerst erwischt, entscheidet, was passiert
    if(streak&&streak.t0<0&&t>=streak.at&&lx>100&&lx<L-150&&free()){streak.t0=t;streak.x=lx+30;props.push(streak);stage=Math.max(stage,t+3);say('Ein Flitzer rennt auf die Bahn!',-1,0,2,'streak')}
    if(streak&&streak.t0>=0&&streak.t1<0){const fx=streak.x+streak.v*(t-streak.t0);
      if(fx>L-5||t-streak.t0>10){streak.t1=t;streak.how='away'}
      else for(let i=0;i<n;i++){const r=rs[i],g=fx-r.x,id=F[i].id;if(r.fin>=0||g<0||g>1.2||!RUNS[r.st]||t-r.fT<1.5)continue;
        streak.t1=t;streak.j=i;
        if(r.st===4){streak.how='knock';say(F[i].name+' nimmt den Flitzer auf die Hörner. Abflug!',i,2,0,'streakknock')}
        else if(!SMALL.includes(id)&&id!=='esel'&&id!=='stier'&&R()<.7){streak.how='ride';streak.t2=t+2.5+R();r.fz=streak.t2;say('Der Flitzer springt auf '+F[i].name+' und reitet mit!',i,2.4,0,'streakride')}
        else{streak.how='crash';hit(i,-1,F[i].name+' rennt den Flitzer um. Beide überschlagen sich.','streakcrash',0,2)}
        break}}
    if(streak&&streak.how==='ride'){const r=rs[streak.j];
      if(t<streak.t2&&(DN[r.st]||r.fin>=0)){streak.t2=t;r.fz=-1}
      if(!streak.off&&t>=streak.t2){streak.off=1;say('Der Flitzer fällt herunter. Die Ordner übernehmen.',streak.j,0,1,'streakoff')}}
  }
  // Starter i ist in diesem Schritt von x0 nach r.x gelaufen: Trampolin und Bananenschale auf seiner Bahn
  function onTrack(i,x0){const r=rs[i];
    for(const q of props){if(q.b!==i||q.tu!=null||t<q.t0||!(x0<q.x&&r.x>=q.x)||q.k!=='tramp'&&q.k!=='banana')continue;
      if(AIR[r.st]||!RUNS[r.st])continue;   // wer fliegt oder springt, kommt drüber
      q.tu=t;
      if(q.k==='tramp'){fall(r,26,Math.max(r.lv,16)*1.1);say(F[i].name+' erwischt das Trampolin und verschwindet nach oben!',i,1.6,0,'tramp');scare(i)}
      else if(HERB.includes(F[i].id)&&R()<.35){r.st=3;r.T=1.2;say(F[i].name+' frisst die Bananenschale einfach auf.',i,1.6,0,'bananaeat')}
      else hit(i,-1,F[i].name+' rutscht auf der Bananenschale aus!','banana',0,20,Math.max(8,r.lv))}}
  const hu=has('husky'),huN=hu>=0?F[hu].name:'';
  say(bod?'Das Feld ist unterwegs. Der Boden ist '+BODEN[bod].name+'.':'Das Feld ist unterwegs.',-1,0,1,'start');
  while(order.length<n&&t<150){
    if(!wasRain&&rain0>=0&&t>=rain0&&t<rain1&&!free()){rain0=t+DT;rain1=rain0+RAIN}   // der Regen wartet, bis die Bühne frei ist
    const rain=rain0>=0&&t>=rain0&&t<rain1;
    if(rain!==wasRain){wasRain=rain;
      if(hu>=0)say(rain?'Es beginnt zu regnen. Jetzt wacht '+huN+' auf.':'Der Regen hört auf. '+huN+' trottet wieder.',hu,rain?2.4:0,0,rain?'rain':'rainstop');
      else say(rain?'Es beginnt zu regnen.':'Der Regen hört auf.',-1,0,1,rain?'rain':'rainstop')}
    let li=-1,lx=-1,l2=-1,cross=[]; for(let i=0;i<n;i++)if(rs[i].fin<0){if(rs[i].x>lx){l2=lx;lx=rs[i].x;li=i}else if(rs[i].x>l2)l2=rs[i].x}
    due=false;for(const r of rs){if(r.due&&(t-r.dueT>4||r.fin>=0))r.due=null;if(r.due)due=true}
    absurd(lx);
    for(let i=0;i<n;i++){
      const r=rs[i],d=F[i],id=d.id;
      r.n=r.n*.97+(R()-.5)*.05;
      if(r.T>0){r.T-=DT;if(r.T<=0){
        if(r.st===17){r.st=2;r.T=1}   // gelandet, bleibt kurz liegen
        else if(r.st===26)land(i)
        else if(r.st===22){const c=rs[r.o],q=r.o;
          if(F[q].id==='esel'||F[q].id==='stier'){const hi=R()<.35;fall(r,hi?26:17,13);say(hi?F[q].name+' hat genug und katapultiert '+d.name+' aus dem Bild!':F[q].name+' hat genug und wirft '+d.name+' ab. Im hohen Bogen!',i,1.8,0,hi?'buckhigh':'buckoff',q)}
          else{r.st=21;r.T=.45;r.vl=c.lv+6;say(d.name+' springt ab und ist vorbei.',i,0,1,'piggyoff',q)}}
        else{r.st=0;r.o=-1}}}
      // Höhenflug: 1,1 s vor der Landung fällt er von oben wieder ins Bild, manchmal genau auf einen anderen
      if(r.st===26&&r.T<1.1&&!r.tg){r.tg=1;const lx2=r.x+r.vl*r.T;
        for(let j=0;j<n;j++)if(j!==i&&!down(rs[j])&&Math.abs(rs[j].x+rs[j].lv*r.T-lx2)<6){if(R()<.6)r.o=j;break}
        say(d.name+' kommt von oben zurück!',i,1.3,0,'fallback')}
      if(r.st===26&&r.o>=0)r.vl=rs[r.o].lv+(rs[r.o].x-r.x)/Math.max(r.T,DT);
      if(r.fl>0)r.fl-=DT;
      let v=d.v*(1+r.n)*(1+d.late*(r.x/L-.5))*d.bod[bod];
      const z=r.x>L-200?1.5:1;   // Zielgerade: Pannen werden häufiger
      if(r.fin>=0){v*=.6}
      else{
        if(r.st===0&&t>3&&t-r.fT>1.5){
          if(id==='pferd'&&i===li&&r.x>150&&q(r,'sleep',.035)){r.st=1;r.T=3.5+R()*2.5;r.hs=[];say(d.name+' führt und legt sich hin. Er schläft.',i,2.6,0,'sleep')}
          else if((id==='pferd'||id==='aufrecht')&&!r.jub&&i===li&&r.x>L-80&&r.x<L-35&&lx-l2>9&&q(r,'jub',.16)){r.st=8;r.jub=true;r.T=1+R()*.6;say(id==='pferd'?d.name+' jubelt schon. Viel zu früh!':d.name+' reißt die Arme hoch. Er jubelt zu früh!',i,1.5,0,'jub')}
          else if(id==='alpaka'&&q(r,'eat',.015*z)){r.st=3;r.T=2+R()*1.5;say(d.name+' hat den Blumenschmuck entdeckt und frisst.',i,2.2,0,'eat')}
          else if(id==='stier'&&q(r,'charge',.03*z)){
            // jeder achte Sturmlauf endet nach dem ersten Schritt im Gras, und wer dahinter läuft, fällt mit
            if(R()<.125){r.st=2;r.T=2.5;say(d.name+' senkt den Kopf, stolpert über die eigenen Hufe und überschlägt sich.',i,2.4,0,'chargefail');scare(i);
              const b=behind(i,7);if(b>=0)hit(b,i,F[b].name+' kann nicht mehr ausweichen und fällt über '+d.name+'.','trip',0,20,9)}
            else{r.st=4;r.T=4;say(d.name+' senkt den Kopf. Bitte alle zur Seite.',i,4,0,'charge');scare(i)}}
          else if(id==='aufrecht'&&(rain&&q(r,'slip',.08)||bod===2&&q(r,'slip',.012))){r.st=2;r.T=2.2;say(rain?d.name+' rutscht auf dem nassen Gras aus.':d.name+' rutscht im tiefen Boden aus.',i,2,0,'slip');scare(i)}
          else if(id==='aufrecht'&&q(r,'back',.045*z)){r.st=7;r.T=1.8+R()*1.4;r.hs=[];say(d.name+' hat sich umgedreht. Er läuft zurück.',i,2,0,'back')}
          else if(id==='kuh'&&!r.used&&t>6&&q(r,'rocket',.026*(z>1?2.5:1))){r.used=true;
            if(R()<.15){r.st=9;r.T=1+R()*.5;r.hs=[];say('Zündung! Aber die Rakete zeigt in die falsche Richtung.',i,2.6,0,'rocketwrong')}
            else{r.st=6;say('Zündung! Die Rakete von '+d.name+' brennt.',i,2.6,0,'rocket')}
            scare(i)}
          else if(id==='husky'&&!howl&&!rain&&rain0<0&&t>5&&q(r,'howl',.006)){howl=true;rain0=t+1.5;rain1=rain0+RAIN;say(d.name+' heult die Wolken an. Da zieht etwas auf.',i,1.8,0,'howl');
            const w=has('wolf');if(w>=0&&rs[w].st===0&&rs[w].fin<0){rs[w].st=16;rs[w].T=1.8;say(F[w].name+' kann nicht anders und heult mit.',w,1.8,0,'howlalong',i)}}
          // Esel: bleibt stehen, bis ihn jemand überholt (höchstens 7 s)
          else if(id==='esel'&&r.x>60&&q(r,'stubborn',.035*z)){r.st=10;r.T=7;r.hs=[];r.ahead=rs.filter(q=>q.x>r.x).length;say(d.name+' bleibt einfach stehen. Er will nicht mehr.',i,2.2,0,'stubborn')}
          // Hirsch: großer Satz nach vorn, jeder sechste geht schief
          else if(id==='hirsch'&&q(r,'jump',.06)){if(R()<.17){
              // misslungener Sprung: liegt jemand bis 6 m voraus, landet der Hirsch auf ihm
              let tg=-1;for(let j=0;j<n;j++){const g=rs[j].x-r.x;if(j!==i&&g>0&&g<6&&!down(rs[j])){tg=j;break}}
              r.st=2;r.T=2.2;
              if(tg>=0){say(d.name+' springt zu kurz und landet mitten auf '+F[tg].name+'.',i,2.2,0,'landon',tg);scare(i);hit(tg,i,F[tg].name+' ist jetzt platt wie ein Pfannkuchen.','trip',1,18)}
              else{say(d.name+' setzt zum Sprung an und landet auf der Nase.',i,2,0,'crash');scare(i)}}
            else{r.st=11;r.T=.9}}
          // Reh: erschrickt auch ohne Grund
          else if(id==='reh'&&q(r,'spook',.016)){r.st=12;r.T=1.4+R()*1.2;say(d.name+' erschrickt vor einem Schmetterling.',i,1.8,0,'spook')}
          // Wolf: jagt den Vordermann, der flieht schneller als sonst
          else if(id==='wolf'&&q(r,'hunt',.05)){let tg=-1,gx=1e9;for(let j=0;j<n;j++){const g=rs[j].x-r.x;if(j!==i&&rs[j].fin<0&&g>4&&g<20&&g<gx){gx=g;tg=j}}
            if(tg>=0){const q=rs[tg],tid=F[tg].id;
              // die Jagd geht schief, wenn sich der Wolf den Falschen aussucht
              if(tid==='stier'&&q.st!==4&&!down(q)){q.st=4;q.T=4;r.st=0;say(d.name+' hat sich den Falschen ausgesucht. '+F[tg].name+' dreht sich um und senkt den Kopf.',tg,3,0,'bullturn',i);scare(tg)}
              else if(tid==='esel'&&R()<.6){say(d.name+' kommt '+F[tg].name+' zu nah und kassiert einen Tritt.',i,2.2,0,'kick',tg);hit(i,tg,d.name+' fliegt rückwärts durch die Luft.','trip',1,17,-9)}
              else if(tid==='reh'&&q.st===0){q.st=12;q.T=2;say(F[tg].name+' rennt nicht weg, sondern erstarrt vor '+d.name+'. Der weiß jetzt auch nicht weiter.',tg,2,0,'freeze',i);r.st=12;r.T=1.2}
              else{r.st=13;r.T=3;q.fl=3;if(STOP.includes(q.st)&&q.st!==2){q.st=0;q.T=0}
                say(d.name+' hat '+F[tg].name+' im Visier. '+F[tg].name+' rennt um sein Leben.',i,2.2,0,'hunt',tg);scare(i)}}}
          else if(id==='shiba'&&q(r,'sniff',.025*z)){r.st=14;r.T=1.8+R()*1.4;say(d.name+' hat eine Spur gefunden und schnüffelt.',i,2,0,'sniff')}
          else if(id==='shiba'&&q(r,'zoom',.018)){r.st=15;r.T=2.5;r.hs=[];say(d.name+' bekommt seine fünf Minuten und rast los.',i,2.2,0,'zoom');scare(i)}
        }else if(r.st===6&&p(.13)){r.st=2;r.T=3;say('Die Rakete ist explodiert. '+d.name+' geht zu Fuß weiter.',i,2.4,0,'explode');scare(i);blast(i)}
        else if(r.st===9&&r.T<=DT){r.st=2;r.T=3;say('Die Rakete ist explodiert. '+d.name+' sortiert sich neu.',i,2.4,0,'explode');scare(i);blast(i)}
        // rückwärts fliegende Rakete: wer im Weg ist, wird umgemäht
        else if(r.st===9)passBy(i,2,.6,j=>hit(j,i,'Die Rakete nimmt '+F[j].name+' ein Stück mit nach hinten.','rocketram',0,17,-14))
        // rückwärts laufendes Pferd: Zusammenstoß mit dem, der von hinten kommt
        else if(r.st===7)passBy(i,1.2,.1,j=>{if(hit(j,i,d.name+' läuft rückwärts in '+F[j].name+' hinein. Beide sehen Sterne.','headon',0,19)){fall(r,19)}})
        // Zoomies im Zickzack: wer zu nah ist, wird umgerannt
        else if(r.st===15)passBy(i,2.5,.2,j=>hit(j,i,d.name+' rennt im Zickzack '+F[j].name+' über den Haufen.','zoomhit'))
        // schlafendes Pferd: der Nächste stolpert darüber
        else if(r.st===1)passBy(i,1,.25,j=>hit(j,i,F[j].name+' stolpert über den schlafenden '+d.name+' und rutscht auf dem Bauch weiter.','pileup',0,20,10))
        // bockender Esel: tritt nach dem, der dicht vorbeiläuft; wird er überholt, trottet er weiter
        else if(r.st===10){passBy(i,2,.15,j=>R()<.3?hit(j,i,d.name+' tritt aus. '+F[j].name+' fliegt über die Tribüne hinaus!','kickhigh',0,26,16):hit(j,i,d.name+' tritt aus und schießt '+F[j].name+' nach vorn durch die Luft.','kick',0,17,16));const a=rs.filter(q=>q.x>r.x).length;if(a>r.ahead){const by=rs.findIndex((q,j)=>j!==i&&q.x>r.x&&q.x-r.x<3);r.st=0;r.T=0;say(by>=0?F[by].name+' zieht vorbei. Jetzt trottet '+d.name+' beleidigt hinterher.':d.name+' setzt sich wieder in Bewegung.',i,0,1,'unstubborn',by)}}
        if(STOP.includes(r.st))v=0;
        else if(r.st===17||r.st===21||r.st===26)v=r.vl;else if(r.st===20)v=r.vl*r.T/DUR[20];else if(r.st===22)v=0;
        else if(r.st===23)v*=.7;else if(r.st===24)v*=1.6;else if(r.st===25)v*=1.05;
        else if(r.st===4)v*=1.7;else if(r.st===7)v*=-.6;else if(r.st===6)v=70;else if(r.st===9)v=-35;
        else if(r.st===11)v*=1.8;else if(r.st===13)v*=1.45;else if(r.st===15)v*=1.9;
        if(r.fl>0&&!STOP.includes(r.st)&&r.st!==6&&r.st!==9&&r.st!==26)v*=1.25;
        if(t<r.fz)v*=.9;   // trägt einen Flitzer
        // Fuchs: im Windschatten eines Vordermanns schneller, auf den letzten 150 m zieht er heraus
        if(id==='fuchs'&&r.st===0){let dr=-1;for(let j=0;j<n;j++){const g=rs[j].x-r.x;if(j!==i&&rs[j].fin<0&&g>.5&&g<6&&!STOP.includes(rs[j].st)){dr=j;break}}
          if(dr>=0){const late=r.x>L-150;v*=late?1.3:1.12;
            if(r.dr<0&&t>6&&(late||dr===li)&&t-foxT>12){foxT=t;say(late?d.name+' kommt aus dem Windschatten von '+F[dr].name+'!':d.name+' hängt sich in den Windschatten von '+F[dr].name+'.',i,late?1.6:0,0,late?'draftout':'draft',dr)}}
          r.dr=dr}
        if(rain&&r.st!==6&&r.st!==9&&r.st!==17&&r.st!==21&&r.st!==26)v*=d.rain;
        // Aufholjagd: Wer zurückliegt, legt zu (bis +12 % ab 30 m Rückstand), der Führende lässt etwas nach. So bleibt das Feld beisammen
        // und es gibt mehr Führungswechsel. Nicht in der Luft, auf der Rakete, beim Rutschen oder rückwärts.
        if(v>0&&!NOCATCH[r.st])v*=1+CATCH*clamp((lx-r.x)/30,0,1)-(i===li?LEADF:0);
        if(r.st===0&&t>4&&t-r.fT>1.5)v=overtake(i,v);
        if(r.st===24&&r.T<=DT&&r.tf){r.tf=0;fall(r,20,v*.5);say(d.name+' hat sich übernommen und landet auf dem Bauch.',i,1.6,0,'turbofail')}
        if(r.st===25&&r.T<=DT&&r.tf){r.tf=0;fall(r,2);say(d.name+' hat nicht nach hinten geschaut und fällt über die eigenen Beine.',i,1.6,0,'tauntfail')}
      }
      if(r.st!==9&&r.st!==10&&r.st!==7&&r.st!==15&&r.st!==1&&r.st!==12&&r.hs.length)r.hs=[];
      if(ISFALL[r.st])r.fT=t;
      r.lv=v;
      const x0=r.x;r.x+=v*DT;
      if(r.fin<0)onTrack(i,x0);
      // Zieldurchgang auf den Bruchteil des Zeitschritts genau, damit Zielfoto und Einlauf übereinstimmen
      if(r.fin<0&&r.x+nose(d,r.x)>=L){const a0=x0+nose(d,x0),a1=r.x+nose(d,r.x);r.fin=t-DT+DT*clamp((L-a0)/(a1-a0),0,1);r.st=0;r.T=0;cross.push(i)}
    }
    for(let i=0;i<n;i++){const r=rs[i];if(r.st!==22)continue;const c=rs[r.o];
      if(c.fin>=0){r.st=0;r.T=0;r.o=-1}
      else if(ISFALL[c.st]||c.st===26){const q=r.o;fall(r,2);say(F[i].name+' fällt von '+F[q].name+' herunter.',i,0,1,'piggyfall',q)}else r.x=c.x}
    cross.sort((a,b)=>rs[a].fin-rs[b].fin).forEach(i=>{
      order.push(i);
      if(order.length===1){winT=rs[i].fin;say(F[i].name+' gewinnt!',i,0,3,'win')}
      else if(order.length===2&&rs[i].fin-winT<.2)say('Das war eng. '+F[i].name+' nur eine Nasenlänge dahinter.',i,0,3,'close');
    });
    // Plötzliches Stehenbleiben: Wer im Windschatten klebt oder direkt hinter einem erstarrten Reh läuft, fährt auf
    for(let i=0;i<n;i++){const r=rs[i],id=F[i].id;if(r.fin>=0)continue;
      if(id==='fuchs'&&r.st===0&&r.dr>=0&&STOP.includes(rs[r.dr].st)&&rs[r.dr].x-r.x<2.5&&p(1.5))hit(i,r.dr,F[i].name+' klebt zu dicht an '+F[r.dr].name+' und fährt auf.','rearend',0,19);
      if(id==='reh'&&r.st===12)passBy(i,1.5,.15,j=>{if(rs[j].x<r.x)hit(j,i,F[j].name+' rennt in das erstarrte '+F[i].name+' und sieht Sterne.','bump',0,19)})}
    for(let e=0;e<n;e++){const b=rs[e];if(F[e].id!=='stier'||b.st!==4||b.fin>=0)continue;
      for(let j=0;j<n;j++){const r=rs[j];
        if(j!==e&&!down(r)&&r.st!==11&&Math.abs(r.x-b.x)<5){const hi=R()<.25;fall(r,hi?26:17,15);
          say(hi?F[e].name+' schießt '+F[j].name+' in die Umlaufbahn!':F[e].name+' nimmt '+F[j].name+' auf die Hörner. Abflug!',j,0,2,hi?'knockhigh':'knock',e);scare(j)}}}
    if(!order.length&&t>4&&li!==lead&&t-leadT>2.5){say(F[li].name+(lead<0?' führt das Feld an.':' übernimmt die Führung.'),li,0,1,lead<0?'lead1':'lead');lead=li;leadT=t}
    if(!m200&&lx>=L-200){m200=true;say('Noch 200 Meter.',-1,0,2,'m200')}
    const al=has('alpaka');
    if(!stretch&&al>=0&&rs[al].fin<0&&rs[al].x>=L-90){stretch=true;say(F[al].name+' streckt den Hals nach vorn.',al,0,2,'stretch')}
    if(rec)frames.push({x:rs.map(r=>r.x),s:rs.map(r=>r.st),o:rs.map(r=>r.o),rain});
    t+=DT;stp++;
  }
  rs.map((r,i)=>i).filter(i=>rs[i].fin<0).sort((a,b)=>rs[b].x-rs[a].x).forEach(i=>order.push(i));
  return {order,frames,ev,dur:t,winT,fin:rs.map(r=>r.fin),field:(field||CLASSIC).slice(),props};
}

if(typeof module!=='undefined')module.exports={simulate,ROSTER,CLASSIC,RUN,FIELD,setField,drawField,L,BODEN,drawBoden,nose,rng};
