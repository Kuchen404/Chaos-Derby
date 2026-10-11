// Chaos-Derby – Rennsimulation: Starter, Ereignisse, Kommentar. Läuft im Browser und in Node (siehe tools/odds.js).
const L=1000, DT=1/30;
const RUN=[
 {nr:1,name:'Sekundenschlaf',kind:'Pferd',trait:'Schnell, schläft in Führung aber gern ein',col:'#d2232a',ink:'#fff',v:23,late:-.04,rain:.85,bod:[1,.97,.95]},
 {nr:2,name:'Hals über Kopf',kind:'Alpaka',trait:'Streckt im Ziel den Hals, frisst unterwegs',col:'#f2b600',ink:'#111',v:22.5,late:.02,rain:.85,bod:[1,.99,.97]},
 {nr:3,name:'Dampfwalze',kind:'Stier',trait:'Langsam, räumt beim Sturmlauf alles ab',col:'#2f6fb8',ink:'#fff',v:19,late:.03,rain:.95,bod:[1,1,.99]},
 {nr:4,name:'Schmuddelwetter',kind:'Husky',trait:'Trottet lustlos, außer es regnet',col:'#12a08f',ink:'#fff',v:16.5,late:0,rain:2.33,bod:[1,1,1]},
 {nr:5,name:'Aufrechter Gang',kind:'Pferd auf zwei Beinen',trait:'Der Schnellste, läuft manchmal zurück',col:'#8e44ad',ink:'#fff',v:24.6,late:0,rain:.8,bod:[1,.97,.95]},
 {nr:6,name:'Spätzünder',kind:'Kuh mit Rakete',trait:'Trottet, bis die Rakete zündet',col:'#e0559b',ink:'#fff',v:9,late:0,rain:1,bod:[1,.98,.96]}
];
// Bahnzustand: wird vor dem Rennen ausgelost und angesagt, damit die Quoten ihn schon enthalten
const BODEN=[{name:'gut',p:.5},{name:'weich',p:.3},{name:'schwer',p:.2}];
function drawBoden(u){let a=0;for(let k=0;k<BODEN.length;k++){a+=BODEN[k].p;if(u<a)return k}return BODEN.length-1}
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const nose=(i,x)=>i===1?2+4*clamp((x-(L-90))/60,0,1):0;
// Zustände: 0 läuft, 1 schläft, 2 purzelt, 3 frisst, 4 Sturmlauf, 6 Rakete, 7 läuft zurück, 8 jubelt zu früh, 9 Rakete verkehrt herum
// bod: Index in BODEN (Standard 0 = gut)
function simulate(seed,rec,bod){
  const R=rng(seed), rs=RUN.map(()=>({x:0,st:0,T:0,n:0,fin:-1,used:false}));
  const order=[],frames=[],ev=[]; let t=0,lead=-1,leadT=0,m200=false,stretch=false,winT=-1,wasRain=false,howl=false;
  bod=bod|0;
  let rain0=R()<.45?8+R()*20:-1, rain1=rain0+10;
  // p: Gewicht für den gesprochenen Kommentar, 3 = Zieleinlauf, 2 = Ereignis, 1 = Rest
  const say=(s,i,cut,p)=>{if(rec)ev.push({t,s,i,cut,p:p||(cut?2:1)})};
  const p=h=>R()<h*DT;
  say(bod?'Das Feld ist unterwegs. Der Boden ist '+BODEN[bod].name+'.':'Das Feld ist unterwegs.');
  while(order.length<6&&t<150){
    const rain=rain0>=0&&t>=rain0&&t<rain1;
    if(rain!==wasRain){wasRain=rain;say(rain?'Es beginnt zu regnen. Jetzt wacht Schmuddelwetter auf.':'Der Regen hört auf. Schmuddelwetter trottet wieder.',3,rain?2.4:0)}
    let li=-1,lx=-1,l2=-1,cross=[]; for(let i=0;i<6;i++)if(rs[i].fin<0){if(rs[i].x>lx){l2=lx;lx=rs[i].x;li=i}else if(rs[i].x>l2)l2=rs[i].x}
    for(let i=0;i<6;i++){
      const r=rs[i],d=RUN[i];
      r.n=r.n*.97+(R()-.5)*.05;
      if(r.T>0){r.T-=DT;if(r.T<=0)r.st=0}
      let v=d.v*(1+r.n)*(1+d.late*(r.x/L-.5))*d.bod[bod];
      const z=r.x>L-200?1.5:1;   // Zielgerade: Pannen werden häufiger
      if(r.fin>=0){v*=.6}
      else{
        if(r.st===0&&t>3){
          if(i===0&&i===li&&r.x>150&&p(.035)){r.st=1;r.T=3.5+R()*2.5;say('Sekundenschlaf führt und legt sich hin. Er schläft.',0,2.6)}
          else if(i===0&&!r.jub&&i===li&&r.x>L-80&&r.x<L-35&&lx-l2>9&&p(.16)){r.st=8;r.jub=true;r.T=1+R()*.6;say('Sekundenschlaf jubelt schon. Viel zu früh!',0,1.5)}
          else if(i===1&&p(.015*z)){r.st=3;r.T=2+R()*1.5;say('Hals über Kopf hat den Blumenschmuck entdeckt und frisst.',1,2.2)}
          else if(i===2&&p(.03*z)){r.st=4;r.T=4;say('Dampfwalze senkt den Kopf. Bitte alle zur Seite.',2,4)}
          else if(i===4&&(rain&&p(.08)||bod===2&&p(.012))){r.st=2;r.T=2.2;say(rain?'Aufrechter Gang rutscht auf dem nassen Gras aus.':'Aufrechter Gang rutscht im tiefen Boden aus.',4,2)}
          else if(i===4&&!r.jub&&i===li&&r.x>L-80&&r.x<L-35&&lx-l2>9&&p(.16)){r.st=8;r.jub=true;r.T=1+R()*.6;say('Aufrechter Gang reißt die Arme hoch. Er jubelt zu früh!',4,1.5)}
          else if(i===4&&p(.045*z)){r.st=7;r.T=1.8+R()*1.4;say('Aufrechter Gang hat sich umgedreht. Er läuft zurück.',4,2)}
          else if(i===5&&!r.used&&t>6&&p(.026*(z>1?2.5:1))){r.used=true;
            if(R()<.15){r.st=9;r.T=1+R()*.5;say('Zündung! Aber die Rakete zeigt in die falsche Richtung.',5,2.6)}
            else{r.st=6;say('Zündung! Die Rakete von Spätzünder brennt.',5,2.6)}}
          else if(i===3&&!howl&&!rain&&rain0<0&&t>5&&p(.006)){howl=true;rain0=t+1.5;rain1=rain0+10;say('Schmuddelwetter heult die Wolken an. Da zieht etwas auf.',3,1.8)}
        }else if(r.st===6&&p(.13)){r.st=2;r.T=3;say('Die Rakete ist explodiert. Spätzünder geht zu Fuß weiter.',5,2.4)}
        else if(r.st===9&&r.T<=DT){r.st=2;r.T=3;say('Die Rakete ist explodiert. Spätzünder sortiert sich neu.',5,2.4)}
        if(r.st===1||r.st===2||r.st===3||r.st===8)v=0;else if(r.st===4)v*=1.7;else if(r.st===7)v*=-.6;else if(r.st===6)v=70;else if(r.st===9)v=-35;
        if(rain&&r.st!==6&&r.st!==9)v*=d.rain;
      }
      const x0=r.x;r.x+=v*DT;
      // Zieldurchgang auf den Bruchteil des Zeitschritts genau, damit Zielfoto und Einlauf übereinstimmen
      if(r.fin<0&&r.x+nose(i,r.x)>=L){const a0=x0+nose(i,x0),a1=r.x+nose(i,r.x);r.fin=t-DT+DT*clamp((L-a0)/(a1-a0),0,1);r.st=0;r.T=0;cross.push(i)}
    }
    cross.sort((a,b)=>rs[a].fin-rs[b].fin).forEach(i=>{
      order.push(i);
      if(order.length===1){winT=rs[i].fin;say(RUN[i].name+' gewinnt!',i,0,3)}
      else if(order.length===2&&rs[i].fin-winT<.2)say('Das war eng. '+RUN[i].name+' nur eine Nasenlänge dahinter.',i,0,3);
    });
    const e=rs[2];
    if(e.st===4&&e.fin<0)for(let j=0;j<6;j++){const r=rs[j];
      if(j!==2&&r.fin<0&&r.st!==2&&r.st!==6&&r.st!==9&&Math.abs(r.x-e.x)<5){r.st=2;r.T=2.2;say('Dampfwalze räumt '+RUN[j].name+' ab.',j,0,2)}}
    if(!order.length&&t>4&&li!==lead&&t-leadT>2.5){say(RUN[li].name+(lead<0?' führt das Feld an.':' übernimmt die Führung.'));lead=li;leadT=t}
    if(!m200&&lx>=L-200){m200=true;say('Noch 200 Meter.',-1,0,2)}
    if(!stretch&&rs[1].fin<0&&rs[1].x>=L-90){stretch=true;say('Hals über Kopf streckt den Hals nach vorn.',1,0,2)}
    if(rec)frames.push({x:rs.map(r=>r.x),s:rs.map(r=>r.st),rain});
    t+=DT;
  }
  rs.map((r,i)=>i).filter(i=>rs[i].fin<0).sort((a,b)=>rs[b].x-rs[a].x).forEach(i=>order.push(i));
  return {order,frames,ev,dur:t,winT,fin:rs.map(r=>r.fin)};
}

if(typeof module!=='undefined')module.exports={simulate,RUN,L,BODEN,drawBoden};
